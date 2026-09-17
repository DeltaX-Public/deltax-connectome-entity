# A Journey Through the Circuits

A global graph statistic can tell us that recurrence is common without telling us why a particular loop exists. To move from organisation to computation, we need to follow signals through identifiable populations. This chapter takes that closer view. The aim is to understand why several algorithmic interpretations are tempting, and what additional evidence each interpretation would require.

The anatomical names can initially feel like an obstacle. It helps to treat them as addresses. An address lets us return to the same population when a hypothesis becomes an experiment. We need not memorise every label, but we do need to preserve the difference between a named group of cells and a function that we hope those cells perform.

## Smell begins with channels

The antennal lobe receives olfactory input through glomeruli, local regions associated with particular receptor channels. In the project's census there are fifty glomeruli, 2,562 olfactory receptor neurons, 267 uniglomerular projection neurons, and about 420 local neurons. A typical glomerulus contains a few dozen receptor neurons and a handful of projection neurons.

The direct receptor-to-projection wiring is remarkably channel-specific. About 96.6 percent of its weight remains within the same glomerulus. Each projection neuron receives from a median of thirty-eight receptor neurons, and each receptor neuron reaches about four projection neurons. This looks like a system that pools repeated measurements while retaining channel identity.

Pooling is useful when several receptors carry related signals. A downstream cell can combine their activity instead of relying on one noisy input. But preserving a channel is not the same as preserving an unmodified signal. The antennal lobe also has extensive local interactions that can change the gain and selectivity of the projection-neuron response.

Receptor neurons make about 537,000 contacts onto local neurons, compared with about 414,000 onto projection neurons. Local neurons often span multiple glomeruli: the median cell receives from eight and projects to fifteen, while broadly connected examples cover most of the fifty. They also return approximately 169,000 contacts to receptor terminals. Such connections provide an anatomical route for presynaptic regulation of sensory transmission.

The local network is itself densely interconnected. Local-to-local weight exceeds local-to-projection weight, and its transmitter assignments are mixed. Some local cells are GABAergic or glutamatergic under the project's inhibitory convention; others are cholinergic. The latter include populations with very large outputs onto projection neurons.

This makes the circuit more interesting than a bank of independent labelled lines. Odour identity enters through relatively separate channels, while a broad network can regulate those channels in relation to one another. Whether this produces useful normalisation or excessive mixing depends on the dynamics. In the embodied calibration, downstream odour specificity remained poor across the tested configurations. The broad cholinergic pathways are plausible contributors, but their contact counts alone do not identify the cause of the failure.

## Two routes out of the antennal lobe

Projection neurons distribute information to both the lateral horn and the mushroom body. In the structural report, total weight to the lateral horn is about 1.036 times the weight to Kenyon cells. The two destinations therefore receive comparable anatomical investment under this measure.

The lateral horn contains about 2,028 neurons in 422 types. Most are classified as output cells, while the remainder are local interneurons. A typical output cell pools input from around six projection-neuron types, and its strongest projection-neuron type contributes about a quarter of that input. This suggests combinations of channels rather than a simple copy of one glomerulus.

The common description of the lateral horn as an innate pathway and the mushroom body as a learned pathway is useful orientation. It should not suggest two sealed systems. Mushroom-body output neurons contact lateral-horn populations, and the horn reaches descending pathways. Learned information can therefore influence circuitry associated with innate responses.

Imagine an odour that normally elicits approach but has recently predicted an unpleasant outcome. The anatomical convergence provides places where a learned signal could modify the original response. The graph does not reveal the learned weight or the decision rule. It tells us where to look for the interaction.

## Expansion into Kenyon cells

The mushroom body presents one of the most recognisable computational arrangements in the connectome. A smaller population of projection neurons supplies a much larger population of Kenyon cells, each of which samples a small subset of the available inputs. The resulting representation can distinguish combinations of sensory channels that were less separable in the input.

The denominator matters when describing this expansion. The broad census includes 686 projection neurons, giving 4,064 Kenyon cells an expansion ratio of about 5.9. Among the 282 projection neurons identified as reaching the calyx, the ratio is about 14.4. Relative to the 267 uniglomerular projection neurons, it is about 15.2. These are different population comparisons, not competing estimates of one number.

A typical Kenyon cell samples about five projection neurons, with most sampling between three and eight. Each calyx-projecting neuron reaches a median of about fifty-six Kenyon cells. The sampling is relatively heterogeneous: the mean absolute correlation between projection-neuron target patterns is about 0.023, compared with about 0.013 after shuffling. This supports a weakly structured expansion, rather than literal independent random wiring.

To understand why sparse sampling might help, consider two odours that activate largely overlapping input channels. A cell requiring a conjunction of several inputs may respond to one combination but not the other. A large population of such cells offers many opportunities for differences to become visible. Whether the actual responses are sparse and separated depends on thresholds, inhibition, and input statistics as well as on the sampling pattern.

