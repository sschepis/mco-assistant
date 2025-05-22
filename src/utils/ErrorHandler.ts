import Logger from "./Logger";

class ErrorHandler {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  handleError(error: Error | Event, context: string): void {
    this.logger.error(`Error in ${context}:`, error);
    // Implement more sophisticated error handling here
  }
}

export default ErrorHandler;