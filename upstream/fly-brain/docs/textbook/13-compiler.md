# Making the Investigation Reusable

Three successful analyses can still amount to three separate pieces of software. Each may contain its own population selectors, stimuli, classification rules, and result formatting. Adding a fourth circuit then requires reconstructing the same machinery again, with another opportunity for assumptions to drift.

The compiler claim becomes meaningful when circuit-specific reasoning is expressed separately from the common execution process. A detected operator should lead to a specification that states what is being varied and measured. The runner should then execute that specification without containing a new special-case experiment loop for every circuit.

This is an engineering boundary with scientific consequences. It makes repeated operations consistent and makes the circuit-specific choices easier to inspect. It does not automate the discovery of every relevant parameter or the interpretation of every result.

## What belongs in a specification

Consider the mushroom-body probe. A specification identifies Kenyon cells as the stimulated population, mushroom-body output neurons as the readout, and APL as an inhibitory control population. It records the two-hundred-cell input patterns and their overlap. It identifies which connection classes receive variable gains and which output cells receive tonic bias.

It also explains why those quantities are free. Kenyon-to-output weights can change through learning in the biological system. APL efficacy is not measured by contact count alone. Output recurrence exists, but its functional contribution is uncertain. Giving each axis a reason prevents the parameter list from becoming an arbitrary collection of convenient knobs.

The specification then describes interventions: suppress APL, remove output recurrence, or alter input strength. Finally, it names the observables and the rules used to group responses. The runner can enumerate the grid and execute the interventions, while the specification states the scientific question.

No source-code listing is needed to understand this separation. The essential idea is that the experiment is represented as data with a meaning. The same generic engine can interpret a different set of populations and gains without changing the logic of building, probing, perturbing, and reporting.

## What the runner actually shares

The common execution machinery resolves populations from anatomical type labels, instantiates the chosen network, modifies selected edge classes, and applies tonic biases. It iterates over parameter combinations, resets state between probes, and records baseline and perturbed responses.

It also computes the unweighted separation score and assembles a common result structure. Every member remains associated with its parameters, observations, and labels. This matters because the summary should be recoverable from the underlying runs rather than being an independent narrative written after the fact.

The common builder retains the full loaded network. A specification selects the populations to manipulate and measure, rather than automatically extracting an isolated subgraph. That is a real design choice: background pathways can contribute to a response, and the computational cost remains that of the larger model. A future isolated-circuit mode would need an explicit boundary rule for omitted inputs and outputs.

The shared machinery also inherits a base neuronal configuration. As Chapter 6 established, it differs from the embodied calibration. Reuse is therefore not enough to guarantee that every stage uses the same physical assumptions. The effective parameter configuration needs to be recorded with each run, including defaults that are easy to overlook.

## What cannot be shared without interpretation

The meaning of a response depends on the represented quantity. A heading probe needs circular statistics. A column-shift probe needs a coordinate mapping and a way to distinguish displacement from response loss. A memory-related probe needs pattern similarity, recruitment, and gain measurements.

These differences are handled by geometry-specific measurement components. The ring component estimates phase, concentration, width, and directional movement. The column component measures offsets and arm-specific responses. The pattern component compares activity vectors and drive-response relations.

A new operator can reuse the execution loop while still requiring a new measurement model. A motion correlator, for example, needs stimuli with controlled direction and speed, along with timing-sensitive responses. It would be misleading to declare support merely because the runner can stimulate its neurons and count spikes.

This boundary is scientifically healthy. It forces the question of what observation would establish the proposed computation. Automation should remove repeated bookkeeping, not remove the need to define the observable correctly.

The column-centroid issue from Chapter 10 illustrates the risk. A generic function can be perfectly reusable while computing the wrong coordinate average for a particular anatomy. The geometry component needs its own checks, including examples whose expected result can be reasoned through independently of the implementation.

## Comparing the two routes

The hand-written heading lab produced thirty silent, twelve tonic-supported attractor, and six filter members. The generic execution produced thirty, eleven, and seven. Both gave prominence to tonic excitation and the PEG and Delta7 interventions, while their precise scores differed.

The PFN lab produced thirteen shifted, fifty-five passthrough, and four silent members. The runner produced eleven, fifty-six, and five, and included an additional arm-coupling dependency in its attribution. The mushroom-body experiment was first executed through the generic pattern component and produced nine silent and nine collapsed members.

These comparisons support approximate consistency of the broad outcomes. They do not establish numerical equivalence. A difference of one or two members can be scientifically minor if it reflects a threshold boundary, but that explanation should be demonstrated from the member-level observations rather than assumed.

Shared code also limits independence. Agreement can show that the specification expresses the intended experiment, but it cannot independently verify the neuron kernel both routes use. A deterministic reference calculation or a separate implementation of a small case would test a different part of the system.

Exact agreement would not be suspicious by itself. It could be the expected result of identical inputs and operations. Likewise, small disagreement does not provide evidence of desirable independence. The cause of agreement or disagreement depends on what is shared and what differs.

## Preserving the argument with the result

A useful computational record contains more than the final winning experiment. It includes the seed, parameter grid, effective neuronal settings, selected population counts, coordinate convention, stimulus timing, continuous observables, classification thresholds, and perturbation outcomes.

The present artifacts retain many of these elements, including parameter combinations, classifications, ranked experiments, and selected cross-formalism comparisons. They do not yet eliminate every need to inspect the source for effective defaults or measurement details. The discrepancy between the prose and the ensemble builder shows why those omissions matter.

A generated report can reduce such drift. Population counts and class totals should be read from the same run being discussed. Mechanism summaries should state which subset they cover. If an analysis attributes mechanisms only for one arm, the denominator should remain visible when a broader hypothesis count is displayed elsewhere.

This is a place where software discipline directly improves scientific communication. A repeated number should have one computational origin. A report can then translate it into prose without manually maintaining conflicting copies. The reader should encounter an explanation, while the supporting record carries the exact accounting.

## How much has been compiled?

The system now has a real lowering boundary from candidate operator to an executable specification and then to an ensemble report. Common execution supports several distinct geometries. Adding an experiment within an existing geometry can largely become a matter of specifying populations, gains, and perturbations.

The choices of free axes and plausible ranges are still human-authored. So are the operator definitions and much of the interpretation of their outcomes. Automatically turning every edge class into a parameter would be easy to express and often impractical to execute. It would also assign complexity according to annotation granularity rather than biological uncertainty.

A better automatic proposal system would group parameters using physiological evidence, identify sensitivities, and refine the sample where predictions change. It would distinguish uncertainty in a measured quantity from uncertainty about the model class. These are substantive modelling problems, not the final few lines of routine automation.

The current compiler is therefore a reusable system for executing specified connectome-constrained hypotheses. It is not an autonomous discovery engine that recovers the complete programme of a nervous system. Its value is that a hypothesis can move through a common, inspectable process and return with its assumptions and failures attached.

## The next boundary to improve

Before adding many new operators, it would be useful to strengthen the contract of the existing ones. The same input should produce a traceable set of effective parameters. The same intervention should have a clearly defined mapping to an observable. Numerical differences between execution routes should be explained at the level where they arise.

That work may be less visible than detecting a fourth circuit, but it increases the value of every future result. A system that can execute many hypotheses quickly is useful only if the claims remain connected to what was actually executed.

The embodied model raises the same issue on a larger scale. There, several neural, sensory, physical, and behavioural components cooperate to produce movement. The next chapter follows those boundaries through the whole system, treating the moving fly as a demanding integration experiment rather than a substitute for circuit-level explanation.
