import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  generateCandidates_A_Current,
  generateCandidates_B_Upstream,
  generateCandidates_C_IndependentAxes
} from '../../src/connectome/candidate_readouts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = '../../artifacts/steering_asymmetry/dn_readout_symmetry.json';
const outputPath = path.resolve(__dirname, OUTPUT_FILE);

const INTENSITIES = [0.1, 0.25, 0.5, 1.0, 2.0, 5.0];

const READOUTS = {
  'A_Current': generateCandidates_A_Current,
  'B_Upstream': generateCandidates_B_Upstream,
  'C_IndependentAxes': generateCandidates_C_IndependentAxes
};

function createState(intensityLeft, intensityRight) {
  return {
    forward: { weighted_mean: 0, neurons: [], types: [] },
    backward: { weighted_mean: 0, neurons: [], types: [] },
    turn_left: { 
      weighted_mean: intensityLeft, 
      mean_rate: intensityLeft, 
      max_rate: intensityLeft, 
      neurons: [{index: 0, type: 'DNa02', weight: 1.0, rate_hz: intensityLeft, silenced: false}], 
      types: ['DNa02'] 
    },
    turn_right: { 
      weighted_mean: intensityRight, 
      mean_rate: intensityRight, 
      max_rate: intensityRight, 
      neurons: [{index: 1, type: 'DNa02', weight: 1.0, rate_hz: intensityRight, silenced: false}], 
      types: ['DNa02'] 
    },
    escape: { mean_rate: 0, neurons: [], types: [] },
    takeoff: { weighted_mean: 0, neurons: [], types: [] },
    groom: { weighted_mean: 0, neurons: [], types: [] }
  };
}

const results = [];
console.log('Mode              | Intensity | Left_A | Right_A | Left_B | Right_B | Sym_Error | Symmetric?');
console.log('------------------------------------------------------------------------------------------');

for (const [modeName, func] of Object.entries(READOUTS)) {
  for (const X of INTENSITIES) {
    const STATE_A = createState(X, 0);
    const STATE_B = createState(0, X);

    const candsA = func(STATE_A);
    const candsB = func(STATE_B);

    const leftA = candsA.find(c => (c.action_class || c.action) === 'turn_left')?.activation_strength || 0;
    const rightA = candsA.find(c => (c.action_class || c.action) === 'turn_right')?.activation_strength || 0;

    const leftB = candsB.find(c => (c.action_class || c.action) === 'turn_left')?.activation_strength || 0;
    const rightB = candsB.find(c => (c.action_class || c.action) === 'turn_right')?.activation_strength || 0;

    const symError = Math.abs(leftA - rightB) + Math.abs(rightA - leftB);
    const isSymmetric = symError < 0.001;

    results.push({
      mode: modeName,
      intensity: X,
      state_A: { turn_left: leftA, turn_right: rightA },
      state_B: { turn_left: leftB, turn_right: rightB },
      symmetry_error: symError,
      is_mirror_symmetric: isSymmetric
    });

    console.log(`${modeName.padEnd(17)} | ${X.toFixed(2).padStart(9)} | ${leftA.toFixed(4).padStart(6)} | ${rightA.toFixed(4).padStart(7)} | ${leftB.toFixed(4).padStart(6)} | ${rightB.toFixed(4).padStart(7)} | ${symError.toFixed(6).padStart(9)} | ${isSymmetric}`);
  }
}

const outputData = {
  _schema: 'steering_asymmetry.dn_readout_symmetry.v1',
  results: results
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
console.log(`\nSaved results to ${outputPath}`);
