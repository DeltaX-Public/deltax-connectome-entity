# What the Wiring Has Taught Us to Ask

A complete wiring diagram changes the questions available to neuroscience. It lets us replace some conjectures about connectivity with measured structure. It identifies pathways that can be manipulated, reveals repeated organisation, and supplies a common anatomical substrate for competing dynamical explanations.

It does not select a unique executable programme. The same graph can support different behaviours when its synaptic efficacy, cellular dynamics, background inputs, and state change. Some of those possibilities can be sampled in a model ensemble. Others require a different representation before they can be expressed at all.

The investigation in this book has used the connectome to organise that uncertainty. Its most defensible achievement is a chain from anatomical pattern to candidate computation, from candidate computation to explicit model family, and from model family to perturbations that expose differences. The chain is incomplete, but its boundaries can be stated.

## The recurring gap

Several results begin with a compelling structural signature and end with a more conditional dynamical claim. The Delta7 path has an excellent cosine fit in the structural measure, while a particular realised inhibitory probe has a weaker fit. Some heading-model settings maintain a localised state, but none in the reported grid does so without tonic support. The PFN projection has systematic offsets, while its analysed PFNd shifts depend on recurrent support in the simulation.

The mushroom body has extensive feedback anatomy, yet the point-neuron ensemble fails its chosen gain-control test. The embodied system recruits plausible command pathways but needs supplied stepping and bout mechanisms to produce its demonstrated movement. These are related observations, though they do not all diagnose the same cause.

The phrase structure systematically overstates what dynamics delivers can serve as a warning about our expectations. It should not become a claim that the biological graph promised more than the biological dynamics can accomplish. The graph itself makes no verbal promise. We interpreted a pattern as an operation, then tested that interpretation using a model.

When the operation failed to appear, at least two things were under examination: the proposed computation and the way the anatomy had been made executable. A false interpretation, an unmeasured gain, a missing mechanism, and an unsuitable probe can all produce a negative result. The useful next step is to design a comparison that distinguishes them.

## What has been demonstrated

The structural analyses can operate on a common representation of fly and worm connectivity. They expose recurrence, sign-conditioned motifs, and concentrated spectral modes. Their cross-species comparison remains dependent on differences in annotation, thresholding, and sign coverage, but the common interface makes those differences inspectable.

The ensemble machinery can execute parameter grids for several candidate computations and retain the outcomes of defined perturbations. It demonstrates that baseline-compatible responses can rely on different interactions. The unweighted separation score makes these disagreements easy to summarise, while leaving experimental value and sampling sensitivity as further problems.

The field model supplies another description of the heading system. It produces continuous width and phase observables and exposes the assumptions required for a phase-reduction argument. Its inhibition was revised using physiological evidence, and its resulting quantitative predictions remain available for a new test.

The compiler has a reusable specification and execution boundary. Circuit-specific choices can be separated from common iteration and reporting. The remaining human choices are substantial, including the operator vocabulary, free parameters, model class, and measurement geometry. Reuse has made the investigation easier to extend; it has not made those choices automatic.

The engineering benchmark shows that an idealised field estimator can be competitive in one synthetic regime. The embodied model shows that connecting the graph to a body creates informative failures and useful pathway-level responses. Neither result substitutes for a validated explanation of the whole animal.

## Missing quantities and missing descriptions

Some information is plainly absent from the packed graph. Contact counts do not provide receptor-specific conductances. The chemical representation does not include a complete electrical graph. It does not supply each cell's membrane properties, all synaptic timescales, or the distribution of modulatory receptors. Thresholding also removes weak connections that may matter collectively.

Other limitations arise from the chosen representation. A neuron stored as one node can have spatially separated computations. A type-level edge can hide heterogeneity among cells. A field kernel can erase irregularities that stabilise or destabilise a real population. A centroid can collapse a multimodal response into a position at which little activity exists.

These categories require different remedies. Measuring conductance can narrow a parameter. Modelling local graded activity can change the class of mechanisms. Improving a coordinate map can correct an observable without changing the simulated biology. It is important to identify which kind of uncertainty a proposed experiment addresses.

