# A Negative Result in the Mushroom Body

The mushroom body is an especially tempting place to identify an algorithm from anatomy. Projection neurons expand into a much larger population of Kenyon cells. Kenyon cells receive inhibitory feedback and converge onto output neurons whose compartments also receive teaching-related input. The arrangement resembles a system for constructing sparse representations and learning how to read them.

A familiar architecture can make a failed simulation feel surprising. Surely, if the ingredients are all present, the expected operation should appear. But the expectation often bundles together several computations and several unmeasured physical assumptions. The mushroom-body experiment is useful because it forces us to take that bundle apart.

The implemented ensemble did not reproduce the chosen gain-control criterion. That is a result about a point-neuron family under direct Kenyon-cell stimulation. It does not identify synaptic conductance as the unique missing quantity, and it does not test the complete process of associative memory.

## What the anatomical ratios mean

There are 4,064 Kenyon cells in the structural census. The broad projection-neuron count is 686, giving an expansion ratio near 5.9. Restricting the denominator to the 282 projection neurons that reach the calyx gives a ratio near 14.4. The familiar description of roughly sixfold expansion uses the broad denominator; it should not be attached to the calyx-projecting count.

The more important local fact is sparse sampling. A Kenyon cell receives input from a median of about five projection neurons. A large population of cells sampling different combinations can produce a representation in which similar sensory inputs activate partly different subsets.

That possibility depends on the transfer function. If every Kenyon cell responds linearly to any single active input, the expansion may mostly repeat correlations already present upstream. If cells require coincident input and operate near threshold, different combinations can become more distinct. Inhibition can help regulate that operating point, but its effect depends on how and where it is delivered.

The APL loop is anatomically extensive. About 196,000 APL-to-Kenyon contacts are distributed over roughly 4,210 connections, and reciprocal coverage reaches essentially all Kenyon cells in the selected graph. Dividing total contacts by cells gives about forty-eight contacts per Kenyon cell; dividing by connections gives a slightly different average. Neither quotient measures an effective inhibitory conductance.

The output population contains ninety-seven mushroom-body output neurons, each pooling many Kenyon cells. Teaching-associated dopamine pathways make compartment-specific contacts. These facts motivate a broad memory hypothesis, but a successful memory experiment would still need an experience-dependent change and a later recall test.

## What the probe actually stimulates

The ensemble bypasses the sensory expansion by driving Kenyon cells directly. It creates two activity patterns, each involving two hundred cells with half of the selected cells shared. It then measures the similarity of the resulting output-neuron activity vectors and the response to stronger drive.

This is a reasonable way to examine the readout of overlapping Kenyon-cell patterns. It is not a test of whether projection-neuron input becomes sparse through Kenyon-cell expansion, because that transformation has already been supplied by the experimenter. Nor does the probe train the readout weights through experience.

The distinction is easy to see in a simpler example. If a camera-processing system contains an image encoder followed by a classifier, injecting a vector directly into the classifier tests the classifier's response to that vector. It says little about whether the image encoder would produce the same vector from a photograph. Bypassing a stage can isolate a question, but it cannot validate the bypassed computation.

The gain measure compares Kenyon-cell spike output at double drive with output at the original drive. Strong divisive regulation would tend to reduce that ratio below the unregulated increase over the relevant range. A low ratio alone would not prove normalisation, since saturation or fatigue can also compress responses. The effect of APL manipulation and the shape of the full input-output curve are therefore important.

## The eighteen-member result

The ensemble varies Kenyon-to-output gain over one half, one, and two; APL gain over the same values; and output-cell tonic bias over zero and four millivolts. Output recurrence is held fixed. This produces eighteen parameter settings within the circuit builder's default LIF model.

Nine members are classified as silent and nine as collapsed under the selected response criteria. None satisfies the gain-controlled category. The separation score for both the baseline gain test and APL silencing is about 0.529, reflecting the same nine-versus-nine partition.

That score is not evidence of several successful competing mechanisms. It is the near-even two-class split explained in Chapter 6. If silencing APL leaves the classification unchanged, the classifier has not detected an APL-dependent change in the chosen capability. Continuous response differences could still exist below the categorical threshold.

A stronger diagnostic drives four hundred Kenyon cells at increasing input rates. At drive levels of sixty, one hundred and fifty, and three hundred, the recorded Kenyon-cell totals rise from about 4,163 to 9,144 to 14,338 spikes. The two model APL units produce roughly thirteen and eight spikes at the first level, then sixteen and eleven at the higher levels during the two-hundred-millisecond window.

Within this point-neuron configuration, APL output changes little while the driven population's output grows substantially. That helps explain why increasing drive is not effectively compressed through the model's feedback loop. It does not establish a biological limit of eighty hertz for APL, because the model has imposed a spiking representation on that cell.

## Why the APL representation matters

