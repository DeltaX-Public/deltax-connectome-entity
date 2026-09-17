# When an Anatomical Offset Becomes a Computation

Suppose an input population is arranged in columns, and its connections consistently reach an output population several columns to one side. The most immediate interpretation is a shift: input at position six should produce output at position three. It is a simple and attractive way to perform a coordinate transformation.

But a map of contact counts is not an input-output function. The target neurons integrate several sources, interact with one another, and may send feedback to the input. A displaced projection can therefore provide a bias without determining the final response. The PFN-to-hΔB experiment asks how much of the apparent shift survives those dynamics.

This is a useful second test of the operator approach because it asks a different question from the heading experiment. The observable is displacement along the selected column coordinate, rather than persistence around a ring. A framework that merely applies a heading classifier to every circuit would have little to say here.

## Reading the structural offset

The structural histograms place the PFNd-to-hΔB peak near negative three columns and the PFNv-to-hΔB peak near positive two. With column six as the input, a literal reading would predict responses near columns three and eight respectively.

A histogram peak describes where contact weight is concentrated. It does not mean that every input neuron projects to exactly that offset, or that the output activity will have its maximum there. It also does not establish a rigid transform over all positions. Boundary effects and heterogeneous input can make a projection behave differently near the edge of the represented coordinate.

The two arms are anatomically unequal. The selected population contains forty PFNd cells and twenty PFNv cells. Their recurrent and feedback relationships also differ. A comparison based only on the location of two normalised peaks can conceal these differences in total drive and effective influence.

The initial dynamical probes often produced offsets with the expected sign but reduced magnitude, around one or two columns rather than the structural three. This is evidence that the static profile does not directly become the measured output displacement in those settings. It is not enough to identify why the displacement is reduced.

Possible contributors include the thresholded graph, other inputs, recurrence, saturation, and the centroid observable. The purpose of the deeper experiment is to separate some of these alternatives by changing the pathways that could support the response.

## The loops behind the projection

PFNd has substantial self-recurrence, with about 7,970 synaptic contacts in the structural census. The graph also contains sixty-one hΔB-to-PFN feedback edges, as well as hΔB internal recurrence. These interactions make a simple feedforward interpretation incomplete as a description of the model.

The ensemble varies the gains of the two PFN-to-hΔB pathways, hΔB recurrence, and hΔB tonic bias. Three gains for each PFN arm, four recurrent settings, and two bias settings produce seventy-two combinations. Each is tested with localised column drive and with selected recurrent or feedback pathways removed.

The recurrent ablations are causal tests within the simulator. They ask whether the observed shift depends on a pathway under the chosen operating point. They do not by themselves show whether the pathway carries the spatial transformation or merely keeps the response above threshold. Both can make a shift disappear when the pathway is removed.

This distinction can be tested by examining the full response. If an ablation abolishes all activity, loss of the centroid is different from a surviving response returning to the input column. A mechanism label that combines these cases should be unpacked before making a strong claim about coordinate computation.

## What was classified as shifted

At the recorded seed, thirteen members meet the shift criterion on at least one arm, fifty-five are classified as passthrough, and four are silent. The phrase shifted member therefore means that either PFNd or PFNv produced a response sufficiently close to its expected structural offset under the classification tolerance.

Only nine of the thirteen show the PFNd shift. The other four qualify through PFNv while their PFNd response is classified as passthrough. The hand-written mechanism analysis then examines dependency of the PFNd shift. Its nine entries account for those nine PFNd cases, not all thirteen shifted members.

Among the nine analysed cases, two depend on hΔB recurrence together with hΔB-to-PFN feedback, two depend on all three recurrent elements, and two depend on feedback alone. The remaining three each depend on a different single or paired combination involving PFN or hΔB recurrence. None of these nine retains the classified PFNd shift after every tested source of recurrent support is removed individually.

That is narrower than saying none of thirteen shifted members can work from the projection alone. The four PFNv-only cases were outside this mechanism attribution. They must remain unassigned by that analysis rather than disappearing from the denominator.

It is also narrower than proving that the direct projection has no transforming role. The projection can supply the spatial bias while recurrence supplies sufficient activity or amplifies that bias. The experiment shows dependency on recurrent support in the analysed PFNd cases. Further probes would distinguish amplification from an independently generated displacement.