Not every Kenyon cell belongs to the same olfactory route. The census contains 283 with no projection-neuron input under its selection, many belonging to subtypes associated with other sensory modalities. This is another reason to keep the selected population explicit. An apparent missing input can represent a different sensory pathway rather than an incomplete cell.

## Feedback and teaching in the mushroom body

Kenyon cells have extensive reciprocal contact with the two APL neurons. The report records about 210,000 Kenyon-to-APL contacts and 196,000 in the reverse direction, with complete Kenyon-cell coverage under the selected graph. This is a strong anatomical basis for feedback inhibition.

It is tempting to draw APL as a single box that sums all Kenyon-cell activity and returns one global inhibitory signal. That is a modelling choice. Broad innervation does not imply that activity mixes uniformly throughout an extended neuron. Chapter 11 examines why a point-neuron approximation is especially consequential here and why a failed gain-control test cannot be attributed to synaptic strength alone.

The output stage contains ninety-seven mushroom-body output neurons, each receiving from a median of 313 Kenyon cells. A Kenyon cell reaches a median of eleven output neurons, and the total Kenyon-to-output weight is about 439,000 contacts. These outputs form a distributed readout of the expanded activity pattern.

Dopaminergic neurons add another anatomical relation. Roughly 340 cells in the selected teaching populations contact Kenyon-cell axons and output compartments. About seventy percent of dopamine-to-output-neuron weight lands in the matching compartment. This organisation is consistent with compartment-specific modification of the readout, but the learning rule and the history of learned values do not arrive with the graph.

The distinction between architecture and an executed memory is straightforward. A memory experiment must change something through experience and then test whether later behaviour or neural output depends on that change. A graph containing candidate teaching pathways is evidence for where such plasticity could act. A probe of fixed weights, even in the correct anatomy, does not by itself test learning.

Outputs from different mushroom-body compartments later converge on shared targets, including descending populations. The compartmental organisation therefore supports several stages of interpretation: sensory expansion, activity regulation, plastic readout, and recombination into action-related signals. Collapsing them into one label such as associative memory can be convenient, provided each experimental claim identifies which stage was actually exercised.

## A compass made of populations

The heading circuit uses populations associated with the ellipsoid body and protocerebral bridge. EPG neurons provide the principal measured heading representation. Delta7 neurons contribute an inhibitory pathway. PEG and PEN populations participate in recurrent and shifted pathways. Anatomical labels allow the project to assign these cells positions on an analysis ring.

The two-hop EPG-to-Delta7-to-EPG pathway has a striking spatial profile. At the source position the structural measure is about 115 in the report's units; halfway around the eight-bin ring it reaches about 1,770, before falling again toward the starting position. A constant-minus-cosine fit explains approximately 99 percent of the profile's variation.

This is the sort of interaction one would choose when designing a ring attractor. Activity near one position receives comparatively little inhibition from that pathway, while activity far away receives more. Local excitation can then support a patch that suppresses competitors at distant positions. The wiring also contains same-column EPG recurrence and reciprocal EPG-PEG connections, supplying plausible routes for local reinforcement.

The cosine fit is a property of an aggregated path-weight profile. It is not a measurement of a postsynaptic current. In a probe of the calibrated whole-brain model, the realised inhibitory profile retains the broad orientation but has a much weaker cosine fit, around 0.56. That difference records a change between two representations. It could involve response nonlinearities, sampling, and the probe, as well as the particular weight calibration.

The PEN pathway adds spatial asymmetry. Left and right populations return to different positions relative to their input. In the chosen folded coordinate, typical offsets are approximately positive 1.47 and negative 1.45 bins. Pooling the sides would make the average look close to zero and hide the organisation relevant to directional updating.

These offsets must not be identified directly with a 22.5-degree anatomical wedge. The project uses an eight-bin coordinate for several analyses, and the relation between bridge positions, hemispheres, and ellipsoid-body wedges needs to be carried through explicitly. What the structural result securely shows is a pair of oppositely oriented pathways. A calibrated angular-velocity transformation requires more work.

Ring-neuron populations supplying the compass also show strong mutual inhibition and disinhibitory chains. This gives the heading system several possible sources of regulation. A model that assigns all inhibition to Delta7 is a simplification of that anatomy, and Chapter 9 shows why that simplification matters when Delta7 output is reduced.

## Shifts in the fan-shaped body

Behind the compass are column-organised pathways associated with movement and steering. Connections between PFN and hΔB populations have systematic offsets in the anatomical column labels. The structural histograms peak near negative three columns for one PFN arm and positive two for the other.

A first interpretation would be a fixed coordinate shift. Drive one input column and obtain a correspondingly displaced output. But a histogram of contacts cannot tell us whether the resulting response is a rigid translation, a position-dependent transformation, or a recurrent computation whose output happens to have a displaced centroid.

