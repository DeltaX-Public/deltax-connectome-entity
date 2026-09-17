# What an Engineer Can Learn from the Heading Model

A biological explanation and an engineering algorithm can be evaluated separately. A field model may be an imperfect account of the PEN pathway while still offering an interesting way to combine noisy velocity with unreliable landmarks. Conversely, a model can reproduce a neural response without being the most efficient estimator for a machine.

The heading benchmark asks the engineering question. All estimators receive the same synthetic observations and attempt to recover the same trajectory. The result is preliminary evidence about their behaviour in one chosen regime, rather than a contest between the fly and classical estimation theory.

The most informative comparison turns out to be between a single stored angle and a distributed activity pattern. Both can represent heading, but they respond differently to conflicting observations. The benchmark explores whether that difference can be useful.

## A deliberately difficult observation stream

Each trial lasts sixty seconds, sampled at intervals of fifty milliseconds. The true angular velocity fluctuates through a mean-reverting random process with occasional larger turns. The estimator receives a noisy velocity signal and a landmark bearing every two seconds.

Fifteen percent of landmarks are corrupted by an offset of exactly half a turn. This creates a conflict between the current estimate and an occasional observation pointing in the opposite direction. Every estimator sees the same trajectories and observations across sixty seeded trials.

The use of shared trials is a strength. A difficult trajectory is difficult for all estimators, so differences can be measured on matched conditions. It also determines the appropriate statistical analysis. The natural unit is the per-trial difference between estimators, not two unrelated collections of error scores.

The corruption model is special. An exact half-turn error lies at the antipode of a circular representation and may interact particularly strongly with a ring's inhibitory geometry. A convincing robustness claim should also survive a distribution of outlier angles, varying corruption rates, and genuine abrupt heading changes. Rejecting a bad observation is useful only if the estimator can still accept a surprising correct one.

## The scalar estimators

Dead reckoning integrates the velocity signal and ignores landmarks. It has no way to correct accumulated drift, but it is also immune to landmark corruption. In this regime it provides a useful reference: a system that accepts unreliable corrections can perform worse than one that refuses them all.

A complementary filter also integrates velocity, then moves a fixed fraction of the way toward each landmark. The benchmark includes a correction fraction of 0.35 and a smaller fraction of 0.05. The latter is chosen to make the effective correction strength more comparable to the reduced ring estimator.

This matching matters because gain alone can explain an apparent advantage. A filter that reacts strongly to every landmark is vulnerable to corrupt observations. A cautious filter may look robust without doing anything more sophisticated than trusting them less. Comparing an attractor with only an aggressive baseline would confound architecture with parameter choice.

The Kalman-style estimator maintains an angle estimate and its uncertainty, using an assumed noise model to determine the correction gain. A gated version rejects landmarks whose discrepancy is too large relative to the estimated uncertainty. The gate provides explicit outlier handling, though its threshold and noise assumptions also affect performance.

The reduced ring stores a phase and applies bounded landmark correction. Once the distributed representation has been compressed this far, its relationship to a complementary filter is close. The comparison asks whether any meaningful advantage remains after that compression.

## The distributed estimators

The full field retains 256 activity units around the circle. Recurrent excitation and inhibition maintain a preferred region, while landmark input competes with the existing state. The benchmark uses the revised two-inhibition field and idealised advection for velocity transport.

A second version adds independent noise to individual field units at the specified amplitude. This tests one form of population-noise sensitivity. It does not make the comparison with scalar estimators a fully matched sensor-noise experiment, because the additional perturbation acts on internal units of one representation.

The advection choice is particularly important. It supplies direct phase transport rather than requiring the shifted PEN-like mechanism to perform the update. The resulting score measures an idealised field estimator. Chapter 8's less direct transport mechanisms have their own errors and cannot inherit this benchmark result without being run under the same conditions.

The model also holds a landmark input for a finite interval. Cue duration and strength affect how much a competing activity peak can grow. Robustness therefore depends on temporal presentation as well as on the spatial kernel. Calling it purely structural would hide parameters that help determine the outcome.

## Reading the recorded errors

The main score is RMS wrapped angular error in radians. Wrapping treats angles just below and above a full turn as nearby. The report also measures error in the five-second windows following corrupt landmarks, providing a focused view of recovery.

