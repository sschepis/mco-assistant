/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Corrected imports using relative paths
import MultiContextObject from './core/MultiContextObject';
import { ContextType, DataProvider } from './types'; // Value imports
import type { ConfigurationOptions } from './types'; // Type-only import
import { contextMethod } from './decorators/DecoratorFactory';
import { SERVER_CONTEXT, BROWSER_CONTEXT } from './Contexts';
import { NetworkManager } from './managers/NetworkManager';
import ObjectManager from './managers/ObjectManager';

// Removed redundant contextMethod assignment

export default class Configuration extends MultiContextObject {
  private static instance: Configuration;
  private config: ConfigurationOptions;

  private privateKeys = [
    'apiKeys',
    'domains',
    'aiProvider'
  ];

  private constructor(
    id: string,
    contexts: ContextType[],
    provider: DataProvider,
    networkManager: NetworkManager,
    objectManager: ObjectManager
  ) {
    super(id, 'configuration', contexts, provider, networkManager as any, objectManager as any);
    this.config = {
      aiProvider: 'openai',
      maxTokens: 100,
      temperature: 0.7,
      domains: {}
    };
  }

  static getInstance(
    provider: DataProvider,
    networkManager: NetworkManager,
    objectManager: ObjectManager
  ): Configuration {
    if (!Configuration.instance) {
      Configuration.instance = new Configuration(
        'global-config',
        [SERVER_CONTEXT, BROWSER_CONTEXT],
        provider,
        networkManager,
        objectManager
      );
    }
    return Configuration.instance;
  }

  loadConfig(): void {
    this.config = {
      ...this.config,
      apiKeys: {
        openai: process.env.OPENAI_API_KEY || this.config.apiKeys?.openai || '',
        gcloud: process.env.GOOGLE_CLOUD_API_KEY || this.config.apiKeys?.gcloud || '',
        azure: process.env.AZURE_API_KEY || this.config.apiKeys?.azure || '',
      },
      azureOpenaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT || this.config.azureOpenaiEndpoint,
    };
  }

  getSharedConfig(key: string): any {
    if (this.privateKeys.includes(key)) {
      throw new Error(`Cannot access private key: ${key}`);
    }
    return (this.config as any)[key] || null;
  }

  @contextMethod(SERVER_CONTEXT)
  setSharedConfig(key: string, value: any): void {
    if (this.privateKeys.includes(key)) {
      throw new Error(`Cannot set private key: ${key}`);
    }
    (this.config as any)[key] = value;
  }

  @contextMethod(SERVER_CONTEXT)
  setConfig(options: Partial<ConfigurationOptions>): void {
    this.config = { ...this.config, ...options };
  }

  @contextMethod(SERVER_CONTEXT)
  getConfig(): ConfigurationOptions {
    return { ...this.config };
  }

  @contextMethod(SERVER_CONTEXT)
  setApiKey(provider: string, apiKey: string): void {
    (this.config.apiKeys || {})[provider] = apiKey;
  }

  @contextMethod(SERVER_CONTEXT)
  getApiKey(provider: string): string | undefined {
    return (this.config.apiKeys || {})[provider];
  }

  @contextMethod(SERVER_CONTEXT)
  setDomainConfig(domainName: string, config: { rootNode: string; publicKey: string }): void {
    this.config.domains[domainName] = config;
  }

  @contextMethod(SERVER_CONTEXT)
  getDomainConfig(domainName: string): { rootNode: string; publicKey: string } | undefined {
    return this.config.domains[domainName];
  }

  @contextMethod(SERVER_CONTEXT)
  setAiProvider(provider: string): void {
    this.config.aiProvider = provider;
  }

  @contextMethod(SERVER_CONTEXT)
  getAiProvider(): string {
    return this.config.aiProvider;
  }

  @contextMethod(SERVER_CONTEXT)
  @contextMethod(BROWSER_CONTEXT)
  setMaxTokens(maxTokens: number): void {
    this.config.maxTokens = maxTokens;
  }

  @contextMethod(SERVER_CONTEXT)
  @contextMethod(BROWSER_CONTEXT)
  getMaxTokens(): number {
    return this.config.maxTokens;
  }

