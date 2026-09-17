// Preserve scan/hair geometry while adapting the expensive full-screen passes on dense displays.
// Slow simulation workers in wide views must not cause needless resolution loss.
export class RenderResolution {
  constructor(onChange, { targetFps = 60 } = {}) {
    this.onChange = onChange;
    this.targetFps = targetFps;
    this.refreshInterval = 1000 / 60;
    this.reset();
    if (targetFps > 60) {
      // Sample refresh while assets load. A 60 Hz display should not lose detail merely
      // because it cannot present 120 frames; fast displays get the tighter frame budget.
      const intervals = []; let previous;
      const sample = timestamp => {
        if (previous !== undefined && timestamp > previous && timestamp - previous < 50) intervals.push(timestamp - previous);
        previous = timestamp;
        if (intervals.length < 16) requestAnimationFrame(sample);
        else { intervals.sort((a,b)=>a-b); this.refreshInterval = intervals[3]; }
      };
      requestAnimationFrame(sample);
    }
  }

  reset() {
    this.maximum = Math.min(devicePixelRatio, 2, Math.sqrt(2400000 / (innerWidth * innerHeight)));
    this.minimum = Math.min(0.9, this.maximum);
    this.ratio = this.maximum;
    this.last = 0; this.total = 0; this.frames = 0; this.stable = 0; this.fastFrames = 0;
  }

  update(now, expensive = true) {
    const dt = now - this.last; this.last = now;
    // Ignore initialisation, tab suspension and single long compilation/interaction stalls.
    if (dt <= 0 || dt > 100) { this.total = 0; this.frames = 0; return; }
    // Displays can raise their refresh rate after loading or after moving the window.
    // Require a sustained fast cadence so ordinary 60 Hz scheduling jitter cannot trigger it.
    this.fastFrames = dt < 1000 / this.targetFps * 1.1 ? this.fastFrames + 1 : 0;
    if (this.targetFps > 60 && this.fastFrames >= 8) this.refreshInterval = Math.min(this.refreshInterval, 1000 / this.targetFps);
    this.total += dt; this.frames++;
    if (this.total < 1000) return;
    const mean = this.total / this.frames;
    const budget = Math.max(1000 / this.targetFps, this.refreshInterval);
    const highRefresh = budget < 12;
    this.stable = mean < budget * (highRefresh ? 1.02 : 1.05) ? this.stable + this.total : 0;
    let next = this.ratio;
    if (expensive && mean > budget * (highRefresh ? 1.04 : 1.14)) next = Math.max(this.minimum, this.ratio * 0.85);
    // Hold a successful high-refresh size until resize. Periodically probing a larger
    // MSAA target can introduce allocation stalls and oscillate around the 120 Hz budget.
    else if (!highRefresh && this.stable > 8000) { next = Math.min(this.maximum, this.ratio * 1.05); this.stable = 0; }
    this.total = 0; this.frames = 0;
    if (Math.abs(next - this.ratio) < 0.001) return;
    this.ratio = next; this.onChange();
  }
}
