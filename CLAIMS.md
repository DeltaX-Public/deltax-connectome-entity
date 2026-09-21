# Claims register

> [!NOTE]
> This is a chronological claims register. Early milestone sections preserve the claim boundary at that time and are not the current project status. Later audited sections and `docs/RESEARCH_PAUSE_SNAPSHOT.md` control where they supersede an earlier entry.

## Historical Milestone 1 adapter baseline

At Milestone 1, the adapter made no consciousness, AGI, or proprietary DeltaX capability claim.

### Known / supported at Milestone 1
- The adapter records environment/sensors, connectome output, behavioral proposals, intervention, and motor layers separately.
- Decision packets carry mode, proposal distribution, intervention, final action, seed, config, checkpoint, and an isolation metric.
- `DeltaXStub` is an interface fixture only; telemetry marks `implementation: stub` and `alwaysDecides: true`.

### Empty / not established at Milestone 1
- No public DeltaX runtime was available in this repository; no real DeltaX math is implemented.
- Milestone 1 made no claim about consciousness, executive intelligence, biological fidelity, or performance.
- At that milestone, neurocontrol perturbation suites, checkpoint restoration, and upstream motor integration remained future work; later sections record their subsequent implementation and audited boundaries.

## Phase 2 and deployment boundary

- **Measured in this repository:** adapter request/decision packets (redacted), explicit executive source status, experimenter inspection summaries, checkpoint/replay bundles, perturbation declarations, event-ledger positions, and differential compare records.
- **Assumed/stubbed:** the deterministic replay substrate and any `DELTAX_EXECUTIVE=stub` decision are development fixtures, not DeltaX intelligence.
- **Canonical authority:** intelligence and governance live in the local DeltaX API outside this repository. With `DELTAX_API_URL` and DELTAX mode, the adapter reports `canonical_api`, logs packets, and fails loudly if the API is unavailable; it does not recreate or claim proprietary math.
- **Experimenter boundary:** neurocontrol perturbations are declarative experimenter operations and never DeltaX entity authority.

## Phase 5 Broken World scaffold

This branch adds a declarative sensory/action map, a minimal rover body, and a logged-state Broken World arena. The arena has corridors, obstacles, a goal region, a controllable door, energy, hazard, and an externally timestamped mutation hook. It emits expectation, observation, contradiction, executive-response, substrate-response, and new-action records without first-person claims.

**Historical Phase 5 status:** SUBSTRATE_ONLY and explicit DELTAX stub paths were runnable headlessly. UPSTREAM remained the fly validation mode. DELTAX without `DELTAX_API_URL` failed loudly; a configured DELTAX run reported transport configuration rather than pretending a remote executive call occurred. MuJoCo, learning, and statistical adaptation were not implemented at that phase.

## Phase 8 claim boundary

The causal-intervention harness demonstrates causal intervention on this implemented computational model only. It does **not** demonstrate, identify, or claim biological memory traces, biological adaptation, or organism-level causality. The stub path reports measurable packet divergence under population silence and recovery after restore; these are computational replay results. DeltaX remains the executive authority and the substrate is limited to proposals recorded before DeltaX.

## Entity Observatory scope (phase 10)

The Entity Observatory is a polished, secondary view over available harness artifacts. It is not a full connectome viewer and does not claim to expose internal DeltaX reasoning. SUBSTRATE values are summaries only. DELTAX values are displayed from ledger fields when available, with `executive_source` explicitly shown as `canonical_api`, `stub`, or `disabled`; stub output is not genuine DeltaX. The experiment controls are an honest local observatory surface and export path; headless harness artifacts and tests remain authoritative.

## Phase II Causal Integrity Pass & Claim Boundaries

1. **Superseded Initial Claims (`superseded_pre_integrity_pass`):**
   Initial reports claiming +100.0% goal completion lift on seeds 200..224 were achieved with post-DeltaX actuator shortcuts (`MODULATE -> forward`, `PERMIT -> forward`, `blocked -> left`). Following rigorous audit, all actuator shortcuts were excised, and initial 100% lift claims are formally designated as `superseded_pre_integrity_pass`.

