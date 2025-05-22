/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataProvider } from '../types'; // Corrected import path

import HashChainTransactionManager from './HashChainTransactionManager';
import { cacheResult } from '../decorators/DecoratorFactory';

class HashChainExplorer {
  private transactionManager: HashChainTransactionManager;

  constructor(private provider: DataProvider) {
    this.transactionManager = new HashChainTransactionManager(provider);
  }

  @cacheResult(60000) // Cache for 1 minute
  async getTokenTransactions(tokenId: string, limit: number = 100): Promise<any[]> {
    const transactions = await this.provider.get(['transactions']);
    const tokenTransactions = transactions.filter((tx: string) => tx.includes(tokenId));
    return Promise.all(tokenTransactions.slice(-limit).map(this.transactionManager.getTransactionDetails));
  }

  @cacheResult(300000) // Cache for 5 minutes
  async getAddressBalance(address: string): Promise<number> {
    const transactions = await this.provider.get(['transactions']);
    let balance = 0;
    for (const tx of transactions) {
      const details = await this.transactionManager.getTransactionDetails(tx);
      if (details.to === address) balance += details.amount;
      if (details.from === address) balance -= details.amount;
    }
    return balance;
  }

  async searchTransactions(query: string): Promise<any[]> {
    const transactions = await this.provider.get(['transactions']);
    const matchingTransactions = transactions.filter((tx: string) => tx.includes(query));
    return Promise.all(matchingTransactions.map(this.transactionManager.getTransactionDetails));
  }
}

export default HashChainExplorer;