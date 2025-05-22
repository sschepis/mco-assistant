import MultiContextObject from '../core/MultiContextObject';
import { DataProvider, ContextType } from '../types'; // Corrected import path

import { contextAware, aiModelSwitch } from '../decorators/DecoratorFactory';
import {NetworkManager} from '../managers/NetworkManager';
import ObjectManager from '../managers/ObjectManager';
import AIProviderManager from '../managers/AIProviderManager';
import CacheManager from '../utils/CacheManager';
import RateLimiter from '../utils/RateLimiter';
import CircuitBreaker from '../utils/CircuitBreaker';
import Configuration from '@/Configuration';
import PromptManager from '@/managers/PromptManager';
import StateManager from '@/managers/StateManager';
import ToolManager from '@/managers/ToolManager';
import { ActionQueue } from '@/utils/ActionQueue';

class HashChainToken extends MultiContextObject {
  private balance: number;
  private transactionHistory: string[];
  private cacheManager: CacheManager;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(
    id: string,
    contexts: ContextType[],
    private configuration: Configuration,
    public provider: DataProvider,
    public networkManager: NetworkManager,
    public objectManager: ObjectManager,
    public promptManager: PromptManager,
    public toolManager: ToolManager,
    public stateManager: StateManager,
    public actionQueue: ActionQueue,
    initialBalance: number
  ) {
    super(id, 'HashChainToken', contexts, provider, networkManager, objectManager);
    this.balance = initialBalance;
    this.transactionHistory = ['genesis'];
    this.cacheManager = CacheManager.getInstance();
    this.rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
    this.circuitBreaker = new CircuitBreaker();
    this.registerMethod('transfer', { name: 'client', version: '1.0' }, this.transfer.bind(this));
    this.registerMethod('getBalance', { name: 'client', version: '1.0' }, this.getBalance.bind(this));
    this.registerMethod('getTransactionHistory', { name: 'client', version: '1.0' }, this.getTransactionHistory.bind(this));
  }

  @contextAware({ name: 'client', version: '1.0' })
  async transfer(to: string, amount: number): Promise<boolean> {
    if (!this.rateLimiter.canMakeRequest(this.id)) {
      throw new Error('Rate limit exceeded');
    }

    return this.circuitBreaker.execute(async () => {
      if (amount > this.balance) {
        throw new Error('Insufficient balance');
      }

      const previousHash = this.transactionHistory[this.transactionHistory.length - 1];
      const newHash = await this.hashTransaction(to, amount.toString(), previousHash);
      
      this.balance -= amount;
      this.transactionHistory.push(newHash);
      
      await this.setState({ 
        balance: this.balance, 
        transactionHistory: this.transactionHistory 
      });

      this.cacheManager.invalidate(`balance:${this.id}`);
      return true;
    });
  }

  @contextAware({ name: 'client', version: '1.0' })
  async getBalance(): Promise<number> {
    const cachedBalance = this.cacheManager.get<number>(`balance:${this.id}`);
    if (cachedBalance !== undefined) {
      return cachedBalance;
    }
    const balance = await this.circuitBreaker.execute(() => Promise.resolve(this.balance));
    this.cacheManager.set(`balance:${this.id}`, balance, 60000); // Cache for 1 minute
    return balance;
  }

  @contextAware({ name: 'client', version: '1.0' })
  async getTransactionHistory(): Promise<string[]> {
    return this.circuitBreaker.execute(() => Promise.resolve([...this.transactionHistory]));
  }

  @aiModelSwitch((input: string) => input.length > 100 ? 'anthropic' : 'openai')
  private async hashTransaction(...args: string[]): Promise<string> {

    const aiProvider = AIProviderManager.newInstance(
      this.configuration,
      this.promptManager,
      this.toolManager,
      this.stateManager,
      this.actionQueue
    ).getCurrentProvider();
    const hashPrompt = `Generate a unique hash for the following transaction data: ${args.join('|')}`;
    const response = await aiProvider.generateResponse(hashPrompt);
    return response.trim();
  }


  // HashCHainToken 
  // contexts: ContextType[],
  // private configuration: Configuration,
  // public provider: DataProvider,
  // public networkManager: NetworkManager,
  // public objectManager: ObjectManager,
  // public promptManager: PromptManager,
  // public toolManager: ToolManager,
  // public stateManager: StateManager,
  // public actionQueue: ActionQueue,
  // initialBalance: number


  static async create(
    configuration: Configuration,
    provider: DataProvider,
    contexts: ContextType[],
    initialBalance: number
  ): Promise<HashChainToken> {
    const networkManager = NetworkManager.newInstance(provider);
    const objectManager = ObjectManager.newInstance(provider);
    const toolManager = new ToolManager(configuration);
    const stateManager = new StateManager();
    const actionQueue = new ActionQueue();
    const promptManager = new PromptManager(configuration, provider, networkManager, objectManager, toolManager);
    const aiProvider = await AIProviderManager.newInstance(configuration, promptManager, toolManager, stateManager, actionQueue).getCurrentProvider();
    promptManager.init(aiProvider);
    const id = objectManager.generateId();
    const token = new HashChainToken(id, contexts, configuration, provider, networkManager, objectManager, promptManager, toolManager, stateManager, actionQueue, initialBalance);
    objectManager.registerObject(token);
    return token;
  }
}

export default HashChainToken;