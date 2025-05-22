import { DataProvider } from '../types'; // Corrected import path

import HashChainTransactionManager from './HashChainTransactionManager';
import { eventEmitter } from '../decorators/DecoratorFactory';
import EventManager from '../managers/EventManager';

class HashChainNetwork {
  private transactionManager: HashChainTransactionManager;
  private eventManager: EventManager;

  constructor(private provider: DataProvider) {
    this.transactionManager = new HashChainTransactionManager(provider);
    this.eventManager = EventManager.getInstance(provider);
  }

  @eventEmitter('transactionBroadcast')
  async broadcastTransaction(encryptedTransaction: string): Promise<void> {
    await this.provider.put(['transactions', Date.now().toString()], encryptedTransaction);
  }

  async getLatestTransactions(limit: number = 100): Promise<string[]> {
    return new Promise((resolve) => {
      this.provider.once(['transactions'], (transactions: string[]) => {
        resolve(transactions.slice(-limit));
      });
    });
  }

  async verifyTransactionChain(transactions: string[]): Promise<boolean> {
    let previousHash = 'genesis';
    for (const transaction of transactions) {
      const { from, previousHash: transactionPreviousHash } = await this.transactionManager.getTransactionDetails(transaction);
      if (transactionPreviousHash !== previousHash) {
        return false;
      }
      if (!(await this.transactionManager.verifyTransaction(transaction, from))) {
        return false;
      }
      previousHash = await this.provider.sign(transaction, 'networkSecret');
    }
    return true;
  }

  subscribeToTransactions(callback: (transaction: string) => void): void {
    this.eventManager.on('network', 'transactionBroadcast', callback);
  }
}

export default HashChainNetwork;