# API Gateway Service

## Overview

The API Gateway is the single entry point for all client requests. It handles routing, authentication, rate limiting, and request transformation before forwarding to downstream microservices.

## Authentication

- The gateway must validate JWT tokens on every authenticated request
- Tokens must be verified against the public key published by the Auth service
- Expired tokens must be rejected with a 401 response
- The gateway must not store or log raw token payloads
- Anonymous endpoints must be declared in a public routes manifest

## Rate Limiting

- Each API key must be rate-limited independently
- The default rate limit is 100 requests per minute per API key
- Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) must be included in every response
- When the limit is exceeded, the gateway must return 429 Too Many Requests
- Rate limit counters must be stored in Redis with TTL-based expiry

## Request Routing

- Routes must be declared in a static route table loaded at startup
- The gateway must support path-based routing to downstream services
- Health check endpoints must always return 200 without authentication
- Unknown routes must return 404 with a structured error body

## Request Transformation

- The gateway must inject a correlation ID header (X-Correlation-ID) into every forwarded request
- If the client provides a correlation ID, the gateway must propagate it unchanged
- Request bodies larger than 10MB must be rejected with 413

## Logging & Observability

- Every request must be logged with: method, path, status code, latency, and correlation ID
- The gateway must expose Prometheus metrics at /metrics
- Error responses (5xx) must include a request ID in the response body
- Logs must never contain sensitive data (tokens, passwords, PII)

## Circuit Breaking

- The gateway must implement circuit breaking for each downstream service
- After 5 consecutive failures, the circuit must open for 30 seconds
- An open circuit must return 503 Service Unavailable
- Half-open state must allow a single probe request through

## Security Constraints

- The gateway must enforce TLS 1.2 or higher for all connections
- CORS headers must be configurable per route
- The gateway must not follow redirects from downstream services
- All downstream connections must use mutual TLS in production