Dead reckoning has a recorded mean RMS error of 0.661 radians, with a standard deviation across trials of 0.285. Its post-outlier-window score is 0.589. The stronger complementary filter scores 0.724 overall and 1.176 after outliers, showing that these corrections can be worse than ignoring landmarks in this regime.

The ungated Kalman estimator has the largest recorded error, 1.159 overall and 2.044 after outliers. Adding a gate reduces the overall mean to 0.546 and the post-outlier mean to 0.784. This is a substantial change within the benchmark, and a reminder that the relevant classical comparison includes explicit handling of unreliable observations.

At the smaller matched correction gain, the complementary filter scores 0.622 overall and 0.630 after outliers. The scalar ring scores 0.653 and 0.650. Their trial standard deviations are about 0.211 and 0.228. The reduced biological description does not show an obvious engineering advantage in these aggregate numbers.

The full field scores 0.538 overall, with a trial standard deviation of 0.434, and 0.612 in the post-outlier windows. The noisy field scores 0.521 overall, with a standard deviation of 0.391, and 0.588 after outliers. These are the recorded means for the current benchmark configuration; the rewrite has not generated a new scientific benchmark run.

The field's overall mean is close to the gated estimator's 0.546. Its post-outlier mean is lower than the gated estimator's 0.784. Those observations motivate a recovery hypothesis. They do not establish statistical superiority from the summary alone.

## Why paired uncertainty matters

Standard deviation across trials describes variation in trial difficulty and estimator performance. It is not a confidence interval on the difference between two methods. Large overlapping standard deviations neither prove a tie nor rule out a consistent paired advantage.

Suppose every difficult trial raises both methods' errors by the same amount, while one method is slightly better on almost every trial. Their separate standard deviations could be large even though the difference is stable. Conversely, a favourable mean could be driven by a few exceptional trials.

The next analysis should retain each estimator's score on each shared trial, compute paired differences, and report an interval obtained from those paired samples. The post-outlier windows also overlap when corrupt landmarks occur close together, so they should not be treated as independent observations. Trial-level resampling is a more natural starting point.

The slight improvement after adding field noise deserves the same restraint. It could reflect variation in a limited sample or a regime-specific effect. The recorded result shows no large deterioration at that noise setting. It does not establish that noise generally improves the estimator.

## A possible mechanism for robustness

A scalar estimator can move directly toward an observation. In the field, a conflicting cue must alter a distributed pattern maintained by recurrent interactions. A distant cue can begin growing a competing peak while the old peak continues to suppress it. A brief or weak contradiction may fail to displace the established state.

This provides a plausible explanation for reduced sensitivity to isolated outliers. It is an interpretation of the model's dynamics, and it can be tested by measuring peak competition directly. One could vary cue strength and duration while tracking whether the old state persists, a new state wins, or both coexist transiently.

The same persistence can become a liability. If the animal really turns quickly or a landmark legitimately changes the frame, resistance to correction can delay an accurate update. Robustness is therefore a tradeoff with responsiveness, not a free property obtained without tuning.

The comparison should examine this tradeoff across corruption distributions, velocity noise, landmark frequency, and cue duration. It should also retune competing estimators on separate training regimes rather than using the test results to choose favourable parameters. Otherwise the apparent architecture effect can partly reflect unequal optimisation effort.

## The cost of keeping a population

The scalar methods store only a small number of values. The field stores 256 units and repeatedly applies spatial interactions. Even if its error is competitive, its computational cost differs substantially. Runtime and memory should accompany accuracy before recommending it as an engineering replacement.

The relevant cost depends on the deployment. A conventional processor may favour a compact gated filter. A parallel substrate or a system already maintaining a population representation may value the field differently. The present benchmark does not measure those costs, so it cannot settle the practical tradeoff.

The useful conclusion is that spatial competition is a candidate mechanism for handling conflicting observations. The current field is competitive on this synthetic benchmark and has a lower recorded post-outlier mean than the gated comparison. Establishing the reliability, scope, and efficiency of that advantage requires paired statistics and broader regimes.

That result is sufficient to motivate further work. It allows the connectome-inspired investigation to contribute an engineering idea without claiming that a biological circuit has defeated an optimally designed estimator or that the best field transport mechanism has already been recovered from anatomy.
