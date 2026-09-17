import { decodeBlenderFly } from './fly-decode.js';
self.onmessage = async ({data:{meta,binary}}) => {
  try {
    const prepared = await decodeBlenderFly(meta,binary);
    const transfer = prepared.parts.flatMap(p=>[p.index.buffer,...Object.values(p.attributes).map(a=>a.buffer)])
      .concat(prepared.hairs.flatMap(h=>[h.light.buffer,h.matrices.buffer]));
    self.postMessage({prepared},transfer);
  } catch(error) { self.postMessage({error:error.message}); }
};
