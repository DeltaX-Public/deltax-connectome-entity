# What Does a Wiring Diagram Actually Compute?

Imagine being handed a map of every road in a country. The map is extraordinarily detailed. It includes the narrow lane behind a house, the motorway connecting two cities, and the junction where several routes meet. You can answer questions that were previously impossible to ask. You can find bottlenecks, identify isolated regions, and work out where a new bridge would make the largest difference. But the map does not tell you where people will drive tomorrow morning. For that you need to know something about the people, their destinations, the traffic rules, and the conditions on the road.

A connectome creates a similar opportunity in neuroscience. It is a reconstruction of neurons and their connections, detailed enough to let us follow pathways through a nervous system. The male fruit-fly dataset used in this project contains 165,122 neurons in its packed representation. After the project's connection threshold is applied, the graph contains about 10.5 million connections accounting for 104 million reconstructed synaptic contacts. These are measurements of a particular representation of a particular animal, rather than a universal specification of a fly.

The immediate temptation is to load the graph into a simulator and press play. That is a reasonable experiment. We will do it. But there is a question to settle before deciding what its output means: how much of the resulting behaviour came from the wiring, and how much came from the choices required to make the wiring executable?

A synapse count has to become an electrical effect. A neuron has to acquire a threshold, a resting potential, and a rule for integrating its inputs. Some neurons communicate through spikes; others carry graded signals. A body has to turn neural activity into forces, and sensors have to turn light, contact, and chemical concentration back into neural activity. Each choice supplies information. Some of that information comes from experiments. Some comes from mathematical convenience. Some remains an educated guess.

This book follows an attempt to make those choices visible. Its central object is the space of candidate computations that survives after we account for what the wiring actually constrains.

## From a map to a hypothesis

Consider a group of neurons arranged around a circle. Nearby neurons excite one another, while a second population suppresses activity on the opposite side. It is natural to suspect that the circuit can maintain a localised patch of activity. The position of that patch could represent an angle: which direction the animal faces, for example.

Already we have crossed several boundaries. The arrangement around a circle is an anatomical observation. The excitation and inhibition depend partly on transmitter assignments and receptor assumptions. The stable patch is a dynamical hypothesis. The interpretation of its position as heading is a hypothesis about representation. These statements support one another, but they are different statements.

To see why the distinction matters, keep the connections fixed and lower the excitatory gain. The patch may disappear as soon as the input stops. Raise the gain too far and activity may spread around the whole circle. Change the resting excitability and the same graph may alternate between silence and a persistent patch. None of these outcomes changes which neurons are connected.

The wiring has narrowed the possibilities. It has made a heading memory plausible and supplied a geometric explanation for it. It has not selected an operating point. A useful analysis should therefore return more than an attractive simulation. It should describe where the candidate computation appears, which assumptions it needs, and what could distinguish it from a different computation using the same connections.

That is the motivation for treating connectomics as a problem of constrained inference. We start with anatomy, propose a family of dynamical models, and ask what remains true as the unmeasured quantities vary. When the models disagree, we ask which intervention would make that disagreement observable.

## Why the compiler analogy helps

A compiler turns a program written in one language into something that can run in another. It usually does this through intermediate representations: simplified descriptions that make particular properties easier to analyse. A compiler can check types before allocating registers because the two tasks need different views of the same program.

The project uses a related organisation. It first turns the connectome into a common graph representation. It measures recurrence, inhibition, convergence, and spatial organisation. It interprets combinations of those measurements as candidate computational operators. Each supported operator can then be connected to a specification of model parameters, stimuli, observables, and perturbations. An execution stage runs the resulting ensemble and records how its members differ.

There is a limit to the analogy. An ordinary compiler begins with a program whose semantics are already defined. A connectome does not arrive with such a definition. No language specification tells us that a particular reciprocal loop must store a memory or compare two choices. The inferred computation is part of what we are trying to learn.

It is therefore helpful to think of the system as a decompiler that produces hypotheses. It tries to recover candidate computations from the physical organisation of a machine, while retaining the uncertainty that ordinary decompilation often hides. The product is a set of executable possibilities and a way to investigate them.

This organisation also makes errors easier to locate. If an analysis reports a circular structure, we should be able to inspect the positional mapping that produced the circle. If a model uses inhibitory connections, we should be able to recover the sign convention. If an experiment is ranked highly, we should be able to see the particular members and outcome categories responsible for its score. The chain of reasoning should survive inspection at every stage.

## What counts as agreement

Suppose two models follow the same moving landmark. Their decoded heading traces overlap almost perfectly. It would be easy to treat them as equivalent explanations of the circuit.

