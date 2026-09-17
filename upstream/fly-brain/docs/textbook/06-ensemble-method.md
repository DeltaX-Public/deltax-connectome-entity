# Exploring a Family of Models

Suppose we know exactly which cells connect in a candidate heading circuit, but do not know how strongly its recurrent synapses act. A single simulation forces us to choose a strength. An ensemble lets us keep several choices alive and observe what each implies.

This changes the object of the investigation. We no longer ask only whether one model produces a bump. We ask how bump formation depends on recurrent gain, whether a second inhibitory pathway changes the result, and which intervention separates models that otherwise look alike. The aim is to map part of the uncertainty left by anatomy.

The word part matters. A finite parameter grid is a sample from a chosen model class. It is not the complete set of programs permitted by the connectome. A family of point neurons excludes graded, compartmental, and many biochemical mechanisms before its first parameter is varied. Expanding the grid explores the chosen assumptions more thoroughly; it does not remove them.

## Parameters and mechanisms

Some unknowns can be represented reasonably as numerical axes. The efficacy of a selected connection class can be multiplied by several gains. Baseline excitability can be raised or lowered. A synaptic delay can be varied over a range. These are parameter changes within a specified model.

Other unknowns change the model's structure. A cell may require several interacting compartments instead of one voltage variable. An inhibitory influence may arrive through a population omitted from the model. A modulatory pathway may change release probability rather than threshold. No amount of gain adjustment necessarily substitutes for those mechanisms.

The distinction is not absolute. Adding a second inhibitory pathway introduces new parameters, and setting its gain to zero can recover the simpler model. But it remains useful to ask whether a proposed explanation was represented at all. A model can be flexible in the wrong dimensions.

One way to see the danger is to imagine fitting a straight line to a curved relation. Testing many slopes and intercepts will find the best line. It will not establish that the underlying relation is linear. In neural modelling, the analogue of curvature may be local dendritic integration, receptor-specific modulation, or state-dependent input. A dense grid can give an impression of completeness while leaving the relevant possibility outside the family.

## The actual neuron model

The circuit experiments use leaky integrate-and-fire neurons. Each cell has a voltage that relaxes toward rest while incoming activity changes its state. Crossing threshold produces a spike, followed by a reset and refractory interval. The model also includes adaptation and synaptic depression, so recent activity influences subsequent responsiveness.

The default circuit configuration uses a resting potential of negative 52 millivolts, a threshold of negative 45 millivolts, a membrane time constant of twenty milliseconds, and a synaptic time constant of five milliseconds. Integration proceeds in half-millisecond steps with a nominal synaptic delay of 1.8 milliseconds. These choices follow the project's LIF modelling lineage, rather than measurements of each cell in the male reconstruction.

The source path is important here. The ensemble builder loads the full packed network, applies cell-size scaling, and modifies selected edge classes and population biases. It does not extract only the named circuit cells. The circuit names identify the manipulated and measured substrate inside that full network.

The builder also does not automatically import the fitted parameters of the embodied model. Its default synaptic scale is 0.275, its size exponent is one, and conductance-based operation is disabled by default. Adaptation increases threshold by two millivolts per spike and relaxes over one hundred milliseconds; synaptic depression is also active. The embodied configuration described later uses different settings, including conductance-based synapses and zero spike-frequency adaptation.

This distinction resolves an apparent contradiction in the earlier description. An adaptation-related shutdown is possible in the circuit ensemble even though adaptation is zero in the embodied fit. The two experiments use different configurations. It also means that their agreement or disagreement cannot be interpreted as a pure effect of stimulation while assuming every other parameter is shared.

The base configuration gives the ensemble its units and background dynamics. A recurrent gain of four multiplies the selected EPG-to-EPG weights by four relative to that base. It does not mean four times an experimentally measured synaptic conductance. The multiplier is explicit; the physical calibration remains a model assumption.

## Constructing a useful sample

The heading ensemble varies recurrent excitation over four values, inhibitory gain over three, and tonic EPG bias over four, while holding the PEN-pathway multiplier fixed. That gives forty-eight members. The memory-related probe varies readout gain, APL gain, and output-cell bias to create eighteen members. The PFN experiment uses seventy-two combinations of pathway gains, recurrence, and bias.

A regular grid has practical advantages. It is easy to describe, rerun, and inspect. Nearby failures can reveal a regime boundary, and a reader can see which range was explored. But a grid also assigns weight to regions by construction. A parameter sampled at twice as many points contributes twice as many members to an unweighted comparison.

