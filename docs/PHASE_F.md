# Phase F — Freeq Bot Integration

## Overview

Phase F adds a bot command interface. Bots behave as normal users with
a structured command grammar. Mutating commands require confirmation.

## Bots

- **SpecBot** — `ingest`, `diff`, `clauses`
- **ImplBot** — `plan`, `regen`, `drift`
- **PolicyBot** — `status`, `evidence`, `cascade`

## Confirmation Model

- Mutating commands: bot echoes parsed intent, user replies `ok` or `phx confirm <id>`
- Read-only commands: execute immediately
