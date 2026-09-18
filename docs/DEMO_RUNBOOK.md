# Demo runbook

Shortest launch-day path from the repository root. The demo is an auditable
scaffold: it records packets and metadata; it does not claim learned or
biological behavior.

## 1. Start the local DeltaX API

Start the local canonical DeltaX API using the command and placeholder port
provided by that service. No credentials or secrets belong in this repository.
For the examples below, use `<port>` as that service's port:

```sh
DELTAX_API_URL=http://127.0.0.1:<port>
```

Keep the API process running in one terminal. The canonical adapter requires
`DELTAX_API_URL`; it does not silently fall back to the stub when DELTAX mode
is selected.

## 2. Run headless in DELTAX mode

From the repository root, run the Broken World headless smoke through the
canonical transport:

```sh
DELTAX_API_URL=http://127.0.0.1:<port> node scripts/experiment.mjs --mode=DELTAX
```

Run the checked-in causal intervention harness as well:

```sh
npm run demo:causal
```

The causal harness is an explicit, deterministic stub and is useful for CI
bookkeeping; it is not a claim that the stub performed a remote causal call.

For an offline run, use the explicit stub path rather than omitting the API
URL:

```sh
node scripts/experiment.mjs --mode=DELTAX --stub
npm run demo:causal
```

## 3. Open the Entity Observatory

Serve the repository root and open `entity.html`:

```sh
python3 -m http.server 4173
# open http://127.0.0.1:4173/entity.html
```

In Codespaces, forward port 4173 and open the forwarded `entity.html` URL.
The Observatory reads the latest checked-in intervention artifact when one is
available and otherwise shows an explicit empty state.

## 4. Export and artifact locations

The Observatory's **Export JSON** action downloads the displayed run as a
JSON file. Headless runs write artifacts under:

- `artifacts/interventions/` — causal intervention differentials
- `artifacts/checkpoints/` — checkpoint bundles

These are the files to attach or archive for a launch-day run. Do not commit
secrets, API responses containing credentials, or transient logs.

## What fails loud

- DELTAX mode without `DELTAX_API_URL` exits with an error instead of using a
  stub.
- A configured but unreachable API fails the canonical request; it does not
  invent executive state or claim a successful remote run.
- The offline path is only the explicit `--stub` path (and the deterministic
  causal harness above). Keep that distinction in the exported metadata.
