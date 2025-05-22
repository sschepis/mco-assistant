class RateLimiter {
  private readonly limits: Map<string, { count: number; lastReset: number }> = new Map();

  constructor(private readonly maxRequests: number, private readonly interval: number) { }

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const limit = this.limits.get(key) || { count: 0, lastReset: now };

    if (now - limit.lastReset > this.interval) {
      limit.count = 1;
      limit.lastReset = now;
    } else if (limit.count < this.maxRequests) {
      limit.count++;
    } else {
      return false;
    }

    this.limits.set(key, limit);
    return true;
  }
}

export default RateLimiter;