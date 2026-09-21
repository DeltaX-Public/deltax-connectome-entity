# Owner click-ops for public circulation

These steps are for Dominick Noval after the public-front-door pull request is reviewed and squash-merged. They do not authorize anyone else to publish, merge, tag, change organization visibility, or enable hosting.

## 1. Confirm the merge state

1. Confirm the pull request CI is green and the squash merge is on `main`.
2. On the merged commit, run or confirm `npm run verify:pause` passes.
3. Confirm the release diff contains no changes under the 19 primary evidence paths in `docs/RELEASE_EVIDENCE_MANIFEST.md`.

## 2. Repository About panel

In the repository sidebar, choose **Edit repository details** and set:

- **Description:** `Frozen evaluation of candidate-constrained DeltaX governance over a connectome-derived rate model.`
- **Website:** `https://deltaxevaluate.com`

The website is product information. Do not label it as this repository's runtime or hosted demo.

## 3. Social preview

In **Settings → General → Social preview**, upload only a verified still captured from the real Observatory according to `docs/circulation/ASSET_BRIEF.md`. Do not upload a generated mock, and do not add a README image link until the asset exists in the repository.

## 4. Release tag

After merge, create a release that targets the squash-merge commit on `main`:

- **Tag:** `research-pause-2026-09-21`
- **Title:** `Research pause evidence snapshot — 2026-09-21`
- **Body:**

  ```text
  Frozen public snapshot of the active research pause.

  Evidence manifest: https://github.com/DeltaX-Public/deltax-connectome-entity/blob/main/docs/RELEASE_EVIDENCE_MANIFEST.md
  Pause snapshot: https://github.com/DeltaX-Public/deltax-connectome-entity/blob/main/docs/RESEARCH_PAUSE_SNAPSHOT.md

  This release adds public front-door and circulation documentation only. It does not add new experiments, alter primary evidence artifacts, unseal seeds 19000..19099, or reproduce the private DeltaX runtime.

  DeltaX-owned material is licensed under PolyForm Noncommercial 1.0.0. Upstream code and third-party datasets retain their own terms.
  ```

Do not describe this tag as a new scientific version.

## 5. GitHub Pages — optional and not yet authorized

Pages is currently outside this pull request. Leave it disabled unless Dominick Noval explicitly authorizes hosting the existing `entity.html` surface. If authorized later, use a separate reviewed change or the minimal repository Pages setting, then verify that the deployed page loads the committed playback, keeps the source badge visible, links back to `CLAIMS.md` and `LIMITATIONS.md`, and does not imply that the private runtime is hosted.

Do not use `deltaxevaluate.com` as the Pages URL or describe that product site as the repository demo.

## 6. Organization visibility

The organization currently presents no public-member context. If desired, Dominick Noval can make only his own organization membership public from the GitHub organization membership settings. Do not invent a lab, institution, collaborator, or reviewer; repository review remains governed by `.github/CODEOWNERS`.

## 7. Explicitly deferred repository decisions

- **`package.json` `"private": true`:** keep it unless the owner separately authorizes npm publication. It prevents accidental package publication and does not make the GitHub repository private.
- **CI badge:** not added because it was not owner-authorized. If later authorized, point it only to the existing `Public Integrity CI` workflow.
- **Clone weight:** approximately 174 MB. Do not delete or rewrite evidence in this work package. Handle distribution size in a separate infrastructure proposal that preserves artifact provenance and hashes.
- **Social posting:** copy is prepared in this folder; only the owner publishes it.