Now suppose one maintains its estimate through strong local recurrence, while the other is continuously refreshed by external input. Remove the landmark and the models separate. Or suppose both remember heading in darkness, but one depends on an inhibitory population that the other can lose without difficulty. Silencing that population separates them even when the original task does not.

Agreement on behaviour is therefore only one kind of agreement. Neural activity can reveal differences that a behavioural score hides, and perturbations can reveal differences that ordinary activity hides. A convincing explanation should make contact with all of them, at the level of detail relevant to its claim.

This does not mean every model must reproduce every spike. A model of heading estimation may reasonably compress thousands of spikes into one angle. But the compression should preserve the distinctions we care about. If two mechanisms make different predictions about bump width after inhibition is reduced, a single heading-error score cannot settle the dispute.

The ensemble approach uses these differences constructively. Rather than asking which parameter setting makes the most appealing demonstration, it asks which candidate experiment divides the sampled models into different outcomes. The first implementation uses a simple, unweighted pair-separation score. That is a starting point for experimental design, with important limitations that we will examine. It is not yet a calculation of the best experiment an animal laboratory should perform.

## The three circuits

The investigation begins with the heading circuit in the central complex. This is a useful starting point because anatomy and physiology have already given it a substantial interpretation. A localised activity bump tracks heading, and several named populations participate in stabilising and updating it. The project can ask whether its structural analysis recovers the relevant organisation and whether its models reproduce particular responses.

A known circuit is an unusually demanding test if we resist putting the answer into the detector. It lets us separate rediscovering an anatomical pattern from predicting a physiological outcome. It also exposes the temptation to use familiar biology as background knowledge and then quietly count agreement with that same biology as validation.

The second circuit connects PFN neurons to hΔB neurons in the fan-shaped body. Here the candidate computation is a transformation between spatial representations. The wiring contains systematic column offsets, which suggest a shifted output. The experiment asks whether the dynamical response behaves like a fixed shift and whether recurrent pathways are required to produce it.

The third circuit is the mushroom body. Its expansion into Kenyon cells, extensive inhibitory feedback, and compartmental output suggest a family of memory-related computations. The implemented experiment is narrower: it probes response separation and gain under direct Kenyon-cell stimulation. It does not exercise the full sensory expansion, and it does not train and retrieve an association. Recognising that boundary turns out to be essential to interpreting its negative result.

Together these cases test different kinds of observable. Heading lives on a circle. The PFN experiment uses a column coordinate. The mushroom-body probe compares patterns of activity without requiring a spatial axis. This variety makes it harder for the machinery to succeed merely because every question has been made to resemble the first one.

## The body as an integration test

A second branch of the project connects the neural simulation to a fly body with physical joints, muscles, and senses. This branch is visually compelling, but its scientific role is easiest to understand as an integration test.

A circuit can behave sensibly under an isolated stimulus and become unstable when its output changes its own input. A moving foot produces touch. A turn produces optic flow. A grooming leg can enter the visual field. Once those loops close, a model must distinguish an external event from a consequence of its own action, or tolerate the consequences of failing to distinguish them.

The embodied model also makes supplied behaviour unusually visible. If a stepping generator sits between descending neurons and the legs, walking in the animation is evidence about a combined system. If a separate process schedules bouts of activity, spontaneous movement does not show that the neural graph generated the bout statistics. Those additions may be useful and well grounded. Their location in the causal chain determines what the demonstration establishes.

We will therefore follow the signal far enough to ask where a decision, a rhythm, or a correction entered. The relevant boundary is between a component's observed contribution and the larger behaviour that depends on several components together.

## Reading the investigation

The foundations chapters introduce the dataset, its intermediate representation, and the structural patterns that motivate the candidate operators. The method chapters explain how an operator becomes a sampled model family and how perturbations expose differences within it. The circuit chapters then work through the consequences, including cases where the first interpretation has to change.

The assessment chapters ask whether a reduced heading estimator is useful as an engineering algorithm, how much of the pipeline is actually generic, and what happens when the model is embodied. The appendices explain how to trace results to their computational and scientific sources without interrupting the main argument with implementation instructions.

A recurring observation will be that a compelling structural signature does not guarantee the proposed computation in the models tested. The earlier draft described this as structure overstating what dynamics delivers. That phrase captures the experience of the investigation, but it needs a careful reading. The dynamics are hypotheses too. Failure can reveal an unmeasured parameter, an unsuitable neuron model, a missing input, or a poorly chosen probe. It does not by itself reveal which explanation is correct.

The useful outcome is a more specific question. Why did the bump disappear? Which recurrent pathway supported the shift? Would the inhibitory neuron behave differently if its activity were graded and local? What observation would separate these explanations? A connectome becomes scientifically more valuable when it helps us ask such questions precisely, even when it cannot yet answer them.
