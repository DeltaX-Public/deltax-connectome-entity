# From Wiring Patterns to Candidate Computations

Recognising a familiar shape in a circuit is a powerful source of hypotheses. It is also a powerful source of mistakes. Once a diagram resembles a ring attractor or a random-projection memory, we begin to interpret ambiguous details in the language of that algorithm. The operator layer exists to make this transition explicit enough to inspect.

An operator is a proposed computation attached to a particular anatomical substrate. It names an input, a possible internal state, and an output. It also records the wiring measurements that motivated the proposal and the observations that would count against it. Its purpose is to connect structural analysis to an executable question.

For example, a ring operator takes directional sensory information and angular-velocity-related input, maintains a position on a circle, and exposes that position to a readout. The structural signature includes local recurrence, an inhibitory surround, and oppositely shifted pathways. The proposed semantics include persistence and directional updating. The signature and the semantics belong in the same entry, but they remain different kinds of evidence.

## A vocabulary with provisional meanings

The project uses an instruction-set analogy for its catalogue. In a processor, an instruction has an agreed meaning: adding two registers produces a specified result. A biological operator has a weaker status. Its meaning is proposed from anatomy and must be checked against dynamics and experiments.

The catalogue contains twelve detections, representing nine broad candidate operations plus lower-confidence detections under alternative criteria. The strongest ring candidate is accompanied by candidates for reciprocal competition, spatial shifts, motion correlation, repeated visual filtering, sparse memory-related processing, feedforward inhibition, population normalisation, and descending convergence.

Keeping weaker detections is useful when their failure is visible. A candidate that nearly satisfies a ring signature can show whether the detector depends on a specific spatial relation or merely on generic recurrence. If the catalogue displayed only accepted examples, it would be harder to see how selective its definitions really are.

The vocabulary is intentionally smaller than the list of anatomical cell types. Thousands of types may participate in variations of a few computational arrangements. Conversely, one type can participate in more than one operation, depending on state and pathway. There is no requirement that the brain partition neatly into one population per instruction.

This is one reason to avoid treating the catalogue as a literal program recovered from tissue. Biological circuits share components and interact continuously. The operator view is useful when it preserves a relationship that can be tested, rather than when it forces every connection into an engineering analogy.

## What the confidence scores do

The ring candidate receives a score of 0.70 in the existing catalogue. Reciprocal competition receives 0.60. Several visual, spatial-shift, and memory-related candidates receive 0.55, while the descending funnel receives 0.30. These numbers are hand-weighted combinations of evidence items.

They are not calibrated probabilities. A score of 0.70 does not mean that seventy percent of similarly scored anatomical patterns have been shown to be ring attractors. No such validation set has been established. Small differences between scores should therefore not determine a scientific conclusion.

The scores are better understood as a compact record of the detector's preferences. A highly specific spatial signature receives more support than generic convergence onto a small population. A realised inhibitory profile contributes differently from a raw contact-count pattern. The value lies in being able to inspect those contributions and disagree with them.

Even the phrase structural detection needs qualification here. Some catalogue entries incorporate dynamical checks from another stage, such as a realised Delta7 profile or a PEN push measurement. These entries combine anatomical and simulated evidence. Their subsequent agreement with those same checks cannot be counted as an independent success.

A future catalogue could make confidence more meaningful by evaluating detectors on a collection of circuits whose functions were independently established. It could then ask how often a signature generalises and how sensitive it is to thresholds. Until that exists, the evidence record is more informative than the decimal score.

## Making a prediction concrete

Take feedforward inhibition. The structural pattern says that a source reaches a target directly and through an inhibitory intermediary. A proposed temporal interpretation is that the target responds initially and is then suppressed. To test that interpretation, the model needs a stimulus with timing, an observable that measures temporal width, and an intervention that removes or weakens the inhibitory arm.

