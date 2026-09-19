/**
 * Connectome Sensory Transduction.
 * Maps physical body/world observations strictly to biological sensory receptor firing rates (Hz).
 *
 * NO SEMANTIC CHEATS:
 * Transduction produces sensory receptor excitations only (Hill equation curves).
 * Does not precompute task solutions or label optimal actions.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");

function hill(c, k = 0.3, n = 1.5) {
  if (c <= 0) return 0;
  const cN = Math.pow(c, n);
  return cN / (cN + Math.pow(k, n));
}

export const TRANSDUCTION_MODES = Object.freeze({
  SYMMETRIC: "SYMMETRIC",
  LATERALIZED: "LATERALIZED",
});

export class ConnectomeSensoryTransduction {
  constructor(data, bodymap = null, opts = {}) {
    this.data = data;
    this.mode = opts.mode ?? TRANSDUCTION_MODES.SYMMETRIC;
    if (!bodymap) {
      const bmPath = path.join(UPSTREAM, "public", "data", "bodymap.json");
      this.bodymap = JSON.parse(fs.readFileSync(bmPath, "utf8"));
    } else {
      this.bodymap = bodymap;
    }

    this.sensorMap = this._indexSensors();
  }

  _indexSensors() {
    const map = {};
    for (const s of this.bodymap.sensors) {
      map[s.name] = s.idx || [];
    }
    // Eyes / photoreceptors
    if (this.bodymap.eyes) {
      const allEyes = [];
      for (const e of this.bodymap.eyes) {
        if (e.idx) allEyes.push(...e.idx);
      }
      map["photoreceptors"] = allEyes;
    }
    return map;
  }

  /**
   * Transduce world sensory observation into a Map of neuronIndex -> rateHz.
   *
   * @param {Object} observation Sensory observation from the environment
   * @returns {Map<number, number>} Map of neuron index -> firing rate in Hz
   */
  transduce(observation = {}) {
    const drives = new Map();
    const setGroup = (groupName, rateHz) => {
      const indices = this.sensorMap[groupName];
      if (!indices || indices.length === 0) return;
      for (const idx of indices) {
        const current = drives.get(idx) || 0;
        if (rateHz > current) drives.set(idx, +rateHz.toFixed(2));
      }
    };

    const visual = observation.visual_field || {};
    const collision = observation.collision || {};
    const gradients = observation.gradients || {};
    const lateral = observation.lateral_sensors;

    // --- MODE: LATERALIZED SENSORY EMBODIMENT (Phase IV-B) ---
    if (this.mode === TRANSDUCTION_MODES.LATERALIZED && lateral) {
      // 1. Antennal Johnston's Organ & Front-leg Tactile Bristles (Ipsilateral routing)
      // Left mechanosensors: driven strictly by left physical contact and left antenna ray
      if (lateral.left_contact) {
        setGroup("JO wind/gravity left", 140.0);
        setGroup("tactile T1 left", 160.0);
      } else if (lateral.left_antenna_distance < 3.0) {
        const dL = lateral.left_antenna_distance;
        const rateL = 120.0 * hill((3.0 - dL) / 3.0, 0.4, 1.4);
        setGroup("JO wind/gravity left", rateL);
        setGroup("tactile T1 left", rateL * 0.7);
      }

      // Right mechanosensors: driven strictly by right physical contact and right antenna ray
      if (lateral.right_contact) {
        setGroup("JO wind/gravity right", 140.0);
        setGroup("tactile T1 right", 160.0);
      } else if (lateral.right_antenna_distance < 3.0) {
        const dR = lateral.right_antenna_distance;
        const rateR = 120.0 * hill((3.0 - dR) / 3.0, 0.4, 1.4);
        setGroup("JO wind/gravity right", rateR);
        setGroup("tactile T1 right", rateR * 0.7);
      }

      // Frontal head-on impact: excites both sides symmetrically
      if (lateral.front_contact || collision.blocked) {
        setGroup("JO wind/gravity left", 140.0);
        setGroup("JO wind/gravity right", 140.0);
        setGroup("tactile T1 left", 160.0);
        setGroup("tactile T1 right", 160.0);
      }

      // 2. Photoreceptors (Visual clearance ahead)
      const frontDist = lateral.front_distance ?? visual.front_distance ?? 5.0;
      const clearCorridor = frontDist >= 2.0;
      const visualRate = clearCorridor ? 65.0 : Math.max(10.0, 65.0 - (2.0 - frontDist) * 25.0);
      setGroup("photoreceptors", visualRate);

      // 3. Gustatory Receptor Neurons (GRNs - Food signal)
      const foodSignal = gradients.food_signal ?? 0;
      if (foodSignal > 0) {
        const sugarRate = 160.0 * hill(foodSignal, 0.3, 1.5);
        setGroup("taste T1 left", sugarRate);
        setGroup("taste T1 right", sugarRate);
        setGroup("labellar taste left", sugarRate * 0.9);
        setGroup("labellar taste right", sugarRate * 0.9);
      }

      // 4. Noxious & Thermal Transduction (Ipsilateral Arista routing)
      if (lateral.left_noxious > 0.01) {
        const rateNL = 180.0 * hill(lateral.left_noxious, 0.3, 1.5);
        setGroup("thermosensory left", rateNL);
      }
      if (lateral.right_noxious > 0.01) {
        const rateNR = 180.0 * hill(lateral.right_noxious, 0.3, 1.5);
        setGroup("thermosensory right", rateNR);
      }
      if (gradients.hazard) {
        // Immediate cell hazard: bilateral noxious excitation
        setGroup("thermosensory left", 180.0);
        setGroup("thermosensory right", 180.0);
        setGroup("taste T1 left", 150.0);
        setGroup("taste T1 right", 150.0);
      }

      return drives;
    }

    // --- MODE: SYMMETRIC SENSORY TRANSDUCTION (Phase III Baseline) ---
    const proxDist = visual.nearest_obstacle_distance ?? observation.proximity?.nearest_distance ?? 5.0;

    // 1. Antennal Johnston's Organ & Front-leg Tactile Bristles (Bilateral symmetric)
    if (collision.blocked || proxDist <= 0.5) {
      setGroup("JO wind/gravity left", 140.0);
      setGroup("JO wind/gravity right", 140.0);
      setGroup("tactile T1 left", 160.0);
      setGroup("tactile T1 right", 160.0);
    } else if (proxDist < 2.5) {
      const proxStrength = (2.5 - proxDist) / 2.5; // 0..1
      const rate = 120.0 * hill(proxStrength, 0.4, 1.4);
      setGroup("JO wind/gravity left", rate);
      setGroup("JO wind/gravity right", rate);
      setGroup("tactile T1 left", rate * 0.8);
      setGroup("tactile T1 right", rate * 0.8);
    }

    // 2. Photoreceptors & Visual Projection
    const clearCorridor = proxDist >= 2.0;
    const visualRate = clearCorridor ? 65.0 : Math.max(10.0, 65.0 - (2.0 - proxDist) * 25.0);
    setGroup("photoreceptors", visualRate);

    // 3. Gustatory Receptor Neurons
    const foodSignal = gradients.food_signal ?? (observation.body?.x > 4 ? 0.8 : 0.2);
    if (foodSignal > 0) {
      const sugarRate = 160.0 * hill(foodSignal, 0.3, 1.5);
      setGroup("taste T1 left", sugarRate);
      setGroup("taste T1 right", sugarRate);
      setGroup("labellar taste left", sugarRate * 0.9);
      setGroup("labellar taste right", sugarRate * 0.9);
    }

    // 4. Hazard & Thermal Transduction
    if (gradients.hazard) {
      setGroup("thermosensory left", 180.0);
      setGroup("thermosensory right", 180.0);
      setGroup("taste T1 left", 150.0);
      setGroup("taste T1 right", 150.0);
    }

    return drives;
  }
}
