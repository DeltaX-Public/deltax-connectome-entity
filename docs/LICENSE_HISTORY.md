# License Cutover Record

**Repository:** `DeltaX-Public/deltax-connectome-entity`<br>
**Effective Date:** September 20, 2026<br>
**Copyright Holder (DeltaX-Owned Material):** Dominick Francisco Noval<br>
**License Cutover Commit:** `a8512b42d18be2200777c62968c799d918c0ea8e`<br>
**Documentation Synchronization Commit:** `bdb148ff544e207ed2034b8d4556b5eea181ed9d`<br>
**Main Merge Commit:** `47255c7fabf943e946a832d492d90b721dea3453` (PR #22)

---

## License Transition Summary

| Attribute | Prior State | Current State (Cutover Forward) |
| :--- | :--- | :--- |
| **Root License** | MIT License | PolyForm Noncommercial License 1.0.0 |
| **SPDX Identifier** | `MIT` | `PolyForm-Noncommercial-1.0.0` |
| **Scope** | DeltaX-owned material | DeltaX-owned material |
| **Permitted Use** | Unrestricted / commercial permitted | Noncommercial research, inspection, modification, reproduction |
| **Commercial Use** | Permitted under MIT | Requires separate commercial license (`hello@deltaxevaluate.com`) |

---

## Historical Version Grants & Non-Retroactivity

Versions of DeltaX-authored code and artifacts distributed in Git commits prior to the dedicated license-cutover commit remain governed by the MIT License under which they were originally distributed.

The rights holder does not attempt or purport to retroactively revoke prior license grants made with earlier distributions. Beginning with the license-cutover commit, all newly published and modified DeltaX-owned material is licensed under PolyForm Noncommercial 1.0.0.

---

## Third-Party & Upstream Exceptions

The transition of the root DeltaX license does **not** alter, replace, or supersede the licensing of third-party or upstream software and datasets incorporated in this repository:
- `upstream/fly-brain/`: Retains its upstream MIT License (Copyright (c) 2026 lulzx).
- Connectome graph dataset: Male CNS v1.0 (Janelia FlyEM / Google Research), CC-BY 4.0.
- Fly body physics model: `flybody` (TuragaLab / Vaxenburg et al. 2024), Apache-2.0.
- Compound eye model: `flyvis` (TuragaLab / Lappalainen et al. 2024), MIT.
- Publication manuscripts (`docs/publication/`): Governed by author copyright and publisher terms, not software licenses.
