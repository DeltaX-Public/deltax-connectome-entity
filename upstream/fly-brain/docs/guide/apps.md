# The four apps

**`index.html`, the connectome viewer.** Every neuron's 3D skeleton. Pick a cell type,
stimulate it, and watch activity spread through the brain. Details in
[connectome viewer](../04-connectome-viewer.md).

**`structures.html`, the algorithmic structures.** What the wiring computes before any
dynamics are run: the ring attractor and its cosine inhibition kernel, the mushroom
body's expansion coding, the optic lobe's shared convolution kernels, the motif census
with its null model. Each structure comes with a description of the evidence. The
numbers are from [algorithmic structures](../28-algorithmic-structures.md), and the
argument is Chapters 3 and 4 of [the textbook](../textbook/).

**`arena.html`, the embodied arena.** Add flies, male or female. Place sugar, odour,
bitter patches, heat and blocks. Launch a looming threat or fire a fly's takeoff
neurons directly. Change wind and light. Follow a fly and watch its brain in the inset:
per-eye visual columns, and firing rates of the smell, taste, looming, giant-fibre,
walking, steering, grooming, courtship and feeding neurons. Zoom in for the full scan,
setae, eye facets and wing interference. `[` and `]` fold the side panels. Six presets
define the standard assays. Everything about it is in [arena app](../15-arena.md).

**`fly.html`, the 3D fly.** An interactive fly with Blender-subdivided geometry, baked
Cycles lighting, live eye reflections, setae, sex comb, abdominal bands and wing
interference. Male or female, wings folded, spread or flying. The Blender scenes and the
rendering workflow are in [art/fly](../../art/fly/README.md).
