# What happens every simulated millisecond

Each fly runs in its own Web Worker with its own MuJoCo world and a slot in the shared
brain memory. Other flies appear in each world as proxies that collide, are seen and
carry pheromone. Per millisecond, per fly:

**1. Senses** (`src/sim/senses.js`, `src/sim/vision.js`). Taste from the labellum, the
taste pegs and each leg. Odour plumes per antenna, driving glomerulus-specific receptor
neurons with a divisive gain control standing in for GABA_B presynaptic inhibition. Every
other fly carries a short-range cVA-like pheromone plume. Phasic tarsal touch, leg
proprioceptors, body bristles, halteres, antennal wind, heat. Vision is 2 × 721 rays
through the flyvis optic-lobe model at 50 Hz, driving the matching 62,000 optic-lobe
neurons. Rates go in as Poisson spike trains. See [senses](../10-senses.md) and
[vision](../11-vision.md).

**2. Brain** (`src/wasm/lif.c`, or `src/lifgpu.js` on WebGPU). Two 0.5 ms steps of the
conductance-based LIF network over 10.5 million connections. The model and its
physiological additions are in [brain model](../05-brain-model.md), the kernels in
[WebAssembly](../06-wasm-kernel.md) and [WebGPU](../27-webgpu.md).

**3. Motor** (`src/sim/motor.js`). Firing rates of identified descending neurons set
walking, turning and backing through a stepping pattern generator, plus head grooming
and the escape jump from the giant fibre and the looming takeoff neurons. The proboscis
and antennae are driven by their own motor neurons. An experimental full-connectome
mode drives every leg muscle from its motor neurons through the raw nerve-cord wiring;
the fly cannot stand in that mode, which is the honest result. See
[motor output](../12-motor.md), [gait](../13-gait.md) and [reflexes](../14-reflexes.md).

**4. Physics** (`src/sim/world.js`). The flybody fly with its exact inertias and adhesive
claws, five 0.2 ms MuJoCo steps. See [body and physics](../08-body-physics.md).

**5. Endogenous behaviour** (`src/sim/intrinsic.js`). Walk, pause and grooming bouts,
saccades, turning away from obstacles and heat, feeding stops, local search after a
meal, voluntary takeoff. All of it is delivered as synaptic conductance onto descending
neurons, never as actuator commands. See [endogenous behaviour](../23-behaviour.md).

**Neuromodulation** (`src/sim/neuromod.js`). Hunger sets AKH and insulin, which drive
the octopaminergic neurons. Their release lowers their targets' thresholds and sets the
arousal the bout rules read. Walking drives the optic-lobe octopamine cells and raises
visual gain, as in Suver et al. 2012. See [neuromodulation](../25-neuromodulation.md).

**Courtship.** A male detects a nearby fly through LC10 small-object neurons and her
pheromone plume. The connectome's fru/dsx readout, pIP10 and DNp13, gates a court
state: chase on her bearing, sing with the wing facing her. See
[courtship](../26-courtship.md).

**6. Flight** (`src/sim/flight.js`). Takeoff after the jump, then blade-element
aerodynamic forces computed every physics substep on the real 218 Hz wing stroke. Lift
and thrust are not scripted, they fall out of the stroke. Brain steering,
collision-avoidance saccades, landing. See [flight](../24-flight.md).