## Is the shift the same everywhere?

A rigid translation adds the same displacement to every input position. If input at column four moves to column one, input at column six should move to column three, provided both positions lie within a valid coordinate range. A position-dependent displacement represents a different transformation.

The column sweep in the recorded experiment does not establish a uniform rigid shift across the driven positions. The measured output depends on which column is stimulated. This is an important failure of the simplest operator interpretation under the chosen probe.

The observable itself deserves scrutiny. The hand-written probe computes a centroid over an ordered list of output columns and maps it back to a column label after rounding. If labels are not contiguous or the response is multimodal, a centroid in index space can differ from a centroid in the anatomical coordinate. Rounding can also move a response across a classification boundary.

A response concentrated equally at two separated columns illustrates the problem. Its centroid lies between them, possibly at a position where few cells are active. Calling that centroid a shifted copy can hide a qualitative change in the representation. The full profile, peak structure, and total activity should accompany the scalar offset.

For these reasons, the present sweep argues against claiming a clean rigid transform from the recorded model. It does not establish that the biological circuit cannot implement an appropriate coordinate transformation when driven by natural population patterns. Localised stimulation is a diagnostic probe, and the relevant input manifold may be broader than a single column.

## The experiments that expose the differences

Varying stimulus amplitude has the highest unweighted separation score in the hand-written report, about 0.424. Removing hΔB recurrence scores about 0.406, while removing hΔB-to-PFN feedback scores about 0.316. Measuring the PFNd offset and silencing PFNv have similar scores, around 0.314 and 0.312. The rigidity sweep scores about 0.282.

The amplitude result is informative because a spatial operator must also have a usable response range. An output that appears shifted only for one input strength is a more conditional computation than a transform stable across a broad range. Saturation and recruitment can change both the magnitude and location of the response.

The feedback ablation is particularly useful for distinguishing a static reading from a recurrent one. It targets a path that the simplest feedforward interpretation would regard as unnecessary. If the shift or its supporting activity depends on that path, the proposed explanation must include the loop.

Again, the score is a property of the full sampled ensemble. Baseline-compatible shifted members are only a subset. Ranking interventions within that subset could change which experiment is most useful for deciding among the mechanisms that remain plausible after observing a shift in the animal.

## What the generic execution adds

The generic runner reports eleven shifted members, fifty-six passthrough members, and five silent members at the same nominal seed. Amplitude scaling remains the highest-scoring experiment, with a separation of about 0.461. The counts are close to the hand-written results but are not identical.

The runner also includes a PFNv-silencing perturbation in its mechanism attribution. Some PFNd responses depend on PFNv co-activity under the tested conditions. This creates an arm-coupling hypothesis that the earlier dependency analysis did not address in the same way.

The perturbation's internal name can be misleading if read literally. A label recording that PFNv silencing changes the shift describes a dependency test; it does not mean the circuit needs the act of silencing PFNv to produce its normal response. Human-readable interpretation has to follow the direction of the intervention and the observed change.

Shared components limit how independently the two executions confirm one another. They agree on a broad picture of mostly passthrough responses and a small shifted subset, while exposing differences in classification and tested dependencies. A member-level comparison with matched input streams is the appropriate next step before attributing every discrepancy to harmless randomness.

## A more useful interpretation

The anatomical offset remains a valuable constraint. It tells us where the direct pathway tends to send contact weight and motivates directional hypotheses. In the recorded model, however, the analysed PFNd shifts depend on recurrent support and do not establish a uniform input-independent translation.

The resulting hypothesis is that spatially biased projection and recurrent dynamics cooperate to shape the response. That statement can be tested more specifically by preserving total activity during an ablation, varying the width of the input pattern, and measuring the full output distribution across columns. These tests could distinguish recurrence that merely sustains firing from recurrence that determines the transform.

The circuit therefore illustrates a general advantage of executable hypotheses. A static offset gave a plausible first interpretation. Running the network exposed conditions that the interpretation omitted. The useful output is the revised set of dependencies and the remaining measurement questions, rather than a declaration that the wiring either does or does not contain vector arithmetic.