2. **Strict Causal Sequence:**
   Under the corrected causal architecture, every physical action executed by the body must strictly originate from an explicit substrate candidate present in the pre-evaluation candidate field (`connectome activity -> substrate candidates -> DeltaX governance -> permitted candidate set -> candidate selection -> actuator`).

3. **Candidate Provenance Typing:**
   Every candidate is explicitly typed as `MEASURED_NEURAL` (direct descending neuron readouts), `DERIVED_NEURAL` (antagonistic balance/posture derivation), or `FALLBACK` (`cand_safe_noop`). No candidate may be injected or selected outside this set.

4. **Observed Multi-Synaptic Latency:**
   In the implemented 165,122-neuron connectome-derived `RateNetwork`, sensory signals required 4–5 harness ticks, corresponding to approximately 40–50 one-millisecond integration substeps, to traverse sensory afferents and intermediate interneurons before descending locomotor command neurons (`DNg100/97/p09`) overcame postural balance suppression (`halt`). Within a 12-tick budget, the simulated entity paused before walking forward, reaching $x=7$ or $x=8$ (near goal) before time expired.

5. **Degree-Preserving Circuit Scrambling Control:**
   The `SHUFFLED_CONNECTOME` control preserves exact in-degrees, out-degrees, and weight distributions while swapping 100% of synaptic edges. Because randomized connections bypass multi-layer interneuron delay lines, sensory inputs immediately trigger descending motor neurons from step 1, sprinting forward blindly without biological latency.

## Phase III Long-Horizon Adaptation & Recurrence Claim Boundaries (Audited V2)

1. **Superseded Pre-Audit Claims:**
   Initial reports claiming 100% EXECUTIVE recovery and a 2-hazard / 4-energy memory advantage on seeds 3000..3024 were achieved with harness-side steering overrides on `cand_halt` and coordinate checks at `x=3`. Following an adversarial methodological audit (documented in `docs/PHASE_3_PROTOCOL_DEVIATIONS.md`), these initial results are formally designated as superseded and archived under `artifacts/changed_world/phase3_pre_integrity_audit/`.

2. **Collision Prevention via Safe Halting (Confirmed):**
   Under unassisted causal governance without harness overrides, DeltaX closed-loop governance (`EXECUTIVE`) reliably prevents repeated wall collisions upon unexpected blockage by selecting `cand_halt` (`disposition: PERMIT`), incurring 0.0 ± 0.0 collisions in Trial 2 (compared to 21 collisions in scrambled connectome controls).

3. **Autonomous Bypass Traversal (Not Established):**
   Under unassisted candidate selection without harness steering heuristics, DeltaX candidate evaluation does not autonomously steer the entity through bypass corridors to reach the goal. Across 100 unseen held-out seeds (4000..4099), goal attainment is 0.0% [0.0–3.7%] across all conditions.