  @contextMethod(SERVER_CONTEXT)
  @contextMethod(BROWSER_CONTEXT)
  setTemperature(temperature: number): void {
    this.config.temperature = temperature;
  }

  @contextMethod(SERVER_CONTEXT)
  @contextMethod(BROWSER_CONTEXT)
  getTemperature(): number {
    return this.config.temperature;
  }

  @contextMethod(SERVER_CONTEXT)
  setAnthropicModel(model: string): void {
    this.config.anthropicModel = model;
  }

  @contextMethod(SERVER_CONTEXT)
  getAnthropicModel(): string {
    return this.config.anthropicModel || '';
  }

  getAnthropicLocation(): string {
    return this.config.anthropicLocation || '';
  }

  @contextMethod(SERVER_CONTEXT)
  setVertexModel(model: string): void {
    this.config.vertexModel = model;
  }

  @contextMethod(SERVER_CONTEXT)
  getVertexModel(): string {
    return this.config.vertexModel || '';
  }

  @contextMethod(SERVER_CONTEXT)
  setAzureOpenaiEndpoint(endpoint: string): void {
    this.config.azureOpenaiEndpoint = endpoint;
  }

  @contextMethod(SERVER_CONTEXT)
  getAzureOpenaiEndpoint(): string {
    return this.config.azureOpenaiEndpoint || '';
  }

  @contextMethod(SERVER_CONTEXT)
  setAzureOpenaiDeploymentName(deploymentName: string): void {
    this.config.azureOpenaiDeploymentName = deploymentName;
  }

  @contextMethod(SERVER_CONTEXT)
  getAzureOpenaiDeploymentName(): string {
    return this.config.azureOpenaiDeploymentName || '';
  }

  @contextMethod(SERVER_CONTEXT)
  setAzureOpenaiApiKey(apiKey: string): void {
    this.config.azureOpenaiApiKey = apiKey;
  }

  @contextMethod(SERVER_CONTEXT)
  getAzureOpenaiApiKey(): string {
    return this.config.azureOpenaiApiKey  || '';
  }

  @contextMethod(SERVER_CONTEXT)
  setGcloudRegionClaude(region: string): void {
    this.config.gcloudRegionClaude = region;
  }

  @contextMethod(SERVER_CONTEXT)
  getGcloudRegionClaude(): string {
    return this.config.gcloudRegionClaude || '';
  }

  @contextMethod(SERVER_CONTEXT)
  setGcloudProjectId(projectId: string): void {
    this.config.gcloudProjectId = projectId;
  }

  @contextMethod(SERVER_CONTEXT)
  getGcloudProjectId(): string {
    return this.config.gcloudProjectId || '';
  }

  @contextMethod(SERVER_CONTEXT)
  setGcloudRegion(region: string): void {
    this.config.gcloudRegion = region;
  }

  @contextMethod(SERVER_CONTEXT)
  getGcloudRegion(): string {
    return this.config.gcloudRegion || '';
  }

  @contextMethod(SERVER_CONTEXT)
  getTransactionSecret(): string {
    return this.config.transactionSecret || '';
  }

  @contextMethod(SERVER_CONTEXT)
  setLlamaEndpoint(endpoint: string): void {
    this.config.llamaEndpoint = endpoint;
  }

  @contextMethod(SERVER_CONTEXT)
  getLlamaEndpoint(): string {
    return this.config.llamaEndpoint || '';
  }

  @contextMethod(SERVER_CONTEXT)
  updateLLMSettings(_settings: any): void {
    //this.config.llmSettings = settings;
  } 

  @contextMethod(SERVER_CONTEXT)
  getCurrentProjectId(): string {
    return this.config.currentProjectId || '';
  }

  @contextMethod(SERVER_CONTEXT)
  getUserId(): string {
    return this.config.userId || '';
  }

  toJSON(): object {
    return {
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    };
  }

  fromJSON(data: any): void {
    this.config.maxTokens = data.maxTokens;
    this.config.temperature = data.temperature;
  }
}