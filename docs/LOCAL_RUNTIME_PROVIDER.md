# Local runtime provider boundary

This repository can evaluate executive packets through a **shared private local DeltaX runtime** without importing or vendoring that runtime.

## Modes

| `DELTAX_EXECUTIVE` | `executive_source` | Requirements |
|---|---|---|
| `stub` | `stub` | none |
| `DELTAX` / `DELTAX_DEBUG` | `canonical_api` | `DELTAX_API_URL` |
| `local_runtime` | `local_runtime` | `DELTAX_LOCAL_RUNTIME_CMD` |
| `disabled` | `disabled` | none |

`local_runtime` is **not** labeled `canonical_api`. It is a distinct provenance for the private local provider process.

## Transport

- Protocol: stdin/stdout **JSONL** (one request object per line, one decision object per line)
- No HTTP required for this mode
- Private runtime implementation stays outside this repository

## Request (public contract)

Send a flat executive packet compatible with `DELTAX_INTERFACE.md`, including:

- `objective`
- `environment_state_summary`
- `substrate_state_summary`
- `candidate_actions[]` — each **must** include `substrate_candidate_id`
- optional contradictions / constraints / identity / continuity

Missing `substrate_candidate_id` fails closed (adapter throws or provider vetoes).

## Response

Public decision fields only (`disposition`, permitted/vetoed/modulation/unresolved, provenance). Provenance includes `executive_source: local_runtime`.

## Failure policy

If `DELTAX_EXECUTIVE=local_runtime` and the provider command is missing or the process fails, the adapter **throws**. It never silently substitutes stub output.

## Shared installation

Both this project and `deltax-pumpbrains-chamber` should point `DELTAX_LOCAL_RUNTIME_CMD` at the **same** private local installation on the machine.

See also: https://github.com/DeltaX-Public/deltax-pumpbrains-chamber
