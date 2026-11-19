export class Wanted {
  constructor() { this.reset(); }
  crime() {
    this.level = Math.min(5, this.level + 1);
    this.hidden = 0;
  }
  reset() { this.level = 0; this.hidden = 0; }
  update(dt, position, police) {
    if (!this.level) return;
    this.hidden = police.some(car => car.position.distanceToSquared(position) < 60 ** 2)
      ? 0 : this.hidden + dt;
    if (this.hidden >= 20) { this.level--; this.hidden = 0; }
  }
}
