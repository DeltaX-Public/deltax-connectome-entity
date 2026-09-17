# Disagreement, Revision, and a Fresh Test

A model becomes more interesting when it makes a prediction that could have gone another way. An ensemble makes several such predictions visible at once. But the scientific value of a comparison depends on when the evidence entered the process. A result used to revise a model cannot also serve as an independent test of the revised model.

The Delta7 investigation illustrates both the value of comparing formalisms and the importance of this boundary. The spiking ensemble and the field model gave different responses to reduced inhibition. Published physiology then motivated a change to the field. The revised field now makes a quantitative prediction that remains to be tested independently.

Keeping those events distinct produces a stronger account than compressing them into a story in which biology simply selected the winning model. The actual investigation included a failed simplification, a mechanistic revision, and a new uncertainty.

## Before consulting the perturbation result

The spiking ensemble began with several baseline-compatible heading states. When Delta7 was silenced, most retained a relatively sharp concentrated pattern under the classifier. A smaller group lost the sustained response, and one lost confinement. As Chapter 7 explained, the recorded confinement-failure category is not the same as a surviving widened bump.

The original field attributed its surround inhibition entirely to Delta7. Under that construction, reducing Delta7 gain far enough caused the localised state to dissolve. In the reported exploration, the failure appeared below a gain of roughly 0.3.

This was a substantive model prediction. It arose because the field had one source of the inhibition needed to control recurrent excitation. Removing that source could eliminate the operating regime. The prediction was conditional on the field's architecture and parameter values, but it exposed a clear consequence of assigning all relevant inhibition to one pathway.

The models therefore disagreed even before deciding which outcome was biologically appropriate. Some spiking settings preserved a concentrated state; the single-channel field lost it under sufficiently strong suppression. That disagreement was useful because it directed attention to the representation of inhibition.

## What the published observation establishes

Turner-Evans and colleagues reported that a single EPG bump can remain when Delta7 output is reduced, while its tracking of the animal's movements is impaired. They also argued that additional inhibitory sources must contribute to the circuit. This is the relevant qualitative observation for the comparison. [The neuroanatomical ultrastructure and function of a biological ring attractor](https://pmc.ncbi.nlm.nih.gov/articles/PMC8356802/)

The observation challenges a model that requires loss of the bump under a comparable reduction of Delta7 output. Comparability matters: a computational deletion of all output is not automatically equivalent to a partial experimental suppression. Matching the manipulation quantitatively would require knowing the residual effective output in the animal and representing it appropriately in the model.

The observation does not, on its own, decide whether a surviving bump should remain sharp or become wider. Survival and impaired tracking leave that distinction unresolved. Rejecting the sharp-survival spiking class would require a width measurement or an explicit test of tracking predictions under the perturbation.

This is a small logical point with large consequences. If a model predicts three features and an experiment measures one, agreement on that one feature does not validate the other two. Likewise, disagreement on an unmeasured feature cannot be used to reject a model. The observable must match the claim.

## Adding an inhibitory pathway

The anatomical account already included inhibitory ring-neuron populations and their interactions with the compass. The field was revised to include a shallow inhibitory surround whose gain does not depend on the Delta7 multiplier. This provided a route for residual regulation after the structured Delta7 component was removed.

In the implementation, the second kernel has a gain of one half and a cosine-depth parameter of one half. Those values are model choices. Anatomy and physiology motivate the existence of additional inhibition; they do not uniquely specify this kernel or its numerical strength.

The revised model preserves a localised bump throughout the tested suppression sweep. At full Delta7 gain, its width at half maximum is about 90.5 degrees. Reducing the gain to 0.6 gives about 98.1 degrees; at 0.4, about 104.6 degrees; at 0.2, about 116.1 degrees. With the Delta7 term removed, the width is about 143.1 degrees.

Circular concentration falls from about 0.597 at baseline to about 0.528 at complete removal. Width and concentration are related but different observables. Width describes the span above half the peak, while concentration measures how strongly the population favours a direction. Both are needed to distinguish a broader coherent state from nearly uniform activity.

