# Reading the Connectome

The first modelling decision happens before a neuron receives a time constant. It happens when we decide what counts as a neuron, a connection, and an observation worth retaining. A graph can look like raw data while already incorporating thresholds, aggregation, and interpretation. Understanding that representation is the beginning of understanding every later result.

The project uses the male central nervous system reconstruction known as MaleCNS, version 1.0. Its packed graph contains 165,122 neurons assigned to 11,752 cell types. Connections with fewer than three reconstructed synapses have been omitted. The retained graph has 10,511,038 directed connections, representing 104,213,652 synaptic contacts. A connection can contain as few as three contacts or as many as 2,591.

These quantities describe different objects. If one neuron makes twenty contacts onto another, that contributes twenty synapses but one directed connection. If the second neuron also contacts the first, there are two directed connections. If both neurons belong to the same named type, a type-level graph may fold all of this into a single population relation. Confusing these levels can change a ratio by orders of magnitude while leaving the sentence around it apparently plausible.

The graph in this book is a thresholded derivative of the reconstruction. Its counts should not be read as totals for every synaptic contact in the original release. Later analyses sometimes impose stricter thresholds of five or six contacts, so even within the project there is no single graph size that describes every calculation. The threshold belongs with the result.

## Counting is not measuring strength

Imagine two connections with twenty contacts each. One lands near a region of membrane that strongly influences spike generation. The other lands on a distant branch. The postsynaptic cells may differ in size, resistance, receptor expression, and recent activity. Even if the contacts look equally convincing in the reconstruction, their electrical effects need not be equal.

The count is still valuable. Twenty observed contacts generally provides different anatomical evidence from one uncertain contact. Across a population, contact counts constrain where a model should place its interactions. But turning a count into conductance requires an additional rule. A global multiplier is one such rule. A multiplier adjusted for cell size is another. Neither becomes an observed physical quantity merely because it is applied consistently.

This distinction is especially important when a model fails. If a feedback loop is too weak, increasing its conductance may repair the result. That shows that the model can operate at a different gain. It does not establish that conductance was the only missing ingredient. The representation of the inhibitory cell itself may have discarded local dynamics, and the test stimulus may have driven the circuit outside the range in which the loop normally operates.

The project also measured how well connection counts compress. Encoding counts alone required about 4.04 bits per count; the best tested contextual encoding required about 3.95. The small difference says that those particular context models found little additional predictive information. It does not prove that counts are statistically independent of the rest of the graph. A better model might exploit a relation that these compressors missed.

There is a broader distinction here between a successful prediction and the absence of one. Finding a pattern is evidence that the pattern exists in the tested data. Failing to compress a variable further is evidence about the predictor as well as the variable. We will encounter the same logical asymmetry when a simulator fails to produce a computation.

## Labels carry assumptions and geometry

Each neuron is accompanied by annotations such as type, hemisphere, superclass, transmitter prediction, and volume. These labels make the graph tractable. They let us select all Kenyon cells, distinguish descending neurons from local interneurons, and compare homologous populations across the two sides of the animal.

Some labels contain spatial information. Instance names in the protocerebral bridge encode side and glomerular position. Names in the fan-shaped body can encode a column. Olfactory receptor-neuron names identify glomerular channels. A graph that appears to have no coordinates can therefore contain an implicit coordinate system in its annotations.

This is useful, but it changes what a discovery means. Recovering a ring from anatomically assigned column labels is a finding about connectivity organised by known position. It is not the same as discovering a circular latent space from an unlabelled adjacency matrix. Both are worthwhile tasks. Their inputs differ, and the claim should acknowledge the difference.

The same caution applies to type definitions. A fine type can preserve a distinction that disappears when several populations are merged. Conversely, an analysis at individual-neuron resolution can be dominated by repeated copies of a common cell type. There is no universally correct level of aggregation. The appropriate representation depends on whether the question concerns individual connections, repeated local circuits, or interactions between populations.

Positional labels also require a convention. Eight analysis bins around a full circle correspond to 45 degrees per bin. Sixteen anatomical wedges correspond to 22.5 degrees per wedge. A bridge coordinate is not automatically either one. The hemisphere mapping and the folding operation must be specified before converting an offset into an angle. In this book, measured offsets remain in their stated analysis coordinates unless an explicit conversion is justified.

## What a sign means in this project

A structural analysis often needs to distinguish excitatory from inhibitory connections. The project uses transmitter predictions to construct a sign proxy, but the proxy is not identical across all stages.

The stored fly sign representation treats acetylcholine as positive and GABA, glutamate, and histamine as negative. It also inherits positive contributions for monoamines in the convention used by the packed fly analysis. For neurons without a consensus transmitter assignment, the graded proxy combines the predicted probabilities: acetylcholine and monoamines contribute positively, while GABA, glutamate, and histamine contribute negatively. There are 3,602 neurons for which this graded treatment matters.

This explains why some dopamine-associated pathways appear among positive-positive motifs in the structural report. Such a motif is positive under the report's proxy. It is not proof that both pathways act as fast excitatory synapses in the animal. Transmitter identity alone does not determine receptor-specific effects or timescale.

