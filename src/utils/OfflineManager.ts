import Logger from "./Logger";
import { Operation } from '../types'; // Corrected import path

export default class OfflineManager {
    queue: Operation[];
    isOnline: boolean;
    private logger: Logger;
  
    constructor() {
      this.queue = [];
      this.isOnline = navigator.onLine;
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      this.logger = Logger.getInstance();
    }
  
    queueOperation(operation: Operation): Promise<any> {
      if (this.isOnline) {
        return operation();
      }
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  
    async handleOnline(): Promise<void> {
      this.isOnline = true;
      this.logger.info('Connection is back online. Processing queued operations...');
      while (this.queue.length > 0) {
        const operation = this.queue.shift();
        if (operation) {
          try {
            await operation();
          } catch (error) {
            this.logger.error('Failed to process queued operation', error);
          }
        }
      }
      this.logger.info('All queued operations processed.');
    }
  
    handleOffline(): void {
      this.isOnline = false;
      this.logger.warn('Connection is offline. Operations will be queued.');
    }
  }
  