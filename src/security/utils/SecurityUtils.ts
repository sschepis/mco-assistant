/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import Gun from 'gun';
import 'gun/sea';
import PermissionsManager from '../PermissionsManager';
const SEA = Gun.SEA;

export async function createEncryptedClosure(func: Function, publicKey: string): Promise<string> {
  const closureCode = `
      (function() {
        const privateData = "This is secret";
        return ${func.toString()};
      })()
    `;
  return await SEA.encrypt(closureCode, publicKey);
}

export async function executeEncryptedClosure(encryptedClosure: string, privateKey: string, ...args: any[]): Promise<any> {
  const decryptedCode = await SEA.decrypt(encryptedClosure, privateKey);
  return eval(decryptedCode)(...args);
}

export function createSecureProxy<T extends object>(target: T, user: any, permissionsManager: PermissionsManager): T {
  return new Proxy(target, {
    get(obj: T, prop: string | symbol) {
      if (typeof obj[prop as keyof T] === 'function') {
        return async (...args: any[]) => {
          if (await permissionsManager.hasPermission(user.pub, prop.toString())) {
            return (obj[prop as keyof T] as Function).apply(obj, args);
          }
          throw new Error('Permission denied');
        };
      }
      return obj[prop as keyof T];
    }
  });
}