The fan-shaped-body graph contains the recurrent connections needed to make these alternatives substantive. PFN populations have self-recurrence, hΔB cells have internal interactions, and hΔB projects back to PFN. A static drawing focused on the feedforward projection can leave all three out while still looking anatomically convincing.

The circuit also has unequal population sizes and unequal inputs across its arms. Forty PFNd cells and twenty PFNv cells do not necessarily provide comparable drive merely because each arm has a clean peak in an offset histogram. Chapter 10 follows this asymmetry into the executable models and separates what was tested on the two arms.

Downstream populations such as PFL3 and PFL2 contact descending pathways associated with steering. This provides a route by which internal spatial representations could influence movement. It does not establish that every intermediate is performing an independently identifiable coordinate transform. The operational question is whether an input-output relation survives changes of position, amplitude, and recurrent support.

## Repetition in vision

The optic lobe offers a different structural regularity: many copies of related local circuitry across visual space. Forty-seven types have at least six hundred instances. For some strong type pairs, nearly every source neuron connects, partner counts are relatively consistent, and total connection weight varies within a limited range.

This resembles a shared spatial kernel. A local operation is repeated across the eye so that a feature can be detected at many positions. Some pathways are close to one-to-one, while others connect across several columns. The correspondence with convolution is useful, although finite boundaries, variable weights, and anatomical irregularities prevent it from being exact weight sharing in the engineering sense.

The lamina pathways also separate into channels. L1 strongly contacts populations such as Mi1 and Tm3, while L2 strongly contacts other populations including Tm1, Tm2, and Tm4. This block structure is associated with the ON and OFF organisation of visual processing.

Direction-sensitive T4 and T5 subtypes provide another repeated pattern. The four T4 subtypes have very similar input compositions, with full input-vector cosine similarities around 0.93 to 0.95. Their spatial arrangements differ. Similar ingredients at different offsets are consistent with a bank of related directional filters.

Timing is indispensable to that interpretation. Two signals arriving from neighbouring columns do not reveal motion direction merely because both are present. Their relative timing and nonlinear combination determine which direction is preferred. The anatomy supplies candidate inputs and offsets; a motion model must also specify delays and dynamics.

Wide-field neurons then pool many local detectors. Horizontal-system populations receive from hundreds of selected T4 and T5 cells, while other lobula-plate populations pool different subtypes. This changes the scale of the representation, allowing local feature measurements to contribute to broad motion signals. Thousands of visual projection neurons subsequently distribute specialised outputs to the central brain, where visual information meets other senses and internal state.

## From sensation to action

The descending system contains 1,314 neurons in the project's census. They receive a relatively small share of total brain output weight, yet each typically combines input from many types. The median descending neuron receives about 1,722 contacts from eighty-seven types.

Calling this a command bottleneck is suggestive, but the population includes different functions. Convergence could reflect action selection, sensory integration, state-dependent gain, or communication to specialised motor circuits. A narrow anatomical channel need not carry a single central decision.

Descending neurons also contact one another, and their output largely reaches nerve-cord interneurons rather than motor neurons directly. Only about six percent of descending output goes straight to motor cells. Ascending pathways provide substantial return input to descending populations, so the arrangement includes feedback from the body-related circuitry it influences.

The motor census contains 708 neurons. A typical motor neuron receives from many premotor partners, with a large inhibitory share and a strong contribution from nerve-cord interneurons. Motor neurons of the same type and side share premotor partners much more often than random pairs do. This is consistent with coordinated pools, although the timing required for posture and stepping is not given by shared input alone.

Escape makes the completeness problem especially concrete. The giant fibre receives convergent visual input, including LC4 and LPLC2 pathways, and is associated with rapid jump and takeoff responses. Yet a chemically reconstructed graph does not supply every relevant electrical connection. The embodied implementation adds a known giant-fibre-to-jump-motor pathway that was absent from the packed chemical representation. The resulting behaviour belongs to the augmented model.

## State within the network

Small populations associated with circadian timing, sleep need, peptides, and monoamines interact extensively with fast sensorimotor circuits. In the selected state-cell census, the largest measured exchanges are with the central complex, with roughly 111,000 contacts in one direction and 101,000 in the other.

This organisation makes state-dependent behaviour plausible without placing state in a separate control centre. The compass can influence state-related populations, and those populations can influence the compass. Descending and mushroom-body outputs also receive state-associated contacts.

The difficulty is that a modulatory contact often needs information the graph does not carry. Which receptor is present? Does activation change threshold, adaptation, synaptic release, or another process? Over what timescale? Uniformly lowering the thresholds of all anatomical targets is one executable hypothesis, but it is a strong simplification.

The regional tour has now supplied a vocabulary of possibilities: channel pooling, population regulation, sparse expansion, persistent spatial state, directional updating, repeated visual filtering, and distributed motor control. Each possibility has an anatomical basis. The next chapter asks how to turn that basis into an explicit candidate operator without pretending that a familiar diagram has already established its computation.
