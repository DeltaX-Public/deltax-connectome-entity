# What the wiring gives you, and what it does not

This is the result I would want a reader to leave with, so it gets its own page. A
connectome is wiring. It is not synaptic strengths, neuromodulation, gap junctions or
plasticity. When you run it as a spiking network with a handful of fitted global
parameters, some behaviours appear and some do not, and the boundary between them is
specific.

**Read out of the connectome.** Forward and backward walking, steering, grooming,
escape and takeoff commands, on the descending neurons the literature names for them.
A sensory screen showing which senses drive which commands: looming drives the giant
fibre and takeoff neurons, wind and hind-leg touch drive the backward-walking neuron,
odours drive the steering neurons. Courtship detection, where pheromone and a
small-object visual signal propagate through the wiring to pIP10 and DNp13 and roughly
double their firing near another fly. Sparse coding in the mushroom body at 7.4%
active Kenyon cells. The published reflexes used for calibration: sugar drives the
proboscis motor neuron, bitter silences it and vetoes sugar.

**Not in the wiring, supplied from outside.** Coordinated walking. No connectome-only
model produces it from the whole nerve cord, so a stepping generator fitted to real
walking kinematics sits between the descending neurons and the legs. Spontaneous
behaviour: bout lengths, pause lengths, saccade rates, all from ethology papers. A
reafference gain, because without it the fly's own footfalls drove its walking neurons
and it ran without stopping. Escape gating, because a wall you walk into looms on the
eye and the fly jumped into walls. One electrical synapse, giant fibre to the jump motor
neuron, that the chemical connectome cannot contain. A slow adaptation on the steering
readout, because the reconstructed wiring is not left-right symmetric and the fly
circled right without it.

**Weakly supported.** Looming escape fires on 2 of 10 test looms, because the takeoff
neurons reach their trigger during ordinary self-motion and a real loom only just
clears it. Turning away from touched obstacles and heat. Feeding to completion.

**Where octopamine surprised us.** With the hunger chain built as the literature
describes, a starved fly's octopamine broadcast, acting on the connectome alone, makes
it walk *less*, because the steering and backward-walking neurons receive more
octopamine synapses than the forward-walking ones. Restoring the measured 2 to 3×
optic-lobe gain during walking did not bring back the giant-fibre loom response either.

The full list is in [limitations](../19-limitations.md), and Chapter 14 of
[the textbook](../textbook/) works through why each item lands where it does.
