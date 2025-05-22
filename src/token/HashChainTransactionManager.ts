// Corrected import paths
import { encrypt, decrypt } from '../security/utils/Crypto';
import { DataProvider } from '../types';
import { configDependent } from '../decorators/DecoratorFactory'; // Import specific decorator

import Configuration from '../Configuration';
import provider from '../Provider';
import loadManagers from '../Managers';

// Removed redundant configDependent assignment

const { networkManager, objectManager } = loadManagers(provider);

class HashChainTransactionManager {
  constructor(private provider: DataProvider) {}

  @configDependent // Removed argument
  async createTransaction(from: string, to: string, amount: number, previousHash: string): Promise<string> {
    const transactionData = `${from}|${to}|${amount}|${previousHash}`;
    const transactionHash = await this.provider.sign(transactionData, from);
    return encrypt(JSON.stringify({ transactionData, transactionHash }), Configuration.getInstance(
      provider,
      networkManager,
      objectManager,
    ).getConfig().transactionSecret || '');
  }

  @configDependent // Removed argument
  async verifyTransaction(encryptedTransaction: string, publicKey: string): Promise<boolean> {
    const { transactionHash } = JSON.parse(await decrypt(encryptedTransaction, Configuration.getInstance(
      provider,
      networkManager,
      objectManager,
    ).getConfig().transactionSecret || ''));
    return this.provider.verify(transactionHash, publicKey);
  }

  @configDependent // Removed argument
  async getTransactionDetails(encryptedTransaction: string): Promise<{ from: string; to: string; amount: number; previousHash: string }> {
    const { transactionData } = JSON.parse(await decrypt(encryptedTransaction, Configuration.getInstance(
      provider,
      networkManager,
      objectManager,
    ).getConfig().transactionSecret || ''));
    const [from, to, amount, previousHash] = transactionData.split('|');
    return { from, to, amount:Number(amount), previousHash };
  }
}

export default HashChainTransactionManager;