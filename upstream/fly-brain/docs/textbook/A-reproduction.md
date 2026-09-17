\appendix

# Reproducing the Investigation

A numerical claim is most useful when a reader can recover the experiment that produced it. The prose explains what a result means; the computational record must explain how it was obtained. This appendix describes that relationship, while the separate technical reproduction companion retains the executable commands and implementation details.

The [project repository](https://github.com/Lulzx/fly-brain) contains the model source, analysis stages, and saved reports. The present edition rewrites the interpretation of those reports and checks several disputed claims against the implementation. It does not constitute a fresh rerun of the scientific experiments. A saved result, a source inspection, and an independently repeated experiment are different kinds of evidence.

## Starting from the same object

Reproduction begins with the dataset and its transformation. The reported fly counts refer to the packed MaleCNS representation with a three-contact connection threshold. Some structural probes use a higher threshold, and the embodied fit uses six. A reader should recover the graph version and the threshold of the particular stage rather than assuming one connection count describes the entire project.

The common representation also carries cell identities, annotations, and sign conventions. The fly's stored graded proxy, the worm's transmitter convention, the circuit model's default sign table, and the embodied treatment of octopamine are not interchangeable. Repeating a sign-conditioned analysis requires the convention that actually produced it.

Positional mappings belong in the same record. An eight-bin ring, a sixteen-wedge anatomical description, and a linear fan-shaped-body column list are different coordinates. The earlier equivalence between one and a half bins and one 22.5-degree wedge was incorrect. Under an eight-bin full-circle convention, one and a half bins corresponds to 67.5 degrees mathematically; relating that value to anatomy requires the stated hemisphere and position mapping.

## Following the computation

The structural stages measure flow, recurrence, signs, motifs, and region-specific patterns. The common-representation checks compare the fly results with the original fly analysis before extending the same operations to the worm. The operator detector then interprets selected combinations of measurements as candidate computations.

The ensemble specification records populations, parameter axes, stimuli, and perturbations. The runner instantiates the full loaded network, modifies the named pathways, and measures the selected circuit. The heading, column, and pattern probes use different observables, so their labels should not be compared as though they were one common measure of computational success.

The field calculation is a separate stage. It generates perturbation curves that can be attached to the heading report. If the heading report is generated before the field perturbation output exists, the merged comparison may be absent or stale. To refresh that comparison, generate the field perturbations first and then regenerate the heading report that incorporates them.

The benchmark and embodied evaluations form further branches. The benchmark compares estimators on synthetic shared inputs. The embodied calibration selects parameters against a multi-part objective, after which closed-loop scenarios and state manipulations examine the assembled system. A reproduction should preserve which observations were used for fitting and which were used afterward.

## Replaying randomness

The experiments use seeded random generators, allowing a particular implementation and execution order to be replayed. A seed alone is not a complete specification of a stochastic experiment. Changing the order of operations can change which random values reach a given cell or stimulus.

For comparisons across models, matched input streams are more informative than merely supplying the same initial seed. For comparisons across code versions, the source revision, dependencies, effective parameters, and observation definitions should accompany the seed. Hardware and numerical backend also belong in performance or equivalence claims.

A single replay answers whether one run can be recovered. Repeated seeds address variability. Changes to parameter sampling and classification thresholds address robustness of an ensemble conclusion. These checks are related, but none substitutes for the others.

## Checking the accounting

Several corrections in this edition arose from following the denominators. The heading substrate contains 148 named cells, while eighty-eight counts only EPG plus Delta7. The calyx-reaching projection-neuron population gives a Kenyon-cell expansion ratio near 14.4, while the broader projection-neuron census gives about 5.9.

The PFN report contains thirteen shifted members but attributes the selected recurrent mechanisms only for the nine with a PFNd shift. Four PFNv-only cases remain outside that attribution. The spiking heading report's one confinement-failure member is also distinct from the field model's surviving widened bump. Preserving these distinctions prevents a summary from changing the scope of the underlying measurement.

Effective defaults require the same attention. The circuit ensemble uses adaptation, depression, and a current-based default configuration. The embodied fit uses a separate conductance-based configuration with adaptation set to zero. The source and saved parameters should be read together when reproducing a comparison between them.

## What would strengthen the record

The current artifacts preserve parameter points, classified outcomes, and ranked experiments, but not every result is equally self-contained. Future reports should include all effective defaults, population selections, coordinate mappings, classification thresholds, and continuous measurements required to reconstruct a claim without inferring hidden state from the implementation.

The heading benchmark would benefit from retained per-trial paired errors, allowing uncertainty intervals to be computed directly. The field reduction needs an adjoint calculation and a small-perturbation check. The APL comparison needs alternative neuronal representations under matched stimulation. These are open scientific checks, rather than tasks already completed by the preparation of this edition.

Reproducibility makes a claim inspectable; it does not make its interpretation inevitable. The purpose of retaining the full chain is to let another reader rerun the result, challenge the observable, and test a different explanation on the same anatomical substrate.
