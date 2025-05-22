import Logger from "../utils/Logger";
import CacheManager from "../utils/CacheManager";
import { DataProvider } from '../types'; // Corrected import path

class PermissionsManager {
  private readonly cacheManager: CacheManager;
  private readonly logger: Logger;

  constructor(private readonly provider: DataProvider) {
    this.cacheManager = CacheManager.getInstance();
    this.logger = Logger.getInstance();
  }

  async getEncryptedMethod(methodName: string, userPublicKey: string): Promise<string | null> {
    const cacheKey = `permission:${methodName}:${userPublicKey}`;
    const cachedMethod = this.cacheManager.get<string>(cacheKey);
    if (cachedMethod) return cachedMethod;

    return new Promise((resolve) => {
      this.provider.once(['permissions', methodName, userPublicKey], (data: string | null) => {
        if (data) {
          this.cacheManager.set(cacheKey, data, 300); // Cache for 5 minutes
        }
        resolve(data);
      });
    });
  }

  async hasPermission(userPublicKey: string, methodName: string): Promise<boolean> {
    const permission = await this.getEncryptedMethod(methodName, userPublicKey);
    return !!permission;
  }

  async setMethodPermission(methodName: string, userPublicKey: string, encryptedMethod: string): Promise<void> {
    await this.provider.put(['permissions', methodName, userPublicKey], encryptedMethod);
    this.cacheManager.invalidate(`permission:${methodName}:${userPublicKey}`);
  }

}
export default PermissionsManager;