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
    if (!['forward', 'left', 'right', 'stop'].includes(action)) {
      throw new Error(`Unsupported rover action: ${action}`);
    }
    const turn = action === 'left' ? -1 : action === 'right' ? 1 : 0;
    const nextHeading = (this.heading + turn + 4) % 4;
    const [dx, dy] = DELTAS[nextHeading];
    return {action, nextHeading, target: action === 'forward' ? {x: this.x + dx, y: this.y + dy} : {x: this.x, y: this.y}};
  }

  apply(proposal, {canMove = () => true} = {}) {
    if (proposal.action === 'stop') return {status: 'STOPPED', state: this.snapshot()};
    if (proposal.action === 'left' || proposal.action === 'right') {
      this.heading = proposal.nextHeading;
      this.energy = Math.max(0, this.energy - 0.1);
      return {status: 'TURNED', state: this.snapshot()};
    }
    if (!canMove(proposal.target)) return {status: 'BLOCKED', target: proposal.target, state: this.snapshot()};
    this.x = proposal.target.x;
    this.y = proposal.target.y;
    this.energy = Math.max(0, this.energy - 1);
    return {status: 'MOVED', state: this.snapshot()};
  }
}

export const ROVER_ACTIONS = Object.freeze(['forward', 'left', 'right', 'stop']);
