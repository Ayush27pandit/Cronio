# Cronio

> **The execution layer for time.**
>
> A distributed job scheduling and execution platform built for reliability, observability, and scale.

[![Go Version](https://img.shields.io/badge/go-1.22+-00ADD8?logo=go)](https://go.dev)
[![PostgreSQL](https://img.shields.io/badge/postgres-15+-4169E1?logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## What is Cronio?

Cronio is a **distributed job execution platform** whose first trigger happens to be cron. It replaces fragile crontabs, over-complex workflow engines, and cloud-specific schedulers with a single, reliable system that:

- **Schedules** jobs reliably across any timezone
- **Executes** them at scale with automatic retries and failure recovery
- **Observes** everything so you know exactly what happened and why

Whether you need a daily report, a nightly data sync, or a health check every 15 seconds — if it has a schedule, it belongs in Cronio.

---

## Why Cronio?

| Problem | How Cronio Solves It |
|---------|---------------------|
| Cron jobs silently fail when a server goes down | Distributed scheduler fleet with automatic failover |
| No visibility into whether a job ran or why it failed | Full execution history, request/response logs, and real-time status |
| Retrying failed jobs requires manual intervention | Configurable retry policies with exponential backoff |
| One slow job blocks everything else | Per-job concurrency limits and independent worker scaling |
| Building scheduling into every app is repetitive | Clean API and SDKs — integrate in an afternoon |

---

## Architecture

Cronio separates concerns into two planes:

```
┌─────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  API        │  │  Scheduler  │  │  Dispatcher         │  │
│  │  (Go)       │  │  Fleet (Go) │  │  (Go, optional)     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         └─────────────────┼────────────────────┘             │
│                           ▼                                  │
│                  ┌─────────────────┐                         │
│                  │   PostgreSQL    │                         │
│                  │  Source of Truth│                         │
│                  └─────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA PLANE                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Queue      │  │  Worker     │  │  Job Targets        │  │
│  │  (Postgres  │  │  Fleet (Go) │  │  HTTP / SDK Workers │  │
│  │   or NATS)  │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key principles:**
- **PostgreSQL is the source of truth.** The queue transports work; the database owns state.
- **Schedulers don't execute.** They find due jobs and create executions. Workers do the actual work.
- **At-least-once execution.** We guarantee delivery and provide idempotency keys. Your job target handles deduplication.
- **Independent scaling.** API, scheduler, and worker fleets scale separately based on their own load.

---
