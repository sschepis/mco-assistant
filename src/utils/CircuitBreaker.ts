import Logger from "./Logger";

class CircuitBreaker {
  failureCount: number;
  failureThreshold: number;
  resetTimeout: number;
  state: 'CLOSED' | 'OPEN' | 'HALF-OPEN';
  private logger: Logger;

  constructor(failureThreshold: number = 5, resetTimeout: number = 30000) {
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED';
    this.logger = Logger.getInstance();
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      this.logger.warn('Circuit is OPEN');
      throw new Error('Circuit is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      this.logger.error('Circuit Breaker: Operation failed', error);
      throw error;
    }
  }

  onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      setTimeout(() => {
        this.state = 'HALF-OPEN';
      }, this.resetTimeout);
    }
  }
}

export default CircuitBreaker;