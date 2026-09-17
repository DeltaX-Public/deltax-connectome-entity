# Building the data

The raw inputs are about 10 GB of Janelia tables and skeletons. The browser loads 27 MB.
Everything in between is a script, and each one is deterministic.

```sh
uv venv .venv && uv pip install --python .venv/bin/python \
  pyarrow pandas numpy scipy mujoco trimesh fast-simplification cma h5py

.venv/bin/python scripts/prep_graph.py 3        # neurons.bin, graph_w3.bin, meta.json: flat connectome tables
node --max-old-space-size=16000 scripts/prep_skel_tree.mjs   # skeletons.flys: 5.5 GB of skeletons to 12 MB
.venv/bin/python scripts/prep_body.py 0.25      # fly_physics.xml, fly_visual.*: the flybody model
.venv/bin/python scripts/prep_bodymap.py        # bodymap.json: motor, sensory and eye neuron maps
.venv-flyvis/bin/python ...                     # flyvis export -> public/vision/ (see docs/11-vision.md)
.venv/bin/python scripts/prep_flyvis_map.py     # flyvis node <-> male-CNS neuron map, retinotopy via the connectome
node scripts/pack_data.mjs                      # graph.flyg, neurons.flyn: packed for the browser
```

Then the fits that sit on top of the data:

```sh
node scripts/calib_search.mjs '{"coba":true}'   # brain parameters against the behavioural benchmarks
node scripts/neuromod_calib.mjs 60              # neuromod.json: octopamine and insulin cell thresholds, fed fly
.venv/bin/python scripts/gait_opt2.py 60        # stepping pattern generator, multi-condition CMA-ES
```

Where each raw file comes from and what it contains is in
[connectome data pipeline](../03-data-pipeline.md). How the packing works, and the
somewhat surprising fact that synapse counts are nearly incompressible given the rest
of the graph, is in [data codecs](../22-codecs.md). The calibration targets and the
fitted values are in [calibration](../07-calibration.md).

The structural analysis and the model ensembles behind the textbook have their own
pipeline, listed in [Appendix A of the textbook](../textbook/A-reproduction.md).
