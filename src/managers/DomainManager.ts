import { DataProvider, DomainConfig } from '../types'; // Corrected import path

export default class DomainManager {
  private static instance: DomainManager;
  private domains: Map<string, DomainConfig> = new Map();

  private constructor(private provider: DataProvider) {

  }

  static getInstance(provider: DataProvider): DomainManager {
    if (!DomainManager.instance) {
      DomainManager.instance = new DomainManager(provider);
    }
    return DomainManager.instance;
  }

  async registerDomain(domainName: string, rootNode: string, publicKey: string): Promise<void> {
    const domainConfig: DomainConfig = { rootNode, publicKey };
    this.domains.set(domainName, domainConfig);
    await this.provider.put(['domains', domainName], domainConfig);
  }

  async getDomainConfig(domainName: string): Promise<DomainConfig | undefined> {
    if (this.domains.has(domainName)) {
      return this.domains.get(domainName);
    }
    return new Promise((resolve) => {
      this.provider.once(['domains', domainName], (domainConfig: unknown) => {
        if (domainConfig) {
          this.domains.set(domainName, domainConfig as DomainConfig);
        }
        resolve(domainConfig as DomainConfig | undefined);
      });
    });
  }

  async verifyDomainSignature(domainName: string, signature: string): Promise<boolean> {
    const domainConfig = await this.getDomainConfig(domainName);
    if (!domainConfig) {
      throw new Error(`Domain ${domainName} not found`);
    }
    const { publicKey } = domainConfig;
    const verificationResult = await this.provider.verify(signature, publicKey);
    return verificationResult;
  }

  async signDomainData(domainName: string, data: object): Promise<string> {
    const domainConfig = await this.getDomainConfig(domainName);
    if (!domainConfig) {
      throw new Error(`Domain ${domainName} not found`);
    }
    const { publicKey } = domainConfig;
    const signature = await this.provider.sign(data, publicKey);
    return signature;
  }
}