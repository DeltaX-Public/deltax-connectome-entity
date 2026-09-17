# What this is

Each fly in the arena is three things bolted together, and it is worth knowing which is
which, because they come from different places and have different levels of trust.

**A brain.** The male *Drosophila* CNS connectome, version 1.0, from Janelia FlyEM and
Google Research (CC-BY 4.0). 165,122 neurons and 10.5 million connections of three or
more synapses, run as conductance-based leaky integrate-and-fire neurons. The wiring is
the data. The nine global parameters that turn synapse counts into currents were fitted
to published behaviours, and that fitting is described in [calibration](../07-calibration.md).

**A body.** flybody, the MuJoCo fruit fly from Janelia and DeepMind: 67 bodies, 102
joints, 78 actuators, adhesive claws, about a milligram. Physics runs at 0.2 ms steps.
See [body and physics](../08-body-physics.md).

**An eye.** flyvis (Lappalainen et al. 2024), a trained model of 65 optic-lobe cell types
on 721 columns per eye. Its outputs drive the matching 62,000 optic-lobe neurons of the
connectome, same cell type, same retinotopic column. Everything downstream of the optic
lobe is the spiking connectome. See [vision](../11-vision.md).

The brain turns what the fly senses into what it does. Taste, smell, touch, heat, wind
and proprioception enter as spike trains on 7,745 identified sensory neurons. Behaviour
is read out from identified descending neurons.

There is a fourth piece I want to be upfront about. The connectome, as reconstructed,
does not decide when to walk, pause, groom, turn or take off. An endogenous-activity
module supplies that spontaneous drive, using bout statistics from the ethology
literature. It never writes actuator commands. It delivers synaptic input to identified
descending neurons, so every command still passes through the wiring. Hunger reaches the
brain the way it does in the animal, as hormones acting on octopamine neurons. The
reasons for that design are in [what the wiring gives you](what-the-wiring-gives.md) and
[endogenous behaviour](../23-behaviour.md).