APL is non-spiking, and its activity and inhibitory effects can be spatially localised. Amin and colleagues used local stimulation and calcium imaging to demonstrate that different parts of the cell can influence mushroom-body regions differently. Broad anatomical coverage therefore does not imply a single global inhibitory signal. [Localized inhibition in the Drosophila mushroom body](https://elifesciences.org/articles/56954)

Representing each APL neuron as one spiking unit removes that spatial and graded organisation. Its output in the simulation is constrained by the point-neuron threshold, refractory behaviour, adaptation, and synaptic update rules. A plateau in the simulated spike count can diagnose those choices as much as it diagnoses the strength of the reconstructed contacts.

At least three explanations remain open for the failed gain-control test. The effective inhibitory weights may be inappropriate. The neuronal representation may omit relevant graded or local dynamics. The direct, strong stimulation may place Kenyon cells outside the operating range in which the feedback normally regulates them. These explanations can also interact.

The appropriate conclusion is therefore conditional: the tested point-neuron ensemble did not produce the specified gain regulation under this protocol. The experiment has located a mismatch between an expected operation and an implemented model. Identifying the cause requires comparing alternatives that differ in more than a single multiplier.

## A comparison that could narrow the cause

A useful next study would keep the anatomical connectivity and input protocol fixed while changing the APL representation. A point-spiking version would provide continuity with the existing result. A graded version would remove spike-mediated output as a bottleneck. A compartmental version would allow local input to influence local output without forcing activity to mix uniformly across the cell.

The comparison should examine a range of stimulation strengths and patterns. Broad direct drive can be retained as a stress test, but more structured projection-neuron input is necessary to examine the sensory operating regime. Input width, overlap, and temporal structure can determine whether inhibition acts mainly near threshold or against strongly driven firing.

Conductance calibration should be varied within each representation rather than treated as an alternative to representation. A graded model with arbitrary weak feedback can fail, and a point model with very strong inhibition can pass a coarse compression criterion for the wrong reason. The goal is to find a model that explains multiple observables together.

Those observables should include Kenyon-cell recruitment, response rates, pattern overlap, the effect of APL suppression, and local versus distant inhibitory influence where measurable. If only the total spike count is checked, a globally suppressive model can appear adequate while missing the structure of the code.

Learning and recall require another extension. The readout must be modified through a specified teaching rule, followed by a test on trained and untrained inputs. Until that is done, the ensemble remains a probe of fixed-pattern processing and regulation. The broad associative-memory operator is only partly examined.

## Checking a negative result for a mundane cause

Before interpreting the APL failure biologically, the project checked the transmitter assignment. A diagnostic had displayed a missing value, raising the possibility that the inhibitory outputs had been omitted by the simulator's sign handling. Both APL cells were in fact labelled GABAergic in the relevant metadata path.

That check removes one possible implementation explanation. It does not validate the rest of the representation. A correctly signed inhibitory connection can still have the wrong magnitude, dynamics, or spatial scope. Debugging a negative result is a process of eliminating alternatives, not a ceremony after which the remaining preferred explanation becomes certain.

The same principle applies to stimulation and reset state. If a previous trial leaves adaptation or synaptic depletion behind, the next trial can appear suppressed for reasons unrelated to its parameter setting. Reproducible seeds help, but full state reset and clearly defined initialisation are equally important.

A useful negative result should therefore retain enough measurements to distinguish silence, saturation, and failure of the target operation. Reporting only that gain control was absent would discard much of what makes the experiment interpretable.

## The apparent contradiction with whole-brain sparsening

A separate probe of the calibrated whole-brain model drives Kenyon cells through projection neurons. In that setting, suppressing APL raises the active Kenyon-cell fraction from about 0.15 to 0.72 and increases mean rate from about 0.87 to 5.08 hertz. APL plainly affects activity in that configuration.

The two findings concern different protocols and different model settings. The embodied calibration uses conductance-based synapses, altered thresholds and size scaling, and different adaptation choices. The circuit ensemble uses its own defaults and direct Kenyon-cell input. The contrast cannot be attributed to stimulation alone while treating the models as otherwise identical.

It is nevertheless useful to distinguish sparsening from divisive regulation. A modest inhibitory effect can keep many near-threshold cells inactive without proportionally dividing the responses of cells driven far above threshold. A model can therefore affect the fraction of active cells while failing a strong-drive gain test.

To establish that this distinction explains the difference here, the same model would need to be tested under both input protocols with matched parameters. A crossed comparison of model configuration and stimulation route could separate the effects. The existing results motivate that study; they do not already supply it.

## What the negative result contributes

The mushroom-body experiment is valuable because it exposes how much can be hidden inside an appealing computational label. Sparse expansion, inhibition, fixed readout, learning, and recall are related stages with different evidence requirements. A failure in one probe cannot stand in for a verdict on all of them.

The result also clarifies what additional information might matter. Synaptic efficacy remains relevant, but so do neuronal dynamics, spatial representation, and the operating regime. The next question is no longer simply how to increase APL gain until the category changes. It is which model of inhibition explains the relevant responses without relying on the wrong physical mechanism.

That is a more demanding outcome than a tidy positive result, and a more useful one than claiming that the connectome alone has identified its own missing parameter. The graph supplied the feedback anatomy. The experiment revealed the limits of one way of making that anatomy executable. The comparison among plausible alternatives is still open.
