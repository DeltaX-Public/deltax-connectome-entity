# Structure Before Dynamics

A nervous system can be examined without simulating it. Paths reveal where influence could travel. Reciprocal connections reveal where feedback could occur. Population structure reveals repeated patterns that might implement similar operations in different places. These observations do not require us to choose a membrane time constant, and that independence is useful: they provide constraints against which later dynamical models can be checked.

The difficulty is that graph measurements are often easier to compute than to interpret. A short path is not a processing time. A large eigenvalue is not an observed instability. A frequent motif is not an algorithm. This chapter develops the measurements alongside the distinctions needed to use them.

## Short routes through a recurrent network

Start at every annotated sensory neuron and follow connections containing at least five synapses. For each cell, record the shortest number of steps from any sensory source. About 15,900 cells begin at the sensory boundary. Another 27,500 are one step away, about 84,700 are two steps away, and about 35,200 are three steps away. Only a small remainder is farther away or unreachable under this threshold.

Descending and motor populations also have short available routes from sensation. Roughly half the descending neurons are one step from a sensory neuron, and most of the rest are two steps away. Of 708 motor neurons, 465 have a direct sensory connection in this graph.

These numbers show widespread opportunities for rapid access. They do not bound the depth of the computation that a cell participates in. Consider a motor neuron with both a direct touch input and a long pathway through several interneurons. Its shortest sensory distance is one, even if the long pathway determines most of its behaviour. Adding a direct connection can collapse a shortest-path statistic without removing any of the deeper computation.

The same applies to time. A direct but weak connection may have less influence than a longer, stronger pathway. Recurrent activity can keep information in circulation, but long feedforward routes can also coexist with short ones. The graph therefore supports the conclusion that short sensorimotor routes are common. It does not support the stronger conclusion that all extended processing must occur through recurrence.

To describe the network more continuously, the project assigns a harmonic depth. Sensory cells are fixed at one boundary and motor or efferent cells at the other. Intermediate cells receive positions determined by an averaging relation over their partners. This produces an ordering in which antennal-lobe local neurons are close to sensory inputs, projection neurons and Kenyon cells lie somewhat farther along, and descending and nerve-cord populations lie nearer the motor boundary.

Relative to this ordering, approximately half the fly's synaptic weight is lateral, 37 percent is forward, and 12 percent is feedback. The rounded shares do not sum exactly to one. More importantly, the words forward and feedback refer to this inferred ordering. They do not identify a universal sequence through which every signal must pass.

## What it means to belong to one loop

A strongly connected component is a set of nodes for which every node can reach every other by a directed path. About 160,500 neurons, or 97.2 percent of the packed fly graph, belong to one such component. This includes the central populations through which sensory interpretation and motor control interact.

The result rules out a picture of the central nervous system as a collection of wholly isolated boxes. There are routes connecting the boxes in both directions. But strong connectivity is a topological property. It says nothing by itself about whether an influence is strong enough, fast enough, or active in the relevant state to matter physiologically.

A useful analogy is a railway network. If every station can eventually reach every other, the network is strongly connected. That does not imply that a train from one station arrives at every destination within an hour, or that every route carries comparable traffic. The distinction is especially important in a neural graph whose paths can include inhibitory and modulatory interactions.

Reciprocity gives a more local view. About 19 percent of directed connections have a connection in the reverse direction, and these reciprocal connections account for about 27 percent of retained synaptic weight. Mutual influence is therefore common even before considering longer loops.

Under the stored fly sign convention, positive-negative reciprocal pairs are the largest category: about 616,000 neuron pairs, compared with roughly 264,000 positive-positive and 126,000 negative-negative pairs. These counts motivate a serious role for feedback inhibition. They do not establish that every positive-negative pair implements stabilisation; delays, operating points, and indirect pathways can change the outcome.

## Inhibition and the left-right problem

The structural sign proxy assigns about 61 percent of synaptic weight to the positive side and 38 percent to the negative side. The median neuron receives around 44 percent of its input weight from negatively classified sources, with considerable variation across cells and regions. Central-complex populations receive a particularly large inhibitory share, while Kenyon cells and mushroom-body output neurons have smaller shares by count.

A proportion of inhibitory contacts is not the same as a proportion of inhibitory current. Nevertheless, it makes clear that inhibition is a substantial part of the architecture. A model that treats it as a small correction to excitation has already made a strong assumption about relative efficacy.

Connections crossing the midline account for about 22 percent of weight across the full graph. The proportion is low in the optic lobe and much higher among ascending, descending, and nerve-cord populations. Crossing connections are also more often assigned an inhibitory sign than connections that stay on one side.

This organisation suggests several possible uses. Inhibition can coordinate opposite sides, prevent conflicting actions, or sharpen the difference between competing sensory estimates. The strongest mutual inhibitory relations between homologous types include ring-neuron populations associated with the central complex. Yet an inhibitory bridge does not tell us whether the two sides alternate, select a winner, settle into a compromise, or remain inactive. Those are alternatives for a dynamical test.

