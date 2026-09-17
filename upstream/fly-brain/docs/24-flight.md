# 24. Flight

Files: `src/sim/flight.js`, `src/sim/fly.js`, `src/sim/motor.js`, `src/sim/fly.worker.js`.

## Model

Flight uses a **cycle-averaged aerodynamic motor** driving an articulated MuJoCo body. The actual
FlySuite 218 Hz wing cycle is sampled once to calibrate mean force magnitude at unit amplitude.
A velocity/height controller chooses amplitude and the direction of the mean force, capped at 2.2
body weights. A separate haltere-like attitude controller provides roll, pitch and yaw moments using
the fly's composite inertia. MuJoCo integrates all translation, rotation, leg motion and contacts.

This is an engineered control approximation. The commanded stroke-plane direction and attitude torque
are not derived from individual steering muscles or a resolved unsteady flow solver. The renderer
samples the real wing cycle into two instanced membrane fans; those samples do not reproduce the
controller's amplitude or stroke-plane adjustments exactly. No body trajectory is prescribed.

The calibration uses degree-valued empirical lift/drag fits, converted to radians before JavaScript
trigonometric functions. Drag follows air velocity relative to the wing. See the discussion of these
fits in [Walker and Taylor, 2021](https://doi.org/10.1098/rsif.2021.0103).

The net force acts at the whole fly's center of mass. Its moment is translated to the thorax body's
inertial center of mass before writing MuJoCo's `xfrc_applied`; these centers are different. See
[MuJoCo's force application guidance](https://github.com/google-deepmind/mujoco/discussions/641).
Yaw commands about world vertical are converted into body angular-velocity components before the
attitude feedback is evaluated.

## Sequence

1. **Request / jump.** The intrinsic bout controller or escape pathway can request a jump. The arena's
   takeoff button also queues an explicit request. It remains pending across the 1.5-second simulation
   startup gate, pauses and temporary contact gating. The UI shows when Run is needed. It clears when
   a flight actually starts. This routes through the existing intrinsic drive and voluntary motor gate;
   it is not proof of experimentally validated optogenetic behavior.
2. **Climb.** After the leg push-off, wing support starts and the legs tuck. The climb phase lasts 250 ms
   of simulation time, targeting a height sampled from 0.35–0.75 cm.
3. **Cruise.** The median sampled duration is 1.5 seconds, with lognormal variability. Target airspeed is
   around 9 cm/s, with variability. Wind offsets ground velocity; near-wall/obstacle clearance adds an
   avoidance demand. Steering comes from the simulated brain's motor readout. The body is held roughly
   20 degrees nose-up and banks into turns.
4. **Land.** Landing is deferred above obstacles. Forward speed and descent taper near the floor;
   yaw commands stop, the body levels and legs extend. This avoids pitching into the ground at cruising
   attitude and speed.
5. **Touchdown.** Foot contact or the low-height fallback initiates an 80 ms transfer of weight to the
   legs. Attitude support continues during that transfer. Wing force then stops; a 300 ms stance allows
   walking to resume. The renderer restores the parked wing geometry.

## Why the prior flight failed

The old controller repeatedly evaluated a virtual stroke inside each physics step while the solver's
wing joints stayed parked. Its instantaneous moments, overly aggressive attitude feedback and
incorrect force-application center produced violent tumbling in the flight diagnostic. The empirical
coefficient formulas also passed degree-valued angles to radian trigonometric functions, and drag had
its sign reversed. Fixing those two formulas alone did not give stable takeoff-to-landing behavior.
The former 80 ms UI request could additionally expire during startup, making a click do nothing.

The replacement applies the calibrated cycle mean and removes five extra kinematics traversals per
simulated millisecond. It retains the existing 40 cm/s emergency speed guard; normal regression cases
stay below 8 cm/s and do not depend on that guard. Recovery from arbitrary collisions or extreme gusts
is not established by these tests.

## Verification

```sh
node scripts/check_flight.mjs
node scripts/flight_test.mjs 0.25 3500
node scripts/diag_walk.mjs 6 open /tmp/fly-flight-full.jsonl '{"takeoffAt":2000,"vision":false}'
npm run build
npm run preview -- --port 5176
node scripts/check_arena_flight.mjs --url=http://localhost:5176
node scripts/check_arena_flight.mjs --url=http://localhost:5176 --gpu=0
```

`check_flight.mjs` exercises real MuJoCo motion with fixed steering: straight flight, both turn
directions, wind and a zero-lift ablation. It asserts bounded height and speed, opposite turns,
upright landing, phase transitions and actual foot contact. The ablation falls rather than hovering.
This isolates the motor; it is not a neural-behavior validation.

`check_arena_flight.mjs` clicks the actual button before startup, checks the queued/paused state,
runs the full brain/vision/physics worker, observes flight and wing visibility, and waits for landing.
The six-second WASM embodiment trace with vision disabled separately recorded two takeoffs and one
complete upright landing, followed by another cruise. See [arena performance](arena-performance.md)
for browser measurements and their scope.
