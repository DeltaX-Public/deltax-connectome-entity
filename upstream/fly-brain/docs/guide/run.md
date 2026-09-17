# Run it

```sh
npm install
npm run dev            # http://localhost:5173/arena.html
```

The dev server sets the cross-origin isolation headers in `vite.config.js`, because the
brain lives in shared WebAssembly memory and browsers only allow that on isolated pages.
If you serve the built site yourself, you need to send the same headers.

The browser loads packed versions of the connectome, the skeletons and the neuron
table, 27 MB in total, from `public/`. Those files are produced by the scripts in
[building the data](pipeline.md). You do not need to rebuild them to run the apps; they
are committed. How they are packed, and what the packing revealed about the graph, is in
[data codecs](../22-codecs.md).

Expect about 0.2 times real time per fly with vision on a recent laptop, and five flies
at once on a 12-core machine. The arena picks WebGPU when the browser has it and falls
back to WebAssembly. `?gpu=0` on the arena URL forces WebAssembly. Where the time goes is
in [performance](../18-performance.md).
