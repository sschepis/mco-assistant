/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigurationOptions } from './types';

export default class SimpleConfiguration {
  private static instance: SimpleConfiguration;
  private config: ConfigurationOptions;

  private constructor() {
    this.config = {
      aiProvider: 'openai',
      maxTokens: 4000,
      temperature: 0.7,
      domains: {},
      apiKeys: {}
    };
    this.loadConfig();
  }

  static getInstance(): SimpleConfiguration {
    if (!SimpleConfiguration.instance) {
      SimpleConfiguration.instance = new SimpleConfiguration();
    }
    return SimpleConfiguration.instance;
  }

  private loadConfig(): void {
    this.config = {
      ...this.config,
      apiKeys: {
        openai: process.env.OPENAI_API_KEY || this.config.apiKeys?.openai || '',
        anthropic: process.env.ANTHROPIC_API_KEY || this.config.apiKeys?.anthropic || '',
        azure: process.env.AZURE_API_KEY || this.config.apiKeys?.azure || '',
        gcloud: process.env.GOOGLE_CLOUD_API_KEY || this.config.apiKeys?.gcloud || '',
      },
      azureOpenaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT || this.config.azureOpenaiEndpoint,
      maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    };
  }

  getSharedConfig(key: string): any {
    return (this.config as any)[key] || null;
  }

  setSharedConfig(key: string, value: any): void {
    (this.config as any)[key] = value;
  }

  setConfig(options: Partial<ConfigurationOptions>): void {
    this.config = { ...this.config, ...options };
  }

  getConfig(): ConfigurationOptions {
    return { ...this.config };
  }

  setApiKey(provider: string, apiKey: string): void {
    if (!this.config.apiKeys) {
      this.config.apiKeys = {};
    }
    this.config.apiKeys[provider] = apiKey;
  }

  getApiKey(provider: string): string | undefined {
    return this.config.apiKeys?.[provider];
  }

  setDomainConfig(domainName: string, config: { rootNode: string; publicKey: string }): void {
    this.config.domains[domainName] = config;
  }

  getDomainConfig(domainName: string): { rootNode: string; publicKey: string } | undefined {
    return this.config.domains[domainName];
  }

  setAiProvider(provider: string): void {
    this.config.aiProvider = provider;
  }

  getAiProvider(): string {
    return this.config.aiProvider;
  }

  setMaxTokens(maxTokens: number): void {
    this.config.maxTokens = maxTokens;
  }

  getMaxTokens(): number {
    return this.config.maxTokens;
  }

  setTemperature(temperature: number): void {
    this.config.temperature = temperature;
  }

  getTemperature(): number {
    return this.config.temperature;
  }

  // Helper methods for common configurations
  isApiKeySet(provider: string): boolean {
    const key = this.getApiKey(provider);
    return Boolean(key && key.length > 0);
  }

  hasValidConfiguration(): boolean {
    return this.isApiKeySet('openai') || this.isApiKeySet('anthropic') || this.isApiKeySet('azure');
  }

  getDefaultProvider(): string {
    if (this.isApiKeySet('anthropic')) return 'anthropic';
    if (this.isApiKeySet('openai')) return 'openai';
    if (this.isApiKeySet('azure')) return 'azure';
    return 'anthropic'; // Default fallback
  }
}