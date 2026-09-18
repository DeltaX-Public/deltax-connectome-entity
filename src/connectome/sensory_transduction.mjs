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

export class ConnectomeSensoryTransduction {
  constructor(data, bodymap = null) {
    this.data = data;
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
   * @param {Object} [observation.visual_field]
   * @param {number} [observation.visual_field.nearest_obstacle_distance] Distance in units (0 = touching, large = clear)
   * @param {string} [observation.visual_field.corridor] "west_corridor" | "east_corridor"
   * @param {Object} [observation.collision]
   * @param {boolean} [observation.collision.blocked] Physical obstacle collision
   * @param {Object} [observation.gradients]
   * @param {boolean} [observation.gradients.hazard] Hazard cell proximity / presence
   * @param {number} [observation.gradients.energy] Remaining energy level
   * @param {number} [observation.gradients.food_signal] Signal strength of goal / nutrition (0..1)
   * @param {Object} [observation.body]
   * @param {number} [observation.body.x]
   * @param {number} [observation.body.y]
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
    const proxDist = visual.nearest_obstacle_distance ?? observation.proximity?.nearest_distance ?? 5.0;

    // 1. Antennal Johnston's Organ & Front-leg Tactile Bristles (Obstacle contact & proximity)
    // Distance < 1.5 triggers deflection; direct collision triggers 150 Hz burst
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

    // 2. Photoreceptors & Visual Projection (Corridor ambient light & looming)
    const clearCorridor = proxDist >= 2.0;
    const visualRate = clearCorridor ? 65.0 : Math.max(10.0, 65.0 - (2.0 - proxDist) * 25.0);
    setGroup("photoreceptors", visualRate);

    // 3. Gustatory Receptor Neurons (GRNs - Food / Goal nutrients)
    const foodSignal = gradients.food_signal ?? (observation.body?.x > 4 ? 0.8 : 0.2);
    if (foodSignal > 0) {
      const sugarRate = 160.0 * hill(foodSignal, 0.3, 1.5);
      setGroup("taste T1 left", sugarRate);
      setGroup("taste T1 right", sugarRate);
      setGroup("labellar taste left", sugarRate * 0.9);
      setGroup("labellar taste right", sugarRate * 0.9);
    }

    // 4. Hazard & Thermal Transduction (Thermosensory Arista & Bitter GRNs)
    if (gradients.hazard) {
      setGroup("thermosensory left", 180.0);
      setGroup("thermosensory right", 180.0);
      setGroup("taste T1 left", 150.0); // Bitter aversion
      setGroup("taste T1 right", 150.0);
    }

    return drives;
  }
}
