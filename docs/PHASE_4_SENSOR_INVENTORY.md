# Phase IV-A: Sensory Surface & Receptor Inventory

**Repository:** `DeltaX-Public/deltax-connectome-entity`  
**Authoritative Baseline:** Post-Audited Phase III V2 (`5e4128d`)  
**Data Sources:** `upstream/fly-brain/public/data/bodymap.json`, `upstream/fly-brain/docs/09-bodymap.md`, `src/connectome/sensory_transduction.mjs`

---

## 1. Executive Summary & Epistemological Boundaries

Before assessing behavioral generation or candidate dynamics, we characterize the exact sensory receptor populations available in the biological connectome substrate.

### Mandatory Declarations:
1. **Absence of Labeled Nociceptors:** The upstream Janelia whole-CNS connectome bodymap contains **no** populations labeled "nociceptor" or "pain". In this research, aversive stimulation is strictly operationalized as **aversive / noxious sensory drive** via high-threshold mechanosensory deflections (tactile bristles, Johnston's organ), extreme thermosensory activation (arista thermal sensors), and bitter gustatory channels. No subjective pain or sentience claims are made.
2. **Current Transduction Asymmetry Deficit:** In `src/connectome/sensory_transduction.mjs`, **100% of sensory drives delivered to the connectome are bilateral and mathematically symmetric**. No lateral gradient or directional disparity has ever been transduced from the Broken World simulation into the connectome.
3. **Total Available Sensory Population:** 7,745 sensory receptor neurons across 151 distinct functional channels, plus 4,107 compound eye photoreceptors (total: 11,852 sensory afferents).

---

## 2. Complete Inventory of Usable Sensory Populations

| Bodymap Population Name | Neuron Count | Side / Laterality | Modality | Currently Used in Transduction? | Current Transduction Function | Current Max Drive | Driving World Variable | Current Laterality | Downstream Behavioral Relevance |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `tactile T1 left` | 151 | Left | Mechanosensation (Foreleg bristle) | **Yes** | Hill / Step | 160.0 Hz | `collision.blocked`, `proxDist` | **Symmetric** | Obstacle tactile feedback, leg flexion, turning away |
| `tactile T1 right` | 115 | Right | Mechanosensation (Foreleg bristle) | **Yes** | Hill / Step | 160.0 Hz | `collision.blocked`, `proxDist` | **Symmetric** | Obstacle tactile feedback, leg flexion, turning away |
| `tactile T2 left` | 378 | Left | Mechanosensation (Midleg bristle) | No | None (0 Hz) | 0.0 Hz | None | None | Midleg coordination, postural correction |
| `tactile T2 right` | 428 | Right | Mechanosensation (Midleg bristle) | No | None (0 Hz) | 0.0 Hz | None | None | Midleg coordination, postural correction |
| `tactile T3 left` | 394 | Left | Mechanosensation (Hindleg bristle) | No | None (0 Hz) | 0.0 Hz | None | None | Hindleg propulsion, backward crawling/kick |
| `tactile T3 right` | 411 | Right | Mechanosensation (Hindleg bristle) | No | None (0 Hz) | 0.0 Hz | None | None | Hindleg propulsion, backward crawling/kick |
| `chordotonal T1 left` | 23 | Left | Proprioception (Foreleg stretch/vibration) | No | None (0 Hz) | 0.0 Hz | None | None | Joint angle, load sensing, resistance reflex |
| `chordotonal T1 right` | 13 | Right | Proprioception (Foreleg stretch/vibration) | No | None (0 Hz) | 0.0 Hz | None | None | Joint angle, load sensing, resistance reflex |
| `chordotonal T2 left/right` | 80 / 83 | Bilateral | Proprioception (Midleg) | No | None (0 Hz) | 0.0 Hz | None | None | Midleg load/stance phase signaling |
| `chordotonal T3 left/right` | 93 / 100 | Bilateral | Proprioception (Hindleg) | No | None (0 Hz) | 0.0 Hz | None | None | Hindleg stance/extension signaling |
| `hair plate T1/T2/T3` | 1–18 | Bilateral | Proprioception (Joint angle limit) | No | None (0 Hz) | 0.0 Hz | None | None | Limit stops, posture maintenance |
| `campaniform T1/T2/T3` | 2 per leg | Bilateral | Cuticular Strain (Bending / compression) | No | None (0 Hz) | 0.0 Hz | None | None | Substrate load, foot contact timing |
| `taste T1 left` | 149 | Left | Gustation (Foreleg sugar + bitter + pheromone) | **Yes** | Hill / Step | 160.0 Hz (sugar), 150.0 Hz (bitter) | `gradients.food_signal`, `hazard` | **Symmetric** | Proboscis extension, food search, bitter aversion |
| `taste T1 right` | 151 | Right | Gustation (Foreleg sugar + bitter + pheromone) | **Yes** | Hill / Step | 160.0 Hz (sugar), 150.0 Hz (bitter) | `gradients.food_signal`, `hazard` | **Symmetric** | Proboscis extension, food search, bitter aversion |
| `taste T2 left/right` | 109 / 117 | Bilateral | Gustation (Midleg) | No | None (0 Hz) | 0.0 Hz | None | None | Secondary food contact |
| `taste T3 left/right` | 124 / 118 | Bilateral | Gustation (Hindleg) | No | None (0 Hz) | 0.0 Hz | None | None | Secondary food contact |
| `labellar taste left` | 112 | Left | Gustation (Proboscis LB1 bitter, LB3 sugar) | **Yes** | Hill (0.9x) | 144.0 Hz | `gradients.food_signal` | **Symmetric** | Feeding ingestion vs regurgitation |
| `labellar taste right` | 111 | Right | Gustation (Proboscis LB1 bitter, LB3 sugar) | **Yes** | Hill (0.9x) | 144.0 Hz | `gradients.food_signal` | **Symmetric** | Feeding ingestion vs regurgitation |
| `pharyngeal taste left/right` | 24 / 24 | Bilateral | Internal Gustation | No | None (0 Hz) | 0.0 Hz | None | None | Swallowing and crop filling control |
| `wing/notum bristles left/right`| 329 / 326 | Bilateral | Mechanosensation (Body surface) | No | None (0 Hz) | 0.0 Hz | None | None | Grooming reflex, collision warning |
| `haltere left/right` | 197 / 199 | Bilateral | Gyroscopic Mechanosensation | No | None (0 Hz) | 0.0 Hz | None | None | Flight stabilization, equilibrium, angular velocity |
| `JO wind/gravity left` | 228 | Left | Johnston's Organ (Antenna deflection) | **Yes** | Hill / Step | 140.0 Hz | `collision.blocked`, `proxDist` | **Symmetric** | Airflow navigation, obstacle avoidance, antennal grooming |
| `JO wind/gravity right` | 247 | Right | Johnston's Organ (Antenna deflection) | **Yes** | Hill / Step | 140.0 Hz | `collision.blocked`, `proxDist` | **Symmetric** | Airflow navigation, obstacle avoidance, antennal grooming |
| `JO auditory left/right` | 62 / 52 | Bilateral | Johnston's Organ (Vibration / courtship song) | No | None (0 Hz) | 0.0 Hz | None | None | Acoustic communication, conspecific detection |
| `thermosensory left` | 12 | Left | Thermosensation (Arista hot/cold receptors) | **Yes** | Step | 180.0 Hz | `gradients.hazard` | **Symmetric** | Thermotaxis, rapid noxious heat avoidance |
| `thermosensory right` | 13 | Right | Thermosensation (Arista hot/cold receptors) | **Yes** | Step | 180.0 Hz | `gradients.hazard` | **Symmetric** | Thermotaxis, rapid noxious heat avoidance |
| `hygrosensory left/right` | 29 / 36 | Bilateral | Hygrosensation (Arista dry/moist receptors) | No | None (0 Hz) | 0.0 Hz | None | None | Hygrotaxis, environmental desiccative avoidance |
| `ORN_* left/right` (53 types) | ~2,500 total | Bilateral | Olfaction (Antennal lobe glomeruli) | No | None (0 Hz) | 0.0 Hz | None | None | Chemotaxis, food seeking (DM1/DM2), alarm pheromones (VA1d), aversive odors (DA2/geosmin, V/CO2) |
| `photoreceptors` (Left Eye) | ~2,050 | Left | Vision (Retina R1–R8 ommatidia) | **Yes** (Pooled) | Linear / Dimming | 65.0 Hz | `visual_field.nearest_obstacle_distance` | **Symmetric** | Optomotor steering, visual looming escape |
| `photoreceptors` (Right Eye) | ~2,057 | Right | Vision (Retina R1–R8 ommatidia) | **Yes** (Pooled) | Linear / Dimming | 65.0 Hz | `visual_field.nearest_obstacle_distance` | **Symmetric** | Optomotor steering, visual looming escape |

---

## 3. Key Observations & Diagnostic Findings

1. **Severe Sensory Under-Utilization:**
   Of the 151 sensory channels provided by the biological bodymap, the current runtime utilizes only **5 channels** (tactile T1, taste T1, labellar taste, JO wind/gravity, thermosensory), plus pooled visual photoreceptors.
   - High-density mechanosensory channels (`tactile T2`, `tactile T3`, `wing/notum bristles`, `chordotonal`) are completely unexcited ($0$ Hz).
   - All 53 olfactory channels (`ORN_*`) are completely unexcited ($0$ Hz).

2. **The Rotational Symmetry Flaw:**
   When the rover in Phase III approaches the central barrier at $(4, 3)$:
   - `JO wind/gravity left` = $140.0$ Hz, `JO wind/gravity right` = $140.0$ Hz
   - `tactile T1 left` = $160.0$ Hz, `tactile T1 right` = $160.0$ Hz
   - `thermosensory left` = $180.0$ Hz, `thermosensory right` = $180.0$ Hz
   - `taste T1 left` = $150.0$ Hz, `taste T1 right` = $150.0$ Hz
   - `photoreceptors` = $10.0$ Hz (uniformly across both left and right eyes)

   Because the input vectors to the left and right hemispheres of the brain are mathematically identical ($\vec{S}_L = \vec{S}_R$), any asymmetry in downstream descending neuron activity could only arise from slight asymmetries in internal connectome wiring. When bilateral aversive drive is high, symmetric inputs produce massive mutual inhibition or bilateral descending co-activation that forces candidate selection into `safe_noop` / `stop` (HALT).

3. **Missing Lateralized Transduction Channels:**
   The fly brain contains separate left and right eyes, antennae, and legs specifically to compute lateral sensory differentials ($\Delta S = S_L - S_R$). The current transduction code flattens all spatial gradients into bilateral scalar bursts.
