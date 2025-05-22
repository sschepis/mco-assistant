/* eslint-disable @typescript-eslint/no-explicit-any */
import HashChainToken from './HashChainToken';
import { DataProvider, ContextType } from '../types'; // Corrected import path

import { retry, measurePerformance } from '../decorators/DecoratorFactory';
import Logger from '../utils/Logger';
import Configuration from '@/Configuration';

class HashChainWallet {
  private tokens: Map<string, HashChainToken> = new Map();
  private logger: Logger;

  constructor(private configuration: Configuration, private provider: DataProvider, private contexts: ContextType[]) {
    this.logger = Logger.getInstance();
    this.configuration  = configuration;
    this.provider = provider;
    this.contexts = contexts;
    this.logger.info('HashChainWallet initialized');
    this.logger.info(`Configuration: ${JSON.stringify(this.configuration)}`);
    this.logger.info(`Provider: ${JSON.stringify(this.provider)}`);
  }

  @retry(3)
  @measurePerformance
  async createToken(initialBalance: number): Promise<string> {
    const token = await HashChainToken.create(this.configuration, this.provider, this.contexts, initialBalance);
    this.tokens.set(token.id, token);
    this.logger.info(`Created new token with ID: ${token.id}`);
    return token.id;
  }

  @retry(3)
  @measurePerformance
  async transfer(tokenId: string, to: string, amount: number): Promise<boolean> {
    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new Error('Token not found');
    }
    const result = await token.transfer(to, amount);
    this.logger.info(`Transferred ${amount} from token ${tokenId} to ${to}`);
    return result;
  }

  @retry(3)
  async getBalance(tokenId: string): Promise<number> {
    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new Error('Token not found');
    }
    return token.getBalance();
  }

  @retry(3)
  async receiveToken(tokenId: string): Promise<void> {
    const token: any = await HashChainToken.get(this.provider, tokenId);
    this.tokens.set(tokenId, token);
    this.logger.info(`Received token with ID: ${tokenId}`);
  }

  getTokenIds(): string[] {
    return Array.from(this.tokens.keys());
  }

  @measurePerformance
  async getWalletBalance(): Promise<number> {
    let total = 0;
    for (const token of this.tokens.values()) {
      total += await token.getBalance();
    }
    return total;
  }
}

export default HashChainWallet;