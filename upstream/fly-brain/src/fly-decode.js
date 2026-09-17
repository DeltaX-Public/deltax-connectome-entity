// CPU-only asset expansion, shared by the worker and the packing validation.
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { DataUtils } from 'three';

export async function decodeBlenderFly(meta, binary) {
  if (meta.version !== 3) throw new Error(`Unsupported Blender asset version: ${meta.version}`);
  await MeshoptDecoder.ready;
  function decode(stream, count, stride, filter) {
    const data = new Uint8Array(count * stride);
    MeshoptDecoder.decodeVertexBuffer(data, count, stride, new Uint8Array(binary, stream.offset, stream.bytes), filter);
    return data.buffer;
  }
  const parts = meta.parts.map(part => {
    const positionQ = new Uint16Array(decode(part.streams.position, part.vCount, 8));
    const normals = new Int16Array(decode(part.streams.normal, part.vCount, 8, 'OCTAHEDRAL'));
    const lightQ = new Uint16Array(decode(part.streams.light, part.vCount, 8));
    const position = new Float32Array(part.vCount * 3), normal = new Int16Array(part.vCount * 3), aCyclesLight = new Float32Array(part.vCount * 3);
    for (let i=0;i<part.vCount;i++) for (let k=0;k<3;k++) {
      position[3*i+k] = part.bounds.min[k] + positionQ[4*i+k] / 65535 * (part.bounds.max[k]-part.bounds.min[k]);
      normal[3*i+k] = normals[4*i+k];
      aCyclesLight[3*i+k] = (lightQ[4*i+k] / 4095) ** 2 * part.lightMax[k];
    }
    const index = new Uint32Array(part.iCount), stream = part.streams.index;
    MeshoptDecoder.decodeIndexBuffer(new Uint8Array(index.buffer), part.iCount, 4, new Uint8Array(binary, stream.offset, stream.bytes));
    const attributes = { position, normal, aCyclesLight };
    if (/membrane/.test(part.geom)) {
      const uv = new Float32Array(part.vCount * 2), {min,max} = part.bounds;
      for(let i=0;i<part.vCount;i++) { uv[2*i]=(position[3*i]-min[0])/(max[0]-min[0]); uv[2*i+1]=(position[3*i+1]-min[1])/(max[1]-min[1]); }
      attributes.uv = uv;
    }
    if (part.geom === 'head_red') {
      // The same eye centroid fit, without allocating a Vector3 for every lens vertex.
      const center = [[0,0,0],[0,0,0]], count = [0,0], smooth = new Float32Array(position.length);
      for(let i=0;i<part.vCount;i++) { const side=position[3*i]>0?1:0;count[side]++;for(let k=0;k<3;k++)center[side][k]+=position[3*i+k]; }
      for(let s=0;s<2;s++) for(let k=0;k<3;k++)center[s][k]/=count[s];
      for(let i=0;i<part.vCount;i++) {
        const c=center[position[3*i]>0?1:0], x=position[3*i]-c[0], y=position[3*i+1]-c[1], z=position[3*i+2]-c[2];
        const length=Math.sqrt(x*x+y*y+z*z)||1;
        smooth[3*i]=x/length;smooth[3*i+1]=y/length;smooth[3*i+2]=z/length;
      }
      attributes.aSmooth = smooth;
    }
    // Bounds are also computed off the main thread, once, for culling and body framing.
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<position.length;i+=3) for(let k=0;k<3;k++){min[k]=Math.min(min[k],position[i+k]);max[k]=Math.max(max[k],position[i+k]);}
    const center=min.map((v,k)=>(v+max[k])*.5);let radiusSq=0;
    for(let i=0;i<position.length;i+=3) radiusSq=Math.max(radiusSq,(position[i]-center[0])**2+(position[i+1]-center[1])**2+(position[i+2]-center[2])**2);
    return { geom:part.geom, attributes, index, bounds:{min,max,center,radius:Math.sqrt(radiusSq)} };
  });
  const rows=[0,1,2,4,5,6,8,9,10,12,13,14];
  const hairs=meta.hairs.map(hair=>{
    const packed=new Uint16Array(decode(hair.stream,hair.count,8)), light=new Float32Array(hair.count*3);
    for(let i=0;i<hair.count;i++) for(let k=0;k<3;k++)light[i*3+k]=DataUtils.fromHalfFloat(packed[i*4+k]);
    const affine=new Float32Array(decode(hair.instances,hair.count,48)),matrices=new Float32Array(hair.count*16);
    for(let i=0;i<hair.count;i++) { for(let k=0;k<12;k++)matrices[i*16+rows[k]]=affine[i*12+k];matrices[i*16+15]=1; }
    return {...hair,light,matrices};
  });
  return {parts,hairs};
}
