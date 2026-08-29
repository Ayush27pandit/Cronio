# Cronio

Execution layer for time. Cronio schedules and runs time-triggered work, then shows what happened.

## Language

**Tenant**: an isolation boundary that owns jobs and sees only its own executions.
_Avoid_: account, namespace, organization, customer

**Job**: the recurring definition of what to run, when, and where.
_Avoid_: task, cron, workflow, DAG

**Schedule**: when a Job fires. One of Cron, Interval, or Once.
_Avoid_: recurrence, trigger, rule

**Cron Schedule**: a 5-field expression plus timezone that defines repeated calendar times. Evaluated in its timezone, stored as UTC.
_Avoid_: cron string, CRON

**Interval Schedule**: a duration that defines repetition relative to the previous scheduled time.
_Avoid_: every, period

**Once Schedule**: a single absolute timestamp after which the Job disables itself.
_Avoid_: one-shot, run-once, ad-hoc

**Target**: where a Job's work runs. For MVP, an HTTP endpoint with URL, method, headers, and timeout.
_Avoid_: endpoint, webhook, destination, worker (MVP has no SDK worker)

**Execution**: one concrete firing of a Job, tracked from READY through terminal state.
_Avoid_: run, instance, invocation

**Attempt**: one try within an Execution. Retries create a new Attempt for the same Execution.
_Avoid_: retry, try, trial

**Lease**: a short-lived claim (claim_token + lease_until) that lets a Worker hold a CLAIMED or RUNNING Execution. Expires if the Worker dies.
_Avoid_: lock, reservation, heartbeat (heartbeat renews the lease)

**Retry Policy**: how many Attempts an Execution gets and how long to wait between them. Exponential backoff with max delay.
_Avoid_: retry config, backoff policy

**Concurrency Policy**: how many Executions of the same Job may be CLAIMED or RUNNING at once and what to do with extras.
_Avoid_: parallelism, throttle

**Misfire Policy**: what to do when a Job's due time passes while the scheduler was down or at capacity. For MVP, fire_once.
_Avoid_: catch-up, backlog policy