The worm loader uses a different convention: acetylcholine is positive, GABA and glutamate are negative, and monoamines are zero. The embodied fly model introduces another distinction by treating octopamine as a slow modulatory influence rather than retaining its ordinary fast contribution. The circuit ensemble builder, meanwhile, uses the neuron model's transmitter table unless explicitly overridden. It does not automatically inherit every sign or parameter choice used by the embodied model.

These differences are part of the current method. A shared graph interface makes them visible; it does not make them disappear. Sign-conditioned comparisons must carry their conventions, and a future comparison should rerun both datasets under harmonised alternatives. In particular, glutamate's effect is a modelling assumption that can depend on receptors, rather than a universal inhibitory label.

Unknown and zero also need care. A neuron without a consensus call may receive a nonzero graded sign in one representation. A truly zero-sign connection contributes no fast effect in a particular simulation. Omitting an effect avoids inventing a direction, but it still changes the circuit. Silence caused by omitted inputs is not evidence that the biological inputs do nothing.

## A common representation

The intermediate representation keeps the information needed by generic analyses in a small number of conceptual groups. It records each cell's identity and classification, its side, its sign proxy, and whether it is treated as a sensory or motor boundary. It stores chemical connections as directed adjacency lists with contact counts. When electrical connections are available, it stores them separately as symmetric relations. Provenance accompanies these structures so that thresholds and conventions remain recoverable.

The chemical graph is represented sparsely. For each source neuron, the representation gives a contiguous list of target neurons and corresponding counts. It also records where each source's list begins and ends. This avoids allocating a square matrix with an entry for every possible pair of cells. Most possible pairs are absent, so a dense matrix would spend almost all its space recording zeros.

The significance of this choice goes beyond memory use. A shared representation means the flow calculation does not need to know which institution released the dataset or how its tables were arranged. The motif calculation sees a graph and an explicit sign convention. The loader is responsible for translating the source, and the analysis is responsible for interpreting the translated object.

That separation creates a useful check. The fly loaded through the common representation should reproduce the earlier fly-specific structural calculations when the thresholds and conventions match. If it does not, the disagreement is first a data-translation problem. There is little value in interpreting a cross-species difference until the same-species translation has been checked.

## Looking at another nervous system

The second loader reads the adult hermaphrodite worm connectome from Cook and colleagues' 2019 reconstruction as distributed through Netzschleuder. The resulting graph includes 454 cells, rather than only the 302 neurons conventionally associated with the animal, because the represented network also includes other cellular endpoints. It contains 4,879 chemical connections and 28,113 contacts under the project's processing choices. Bilateral homologues and serially repeated neurons are grouped into 169 classes.

Unlike the fly representation, the worm data supplies an electrical graph. Gap junctions can therefore remain a distinct edge type instead of being guessed from chemical wiring. That matters because a chemical synapse and an electrical connection do not have interchangeable dynamics. Combining them into an undifferentiated weight would simplify the interface by erasing a real biological distinction.

The common analyses produce striking contrasts. Under the chosen harmonic ordering, about 72 percent of worm chemical weight is classified as feedback, compared with about 12 percent in the fly. The fly instead has about half its weight classified as lateral. About 61 percent of worm cells belong to its largest strongly connected component, compared with about 97 percent of fly neurons. Reciprocal weight is closer: approximately 29 percent and 27 percent respectively.

These are descriptions of the processed graphs under a particular ordering. It would be premature to call one animal a feedback machine and the other a feedforward machine. Sensory and motor boundary annotations, cell inclusion, thresholds, and unknown transmitter assignments differ. The comparison shows that the same measurement can expose different organisation. Explaining how much of the contrast belongs to biology requires controlling the representation choices.

Transmitter coverage is a particularly large limitation. About 62 percent of worm weight is unsigned under the selected table, compared with roughly half a percent of the fly's stored weight. A sign-conditioned worm motif census therefore observes a much less complete effective graph. Missing signs are not a small correction that can be ignored after quoting the counts.

## What survives compression

A different kind of compression reveals useful regularity in the fly. Renumbering neurons by type and then by the spatial position of their skeleton centroids reduced the estimated cost of target identities from about 11.8 to 8.2 bits per connection. Around 28 percent of a neuron's targets also appeared among the preceding neuron's targets in this ordering.

Here the positive result is direct: type and position help predict connectivity in the tested encoding. Neighbouring, similarly classified cells have overlapping target repertoires. That regularity motivates population-level analyses and repeated-kernel interpretations, while leaving room for individual exceptions.

The representation still omits important physical information. It does not supply a full receptor map, cell-specific membrane dynamics, or all electrical coupling. It drops weak connections at packing time. A skeleton centroid also compresses an extended, branching cell into one location. These choices make the system analysable, and each one limits a different class of inference.

By the end of this stage we have a graph whose meaning can be stated precisely. We know what its weights count, how its signs were assigned, which coordinates came from annotations, and which source distinctions survived translation. That is enough to ask substantial structural questions. It is also enough to recognise why a structural answer cannot silently become a complete dynamical explanation.
