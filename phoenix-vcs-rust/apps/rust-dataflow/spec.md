# DataFlow - Stream Processing Pipeline

## Overview
A high-performance data processing pipeline for ETL (Extract, Transform, Load) operations. Not a web server - this processes data streams through a directed graph of transformations.

## Architecture

### Pipeline Graph
The system is a directed acyclic graph (DAG) of data transformations:

```
Sources → Parsers → Transforms → Sinks
   ↓         ↓          ↓         ↓
 Kafka    JSON      Filter    PostgreSQL
 Files    CSV       Enrich    Parquet
 API      XML       Aggregate S3
```

### Components

#### Sources (Data Inputs)
1. **Kafka Consumer** - Stream from Kafka topics
   - Config: `bootstrap.servers`, `group.id`, `topics[]`
   - Output: `Stream<Bytes>`

2. **File Watcher** - Watch directory for new files
   - Config: `path`, `pattern: "*.csv"`, `poll_interval_secs`
   - Output: `Stream<FileHandle>`

3. **HTTP Webhook** - Receive push data (NOT a REST API - just ingestion)
   - Config: `port: 8080`, `path: "/ingest"`
   - Output: `Stream<Request>`

#### Parsers (Format Converters)
1. **JSON Parser** - Parse JSON lines
   - Input: `Stream<Bytes>`
   - Output: `Stream<JsonValue>`
   - Config: `batch_size`, `strict_mode`

2. **CSV Parser** - Parse CSV with headers
   - Input: `Stream<Bytes>`
   - Output: `Stream<Record>`
   - Config: `delimiter`, `has_headers`, `schema`

3. **Avro Parser** - Deserialize Avro binary
   - Input: `Stream<Bytes>`
   - Output: `Stream<Record>`
   - Config: `schema_registry_url`

#### Transforms (Business Logic)
1. **Filter** - Conditional filtering
   - Condition: `record.temperature > 100`
   - Output: Filtered stream

2. **Enrich** - Add computed fields
   - Add: `timestamp_utc = now()`, `hash = sha256(id)`
   - Output: Enriched records

3. **Aggregate** - Windowed aggregations
   - Window: `tumbling(5 minutes)`
   - GroupBy: `sensor_id`
   - Aggregations: `avg(temp), max(temp), count()`

4. **Join** - Stream-stream joins
   - Left: `sensor_readings` (stream)
   - Right: `sensor_metadata` (lookup)
   - Key: `sensor_id`
   - Window: `interval(1 minute)`

#### Sinks (Data Outputs)
1. **PostgreSQL Sink** - Write to database
   - Config: `connection_string`, `table`, `batch_size`
   - Mode: `insert` | `upsert`

2. **Parquet Sink** - Write columnar files
   - Config: `path`, `partition_by: [date, hour]`, `compression: zstd`
   - Rotation: `every 15 minutes` or `every 100k rows`

3. **S3 Sink** - Upload to object storage
   - Config: `bucket`, `prefix`, `format: parquet`

## Configuration Example

```yaml
pipeline:
  sources:
    - name: kafka_events
      type: kafka
      config:
        brokers: "localhost:9092"
        topics: ["events", "metrics"]
        group_id: "dataflow-pipeline"

    - name: file_drop
      type: file_watcher
      config:
        path: "/data/incoming"
        pattern: "*.csv"

  processors:
    - name: parse_csv
      type: csv_parser
      input: file_drop
      config:
        delimiter: ","
        headers: true

    - name: filter_valid
      type: filter
      input: parse_csv
      condition: "status == 'valid'"

    - name: enrich_data
      type: enrich
      input: filter_valid
      fields:
        processed_at: "now()"
        region: "lookup_ip_geo(ip_address)"

    - name: aggregate_metrics
      type: aggregate
      input: kafka_events
      window:
        type: tumbling
        duration: 5m
      group_by: [service, metric_name]
      aggregations:
        - sum(value)
        - avg(value)
        - percentile(95, value)

  sinks:
    - name: postgres_main
      type: postgresql
      input: enrich_data
      config:
        table: processed_events
        batch_size: 1000

    - name: s3_archive
      type: s3
      input: aggregate_metrics
      config:
        bucket: data-archive
        prefix: metrics/year={year}/month={month}/
        format: parquet
```

## Data Types

### Record
```rust
struct Record {
    id: Uuid,
    timestamp: DateTime<Utc>,
    source: String,
    data: Value,  // JSON-like dynamic data
    metadata: HashMap<String, String>,
}
```

### Stream<T>
```rust
struct Stream<T> {
    items: Receiver<T>,
    watermark: DateTime<Utc>,  // Event time progress
    checkpoint: Checkpoint,     // Fault tolerance
}
```

### Window
```rust
enum Window {
    Tumbling { duration: Duration },
    Sliding { duration: Duration, step: Duration },
    Session { gap: Duration },
}
```

## Fault Tolerance

### Exactly-Once Semantics
- Kafka: Transactional producer + consumer groups
- Files: Move to `.processing/` then `.completed/` or `.failed/`
- Checkpoints: Store offsets in PostgreSQL

### Backpressure
- Bounded channels between components
- When full: pause upstream (stop reading from Kafka)
- Metrics: `buffer_utilization`, `processing_lag_ms`

### Error Handling
1. Parse errors → Dead letter queue (DLQ)
2. Transform errors → Skip record + log
3. Sink errors → Retry with backoff, then DLQ

## Observability

### Metrics
- `records_processed_total` (counter)
- `processing_duration_seconds` (histogram)
- `pipeline_lag_seconds` (gauge)
- `error_rate` (counter)

### Health Checks
- `/health` - Returns 200 if all components running (YES, this one endpoint is for monitoring)

## Non-Functional Requirements

### Performance
- Throughput: 100k records/second per core
- Latency: p99 < 500ms (end-to-end)
- Memory: Bounded by backpressure, max 4GB heap

### Scalability
- Horizontal: Multiple instances with partition assignment
- Vertical: Async runtime uses all cores

## Build

Language: rust
BuildType: binary
template = "rust"

