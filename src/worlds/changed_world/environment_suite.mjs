/**
 * Environment Generalization Suite (Phase IV-C).
 * 10 frozen environment configurations evaluating spatial generalization,
 * mirror symmetry, obstacle shifts, hazard gradients, dead-end withdrawal,
 * and novel start headings.
 *
 * All environments obey strict information parity (zero coordinate cheats)
 * and are guaranteed solvable under the RoverBody actuator vocabulary.
 */
import { ChangedWorld } from "./world.mjs";

export const ENVIRONMENT_SUITE = Object.freeze({
  ENV_0_ORIGINAL: {
    id: "ENV_0_ORIGINAL",
    name: "Original ChangedWorld Baseline",
    description: "Standard layout: door at (6, 3), symmetric passages at x=3, 5, 8.",
    createWorld: (opts = {}) => new ChangedWorld({ ...opts }),
  },

  ENV_1_MIRROR_RIGHT_REQUIRED: {
    id: "ENV_1_MIRROR_RIGHT_REQUIRED",
    name: "Critical Mirror Test: Right Turn Required",
    description: "North passage at x=5 is blocked; South passage at x=5 is open. Overcomes connectome left-bias.",
    createWorld: (opts = {}) => {
      // North wall closed at x=5 (add obstacle {x: 5, y: 2}); South wall remains open at x=5
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
      // Walls at (5, 2) and (5, 4) enclose (5, 3) so left and right are blocked; door at (6, 3) blocks ahead!
      // Openings remain at x=3 and x=4.
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
      const startPos = { x: 1, y: 3, heading: 3 }; // Facing North
      return new ChangedWorld({
        ...opts,
        startPos,
      });
    },
  },
});