Bilateral comparison is valuable for another reason. A reconstruction of one animal need not be exactly symmetric. Some differences may be biological; others may involve reconstruction or annotation. A model can amplify a small asymmetry into a persistent turn. Before interpreting such a turn as a neural strategy, we should inspect the symmetry of its inputs and the sensitivity of the readout.

## From recurring patterns to motifs

To count population motifs, the project aggregates the graph into its 11,752 types. It retains a type-to-type relation when the total contact count and the count per target neuron both exceed specified thresholds. Under the chosen rule, the resulting graph has about 473,500 directed type relations.

One common pattern is feedforward inhibition. An excitatory source reaches a target directly and also reaches an inhibitory population that projects to the same target. In the fly report, about 80 percent of strong positively classified type relations have such a parallel inhibitory route.

The motif is compatible with several computations. If excitation arrives first and inhibition follows, the target may respond mainly to changes or brief coincidences. If inhibition scales with broad population activity, the same wiring can contribute to gain control. If the inhibitory population has a different sensory tuning, it may implement competition between features. The graph identifies a route through which these effects could arise; it does not select the timing or tuning.

Another pattern is reciprocal inhibition. Two populations suppress one another. With sufficient gain and appropriate self-support, such a circuit can favour one state over the other. With different delays or adaptation it may alternate. With weaker coupling both populations may remain active. Calling it a winner-take-all candidate is reasonable as long as the word candidate survives into the interpretation.

The analysis also finds inhibitory populations whose main input group is also their main output group. APL, associated with the mushroom body, is a prominent example. Antennal-lobe local neurons and Delta7 in the central complex show related population feedback. This is a useful structural signature for regulation, but broad coverage does not prove that a neuron computes one global population total. Spatially local processing within an extended cell can matter even when the cell-level graph has collapsed it into a single node.

Feedforward loops, in which an indirect path accompanies a direct one, are also abundant. An excitatory intermediate can reinforce or delay a response; an inhibitory intermediate can truncate or oppose it. The same three-node drawing can produce different temporal computations when its synaptic and cellular dynamics change. For that reason, the catalogue records possible semantics separately from the measured motif.

## Is the organisation surprising?

Large populations make many motifs almost inevitable. If one type connects to thousands of targets, it will participate in many triangles even in a largely shuffled network. Raw motif counts therefore need a comparison that preserves obvious sources of combinatorial abundance.

The project's null model rewires the type graph while preserving in-degree, out-degree, and source-sign constraints. The identities of connected partners change, while each type retains its broad connectivity budget. This asks whether the observed pairing of populations contains organisation beyond those retained statistics.

The answer is substantial under this null. Feedforward inhibitory coverage falls from about 80 percent in the observed graph to about 25 percent in the rewired graphs. Positive-positive reciprocal pairs fall from 8,272 to a null mean of about 526. Negative-negative reciprocal pairs fall from 6,375 to about 282. Both coherent and incoherent feedforward-loop counts also fall sharply.

The reported standardised deviations are very large, often several hundred null standard deviations. They should be read as descriptive contrasts against six rewired samples, not as calibrated probabilities of a biological hypothesis. Six samples provide only a rough estimate of null variance, and preserving degree does not preserve spatial locality, developmental constraints, or every feature of type composition. A more demanding null could retain some of these features too.

There is also a useful control. The total number of inhibitory-to-inhibitory edges remains unchanged under the stated rewiring constraints. A statistic that the null is designed to conserve should remain conserved. This helps check the manipulation without turning every observed quantity into an apparent discovery.

The defensible conclusion is that the arrangement of partners contains substantial structure beyond the chosen degree constraints. That supports further investigation of the motifs. It does not make a particular proposed computation hundreds of standard deviations more likely.

## What the spectrum can reveal

Treating the signed contact-count matrix as a linear operator offers another view. Its largest-magnitude modes identify patterns that are strongly coupled under the selected weights and signs. In the fly calculation, the spectral radius is about 3,771, and the leading eigenvector is concentrated on a small effective population, with a participation ratio of about fifty cells. Much of its mass lies among antennal-lobe local neurons.

A participation ratio describes concentration. A vector spread evenly over many cells has a large effective support. A vector dominated by a few cells has a small one. The result therefore points to a local set of strongly interacting populations inside a much larger graph. It provides a candidate circuit to inspect without requiring an annotation that labels those cells as a dynamical centre.

The raw spectrum does not establish instability of the biological network. For a simple rate model, local stability depends on the Jacobian of the dynamics, which includes leak, gain, and the derivative of the input-output nonlinearity at the operating point. A large eigenvalue of an uncalibrated count matrix becomes relevant only through those factors. In a conductance-based spiking model, the relation is more complicated still.

The worm analysis places its leading mode among head-steering populations such as RMD, RIA, and SMD. That is an interesting convergence with known anatomy. It remains a statement about the signed representation and its incomplete transmitter coverage, rather than a direct measurement of the animal's dominant oscillation.

These structural passes leave us with a more organised set of questions. We know where inhibition, recurrence, and repeated spatial patterns are concentrated. We know which observations depend strongly on aggregation and sign conventions. The next task is to look at individual regions closely enough to propose computations whose successes and failures can be measured.