There is no reason to assume that biological plausibility is uniform in the chosen coordinates. Equal steps in conductance and equal steps in its logarithm describe different sampling distributions. A narrow region of stable operation may be biologically plausible if development regulates the relevant quantity tightly. Its small fraction of a broad grid is not a probability that the animal uses it.

The appropriate first claim is therefore descriptive: twelve of these forty-eight settings sustained a localised state under this probe. To turn that into a statement about likely biological mechanisms would require further constraints or an explicit prior over parameters and model classes.

## Following one experiment through

Consider two ensemble members that retain a coherent bump after a localised stimulus ends. At baseline their decoded phases and widths are similar. In one, strong excitation is balanced mainly by Delta7 inhibition. In the other, a different background interaction supplies enough restraint that Delta7 contributes little under the probe.

Silencing Delta7 can expose this difference. The first member may spread into broad activity or lose its stable operating regime. The second may retain a concentrated bump. The perturbation is informative because the baseline observable left the alternatives unresolved.

The execution loop applies the same general sequence to all members. It builds a network with the chosen parameters, presents a defined stimulus, measures continuous observables, and assigns an outcome category. It then repeats the procedure under each perturbation. The report retains the parameter values, observations, and labels so that a coarse category can be traced back to its measurement.

The classification thresholds are part of the method. A circular concentration just above one half and one just below it may produce different labels despite very similar activity. Such boundaries are useful for summarising many runs, but a change of category should not automatically be called a change of mechanism. The continuous measurements need to remain available.

Randomness also requires discipline. A fixed seed makes a particular execution reproducible. It does not necessarily give two different models identical random inputs if their execution paths consume random values in a different order. The current implementation seeds a shared generator; stronger comparisons would provide matched stimulus streams explicitly for each member and perturbation. Reseeding and examining ranking sensitivity are useful, but they answer a different question from exact replay.

## Understanding the separation score

The initial ranking uses unweighted ensemble separation. For an experiment, count how many pairs of different members receive different outcome labels, then divide by the total number of member pairs.

If there are eighteen members split into two equal groups of nine, eighty-one pairs cross between groups. There are 153 distinct pairs in total, so the score is eighty-one divided by 153, or about 0.529. The value is slightly above one half because a member is never paired with itself. With forty-eight members split equally, the corresponding maximum for two groups is about 0.511.

If every member receives the same label, separation is zero. If several balanced categories are occupied, it can be higher. A high score means that this particular sample of models produces diverse classified outcomes under the specified observation. It does not mean that the experiment has a large effect, nor that it is feasible or precise in an animal.

The denominator exposes a limitation. Suppose baseline recordings have already ruled out all silent models. A stimulus that separates silent models from active models may rank highly on the original grid but tell us little about the remaining biological possibilities. Experimental value should be assessed after conditioning on baseline-compatible members.

The ranking is also sensitive to duplication. If we add many nearly identical models in one region, the score changes even though we have introduced little new mechanistic diversity. Weighting mechanism classes or sampling from an explicit parameter distribution could reduce this problem, but each approach brings its own assumptions.

## From separation to experimental value

A laboratory must care about more than the partition of a model grid. It must be possible to target the population, measure the predicted change, and distinguish the outcomes in the presence of biological variability and measurement noise. A model may predict two bump widths that are different numerically but indistinguishable with the available imaging method.

Interventions can also have effects outside the selected pathway. Silencing a cell type may alter several circuits simultaneously. The model's operation of setting a threshold extremely high is a clear computational manipulation, but its relationship to a biological manipulation has to be established rather than assumed.

A more mature ranking would predict distributions over measurable outcomes, incorporate intervention uncertainty, and evaluate information gain among models still compatible with prior observations. It could then account for cost and feasibility. The present score is a transparent first step toward that calculation.

Transparency is an advantage even when the score is simple. If a highly ranked experiment merely separates silent and active members, we can see that. If its ranking collapses when a classification threshold changes, we can see that too. An opaque confidence measure would make these weaknesses harder to diagnose.

## Learning from an incomplete family

The ensemble method is most useful when it resists two temptations. One is to publish only the parameter setting that works. The other is to treat failure throughout the sampled grid as proof that the anatomy cannot support the computation.

Between those extremes lies a productive result: a map of which assumptions produced which behaviours, together with the interventions that expose their differences. A model family can identify a narrow operating regime, reveal that baseline agreement hides causal differences, or show that an expected capability never appeared under the chosen protocol.

When the entire family fails similarly, the next step may be a new model class rather than a larger grid. The heading field and the APL discussion will make that possibility concrete. The ensemble has not exhausted the connectome's implications. It has organised a portion of them well enough that a disagreement can guide the next experiment.
