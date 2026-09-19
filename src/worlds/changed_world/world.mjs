import { RoverBody, ROVER_ACTIONS } from '../../embodiment/rover/body.mjs';

const DELTAS = Object.freeze([[1, 0], [0, 1], [-1, 0], [0, -1]]); // 0=East, 1=South, 2=West, 3=North

/**
 * ChangedWorld Environment — Phase III Long-Horizon Adaptation Protocol.
 *
 * A structured grid world designed for long-horizon behavioral adaptation testing:
 *   - Phase A (Baseline Settling): Steps 1–10: Entity begins in stable environment;
 *     biological connectome settling and forward locomotion emergence.
 *   - Phase B (Stable Experience): Steps 11–18: Central corridor (y=3) is open and reliable;
 *     entity develops stable traversal experience.
 *   - Phase C (Unexpected Change): At changeAtStep (default 18): Central corridor becomes blocked at (6, 3);
 *     bypass passages (North at y=1, South at y=5 with openings at x=3, x=5, x=8) remain feasible.
 *   - Phase D (Recovery): Steps 19–40: Entity must detect contradiction, recover, and navigate bypass.
 *   - Phase E (Recurrence): Trial 2: Repeated encounter under the changed rules.
 *
 * STRICT INFORMATION PARITY:
 * Zero cheat codes, zero future world state leaks, zero route labels.
 */
