# A Heading State in a Spiking Network

A heading representation has an unusual memory requirement. It must retain an angle while the animal is stationary and update that angle when the animal turns. It should also be able to use a visual cue without becoming merely a copy of that cue. These requirements make the heading circuit a useful place to distinguish persistent state, sensory filtering, and controlled movement of a population pattern.

The anatomical substrate highlighted here contains 148 cells across five named populations: forty-six EPG neurons, forty-two Delta7 neurons, eighteen PEG neurons, twenty PEN_a neurons, and twenty-two PEN_b neurons. The number eighty-eight refers only to EPG plus Delta7. The simulations themselves retain the full loaded network, as described in Chapter 6, while manipulating and reading these populations.

EPG activity is grouped by an eight-bin positional mapping. Delta7 supplies a strongly structured inhibitory path in the anatomical report. PEG participates in local recurrent copying, while the two PEN populations provide directionally offset feedback. This organisation motivates a ring-attractor hypothesis without fixing the gains or resting state needed to realise it.

## What would count as a memory?

Imagine briefly illuminating a spot at one bearing. While the cue is present, a localised neural response could mean little more than that the sensory pathway has spatial tuning. A memory test begins after the localising input is removed.

The probe seeds activity near one position, releases the stimulus, and measures whether activity remains concentrated. It records the total response, circular concentration, and an estimate of width. It also drives the two PEN arms separately to measure directional effects. These observables are more informative together than a phase alone, because a phase can be decoded even from a weak or unreliable population pattern.

A completely silent population has no meaningful remembered direction. A uniformly active ring also has no preferred direction. A concentrated but almost inactive pattern can be difficult to distinguish from residual numerical or transient activity. The classification combines measures to separate these cases, though the exact boundaries remain choices of the probe.

Persistence over the observation window is a finite-time result. It is not a proof of asymptotic stability, nor a guarantee that the state will survive prolonged noise or arbitrary inputs. Those stronger claims require longer observations, additional initial conditions, and perturbations of the state itself.

## Searching the operating regime

The forty-eight-member grid varies EPG recurrence by factors of one, three, four, and six. It varies the Delta7-to-EPG multiplier over one half, one, and 1.3. Tonic EPG bias takes values of zero, three, five, and seven millivolts. The PEN multiplier remains one.

At the recorded seed, thirty members are classified as silent, six as filters, and twelve as tonic-supported attractors. None is classified as an attractor without tonic bias. The successful settings occur with stronger recurrence and positive baseline excitation.

The twelve survivors represent one quarter of this grid. That fraction should not be read as an estimate of how often real flies have an attractor or how likely this mechanism is. The sample weights low and high gains according to the chosen grid, and the family holds many potentially relevant quantities fixed.

The result does establish a useful dependence in the tested model. Anatomically organised recurrence can support a persistent heading-like pattern, but the default operating point is insufficient under this protocol. Increasing excitability changes which computation the same network can express.

It does not establish that the animal must switch its compass on through tonic drive. A missing background input, a different membrane model, a more appropriate weight calibration, or an untested parameter combination could change the requirement. The experiment identifies tonic bias as an effective control in this family. Physiology would have to establish what supplies the corresponding support in the fly.

## Removing inhibition changes the explanation

The surviving models can look similar before perturbation while relying on different interactions. Delta7 silencing exposes this. Eight of the twelve retain a relatively sharp concentrated pattern under the classifier. Three lose the sustained response and are labelled as requiring Delta7 for the tested state. One loses confinement under the recorded outcome classification.

The last category needs particular care. The saved report calls it a confinement failure, while the current classification distinguishes that state from a surviving, widened bump. The original prose treated the one member as a broadened-bump success. That is not supported by the recorded class counts. No member in that report carries the separate widened-bump label.

This distinction matters because a later field model does produce a surviving broadened bump. It cannot be described as reproducing a one-member minority in the spiking report simply because both involve some loss of confinement. A broad coherent bump and broad or uniform activity with low concentration are different outcomes.

The three extinguished responses also need restrained interpretation. The circuit model contains active adaptation and depression, so disinhibition can interact with subsequent fatigue and recurrent feedback. But the label alone does not identify which process caused the shutdown. Removing adaptation while holding the rest fixed would test that explanation more directly. The present result is that the state was lost after the perturbation, not a demonstrated adaptation mechanism.

The value of the ensemble is visible despite these limitations. A baseline bump does not uniquely identify the interactions maintaining it. The perturbation produces several outcomes, and their continuous measurements can guide the next comparison. Majority vote is not a biological verdict; it reflects how the sampled settings are distributed among those outcomes.

## Which perturbations split the grid?

On the recorded forty-eight-member grid, varying tonic excitation produces an unweighted separation score of 0.414. Lesioning the PEG copy pathway scores 0.370, and silencing Delta7 scores 0.351. Driving the right and left PEN arms gives lower and unequal scores, about 0.284 and 0.120.

The high tonic score is understandable. Baseline excitability is one of the dimensions that separates silence, stimulus following, and persistence in this family. A sweep across that dimension naturally divides the grid. It is useful for locating the operating regime, but its value after conditioning on a known persistent state could be lower.

PEG removal asks a more targeted causal question. Does the copy pathway provide necessary support, or can local EPG recurrence compensate? Delta7 silencing asks whether a particular inhibitory source is necessary for persistence or confinement. These questions can remain informative even when the animal's baseline activity has already excluded silent models.

The PEN asymmetry is also worth retaining. Oppositely oriented pathways need not have identical strengths or neuronal populations. A pooled directional score could hide a real difference between arms. Yet a one-sided model response can arise from the coordinate convention or stimulus as well as from anatomy, so both sign conventions and input conditions should accompany the result.

Earlier runs reported a recurring top-three set across seeds, with changes in order. That is evidence about those runs, rather than a general guarantee of ranking stability. A systematic sensitivity analysis would vary seeds, classification thresholds, and parameter sampling together, preferably after restricting to baseline-compatible models.

## A second execution path

The same experiment was later expressed through the generic runner. At the same nominal seed it produced thirty silent members, eleven tonic-supported attractors, and seven filters. The best-ranked tonic experiment scored 0.393, and the leading set of experiments remained similar.

One member therefore crossed a class boundary. This is a useful compatibility result, but it is not exact reproduction. Nor does a small discrepancy prove independent confirmation. The implementations share major components, and random-number consumption, probe details, or classification can account for a difference. Establishing the cause would require matched streams and member-level comparison.

The scientific interpretation should survive this distinction. Both executions find a limited sampled regime of tonic-supported persistence and give prominence to excitation, PEG, and Delta7 manipulations. Claims about an exact fraction of viable models or an exact ordering of experiments are less stable.

## What remains to be explained

The spiking network has recovered a family of heading-like responses attached to identifiable anatomy. That is a meaningful compatibility result. It has also revealed that the proposed computation depends on excitability and that different settings respond differently to inhibition loss.

The next questions are quantitative. How does width change as inhibition is gradually reduced? How does the velocity pathway move the state, and what gain relates drive to angular displacement? Which features of the response are consequences of the discrete wiring, and which belong to the chosen point-neuron dynamics?

A continuous field provides another way to ask these questions. It smooths away individual cells and exposes a mathematical description of bump shape and phase. That simplification will make some mechanisms easier to analyse, while creating new assumptions that must be stated just as explicitly as the assumptions of the spiking ensemble.
