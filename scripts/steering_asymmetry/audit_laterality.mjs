import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKTREE_ROOT = path.resolve(__dirname, '../../');
const UPSTREAM_DIR = path.join(WORKTREE_ROOT, 'upstream/fly-brain');

// Import loadAll
const loadAllPath = path.join(UPSTREAM_DIR, 'scripts/lib_node.mjs');
const { loadAll } = await import('file://' + loadAllPath);

// Import DN_ROLES
const dnRolesPath = path.join(UPSTREAM_DIR, 'src/sim/motor.js');
const { DN_ROLES } = await import('file://' + dnRolesPath);

// Change cwd and load data
const originalCwd = process.cwd();
process.chdir(UPSTREAM_DIR);
console.log('Loading connectome data...');
const data = loadAll();
process.chdir(originalCwd);
console.log('Data loaded.');

const { side, byType, nt, indeg, outdeg, bodymap, meta } = data;

const report = {
    schema_version: 'steering_asymmetry.laterality_audit.v1',
    side_encoding: {},
    steering_dn: {},
    forward_backward_dn: {},
    sensory_population: {},
    readout_c_symmetry: {},
    index_mapping: {}
};

// A. SIDE ENCODING AUDIT
const sideCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
for (let i = 0; i < side.length; i++) {
    sideCounts[side[i]] = (sideCounts[side[i]] || 0) + 1;
}
report.side_encoding = {
    left_1: sideCounts[1],
    right_2: sideCounts[2],
    midline_3: sideCounts[3],
    unknown_0: sideCounts[0],
    total: side.length
};
console.log('Side Encoding Audit:', report.side_encoding);

// Helper function
function auditDNType(type) {
    const leftIndices = byType(type, 1) || [];
    const rightIndices = byType(type, 2) || [];
    const res = {
        left_count: leftIndices.length,
        right_count: rightIndices.length,
        asymmetry_flag: leftIndices.length !== rightIndices.length,
        left_neurons: leftIndices.map(i => ({ index: i, nt: nt[i], indeg: indeg[i], outdeg: outdeg[i] })),
        right_neurons: rightIndices.map(i => ({ index: i, nt: nt[i], indeg: indeg[i], outdeg: outdeg[i] }))
    };
    return res;
}

// B. STEERING DN POPULATION AUDIT
if (DN_ROLES && DN_ROLES.turn) {
    for (const type of Object.keys(DN_ROLES.turn)) {
        report.steering_dn[type] = auditDNType(type);
        if (report.steering_dn[type].asymmetry_flag) {
            console.log(`[FLAG] Asymmetry in steering DN: ${type} - Left: ${report.steering_dn[type].left_count}, Right: ${report.steering_dn[type].right_count}`);
        }
    }
}

// C. FORWARD/BACKWARD DN AUDIT
if (DN_ROLES && DN_ROLES.forward) {
    for (const type of Object.keys(DN_ROLES.forward)) {
        report.forward_backward_dn[type] = auditDNType(type);
    }
}
if (DN_ROLES && DN_ROLES.backward) {
    for (const type of Object.keys(DN_ROLES.backward)) {
        report.forward_backward_dn[type] = auditDNType(type);
    }
}

// D. SENSORY POPULATION AUDIT
const sensorsList = Array.isArray(bodymap?.sensors)
    ? bodymap.sensors
    : Array.isArray(JSON.parse(fs.readFileSync(path.join(UPSTREAM_DIR, 'public/data/bodymap.json'), 'utf-8')).sensors)
    ? JSON.parse(fs.readFileSync(path.join(UPSTREAM_DIR, 'public/data/bodymap.json'), 'utf-8')).sensors
    : [];

const sensorMap = {};
for (const s of sensorsList) {
    if (s.name) sensorMap[s.name] = s.idx || [];
}

const leftSensors = {};
const rightSensors = {};

for (const name of Object.keys(sensorMap)) {
    if (/\bleft\b/i.test(name)) {
        const pairName = name.replace(/\bleft\b/i, '{SIDE}').trim();
        leftSensors[pairName] = name;
    } else if (/\bright\b/i.test(name)) {
        const pairName = name.replace(/\bright\b/i, '{SIDE}').trim();
        rightSensors[pairName] = name;
    }
}

const allPairs = new Set([...Object.keys(leftSensors), ...Object.keys(rightSensors)]);
for (const pairName of Array.from(allPairs).sort()) {
    const leftKey = leftSensors[pairName];
    const rightKey = rightSensors[pairName];
    const leftIndices = leftKey ? (sensorMap[leftKey] || []) : [];
    const rightIndices = rightKey ? (sensorMap[rightKey] || []) : [];
    const leftCount = leftIndices.length;
    const rightCount = rightIndices.length;
    
    report.sensory_population[pairName] = {
        left_name: leftKey || null,
        right_name: rightKey || null,
        left_count: leftCount,
        right_count: rightCount,
        asymmetry_flag: leftCount !== rightCount,
        count_diff: leftCount - rightCount,
        ratio: rightCount > 0 ? +(leftCount / rightCount).toFixed(3) : null
    };
    
    if (leftCount !== rightCount) {
        console.log(`[FLAG] Sensory asymmetry in ${pairName}: Left (${leftKey}) = ${leftCount}, Right (${rightKey}) = ${rightCount}`);
    }
}


// E. READOUT_C FORMULA SYMMETRY CHECK
function testReadoutC(turnLHz, turnRHz, turnScale = 10.0) {
    const diffL = Math.max(0, turnLHz - turnRHz);
    const diffR = Math.max(0, turnRHz - turnLHz);
    const turnLStrength = 1 - Math.exp(-diffL / turnScale);
    const turnRStrength = 1 - Math.exp(-diffR / turnScale);
    return { turnLStrength, turnRStrength };
}

const test1 = testReadoutC(5, 0);
const test2 = testReadoutC(0, 5);
const test3 = testReadoutC(3, 1);
const test4 = testReadoutC(1, 3);

report.readout_c_symmetry = {
    algebraic_symmetry: "diffL and diffR use max(0, L-R) and max(0, R-L). Exp decays use same scale. Structurally mirror-symmetric.",
    test_5_0: test1,
    test_0_5: test2,
    test_3_1: test3,
    test_1_3: test4,
    symmetric_5: test1.turnLStrength === test2.turnRStrength && test1.turnRStrength === test2.turnLStrength,
    symmetric_3_1: test3.turnLStrength === test4.turnRStrength && test3.turnRStrength === test4.turnLStrength
};

// F. INDEX MAPPING VERIFICATION
function checkDisjoint(type) {
    const left = new Set(byType(type, 1) || []);
    const right = new Set(byType(type, 2) || []);
    let disjoint = true;
    for (const l of left) {
        if (right.has(l)) disjoint = false;
    }
    return disjoint;
}

if (DN_ROLES && DN_ROLES.turn) {
    for (const type of Object.keys(DN_ROLES.turn)) {
        report.index_mapping[type] = {
            is_disjoint: checkDisjoint(type)
        };
    }
}

// Write artifact
const artifactsDir = path.join(WORKTREE_ROOT, 'artifacts/steering_asymmetry');
if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
}
const artifactPath = path.join(artifactsDir, 'laterality_audit.json');
fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));
console.log(`Audit report written to ${artifactPath}`);
