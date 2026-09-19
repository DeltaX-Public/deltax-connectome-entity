/**
 * Environment Generalization Suite (Phase IV-C Repaired V2).
 * Frozen environment configurations evaluating spatial generalization,
 * mirror symmetry, obstacle shifts, hazard gradients, dead-end withdrawal,
 * novel start headings, true polarity pairs, non-wall-followable tasks,
 * and temporally non-Markovian recurrence.
 *
 * All environments obey strict information parity (zero coordinate cheats)
 * and are guaranteed solvable under the RoverBody actuator vocabulary.
 */
import { ChangedWorld } from "./world.mjs";

/**
 * Class representing a clean Temporally Non-Markovian environment.
 * Local sensory observation at Junction J (3, 3) facing East is 100% bit-exact
 * identical between Trial 1 and Trial 2, but requires opposite steering decisions
 * due to downstream changes outside line of sight.
 */
export class TemporalNonMarkovianWorld extends ChangedWorld {
  constructor(opts = {}) {
    const staticObstacles = [];
    // Outer perimeter walls
    for (let x = 0; x < 11; x++) {
      staticObstacles.push({ x, y: 0 });
      staticObstacles.push({ x, y: 6 });
    }
    for (let y = 0; y < 7; y++) {
      staticObstacles.push({ x: 0, y });
    }
    // Solid obstacle ahead of junction J (3, 3)
    staticObstacles.push({ x: 4, y: 3 });
    // Dividing walls with passage ONLY at x=3
    for (let x = 0; x <= 8; x++) {
      if (x !== 3) staticObstacles.push({ x, y: 2 });
      if (x !== 3) staticObstacles.push({ x, y: 4 });
    }

    super({
      ...opts,
      staticObstacles,
      startPos: { x: 1, y: 3, heading: 0 },
      hazards: [],
      changeAtStep: 20,
    });
  }

  isObstacle(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    if (this.staticObstacles.some((o) => o.x === x && o.y === y)) return true;
    if (!this.isChanged) {
      // Trial 1: South corridor blocked downstream at (6, 5), North corridor open to goal
      if (x === 6 && y === 5) return true;
    } else {
      // Trial 2 (Recurrence): North corridor blocked downstream at (6, 1), South corridor open to goal
      if (x === 6 && y === 1) return true;
    }
    return false;
  }

  isGoal(pos = this.body) {
    if (!this.isChanged) {
      // Trial 1 goal North at (9..10, 1)
      return pos.x >= 9 && pos.x <= 10 && pos.y === 1;
    } else {
      // Trial 2 goal South at (9..10, 5)
      return pos.x >= 9 && pos.x <= 10 && pos.y === 5;
    }
  }
}

/** Helper to build solid perimeter walls */
function buildEnclosedPerimeter() {
  const walls = [];
  for (let x = 0; x < 11; x++) {
    walls.push({ x, y: 0 });
    walls.push({ x, y: 6 });
  }
  for (let y = 0; y < 7; y++) {
    walls.push({ x: 0, y });
  }
  return walls;
}

