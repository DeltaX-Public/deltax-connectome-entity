import fs from 'fs';
import path from 'path';

// Change cwd to upstream/fly-brain
const worktreeRoot = '/Users/dominicknoval/Projects/tmp/deltax-connectome-steering-asymmetry';
const flyBrainPath = path.join(worktreeRoot, 'upstream/fly-brain');
process.chdir(flyBrainPath);

import { loadAll } from '../../upstream/fly-brain/scripts/lib_node.mjs';
import { DN_ROLES } from '../../upstream/fly-brain/src/sim/motor.js';

async function run() {
    const data = loadAll();
    const { N, E, bodyIds, indeg, outdeg, nt, side, indptr, indices, weights, byType } = data;
    
    // nt values: 0=unknown, 1=ACh, 2=GABA, 3=Glu, etc.
    const NT_SIGN = [1, 1, -1, -1, 1, 1, 1, -1];
    
    const steeringTypes = Object.keys(DN_ROLES.turn); // DNa02, DNa01, DNp09
    
    // We will build a single pass to collect incoming edges to our target neurons
    // First, map target neuron indices to their type and side for fast lookup
    const targetNeurons = new Set();
    const typeSideMap = new Map(); // index -> {type, side}
    
    const results = {};
    
    for (const type of steeringTypes) {
        results[type] = {
            1: { sideName: 'Left', count: 0, indices: [], bodyIds: [], inDegList: [], outDegList: [], weightedOut: 0, weightedIn: 0, ntCounts: {}, excitatory: 0, inhibitory: 0, inputSourceSide: {1: 0, 2: 0, 3: 0, 0: 0} },
            2: { sideName: 'Right', count: 0, indices: [], bodyIds: [], inDegList: [], outDegList: [], weightedOut: 0, weightedIn: 0, ntCounts: {}, excitatory: 0, inhibitory: 0, inputSourceSide: {1: 0, 2: 0, 3: 0, 0: 0} }
        };
        
        for (const s of [1, 2]) {
            const arr = byType(type, s) || [];
            results[type][s].count = arr.length;
            results[type][s].indices = Array.from(arr);
            results[type][s].bodyIds = arr.map(i => Number(bodyIds[i])); // bodyIds might be BigInt, ensure standard types if possible, but loadAll usually returns BigInt64Array, so we might need String() for JSON serialization. Let's use String()
            
            for (const i of arr) {
                targetNeurons.add(i);
                typeSideMap.set(i, { type, side: s });
                
                results[type][s].inDegList.push(indeg[i]);
                results[type][s].outDegList.push(outdeg[i]);
                
                // NT composition
                const nType = nt[i] || 0;
                results[type][s].ntCounts[nType] = (results[type][s].ntCounts[nType] || 0) + 1;
                
                const sign = NT_SIGN[nType] || 1;
                if (sign > 0) results[type][s].excitatory++;
                else results[type][s].inhibitory++;
                
                // Weighted outgoing
                let wOut = 0;
                const start = indptr[i];
                const end = indptr[i+1];
                for (let k = start; k < end; k++) {
                    wOut += weights[k];
                }
                results[type][s].weightedOut += wOut;
            }
        }
    }
    
    // Single pass for incoming edges
    for (let j = 0; j < N; j++) {
        const sourceSide = side[j];
        const start = indptr[j];
        const end = indptr[j+1];
        for (let k = start; k < end; k++) {
            const target = indices[k];
            if (targetNeurons.has(target)) {
                const w = weights[k];
                const { type, side: targetSide } = typeSideMap.get(target);
                
                results[type][targetSide].weightedIn += w;
                results[type][targetSide].inputSourceSide[sourceSide] = (results[type][targetSide].inputSourceSide[sourceSide] || 0) + w;
            }
        }
    }
    
    // Compute aggregates and symmetry
    const auditData = {};
    for (const type of steeringTypes) {
        auditData[type] = {
            left: null,
            right: null,
            symmetry: null
        };
        
        const sideData = {};
        for (const s of [1, 2]) {
            const d = results[type][s];
            const sumInDeg = d.inDegList.reduce((a, b) => a + b, 0);
            const sumOutDeg = d.outDegList.reduce((a, b) => a + b, 0);
            
            sideData[s] = {
                neuron_count: d.count,
                indices: d.indices,
                body_ids: d.bodyIds.map(id => id.toString()), // Convert to string for JSON if BigInt
                mean_in_degree: d.count > 0 ? sumInDeg / d.count : 0,
                mean_out_degree: d.count > 0 ? sumOutDeg / d.count : 0,
                total_weighted_incoming: d.weightedIn,
                total_weighted_outgoing: d.weightedOut,
                nt_composition: d.ntCounts,
                excitatory_count: d.excitatory,
                inhibitory_count: d.inhibitory,
                cross_hemisphere_inputs: d.inputSourceSide
            };
        }
        auditData[type].left = sideData[1];
        auditData[type].right = sideData[2];
        
        // Symmetry assessment
        const lCount = sideData[1].neuron_count;
        const rCount = sideData[2].neuron_count;
        const lConn = sideData[1].total_weighted_incoming + sideData[1].total_weighted_outgoing;
        const rConn = sideData[2].total_weighted_incoming + sideData[2].total_weighted_outgoing;
        
        let countDiff = 0;
        if (Math.max(lCount, rCount) > 0) {
            countDiff = Math.abs(lCount - rCount) / Math.max(lCount, rCount);
        }
        
        let connDiff = 0;
        if (Math.max(lConn, rConn) > 0) {
            connDiff = Math.abs(lConn - rConn) / Math.max(lConn, rConn);
        }
        
        let symmetryClass = 'APPROXIMATELY BILATERAL';
        if (countDiff > 0.5 || connDiff > 0.5) {
            symmetryClass = 'STRONGLY ASYMMETRIC';
        } else if (countDiff > 0.2 || connDiff > 0.3) {
            symmetryClass = 'MODERATELY ASYMMETRIC';
        }
        
        auditData[type].symmetry = {
            count_difference_ratio: countDiff,
            connectivity_difference_ratio: connDiff,
            classification: symmetryClass
        };
    }
    
    // Output JSON
    const outputPath = path.join(worktreeRoot, 'artifacts/steering_asymmetry/source_population_audit.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    const outputJSON = {
        _meta: {
            schema: 'steering_asymmetry.source_population_audit.v1',
            timestamp: new Date().toISOString()
        },
        data: auditData
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputJSON, null, 2));
    
    // Console output
    console.log("=== SOURCE POPULATION AUDIT ===");
    for (const type of steeringTypes) {
        console.log(`\nType: ${type} - Symmetry: ${auditData[type].symmetry.classification}`);
        console.log(`  Left : ${auditData[type].left.neuron_count} neurons, In: ${auditData[type].left.total_weighted_incoming.toFixed(1)}, Out: ${auditData[type].left.total_weighted_outgoing.toFixed(1)}`);
        console.log(`  Right: ${auditData[type].right.neuron_count} neurons, In: ${auditData[type].right.total_weighted_incoming.toFixed(1)}, Out: ${auditData[type].right.total_weighted_outgoing.toFixed(1)}`);
        console.log(`  Cross-hemi input (Left) : L=${auditData[type].left.cross_hemisphere_inputs[1].toFixed(1)}, R=${auditData[type].left.cross_hemisphere_inputs[2].toFixed(1)}, Mid=${auditData[type].left.cross_hemisphere_inputs[3].toFixed(1)}`);
        console.log(`  Cross-hemi input (Right): L=${auditData[type].right.cross_hemisphere_inputs[1].toFixed(1)}, R=${auditData[type].right.cross_hemisphere_inputs[2].toFixed(1)}, Mid=${auditData[type].right.cross_hemisphere_inputs[3].toFixed(1)}`);
    }
}

run().catch(console.error);
