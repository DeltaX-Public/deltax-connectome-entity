const DELTAS = Object.freeze([[1, 0], [0, 1], [-1, 0], [0, -1]]);

/** Small deterministic body harness. It intentionally exposes no inspect motor. */
export class RoverBody {
  constructor({x = 1, y = 2, heading = 0, energy = 20} = {}) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.energy = energy;
  }

  snapshot() {
    return {x: this.x, y: this.y, heading: this.heading, energy: this.energy};
  }

  proposal(action) {
    if (!ROVER_ACTIONS.includes(action)) {
      throw new Error(`Unsupported rover action: ${action}`);
    }
    const turn = action === 'left' ? -1 : action === 'right' ? 1 : 0;
    const nextHeading = (this.heading + turn + 4) % 4;
    let target = { x: this.x, y: this.y };
    if (action === 'forward') {
      const [dx, dy] = DELTAS[nextHeading];
      target = { x: this.x + dx, y: this.y + dy };
    } else if (action === 'backward') {
      const oppositeHeading = (this.heading + 2) % 4;
      const [bx, by] = DELTAS[oppositeHeading];
      target = { x: this.x + bx, y: this.y + by };
    }
    return { action, nextHeading, target };
  }

  apply(proposal, {canMove = () => true} = {}) {
    if (proposal.action === 'stop') return {status: 'STOPPED', state: this.snapshot()};
    if (proposal.action === 'left' || proposal.action === 'right') {
      this.heading = proposal.nextHeading;
      this.energy = Math.max(0, this.energy - 0.1);
      return {status: 'TURNED', state: this.snapshot()};
    }
    if (proposal.action === 'backward') {
      if (!canMove(proposal.target)) return {status: 'BLOCKED', target: proposal.target, state: this.snapshot()};
      this.x = proposal.target.x;
      this.y = proposal.target.y;
      this.energy = Math.max(0, this.energy - 1.0);
      return {status: 'MOVED_BACKWARD', target: proposal.target, state: this.snapshot()};
    }
    if (!canMove(proposal.target)) return {status: 'BLOCKED', target: proposal.target, state: this.snapshot()};
    this.x = proposal.target.x;
    this.y = proposal.target.y;
    this.energy = Math.max(0, this.energy - 1);
    return {status: 'MOVED', state: this.snapshot()};
  }
}

export const ROVER_ACTIONS = Object.freeze(['forward', 'backward', 'left', 'right', 'stop']);
