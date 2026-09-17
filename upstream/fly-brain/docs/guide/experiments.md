# Headless experiments

Everything the arena does also runs in Node, without a browser, which is how the model
was calibrated and how every number in the docs was produced.

```sh
node scripts/run_fly.mjs 6 nearodor     # walk toward food and odour
node scripts/run_fly.mjs 3 onfood       # tarsal sugar: stop, extend the proboscis
node scripts/run_fly.mjs 2 threat       # looming object -> giant fibre -> jump -> run
node scripts/calib_eval.mjs "$(cat public/data/brain_params.json)"   # the behavioural benchmark suite
```

The benchmark suite scores a parameter set against published results in 2 to 4 seconds:
sugar and bitter responses of the proboscis motor neuron (Shiu et al. 2024), Kenyon-cell
sparseness (Turner et al. 2008), looming versus self-motion on the takeoff neurons (von
Reyn et al. 2014, Namiki et al. 2018), and leg-muscle activation from BDN2 (Pugliese et
al. 2025). One target, odour specificity in the Kenyon cells, failed every configuration
tried, and that failure is recorded rather than dropped.

Other useful scripts: `behavior_report.mjs` for the closed-loop scenarios,
`sensory_screen.mjs` for which senses drive which commands, `starvation.mjs` for the
genotype table, `diag_walk.mjs` for a 20 ms trace with sensor ablation. The complete
list, with what each one measures, is in
[experiments and scripts](../17-experiments.md).