The revision therefore supplies a mechanistic explanation for survival within the field: a second inhibitory contribution continues to restrain the network. It also predicts graded broadening as the structured component weakens. The qualitative survival result informed the model's construction. The numerical broadening curve goes beyond that observation.

## What is now a prediction?

The width curve can become a prospective test if it is fixed before comparison with an appropriate dataset. One would need graded perturbations, an estimate of effective suppression, and a consistent way to measure bump width. The model's full-width-at-half-maximum calculation should be related to the imaging observable, including sampling and indicator effects.

A model prediction expressed in degrees can look more precise than its measurement mapping warrants. Imaging reports a filtered signal from a finite set of regions, while the field provides an idealised activity profile. A fair comparison should apply a measurement model or at least quantify the effect of different width definitions.

Tracking offers another fresh test. The experiment reports impaired movement tracking after suppression. The revised model should therefore be driven through turns with and without the perturbation, measuring lag, drift, and phase errors as well as width. A bump can survive yet fail to update, so persistence alone is insufficient.

Several models with additional inhibition might reproduce survival. They could differ in the shape of the width curve, recovery after a transient perturbation, or response to simultaneous changes in excitation. Those differences are where the next discriminating experiment should focus.

The right status of the revised field is consequently clear: it is a model revised using a qualitative physiological constraint, with quantitative predictions awaiting a separate test. Describing that status does not diminish the revision. It prevents the same observation from being counted twice.

## The cost of revision

The earlier single-channel field achieved an error near 0.41 radians in the recorded heading benchmark. The later two-channel model scored about 0.54 in the current benchmark configuration. Earlier drafts also reported an intermediate value near 0.449, reflecting a different recorded version.

These numbers show that the revised model was not simply selected to improve the headline engineering score. They do not isolate the causal cost of an additional inhibitory channel unless every other setting and input is held fixed in a matched comparison. Nor do they establish a precision-versus-robustness tradeoff in the animal.

A controlled ablation would compare the same benchmark trials under the same numerical settings, changing only the second inhibitory component and accounting for any necessary recalibration. It could then ask whether improved perturbation tolerance consistently reduces tracking precision within that model family. The biological interpretation would remain a further step.

This distinction is useful beyond the current example. When a model becomes more faithful to one observation and less accurate on another task, the result may reveal a real tradeoff, a poor parameter choice, or an interaction with the test regime. The discrepancy deserves investigation rather than an immediate evolutionary explanation.

## Directional control and operating thresholds

Other field perturbations provide narrower compatibility checks. Under the tested directional input, retaining one PEN arm gives about 0.98 radians of drift over two seconds, while retaining the opposite arm gives essentially zero. This demonstrates arm selectivity in that implementation and stimulus direction.

The result should not be described as a complete bilateral validation. Reversing the input and testing both signs would be necessary to establish the corresponding symmetry, and biological pathway manipulations may have additional effects. A mechanism that is direction-selective by construction still needs to be checked against the response it is intended to explain.

An excitation sweep finds no bump at gains of 2.6 and below and a bump at 3.0 in the reported initialisation. This brackets a transition within the sampled values. It does not locate an exact bifurcation or establish that all initial conditions share the same threshold. Hysteresis would require approaching the regime from both directions and testing the dependence on initial state.

These qualifications point toward useful next experiments. They are ways to make a compatibility result more informative, rather than reasons to discard it.

## Why the disagreement was productive

The comparison changed the question from whether a ring-like network can produce a bump to which inhibitory organisation can preserve and update it under perturbation. That is progress. The additional field representation exposed a simplification that was difficult to see from a baseline spiking trace alone.

The lesson is not that one formalism won or that an ensemble majority was defeated by a decisive width measurement. The recorded evidence supports a more specific account: the original field's inhibition was inadequate for the qualitative constraint, the revised field incorporated another pathway, and the resulting width and tracking predictions need independent evaluation.

A useful modelling system should preserve this history of evidence without turning the book into a changelog. The reader needs to know which observations shaped the model and which remain available to test it. Once that boundary is clear, disagreement between models becomes a source of experimentally tractable questions.