export const ENVIRONMENT_SUITE = Object.freeze({
  ENV_0_ORIGINAL: {
    id: "ENV_0_ORIGINAL",
    name: "Original ChangedWorld Baseline",
    description: "Standard layout: door at (6, 3), symmetric passages at x=3, 5, 8.",
    createWorld: (opts = {}) => new ChangedWorld({ ...opts }),
  },

  ENV_1_MIRROR_RIGHT_REQUIRED: {
    id: "ENV_1_MIRROR_RIGHT_REQUIRED",
    name: "Critical Mirror Test: Right Turn Required (V1 Baseline)",
    description: "North passage at x=5 is blocked; South passage at x=5 is open. (Permits perimeter traversal in V1).",
    createWorld: (opts = {}) => {
      const staticObstacles = [
        { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
        { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
      ];
      return new ChangedWorld({
        ...opts,
        staticObstacles,
        recoveryZone: (body) => body.y === 5 && body.x >= 6,
      });
    },
  },

  ENV_1B_TRUE_RIGHT_REQUIRED: {
    id: "ENV_1B_TRUE_RIGHT_REQUIRED",
    name: "True Right Turn Required (No Perimeter Loophole)",
    description: "Enclosed perimeter. Left turn leads to oscillatory trap. Right turn required at x=5 to access South bypass.",
    createWorld: (opts = {}) => {
      const staticObstacles = buildEnclosedPerimeter();
      // North dividing wall y=2 is solid (no passage)
      for (let x = 0; x <= 8; x++) {
        staticObstacles.push({ x, y: 2 });
      }
      // South dividing wall y=4 has passage ONLY at x=5
      for (let x = 0; x <= 8; x++) {
        if (x !== 5) staticObstacles.push({ x, y: 4 });
      }
      const goalRegion = { xMin: 9, xMax: 10, yMin: 4, yMax: 5 };
      return new ChangedWorld({
        ...opts,
        staticObstacles,
        goalRegion,
        recoveryZone: (body) => body.y === 5 && body.x >= 6,
      });
    },
  },

  ENV_2_MIRROR_HORIZONTAL: {
    id: "ENV_2_MIRROR_HORIZONTAL",
    name: "Reversed Cardinal Orientation (East to West)",
    description: "Start at (9, 3) facing West (heading=2); Goal at x in [0, 1]; Door at (4, 3).",
    createWorld: (opts = {}) => {
      const startPos = { x: 9, y: 3, heading: 2 };
      const goalRegion = { xMin: 0, xMax: 1, yMin: 1, yMax: 5 };
      const dynamicBlockage = { x: 4, y: 3 };
      const hazards = [{ x: 5, y: 3, cost: 2 }];
      return new ChangedWorld({
        ...opts,
        startPos,
        goalRegion,
        dynamicBlockage,
        hazards,
        recoveryZone: (body) => (body.y === 1 || body.y === 5) && body.x <= 4,
      });
    },
  },

  ENV_3_OBSTACLE_SHIFT_LEFT: {
    id: "ENV_3_OBSTACLE_SHIFT_LEFT",
    name: "Early Obstacle Blockage (x=4)",
    description: "Blockage drops at (4, 3) requiring early turning at x=3 bypass.",
    createWorld: (opts = {}) => {
      const dynamicBlockage = { x: 4, y: 3 };
      const hazards = [{ x: 3, y: 3, cost: 2 }];
      return new ChangedWorld({
        ...opts,
        dynamicBlockage,
        hazards,
        recoveryZone: (body) => (body.y === 1 || body.y === 5) && body.x >= 4,
      });
    },
  },

  ENV_4_OBSTACLE_SHIFT_RIGHT: {
    id: "ENV_4_OBSTACLE_SHIFT_RIGHT",
    name: "Late Obstacle Blockage (x=7)",
    description: "Blockage drops late at (7, 3) after extended forward traversal; bypass exit at x=8.",
    createWorld: (opts = {}) => {
      const dynamicBlockage = { x: 7, y: 3 };
      const hazards = [{ x: 6, y: 3, cost: 2 }];
      return new ChangedWorld({
        ...opts,
        dynamicBlockage,
        hazards,
        recoveryZone: (body) => (body.y === 1 || body.y === 5) && body.x >= 7,
      });
    },
  },

  ENV_5_HAZARD_BIAS_LEFT: {
    id: "ENV_5_HAZARD_BIAS_LEFT",
    name: "Asymmetric Hazard: North Corridor Noxious",
    description: "Severe noxious gradient along North bypass; South bypass clear.",
    createWorld: (opts = {}) => {
      const hazards = [
        { x: 5, y: 3, cost: 2 },
        { x: 5, y: 1, cost: 4 },
        { x: 6, y: 1, cost: 4 },
      ];
      return new ChangedWorld({
        ...opts,
        hazards,
      });
    },
  },

  ENV_6_HAZARD_BIAS_RIGHT: {
    id: "ENV_6_HAZARD_BIAS_RIGHT",
    name: "Asymmetric Hazard: South Corridor Noxious",
    description: "Severe noxious gradient along South bypass; North bypass clear.",
    createWorld: (opts = {}) => {
      const hazards = [
        { x: 5, y: 3, cost: 2 },
        { x: 5, y: 5, cost: 4 },
        { x: 6, y: 5, cost: 4 },
      ];
      return new ChangedWorld({
        ...opts,
        hazards,
      });
    },
  },

  ENV_7_DUAL_BYPASS: {
    id: "ENV_7_DUAL_BYPASS",
    name: "Wide Symmetric Dual Bypass",
    description: "Both North and South dividing walls have widened openings at x=3, 4, 5.",
    createWorld: (opts = {}) => {
      const staticObstacles = [
        { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
        { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
      ];
      return new ChangedWorld({
        ...opts,
        staticObstacles,
      });
    },
  },

  ENV_8_DEAD_END: {
    id: "ENV_8_DEAD_END",
    name: "Cul-de-Sac Dead End (Requires Backward Withdrawal)",
    description: "Corridor walls enclose (5, 3) on North, South, and East. Requires backward step to (4, 3) to bypass.",
    createWorld: (opts = {}) => {
      const staticObstacles = [
        { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
        { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
      ];
      return new ChangedWorld({
        ...opts,
        staticObstacles,
        recoveryZone: (body) => (body.y === 1 || body.y === 5) && body.x >= 5,
      });
    },
  },

  ENV_9_NOVEL_START_HEADING: {
    id: "ENV_9_NOVEL_START_HEADING",
    name: "Novel Initial Heading (Facing North)",
    description: "Starts at (1, 3) facing North (heading=3). Requires right turn to orient East.",
    createWorld: (opts = {}) => {
      const startPos = { x: 1, y: 3, heading: 3 };
      return new ChangedWorld({
        ...opts,
        startPos,
      });
    },
  },

  ENV_POLARITY_LEFT: {
    id: "ENV_POLARITY_LEFT",
    name: "True Turn-Polarity Pair: Left Required",
    description: "Exact geometric mirror of ENV_POLARITY_RIGHT. South wall is solid; North passage open at x=5 to North goal.",
    createWorld: (opts = {}) => {
      const staticObstacles = buildEnclosedPerimeter();
      // South dividing wall y=4 is solid (no passage)
      for (let x = 0; x <= 8; x++) {
        staticObstacles.push({ x, y: 4 });
      }
      // North dividing wall y=2 has passage ONLY at x=5
      for (let x = 0; x <= 8; x++) {
        if (x !== 5) staticObstacles.push({ x, y: 2 });
      }
      const goalRegion = { xMin: 9, xMax: 10, yMin: 1, yMax: 2 };
      return new ChangedWorld({
        ...opts,
        staticObstacles,
        goalRegion,
        recoveryZone: (body) => body.y === 1 && body.x >= 6,
      });
    },
  },

  ENV_POLARITY_RIGHT: {
    id: "ENV_POLARITY_RIGHT",
    name: "True Turn-Polarity Pair: Right Required",
    description: "Exact geometric mirror of ENV_POLARITY_LEFT. North wall is solid; South passage open at x=5 to South goal.",
    createWorld: (opts = {}) => {
      const staticObstacles = buildEnclosedPerimeter();
      // North dividing wall y=2 is solid (no passage)
      for (let x = 0; x <= 8; x++) {
        staticObstacles.push({ x, y: 2 });
      }
      // South dividing wall y=4 has passage ONLY at x=5
      for (let x = 0; x <= 8; x++) {
        if (x !== 5) staticObstacles.push({ x, y: 4 });
      }
      const goalRegion = { xMin: 9, xMax: 10, yMin: 4, yMax: 5 };
      return new ChangedWorld({
        ...opts,
        staticObstacles,
        goalRegion,
        recoveryZone: (body) => body.y === 5 && body.x >= 6,
      });
    },
  },

  ENV_CHOICE_WITH_REVERSAL: {
    id: "ENV_CHOICE_WITH_REVERSAL",
    name: "Non-Wall-Followable: Choice with Reversal",
    description: "First obstacle requires LEFT steering at x=4. Second obstacle requires RIGHT steering at x=8. Defeats fixed wall-following.",
    createWorld: (opts = {}) => {
      const staticObstacles = buildEnclosedPerimeter();
      // South dividing wall y=4 is solid
      for (let x = 0; x <= 8; x++) {
        staticObstacles.push({ x, y: 4 });
      }
      // North dividing wall y=2 has passage at x=4 and x=8 ONLY
      for (let x = 0; x <= 8; x++) {
        if (x !== 4 && x !== 8) staticObstacles.push({ x, y: 2 });
      }
      // Wall ahead at (9, 1) blocks East in North corridor
      staticObstacles.push({ x: 9, y: 1 });
      const dynamicBlockage = { x: 5, y: 3 };
      const goalRegion = { xMin: 9, xMax: 10, yMin: 3, yMax: 4 };
      return new ChangedWorld({
        ...opts,
        staticObstacles,
        dynamicBlockage,
        goalRegion,
        recoveryZone: (body) => body.x >= 8 && (body.y === 3 || body.y === 4),
      });
    },
  },

  ENV_TEMPORAL_NON_MARKOVIAN: {
    id: "ENV_TEMPORAL_NON_MARKOVIAN",
    name: "Temporally Non-Markovian Task",
    description: "At Junction J (3, 3), sensory observation is 100% bit-exact identical between Trial 1 and Trial 2. Requires memory of prior experience.",
    createWorld: (opts = {}) => new TemporalNonMarkovianWorld({ ...opts }),
  },
});
