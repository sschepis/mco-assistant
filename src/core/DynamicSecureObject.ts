/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataProvider } from '../types'; // Corrected import path

import PermissionsManager from "../security/PermissionsManager";

class DynamicSecureObject {

  constructor(private user: any, private permissionsManager: PermissionsManager, private provider: DataProvider) {
  }

  async executeSecure(methodName: string, ...args: any[]): Promise<any> {
    const encryptedMethod = await this.permissionsManager.getEncryptedMethod(methodName, this.user.pub);
    if (!encryptedMethod) {
      throw new Error('Permission denied or method not found');
    }
    const decryptedFunc = await this.provider.decrypt(encryptedMethod, this.user.pair());
    return eval(`(${decryptedFunc})`)(...args);
  }
}

export default DynamicSecureObject;