If the response broadens after that intervention, the outcome supports the proposed role under the tested conditions. If the response barely changes, several explanations remain: the arm may be weak, its timing may be wrong for this stimulus, another pathway may compensate, or the interpretation may be mistaken. An operator entry should make such alternatives easier to formulate rather than compress them into a binary success flag.

Reciprocal inhibition poses a related problem. A candidate competition circuit should be challenged with simultaneous drive to both populations, varying their relative strengths and initial conditions. A persistent winner, alternating activity, and a graded compromise are different outcomes. All can arise from superficially similar wiring. The experiment must measure the distinction that the operator claims to explain.

For a repeated visual kernel, a relevant question is whether a feature presented at different positions produces correspondingly translated responses. Similar input counts across columns motivate the question, but are not its answer. Weight variation, receptive-field boundaries, and nonlinearities can break transfer even when the average wiring looks repeated.

For mushroom-body processing, the prediction must be decomposed further. Sparse sensory expansion, activity regulation, associative learning, and downstream readout are separate capabilities. A direct Kenyon-cell probe of fixed output weights can examine only some of them. The broad memory label should never obscure that experimental scope.

## Geometry is part of the hypothesis

A computation often becomes recognisable only after choosing the space in which its signals live. A heading angle wraps around: north just clockwise of a reference and north just counterclockwise of it are nearby. A linear centroid calculation can place their average on the opposite side of the circle if it ignores that geometry.

The PFN experiment uses a different coordinate: an ordered set of columns. This makes centroid offsets easy to compute, but introduces questions about boundaries, missing columns, and the relation of that linear coordinate to the underlying anatomy. A position-dependent shift can reflect real circuit organisation, the stimulation protocol, or the measurement convention.

The mushroom-body probe has no comparable positional axis. It treats activity as a vector across cells and asks whether two vectors become more or less similar. Choosing cosine similarity makes the observable relatively insensitive to overall amplitude, which is useful for pattern comparison but means gain must be measured separately.

Thus geometry is not just a plotting decision. It determines what counts as agreement, what information the readout discards, and which failures remain visible. An operator specification should carry its geometry as explicitly as its population names.

## A worked transition to an ensemble

Suppose the detector finds a candidate ring. The obvious free quantities include local recurrent gain, inhibitory gain, shifted-pathway gain, and baseline excitability. The graph constrains where these quantities act, while the model family explores selected values.

The candidate's semantics suggest the probe. Initialise a localised activity pattern, remove the localising stimulus, and measure whether a coherent pattern remains. Then drive each directional arm and measure displacement. The counterfactuals suggest perturbations: weaken inhibition, remove the copy pathway, or reduce baseline excitation.

At this point the catalogue has become an executable investigation. The original detection did not establish that the circuit stores heading. It supplied a structured reason to ask a series of narrower questions. A persistent bump in some parameter settings would support compatibility. A failure in all sampled settings would motivate checking both the parameters and the model class. Neither outcome would enumerate every possible implementation of the anatomy.

The final result should therefore retain the route from substrate to test. Which spatial measurement motivated the ring? Which parameters were allowed to vary? Which background assumptions were held fixed? Which observation produced the outcome label? These are the details that turn a computational analogy into a scientific proposal.

## What the catalogue leaves open

There are many operations a detector built around familiar motifs will miss. Some computations may be distributed across several regions. Others may depend primarily on timing, intracellular dynamics, or learning rather than a distinctive cell-level pattern. An undetected operator is not necessarily absent from the brain.

There is also a selection effect in choosing attractive examples. A ring with an excellent cosine fit is easier to describe than a heterogeneous circuit whose role is uncertain. The catalogue should be read as the set of candidates the current detectors know how to propose, not an inventory of everything the connectome computes.

Within that boundary, the approach is useful. It reduces a large anatomical graph to a collection of questions with named substrates and explicit measurements. The ensemble method then asks how those questions behave when the unmeasured quantities vary. That is where a diagram begins to encounter the consequences of being made executable.
