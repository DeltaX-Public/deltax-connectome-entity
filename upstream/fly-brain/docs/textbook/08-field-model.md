# The Shape and Motion of a Neural Field

A bump of population activity has more than one property. It has a position, a width, an amplitude, and a shape. When the animal turns, an ideal heading representation changes position while preserving enough of the other properties to remain readable. This suggests a second model in which the primary object is the activity pattern itself.

Instead of following each EPG spike, the field model represents activity as a function around a circle. Nearby positions can reinforce one another and distant positions can inhibit one another through spatial kernels. A stable bump is then a solution of a dynamical equation. Its movement can be studied as a perturbation of that solution.

This is an Amari-style neural field. It is an approximation with its own commitments: a regular spatial coordinate, repeated interaction rules, a chosen nonlinearity, and a timescale. It does not inherit the authority of the cell-level reconstruction simply because its kernels were motivated by anatomical measurements.

## Building the field

Let the field be called u, with angle and time as its arguments. In the implementation, the circle is sampled by 256 units. The activity relaxes toward rest, receives recurrent input, and responds to velocity and landmark signals. A saturating function converts the internal field into an output rate-like quantity.

The recurrence combines narrow excitation with inhibition. The narrow excitatory kernel represents local EPG and PEG support. The main inhibitory kernel follows the broad constant-minus-cosine profile motivated by the Delta7 pathway. A second, shallower inhibitory surround is included in the revised model.

In the implemented version, that additional surround is itself a constant-minus-cosine kernel with an adjustable depth. It is not merely a uniform subtraction of mean activity, although a uniform inhibitory component is one part of it. Its gain is independent of the Delta7 multiplier, allowing inhibition to remain when the Delta7 term is removed.

In mathematical notation, the equation can be written as

$$
\tau \partial_t u = -u + W * f(u) + P + I.
$$

Here W contains the excitatory and inhibitory kernels, the star denotes circular convolution, P is the selected velocity-related input, and I is the landmark input. The convolution sums contributions from other positions according to their offset. The nonlinearity f limits the output range, while tau sets the time over which the field responds.

Every term has a modelling rationale, but not every term is determined by the connectome. The anatomical profile motivates the shape of part of W. The local excitation's functional form, its gain, the saturation rule, and the field timescale remain assumptions. The second inhibitory term was introduced after consulting a perturbation result, as the next chapter explains.

## A continuous family of positions

Suppose the unforced field has an equilibrium bump. If the kernels depend only on relative position, shifting that bump around the circle gives another equilibrium. The model has no preferred heading until a cue or asymmetry introduces one.

This translation symmetry produces a neutral direction. A small perturbation that simply shifts the bump does not restore it to the old position, because the shifted position is equally valid. Other perturbations, such as a change in width, may relax back toward the equilibrium shape.

The distinction is useful for heading estimation. The circuit needs a degree of freedom that can retain a new angle, while suppressing distortions that would make the angle ambiguous. An ideal attractor offers precisely this separation between phase and shape. Real finite circuits and numerical grids only approximate the symmetry, so position-dependent drift and pinning remain possible.

To derive a phase response, write the travelling profile as

$$
u(\theta,t)=U(\theta-\phi(t)).
$$

The symbol U denotes the equilibrated profile and phi its position. Differentiating with respect to time gives negative phase velocity multiplied by the spatial derivative of U. The minus sign follows from the argument being angle minus phase; reversing that convention would reverse the corresponding signs throughout the calculation.

## The projection that phase reduction requires

Linearise the unforced field dynamics about U and call the resulting operator L. Translation symmetry implies that the derivative U-prime is a right neutral mode: applying L to it gives zero. But the vector needed to extract the phase response is generally the left, or adjoint, neutral mode.

Call that mode psi. It satisfies the adjoint equation and must have a nonzero overlap with U-prime. To first order, a weak input of amplitude v and spatial profile P gives

$$
-\tau\dot\phi\,\langle\psi,U'\rangle
= v\langle\psi,P\rangle,
$$

and therefore

