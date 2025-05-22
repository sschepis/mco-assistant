/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContextConfig, ContextType } from '../types'; // Corrected import path

export class ContextManager {
  private contexts: Map<string, ContextConfig>;

  constructor(contexts: ContextType[], contextConfigs: ContextConfig[] = []) {
    if (contexts.length !== contextConfigs.length) {
      throw new Error('Contexts and contextConfigs must have the same length');
    }
    this.contexts = new Map(contexts.map((context, index) => [`${context.name}:${context.version}`, contextConfigs[index]]));
  }

  getContext(contextType: ContextType): ContextConfig | undefined {
    return this.contexts.get(`${contextType.name}:${contextType.version}`);
  }

  setContextConfig(contextType: ContextType, config: ContextConfig): void {
    const key = `${contextType.name}:${contextType.version}`;
    if (!this.contexts.has(key)) {
      throw new Error(`Context ${JSON.stringify(contextType)} not found`);
    }
    this.contexts.set(key, config);
  }

  hasContext(contextType: ContextType): boolean {
    return this.contexts.has(`${contextType.name}:${contextType.version}`);
  }

  addContext(contextType: ContextType, config?: ContextConfig): void {
    const key = `${contextType.name}:${contextType.version}`;
    if (this.contexts.has(key)) {
      throw new Error(`Context ${JSON.stringify(contextType)} already exists`);
    }
    if (!config) {
      config = { credentials: { username: '', password: '' } };
    }
    this.contexts.set(key, config);
  }

  removeContext(contextType: ContextType): void {
    const key = `${contextType.name}:${contextType.version}`;
    if (!this.contexts.has(key)) {
      throw new Error(`Context ${JSON.stringify(contextType)} not found`);
    }
    this.contexts.delete(key);
  }

  getContextTypes(): ContextType[] {
    return Array.from(this.contexts.keys()).map((key) => {
      const [name, version] = key.split(':');
      return { name, version };
    });
  }

  getContextConfigs(): ContextConfig[] {
    return Array.from(this.contexts.values());
  }

  updateContextConfig(contextType: ContextType, config: Partial<ContextConfig>): void {
    if (!this.contexts.has(contextType.name)) {
      throw new Error(`Context ${contextType} not found`);
    }
    const currentConfig = this.contexts.get(contextType.name);
    this.contexts.set(contextType.name, { ...currentConfig, ...config } as any);
  }

  clearContexts(): void {
    this.contexts.clear();
  }

  getContextCount(): number {
    return this.contexts.size;
  }

  hasContextConfig(contextType: ContextType, configKey: keyof ContextConfig): boolean {
    const config = this.contexts.get(contextType.name);
    return config ? configKey in config : false;
  }

  getContextConfigValue<K extends keyof ContextConfig>(contextType: ContextType, configKey: K): ContextConfig[K] | undefined {
    const config = this.contexts.get(contextType.name);
    return config ? config[configKey] : undefined;
  }

  setContextConfigValue<K extends keyof ContextConfig>(contextType: ContextType, configKey: K, value: ContextConfig[K]): void {
    if (!this.contexts.has(contextType.name)) {
      throw new Error(`Context ${contextType} not found`);
    }
    const config = this.contexts.get(contextType.name);
    if (config) {
      config[configKey] = value;
    }
  }
}