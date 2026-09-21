# Entity Observatory circulation asset brief

**Status:** Capture specification only. No image or animation is represented as complete by this file.

Use the real `entity.html` surface and the already-committed `artifacts/observatory/latest-playback.json`. Do not regenerate the playback, alter artifact bytes, attach the private runtime, or synthesize UI content for the capture.

## Still image

- **Proposed file:** `docs/circulation/assets/entity-observatory-step-3.png`
- **Viewport:** 1440 × 900 CSS pixels at 1× device scale.
- **Moment:** Recorded frame `step: 3`, `note: executive_decision`, with playback paused.
- **Required visible regions:** the complete rover canvas; the `SOURCE: local_runtime` badge and its source note; the candidate list showing `forward through passage` and `stop at door`; the recorded `PERMIT` output.
- **Required labels:** `RESEARCH PAUSE`, `RECORDED HARNESS`, and `SUMMARY ONLY` must remain visible.
- **Forbidden edits:** no neuron-count headline, no “thinking” label, no implication that `local_runtime` is `canonical_api`, and no replacement of recorded fields with illustrative values.
- **Alt text:** “Entity Observatory paused on a recorded Broken World decision: rover canvas at left, source badge labeled local_runtime, and two substrate candidates listed beside a PERMIT output.”
- **Caption:** “Recorded harness view. The source badge is provenance, not cryptographic attestation; the repository does not include the private DeltaX runtime.”

## GIF

- **Proposed file:** `docs/circulation/assets/entity-observatory-recorded-run.gif`
- **Duration:** 10 seconds, looping once or with a 2-second final hold; target width 1200 pixels.
- **0–2 s:** page loaded and paused; rover west of the closed door; `SOURCE: local_runtime` visible.
- **2–5 s:** start playback; rover advances through recorded frames 0–2.
- **5–8 s:** pause on frame 3 so the open door, both substrate candidates, and recorded `PERMIT` decision can be read.
- **8–10 s:** resume to the goal frame and hold the final rover position.
- **Required crop:** include the rover canvas, executive-source badge, and candidate list throughout. Do not crop the badge out for social ratios.
- **Overlay rule:** no added claims. A small “recorded artifact · research pause” overlay is acceptable if it does not cover source or candidate labels.

## Capture procedure

```bash
python3 -m http.server 4173
# Open http://127.0.0.1:4173/entity.html
```

Capture from a browser that can render the real local page. After capture, compare every visible source, candidate, and decision label against the committed playback JSON. The README preview slot should be added only in the same commit that adds the verified asset; do not merge a broken or placeholder image link.