$$
\dot\phi
= -\frac{v\langle\psi,P\rangle}
{\tau\langle\psi,U'\rangle}.
$$

The inner product sums or integrates the product of two profiles around the circle. This expression says that only the component of the perturbation that projects onto the phase-sensitive direction moves the bump to leading order. Other components can change its shape or relax away.

Using U-prime in place of psi needs an additional argument. It is valid in an appropriate self-adjoint setting, but translation invariance alone does not make the linearised operator self-adjoint. Even a symmetric convolution kernel can be combined with a spatially varying derivative of the nonlinearity in a way that changes the adjoint relation.

The existing implementation uses the bump derivative in its projection and takes the magnitude of the resulting coefficient to set a positive gain. It does not solve the adjoint problem. Its reported gain near 0.27 should therefore be treated as an approximate calibration within the specified field model, rather than an exact consequence of the wiring. The algebra in the earlier derivation also dropped the minus sign; the expression above retains it.

This correction changes the interpretation of the calculation without pretending that the implementation has already been replaced. A proper numerical check would compute the adjoint mode, compare the predicted response with small positive and negative inputs, and verify convergence as the grid and perturbation amplitude change. Those checks remain necessary before describing the phase gain as rigorously derived.

## Why the equilibrium matters

Even an approximate projection should use the bump that the model actually sustains. A freshly imposed seed can be too narrow, too broad, or at the wrong amplitude. Its derivative then describes movement of a transient shape rather than the settled state.

The implementation allows a seed to relax before computing its gain estimate. Earlier calibration on the unrelaxed profile produced an inappropriate gain and a frozen tracking response. This is a useful example of a numerical procedure acquiring scientific significance: the object being measured was different from the object assumed by the derivation.

With literal shifted-feedback kernels and the approximate gain, the model tracked clean velocity at about 85 percent of the ideal rate in the recorded test. Shape distortion and finite-input effects are possible explanations for the deficit, but the unverified projection is another. It would be too strong to attribute all fifteen percent to higher-order effects before checking the adjoint calculation.

The gain also depends on the equilibrium, nonlinearity, timescale, and kernel normalisation. Changing any of them can change the numerical value while retaining the same underlying contact pattern. The phrase derived within a model is therefore essential even after the mathematical reduction has been justified.

## Four mechanisms for moving the state

The project compared several ways to deliver velocity information. In the simplest shifted-input version, angular velocity changes the amplitude of a spatially displaced recurrent input. The intuition is that one side of the bump receives extra support, pulling the pattern around the ring.

This input does more than translate the pattern. It can also distort the shape. Under fluctuating velocity, repeated changes of sign can prevent those distortions from relaxing before the next input arrives. In the recorded single-channel benchmark, this mechanism had an RMS heading error of about 1.29 radians.

A second version introduced another field representing the PEN population while retaining amplitude-based drive. It did not repair the problem in the tested settings; the recorded error was about 1.61 radians. The presence of an additional dynamical population is therefore insufficient by itself. How that population represents velocity matters.

A third version used position. Velocity displaced a PEN-related bump, and the EPG-related field was pulled toward it. This reduced the recorded error to about 0.60 radians. The mechanism can express a phase difference between the two populations during rotation, providing a neural observable beyond final heading error.

The comparison supports position-based coupling within the tested implementations. It does not establish that every amplitude-based mechanism must fail, or that the animal uses precisely this two-field rule. Synaptic filtering was explored over a limited range, and the comparison shares the assumptions of the surrounding field model.

## The ideal transport limit

The final version moves the field directly by advection. It shifts the activity pattern itself according to the velocity signal, approximating ideal transport. In the earlier single-inhibition benchmark, this version reached about 0.41 radians RMS error.

Advection is a useful engineering reference. It asks how well the field could track if phase transport were supplied directly. It is not evidence that the biological PEN pathway implements perfect transport. The distinction matters because the best later heading benchmark uses this mode.

The gap between position-coupled transport and advection is compatible with lag in the two-field mechanism, but it is a property of these model variants. Calling it the price paid by the fly would require establishing the biological coupling and matching its operating conditions. A simulated performance gap is not automatically an evolutionary tradeoff.

A stronger test would compare both behavioural and neural responses under matched inputs. Heading error would measure the task. The EPG-PEN phase relation, response lag, and bump deformation would test the mechanism. A model that tracks well but produces the wrong population relationship could still be a useful estimator while remaining an inadequate explanation of the circuit.

## What the field adds

The field makes it easy to measure a continuous width curve while changing inhibition. It also exposes the mathematical assumptions behind velocity updating. The spiking model retains irregular cell-level wiring and its particular adaptation rules; the field smooths these details into kernels and rate dynamics.

Agreement between them is useful when their assumptions differ in ways relevant to the question. Shared assumptions can also make both models wrong in the same way. Neither formalism deserves automatic priority. The next chapter examines a perturbation for which their disagreement helped identify an inadequate inhibitory description, while also showing why model revision and independent validation must remain separate.
