import Logger from "./Logger";

class RetryManager {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async retry<T>(fn: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) {
          this.logger.error('Max retries reached', error);
          throw error;
        }
        this.logger.warn(`Retry attempt ${i + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries reached');
  }
}

export default RetryManager;