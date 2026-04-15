# TUI Dashboard - Terminal User Interface

## Overview
A rich terminal dashboard for monitoring system metrics, logs, and processes. 
This is NOT a web application - it's a TUI (Text User Interface) that runs in the terminal using ncurses-like capabilities via Textual.

## Architecture

### Layout Structure (Grid-based)
```
┌─────────────────────────────────────────┐
│  Header (clock, system name)           │  height: 3
├──────────────┬──────────────┬───────────┤
│  CPU Chart   │  Memory      │  Network  │  height: 15
│  (sparkline) │  (gauge)     │  (bars)   │
├──────────────┴──────────────┴───────────┤
│  Process Table (sortable, filterable)  │  height: 20
│  - PID, Name, CPU%, Mem%, Status       │
├─────────────────────────────────────────┤
│  Log Viewer (scrollable, searchable)   │  height: fill
│  - Color-coded by level (INFO/WARN/ERR) │
└─────────────────────────────────────────┘
```

### Widgets

#### Header Widget
- Title: "System Dashboard"
- Left: Current time (updating every second)
- Right: Hostname + uptime

#### CPU Monitor
- Type: Sparkline (historical graph)
- Data: CPU usage % per core
- Update: Every 500ms
- Colors: Green (<50%), Yellow (50-80%), Red (>80%)

#### Memory Gauge
- Type: Progress gauge with color bands
- Data: Used / Total RAM
- Format: "4.2 GB / 16 GB (26%)"
- Thresholds: Green (<60%), Yellow (60-85%), Red (>85%)

#### Network IO
- Type: Bar chart (in/out)
- Data: Bytes/sec
- Auto-scale: B/s, KB/s, MB/s

#### Process Table
- Type: DataTable with 1000+ rows
- Columns: PID | Name | CPU% | Mem% | Status | User
- Sortable: Click header to sort
- Filterable: Type to filter by name
- Actions: Kill (F9), Details (Enter)

#### Log Viewer
- Type: Scrollable view with virtual rendering
- Data: Last 10k log lines
- Features:
  - Search: /pattern to find
  - Filter: level=ERROR
  - Follow: Auto-scroll new entries
  - Wrap: Toggle line wrapping

## Interactions (Key Bindings)

### Global
- `q` or `Ctrl+C` - Quit
- `Tab` - Focus next widget
- `Shift+Tab` - Focus previous widget
- `1-5` - Jump to widget by number
- `?` - Show help overlay

### Process Table
- `↑/↓` or `j/k` - Navigate
- `Enter` - View process details
- `F9` - Kill process (with confirmation)
- `c` - Sort by CPU
- `m` - Sort by memory
- `p` - Sort by PID
- `/` - Filter by name
- `r` - Refresh now

### Log Viewer
- `↑/↓` or `j/k` - Scroll line
- `PgUp/PgDn` - Scroll page
- `Home/End` - Jump to start/end
- `f` - Toggle follow mode
- `/` - Search forward
- `n` - Next search result
- `N` - Previous search result
- `w` - Toggle wrap
- `l` - Filter by level (cycle: ALL→INFO→WARN→ERROR)

### CPU/Memory/Network
- `c` - Change color scheme
- `s` - Toggle smoothing (for sparklines)

## Data Sources

### System Metrics
- Read from `/proc/stat` (CPU)
- Read from `/proc/meminfo` (Memory)
- Read from `/proc/net/dev` (Network)
- Poll using `psutil` library equivalent

### Logs
- Tail `/var/log/syslog` or journald
- Or read from user-specified file
- Support: systemd journal, files, dmesg

## State Management

### Reactive Updates
Each widget has its own update loop:
```python
class CPUMonitor(Widget):
    def on_mount(self):
        self.set_interval(0.5, self.update_cpu)
    
    def update_cpu(self):
        self.cpu_data = read_proc_stat()
        self.refresh()
```

### Shared State
```python
class DashboardState:
    cpu_history: deque[float]  # Last 60 seconds
    memory_used: int
    network_io: Counter
    selected_pid: Optional[int]
    log_filter: str = ""
```

## Styling

### Color Scheme
- Background: Dark (#1e1e1e)
- Primary: Cyan (#00bcd4)
- Secondary: Purple (#9c27b0)
- Success: Green (#4caf50)
- Warning: Yellow (#ffc107)
- Error: Red (#f44336)
- Text: Light gray (#e0e0e0)
- Muted: Gray (#9e9e9e)

### CSS-like Styling
```css
/* Header */
Header {
    background: $primary;
    color: white;
    height: 3;
}

/* DataTable focused */
DataTable:focus {
    border: solid $primary;
}

/* Log ERROR level */
LogLine.level-error {
    color: $error;
    background: $error-dark;
}
```

## Configuration File

```yaml
# ~/.config/tui-dashboard/config.yaml
refresh_interval: 500  # ms
show_gpu: true
log_source: 
  type: journald
  unit: myapp.service
processes:
  sort_by: cpu
  sort_reverse: true
  hide_kernel: true
colors:
  scheme: dark  # or light, high-contrast
```

## Build

Language: python
Framework: textual
template = "python-textual"