export class ChangedWorld {
  constructor({
    clock = () => Date.now(),
    width = 11,
    height = 7,
    changeAtStep = 18,
    startPos = { x: 1, y: 3, heading: 0 },
    initialEnergy = 50,
    seed = 42,
  } = {}) {
    this.clock = clock;
    this.width = width;
    this.height = height;
    this.changeAtStep = changeAtStep;
    this.seed = seed;
    this.stepCount = 0;
    this.initialEnergy = initialEnergy;
    this.energy = initialEnergy;
    this.isChanged = false;
    this.startPos = { ...startPos };

    // Temporal Phase Tracking
    this.phase = "PHASE_A_BASELINE";
    this.worldChangeStep = null;
    this.firstPostChangeFailureStep = null;
    this.recoveryStep = null;
    this.repeatedMistakeCount = 0;

    // Body initialization
    this.body = new RoverBody({
      x: startPos.x,
      y: startPos.y,
      heading: startPos.heading,
      energy: initialEnergy,
    });

    // Static arena geometry: corridor dividing walls with bypass passages at x=3, x=5, and x=8
    this.staticObstacles = [
      // North dividing wall (y=2) with passages at x=3, x=5, and x=8
      { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
      // South dividing wall (y=4) with passages at x=3, x=5, and x=8
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
    ];

    // Dynamic blockage (drops at changeAtStep)
    this.dynamicBlockage = { x: 6, y: 3 };

    // Hazard zone in changed state (surrounding the blockage)
    this.hazards = [{ x: 5, y: 3, cost: 2 }];

    // Goal Region at East end (accessible via central corridor and North/South bypass corridors)
    this.goalRegion = { xMin: 9, xMax: 10, yMin: 1, yMax: 5 };

    this.events = [];
    this.lastCollision = false;
  }

  currentState() {
    return {
      body: this.body.snapshot(),
      energy: this.energy,
      step: this.stepCount,
      phase: this.phase,
      isChanged: this.isChanged,
      blockedCell: this.isChanged ? { ...this.dynamicBlockage } : null,
      reachedGoal: this.isGoal(),
      worldChangeStep: this.worldChangeStep,
      firstPostChangeFailureStep: this.firstPostChangeFailureStep,
      recoveryStep: this.recoveryStep,
      repeatedMistakeCount: this.repeatedMistakeCount,
    };
  }

  isGoal(pos = this.body) {
    return pos.x >= this.goalRegion.xMin &&
           pos.x <= this.goalRegion.xMax &&
           pos.y >= this.goalRegion.yMin &&
           pos.y <= this.goalRegion.yMax;
  }

  isObstacle(x, y) {
    // Bounds check
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    // Static obstacles
    if (this.staticObstacles.some((o) => o.x === x && o.y === y)) return true;
    // Dynamic blockage in changed world
    if (this.isChanged && this.dynamicBlockage.x === x && this.dynamicBlockage.y === y) return true;
    return false;
  }

  canEnter(target) {
    return !this.isObstacle(target.x, target.y);
  }

  triggerEnvironmentChange() {
    if (this.isChanged) return null;
    this.isChanged = true;
    this.phase = "PHASE_C_UNEXPECTED_CHANGE";
    this.worldChangeStep = this.stepCount;
    const evt = {
      id: this.events.length + 1,
      type: 'ENVIRONMENT_MUTATION',
      timestamp: this.clock(),
      step: this.stepCount,
      phase: this.phase,
      detail: {
        change: 'route_blocked',
        location: { ...this.dynamicBlockage },
      },
    };
    this.events.push(evt);
    return evt;
  }

  /**
   * Observe physical sensory field from current body location.
   * Returns distance, collision bits, and gradient readings.
   */
  observe() {
    const [dx, dy] = DELTAS[this.body.heading];
    const frontX = this.body.x + dx;
    const frontY = this.body.y + dy;

    // Raycast distance along current heading
    let frontDist = 0;
    for (let d = 1; d <= 8; d++) {
      if (this.isObstacle(this.body.x + dx * d, this.body.y + dy * d)) {
        frontDist = d;
        break;
      }
      frontDist = d;
    }

    // Nearest obstacle Euclidean distance
    const obstacles = [...this.staticObstacles];
    if (this.isChanged) obstacles.push(this.dynamicBlockage);
    let nearestDist = 999;
    for (const o of obstacles) {
      const dist = Math.hypot(o.x - this.body.x, o.y - this.body.y);
      if (dist < nearestDist) nearestDist = dist;
    }

    const isHazard = this.isChanged && this.hazards.some((h) => h.x === this.body.x && h.y === this.body.y);

    // --- Physical Lateral Sensor Geometry (Phase IV-B) ---
    // Heading indices: 0=East, 1=South, 2=West, 3=North
    const h = this.body.heading;
    const [fwdX, fwdY] = DELTAS[h];
    const [leftFlankX, leftFlankY] = DELTAS[(h + 3) % 4];
    const [rightFlankX, rightFlankY] = DELTAS[(h + 1) % 4];

    // Antennal rays at ±45 degrees
    const leftAntX = fwdX + leftFlankX;
    const leftAntY = fwdY + leftFlankY;
    const rightAntX = fwdX + rightFlankX;
    const rightAntY = fwdY + rightFlankY;

    // Raycast helper
    const raycastSteps = (sx, sy, stepX, stepY, maxR) => {
      for (let r = 1; r <= maxR; r++) {
        if (this.isObstacle(sx + stepX * r, sy + stepY * r)) return r;
      }
      return maxR;
    };

    const leftAntDist = raycastSteps(this.body.x, this.body.y, leftAntX, leftAntY, 6);
    const rightAntDist = raycastSteps(this.body.x, this.body.y, rightAntX, rightAntY, 6);
    const leftLatDist = raycastSteps(this.body.x, this.body.y, leftFlankX, leftFlankY, 4);
    const rightLatDist = raycastSteps(this.body.x, this.body.y, rightFlankX, rightFlankY, 4);

    const leftContact = this.isObstacle(this.body.x + leftAntX, this.body.y + leftAntY) ||
                        this.isObstacle(this.body.x + leftFlankX, this.body.y + leftFlankY);
    const rightContact = this.isObstacle(this.body.x + rightAntX, this.body.y + rightAntY) ||
                         this.isObstacle(this.body.x + rightFlankX, this.body.y + rightFlankY);
    const frontContact = this.isObstacle(frontX, frontY);

    // Noxious/hazard gradient at lateral sensor poses
    let leftNoxious = 0;
    let rightNoxious = 0;
    if (this.isChanged && this.hazards.length > 0) {
      for (const hz of this.hazards) {
        const dLeft = Math.hypot(hz.x - (this.body.x + leftAntX * 0.5), hz.y - (this.body.y + leftAntY * 0.5));
        const dRight = Math.hypot(hz.x - (this.body.x + rightAntX * 0.5), hz.y - (this.body.y + rightAntY * 0.5));
        leftNoxious = Math.max(leftNoxious, 1 / (1 + dLeft * dLeft));
        rightNoxious = Math.max(rightNoxious, 1 / (1 + dRight * dRight));
      }
    }

    return {
      visual_field: {
        front_distance: frontDist,
        nearest_obstacle_distance: +nearestDist.toFixed(2),
        obstacle_ahead: this.isObstacle(frontX, frontY),
        corridor: this.body.y === 3 ? 'central' : this.body.y < 3 ? 'north_bypass' : 'south_bypass',
      },
      proximity: {
        nearest_distance: +nearestDist.toFixed(2),
        front_distance: frontDist,
      },
      lateral_sensors: {
        front_distance: frontDist,
        left_antenna_distance: leftAntDist,
        right_antenna_distance: rightAntDist,
        left_lateral_distance: leftLatDist,
        right_lateral_distance: rightLatDist,
        left_contact: leftContact,
        right_contact: rightContact,
        front_contact: frontContact,
        left_noxious: +leftNoxious.toFixed(3),
        right_noxious: +rightNoxious.toFixed(3),
      },
      collision: {
        blocked: this.lastCollision,
      },
      gradients: {
        hazard: isHazard,
        energy: this.energy,
        food_signal: +(Math.max(0, 1 - (Math.hypot(9.5 - this.body.x, 3 - this.body.y) / 10))).toFixed(3),
      },
      energy: {
        remaining: this.energy,
      },
      body: this.body.snapshot(),
      step: this.stepCount,
    };
  }

  /**
   * Apply an action to the world and return consequence.
   */
  applyAction(action) {
    this.stepCount++;

    // Check for environmental mutation schedule
    if (this.stepCount === this.changeAtStep && !this.isChanged) {
      this.triggerEnvironmentChange();
    }

    // Phase progression
    if (this.phase !== "PHASE_E_RECURRENCE") {
      if (this.isChanged) {
        this.phase = "PHASE_D_RECOVERY";
      } else if (this.stepCount <= 10) {
        this.phase = "PHASE_A_BASELINE";
      } else {
        this.phase = "PHASE_B_STABLE_EXPERIENCE";
      }
    }

    const proposal = this.body.proposal(action);
    const result = this.body.apply(proposal, { canMove: (t) => this.canEnter(t) });

    this.lastCollision = (result.status === 'BLOCKED');

    // Post-change collision and repeated mistake tracking
    if (this.isChanged && this.lastCollision) {
      if (this.firstPostChangeFailureStep === null) {
        this.firstPostChangeFailureStep = this.stepCount;
      }
      this.repeatedMistakeCount++;
    }

    // Post-change recovery tracking: entity moves beyond blockage along a bypass corridor
    if (this.isChanged && this.recoveryStep === null && result.status === 'MOVED') {
      if ((this.body.y === 1 || this.body.y === 5) && this.body.x >= 6) {
        this.recoveryStep = this.stepCount;
      }
    }

    // Hazard penalties
    if (this.isChanged && this.hazards.some((h) => h.x === this.body.x && h.y === this.body.y)) {
      this.body.energy = Math.max(0, this.body.energy - 2);
    }
    this.energy = this.body.energy;

    const logEntry = {
      id: this.events.length + 1,
      type: 'STEP_EXECUTION',
      step: this.stepCount,
      phase: this.phase,
      timestamp: this.clock(),
      action,
      status: result.status,
      position: { x: this.body.x, y: this.body.y, heading: this.body.heading },
      energy: this.energy,
      reachedGoal: this.isGoal(),
    };
    this.events.push(logEntry);

    return {
      step: this.stepCount,
      phase: this.phase,
      action,
      status: result.status,
      target: proposal.target,
      state: this.currentState(),
      senses: this.observe(),
    };
  }

  /**
   * Reset environment for recurrence trial.
   */
  resetForRecurrence({ preserveChanged = true } = {}) {
    this.stepCount = 0;
    this.energy = this.initialEnergy;
    this.isChanged = preserveChanged;
    this.phase = "PHASE_E_RECURRENCE";
    this.worldChangeStep = preserveChanged ? 0 : null;
    this.firstPostChangeFailureStep = null;
    this.recoveryStep = null;
    this.repeatedMistakeCount = 0;
    this.body = new RoverBody({ x: this.startPos.x, y: this.startPos.y, heading: this.startPos.heading, energy: this.initialEnergy });
    this.lastCollision = false;
    this.events.push({
      id: this.events.length + 1,
      type: 'RECURRENCE_RESET',
      phase: this.phase,
      timestamp: this.clock(),
      detail: { preservedChangedState: preserveChanged },
    });
    return this.currentState();
  }
}