APL is the clearest example. The failed direct-drive gain test does not isolate a single missing scalar. It motivates a comparison of effective strength, neuronal representation, and input regime. The result is scientifically useful precisely because it reveals several distinguishable explanations rather than prematurely choosing one.

## The status of a prediction

A prediction is strongest when its assumptions and observable are fixed before the relevant data are examined. This need not mean that a model is built without any prior biological knowledge. It means that the observation used as a test was not also used to select the tested answer.

The Delta7 revision illustrates the distinction. Qualitative survival after suppression motivated an additional inhibitory contribution. Agreement with survival is then a consistency check on the revision. The detailed width curve and the model's altered tracking response can provide fresh tests if specified before comparison with suitable measurements.

A similar boundary applies to calibration. The embodied model was fitted against several reflexes and activity targets. Reproducing them shows successful fitting within the objective, while new perturbations and closed-loop conditions test generalisation. The benchmark's parameter choices likewise need a separation between tuning regimes and evaluation regimes.

Maintaining these boundaries is not merely cautious language. It changes which result should be pursued next. Once an observation has shaped the model, repeating that agreement yields less information than measuring a consequence that the revision introduced.

## How to make the current account harder to dismiss

The next work should deepen the existing comparisons before multiplying operator names. For the heading field, the phase calculation should use the appropriate adjoint mode and be checked against small signed perturbations. This would turn an approximate within-model calibration into a justified reduction, or reveal the limits of that reduction.

For the mushroom body, comparing spiking, graded, and compartmental inhibitory representations under matched inputs would test the competing explanations of the gain failure. A complete sensory expansion and a learning-and-recall protocol would then examine the broader memory hypothesis that the current probe leaves untouched.

For Delta7, a fresh quantitative perturbation dataset could test width and tracking together. The suppression level should be related to effective synaptic output, and the model should be observed through a measurement procedure comparable to the experiment. A surviving bump with the wrong update dynamics would be a partial success, not a complete one.

For the PFN circuit, the four PFNv-only cases deserve their own mechanism attribution. The coordinate readout should operate directly on the stated anatomical coordinates, preserve full response profiles, and distinguish loss of activity from loss of displacement. Matched-amplitude ablations could then clarify whether recurrence computes the shift or supplies the activity needed to express it.

The experiment-ranking method needs a corresponding refinement. Baseline-incompatible models should be excluded or downweighted, and rankings should be tested against resampling and class-boundary changes. Measurement noise and feasible intervention strength should enter before the score is presented as laboratory priority.

The engineering benchmark can be strengthened with paired uncertainty intervals, distributed outliers, true abrupt changes, separate tuning trials, and runtime and memory measurements. These additions would say whether the apparent recovery advantage is reliable and whether it is worth its computational cost.

## A different way to value a connectome

One way to judge a connectome is to ask whether it lets us simulate an animal from scratch. That is an ambitious and worthwhile goal, but it compresses many sources of missing information into a single dramatic test. A failed walking simulation then seems to say that the wiring was insufficient, even when the failure might be in the motor interface or cellular dynamics.

Another way is to ask how the connectome changes the space of explanations. It can rule out a proposed direct pathway, identify an unexpected feedback route, or show that two candidate mechanisms act on the same anatomical substrate. It can turn a vague question about inhibition into a perturbation of named populations.

This value appears before a complete simulation succeeds. It also survives a model's failure. The PFN investigation gained an explicit recurrence question; the APL investigation gained a representation question; the heading investigation gained a quantitative test of residual inhibition. Each is a more constrained scientific problem than the one with which it began.

The long-term ambition is to make this process systematic. A connectome would enter with its uncertainties, generate a set of plausible computations, and produce experiments that reduce the uncertainty efficiently. Evidence would then revise both the parameter distribution and the model classes considered.

The current project has built part of that loop. Its next advance will come from making a few of its predictions survive more demanding comparisons. A nervous system is not understood when a diagram receives an algorithmic name. Understanding grows when the name leads to a mechanism, the mechanism leads to a measurable consequence, and the consequence survives a test that could have shown it wrong.
