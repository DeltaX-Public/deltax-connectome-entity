# Demo runbook

Shortest launch-day path from the repository root. The demo is an auditable
scaffold: it records packets and metadata; it does not claim learned or
biological behavior.

Primary executive path for a shared private install is **`local_runtime`**
(stdin/stdout JSONL). HTTP `canonical_api` remains available when a local API
shim exists. See [LOCAL_RUNTIME_PROVIDER.md](LOCAL_RUNTIME_PROVIDER.md).

## 1. Point at the shared private local runtime

Both this harness and `deltax-pumpbrains-chamber` should use the **same**
private install on the machine. Export the provider command (never commit a
machine-specific secret path into the repo):

```sh
export DELTAX_EXECUTIVE=local_runtime
export DELTAX_LOCAL_RUNTIME_CMD="/path/to/deltax-python-runtime/.venv/bin/python -m deltax_runtime.provider"
```

`local_runtime` is labeled `executive_source: local_runtime`. It is **not**
`canonical_api`.

## 2. Run the live JSONL smoke

```sh
npm run demo:local-runtime
# or
node scripts/experiment.mjs --mode=local_runtime
```

Expect a decision packet with `executive_source: local_runtime` and a
disposition such as PERMIT / VETO / MODULATE. Missing
`DELTAX_LOCAL_RUNTIME_CMD` fails loudly; there is no silent stub fallback.

## 3. Optional: HTTP canonical_api

If you have a private HTTP shim that wraps the same provider:

```sh
export DELTAX_API_URL=http://127.0.0.1:<port>
node scripts/experiment.mjs --mode=DELTAX
```

DELTAX mode without `DELTAX_API_URL` exits with an error instead of using a
stub.

## 4. Offline / CI bookkeeping

```sh
node scripts/experiment.mjs --mode=DELTAX --stub
npm run demo:causal
```

The causal harness is an explicit deterministic stub for CI; it is not a claim
that a remote or local executive call occurred.

## 5. Open the Entity Observatory

```sh
python3 -m http.server 4173
# open http://127.0.0.1:4173/entity.html
```

The Observatory badge shows `local_runtime`, `canonical_api`, `stub`, or
`disabled` honestly from harness telemetry. Stub output is never labeled as
genuine DeltaX.

## 6. Export and artifact locations

- `artifacts/interventions/` — causal intervention differentials
- `artifacts/checkpoints/` — checkpoint bundles

Do not commit secrets, API responses containing credentials, or transient logs.

## What fails loud

- `local_runtime` without `DELTAX_LOCAL_RUNTIME_CMD`
- DELTAX mode without `DELTAX_API_URL`
- A configured but unreachable provider or API (no invented executive state)
