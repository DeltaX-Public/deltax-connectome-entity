import { RoverBody, ROVER_ACTIONS } from '../../embodiment/rover/body.mjs';

const DELTAS = Object.freeze([[1, 0], [0, 1], [-1, 0], [0, -1]]); // 0=East, 1=South, 2=West, 3=North

/**
 * ChangedWorld Environment.
 * A structured grid world designed for behavioral adaptation testing:
 *   - Phase 1 (Familiarization): Direct central corridor (y=3) is open and optimal.
 *   - Phase 2 (Unexpected Change): Central corridor becomes blocked at (6, 3);
 *     bypass corridors (North at y=1, South at y=5) remain feasible.
 *   - Phase 3 (Recurrence): Second trial / repeated encounter under the changed rules.
 *
 * NO CHEATS:
 * Does NOT inject solution labels, change schedules, or executive decisions into entity observations.
 */
export class ChangedWorld {
  constructor({
    clock = () => Date.now(),
    width = 11,
    height = 7,
    changeAtStep = 4,
    startPos = { x: 1, y: 3, heading: 0 },
    initialEnergy = 30,
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

    // Body initialization
    this.body = new RoverBody({
      x: startPos.x,
      y: startPos.y,
      heading: startPos.heading,
      energy: initialEnergy,
    });

    // Static arena geometry: corridor walls with bypass openings at x=3 and x=8
    this.staticObstacles = [
      // North dividing wall (y=2) with passage at x=3 and x=8
      { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
      // South dividing wall (y=4) with passage at x=3 and x=8
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
    ];

    // Dynamic blockage (drops at changeAtStep)
    this.dynamicBlockage = { x: 6, y: 3 };

    // Hazard zone in changed state (surrounding the blockage)
    this.hazards = [{ x: 5, y: 3, cost: 2 }];

    // Goal Region at East end
    this.goalRegion = { xMin: 9, xMax: 10, yMin: 2, yMax: 4 };

    this.events = [];
    this.lastCollision = false;
  }

  currentState() {
    return {
      body: this.body.snapshot(),
      energy: this.energy,
      step: this.stepCount,
      isChanged: this.isChanged,
      blockedCell: this.isChanged ? { ...this.dynamicBlockage } : null,
      reachedGoal: this.isGoal(),
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
    const evt = {
      id: this.events.length + 1,
      type: 'ENVIRONMENT_MUTATION',
      timestamp: this.clock(),
      step: this.stepCount,
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

    const proposal = this.body.proposal(action);
    const result = this.body.apply(proposal, { canMove: (t) => this.canEnter(t) });

    this.lastCollision = (result.status === 'BLOCKED');

    // Hazard penalties
    if (this.isChanged && this.hazards.some((h) => h.x === this.body.x && h.y === this.body.y)) {
      this.energy = Math.max(0, this.energy - 2);
    }
    this.energy = Math.min(this.energy, this.body.energy);

    const logEntry = {
      id: this.events.length + 1,
      type: 'STEP_EXECUTION',
      step: this.stepCount,
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
    this.body = new RoverBody({ x: 1, y: 3, heading: 0, energy: this.initialEnergy });
    this.lastCollision = false;
    this.events.push({
      id: this.events.length + 1,
      type: 'RECURRENCE_RESET',
      timestamp: this.clock(),
      detail: { preservedChangedState: preserveChanged },
    });
    return this.currentState();
  }
}