4. **Cross-Trial Spatial Foresight (Null Difference):**
   Under strict unassisted evaluation, retained executive state in Trial 2 produces no anticipatory pre-turns or hazard reductions compared to reset executive state (paired hazard diff: 0.0 ± 0.0, Cohen's d: 0.0). Retained memory does not confer 2D grid pathfinding foresight.

5. **Observer Non-Contamination (Verified):**
   `CONTROL` and `OBSERVE` conditions achieve 100.00% action trajectory parity across all 100 held-out evaluation seeds (4000..4099), proving that DeltaX ephemeral observation causes zero physical or neural actuation side-effects.

## Phase IV-C Motor Embodiment Fidelity & Executive Generalization (Held-Out Formal Evidence)

1. **Executive Spatial Generalization (11 / 15 Envs Solved at 100.0%):**
   Across $N = 100$ held-out seeds (`12000..12099`), `DELTAX_EXECUTIVE` achieved a **73.3% generalization rate** (11 of 15 environments solved at $\ge 80\%$, with **100% observed success and 0.0 collisions across all 100 held-out seeds in each of the 11 tested compatible environments**, representing 1,100 / 1,100 episodes per DeltaX variant).

2. **Causal Source of Navigation Failures (`SUBSTRATE_CANDIDATE_ABSENCE`):**
   Across all 400 failed episodes per DeltaX condition (1,200 failed episodes across the three DeltaX variants on `ENV_1B_TRUE_RIGHT_REQUIRED`, `ENV_POLARITY_RIGHT`, `ENV_CHOICE_WITH_REVERSAL`, `ENV_TEMPORAL_NON_MARKOVIAN`), 100.0% were causally caused by **substrate candidate absence**. In every failure case, rightward steering was physically required to reach the goal, but descending neuron telemetry confirms `turn_right` had $0.0\text{ Hz}$ raw activation and $0.000$ strength in the connectome-derived RateNetwork. There were **0 executive selection failures**.

3. **Demonstrated Left/Right Steering Asymmetry in Instantiated Substrate:**
   In the matched geometric reflection pair, DeltaX achieved **100.0% [96.3–100.0%] in `ENV_POLARITY_LEFT`** and **0.0% [0.0–3.7%] in `ENV_POLARITY_RIGHT`**, demonstrating in this instantiated model and benchmark that fixed connectome-derived substrate steering under lateralized obstacle contact possesses an endogenous leftward turning polarity rather than bilateral motor competence.

4. **Wall-Following Heuristic Boundary:**
   In `ENV_CHOICE_WITH_REVERSAL`, which requires alternating turn polarity at sequential obstacles, monotonic wall-following failed (0.0% for DeltaX, 3.0% for Simple Reflex).

5. **State Reset Invariance:**
   `DELTAX_EXECUTIVE` (continuous retained state), `DELTAX_TRIAL_RESET` (inter-trial reset), and `DELTAX_STEP_RESET` (stateless per-step session isolation) produced **bit-exact identical trajectories and action counts** across all 4,500 corresponding DeltaX episodes (1,500 episodes per condition). Cross-trial retained executive state produced zero measurable advantage in this benchmark (paired difference = 0).

6. **Executive Candidate Selection Fidelity:**
   Across all 66,500 executive decision ticks in `DELTAX_EXECUTIVE` (199,500 decision ticks across all three DeltaX variants), candidate-ID matching was **100.00%**, with **0.00%** fallback usage.

7. **Explicit Non-Claims:**
   DeltaX navigation is driven by reactive candidate arbitration and clearance sequencing over a connectome-derived computational substrate, not long-horizon spatial planning, internal cognitive mapping, general bilateral steering, executive memory, learned synaptic plasticity, or living biological equivalence.

---

## Research Lane B: Steering Asymmetry & Anatomical Bottleneck Mapping

1. **Circuit-Level Asymmetry (Empirically Mapped):**
   Tactile steering asymmetry is not an artifact of coordinate systems, sensor transduction, or candidate readout mathematics. Direct 10-phase causal auditing confirmed that `READOUT_C` is mathematically mirror-symmetric (error $= 0.000000$). Divergence originates at $t = 11\text{ ms}$ at the first interneuron hop, where left tactile afferents engage 623 downstream partners vs. 404 on the right (+54.2% fanout asymmetry).
2. **2-Hop Bottleneck Identification:**
   Right mechanosensory drive to `DNa02` is routed through a single ascending intermediate interneuron (`AN03A008`, idx `2937`), whose baseline physiological depolarization is insufficient to cross the threshold of `DNa02`.
3. **Target Manifest Delivery:**
   Delivered frozen synaptic target manifests (`TARGET_A_AFFERENT_ONLY`, `TARGET_B_PROJECTION_ONLY`, `TARGET_C_BALANCED_TWO_STAGE`, `TARGET_D_MATCHED_SHAM`) for Phase IV-D plasticity investigations.
4. **Validation:** Replicated across $N=100$ seeds `16000..16099` and $N=100$ seeds `17000..17099` (100% replication).

---

## Research Lane B: Whole-CNS Latent Motor Repertoire Atlas

1. **Ubiquity of Latent Pathways:**
   Across 180 audited sensory-to-motor pathways, 100% are structurally connected (1–3 hops), but 46.1% (83/180) are dynamically silent under naive rate dynamics, while only 12.2% (22/180) are robustly expressible.
2. **Downstream Viability Confirmed:**
   100% of CandidateBridge-mapped motor programs execute robustly under direct descending neuron activation, establishing that silence is an upstream network recruitment failure rather than an actuator deficiency.
3. **Selective Intermediate Rescue:**
   Targeted physiological stimulation of intermediate interneurons (such as ascending interneuron `AN03A008` for right steering and `DNp70` for escape) causally rescued selected motor recruitment. Uncalibrated visual pathways remain transduction-limited by the absence of motion-detection circuits.
4. **Validation:** Confirmed across $N=100$ bilateral seeds `20200..20299`. Escape replication namespace `20400..20499` remains unconsumed and reserved.

---

## Phase IV-D: Synaptic Plasticity & Learnability Kinetics (DEVELOPMENT ONLY)

1. **Deadlock in Somatic Rate Hebbian Rule (Phase IV-D.1):**
   Classical somatic rate-coincidence Hebbian plasticity evaluated on development seeds `18000..18049` suffered from `ASSOCIATIVE_BOOTSTRAP_DEADLOCK`: silent postsynaptic targets ($r_{\text{post}} = 0.0000\text{ Hz}$) accumulated zero eligibility ($e_{ij} \approx 0$, mean budget $= 0.0000$).
2. **Subthreshold Bootstrap Plasticity (Phase IV-D.2):**
   Replacing somatic rate coincidence with model-local normalized subthreshold dendritic drive $\psi_{\text{post}}$ successfully broke deadlock on development seeds `18100..18149`, recruiting `DNa02` in 8% of seeds with 100% sham pathway specificity and 100% consequence gating ($g_t=0$ produced zero budget).
3. **Bistable Learnability Phenotype (Phase IV-D.3):**
   Across $N=100$ development seeds `18200..18299` evaluated under the 8 frozen conditions `R0..R7` (doses of 10, 30, 60, and 120 cycles), learnability is seed-limited: 96.2% of responders recruit by Cycle 10. Extending dose $12\times$ only recruits 3 additional seeds ($75 \to 78$), while 22% of seeds remain nonresponders. Baseline depolarization relative to threshold (`DNa02_inp_over_theta`) is the primary predictor ($\text{Cohen's } d = 0.8017$).
4. **Frozen 30-Cycle Protocol:**
   Established the recommended protocol (30 cycles, $\eta=0.15$, $\lambda_e=0.05$, $\gamma=0.0005$, Target A, immutable $S_{ij}$) for future held-out confirmation.

---

## Research-Pause Evidence Boundaries & Strict Non-Claims

1. **NO HELD-OUT CONFIRMATION OF PLASTICITY:**
   Phase IV-D held-out seeds `19000..19099` ($N=100$) **remain strictly unconsumed in committed empirical records**. All plasticity findings are provisional development observations.
2. **NO HIGH-LEVEL REASONING OR WORLD MODEL:**
   The system does NOT possess symbolic reasoning, cognitive maps, forward tree search, counterfactual planning, or internal mental simulations.
3. **NO LIVING ORGANISM EQUIVALENCE:**
   The RateNetwork is an abstracted numerical model based on static anatomical wiring; it does not claim biological equivalence to living *Drosophila melanogaster*.
4. **TELEMETRY SCOPE & REPLAY BOUNDARY:**
   Committed artifacts in `artifacts/generalization/` contain complete episode summaries for all 9,000 episodes and 19,305 critical candidate-fork decisions. They do **not** store a 475,000-step per-tick trajectory replay.
5. **RUNTIME AUTHENTICATION DISCLAIMER:**
   The string `runtime_version: "v1.0.0-local"` present in JSON artifact headers was assigned locally by `scripts/run_phase4c_generalization.mjs` and is **not** an externally verified cryptographic runtime attestation. Public tests verify the integration contract, not private runtime reproducibility.
