import * as THREE from 'three';

// Low/medium articulated bodies share a draw per material, across the whole population.
// Macro surfaces and hairs keep their original geometry. No rig or physics is flattened.
export class ArenaBatches {
  constructor(scene, appearance, capacity) {
    this.scene = scene; this.capacity = capacity; this.groups = new Map(); this.dirty = false;
    const variants = [appearance.instantiate('m'), appearance.instantiate('f')];
    for (const fly of variants) for (const mesh of fly.meshes) {
      const key = mesh.material.uuid;
      if (!this.groups.has(key)) this.groups.set(key, {material:mesh.material, geometries:new Set(), parts:new Set(), sources:[], ids:new Map()});
      const group = this.groups.get(key);
      group.parts.add(mesh.name); group.geometries.add(mesh.userData.low); group.geometries.add(mesh.userData.medium);
      group.castShadow = mesh.castShadow; group.receiveShadow = mesh.receiveShadow; group.renderOrder = mesh.renderOrder;
    }
    for (const group of this.groups.values()) {
      const geometries = [...group.geometries];
      const mesh = new THREE.BatchedMesh(capacity*group.parts.size,
        geometries.reduce((n,g)=>n+g.attributes.position.count,0), geometries.reduce((n,g)=>n+g.index.count,0),group.material);
      mesh.castShadow=group.castShadow; mesh.receiveShadow=group.receiveShadow; mesh.renderOrder=group.renderOrder;
      mesh.frustumCulled=false; mesh.matrixAutoUpdate=false; mesh.visible=false;
      mesh.sortObjects=group.material.transparent; mesh.name='arena-body-batch';
      for(const geometry of geometries) group.ids.set(geometry,mesh.addGeometry(geometry));
      group.mesh=mesh; scene.add(mesh);
    }
    this.stats={groups:this.groups.size,instances:0,visible:0};
  }

  add(fly) {
    fly.batchEntries=fly.meshes.map(source=>{
      const group=this.groups.get(source.material.uuid), id=group.mesh.addInstance(group.ids.get(source.userData.low));
      group.mesh.setVisibleAt(id,false);
      const entry={source,group,id,geometry:null,visible:false}; group.sources.push(entry); return entry;
    });
    this.stats.instances+=fly.meshes.length;
  }

  update(fly, poseChanged, detailChanged) {
    const batched=fly.getDetail()<2;
    for (const e of fly.batchEntries) {
      const {source,group,id}=e, visible=!!fly.last && batched && source.parent.visible;
      source.visible=!batched;
      if (e.visible!==visible) { group.mesh.setVisibleAt(id,visible); e.visible=visible; this.dirty=true; }
      if (visible && e.geometry!==source.geometry) {
        group.mesh.setGeometryIdAt(id,group.ids.get(source.geometry)); e.geometry=source.geometry;
      }
      // MuJoCo sends world-space body matrices. Meshes have identity local transforms.
      if (visible && (poseChanged || detailChanged || fly.batchPose!==fly.last)) group.mesh.setMatrixAt(id,source.parent.matrix);
    }
    fly.batchPose=fly.last;
  }

  finish() {
    if (!this.dirty) return;
    let visible=0;
    for(const group of this.groups.values()) {
      const count=group.sources.reduce((n,e)=>n+Number(e.visible),0); visible+=count; group.mesh.visible=count>0;
    }
    this.stats.visible=visible; this.dirty=false;
  }
}
