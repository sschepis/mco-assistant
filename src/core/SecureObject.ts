/* eslint-disable @typescript-eslint/no-explicit-any */
import { encryptedFor } from '../decorators/DecoratorFactory';

class SecureObject {
  user: any;

  constructor(user: any) {
    this.user = user;
  }

  @encryptedFor('publicKeyOfAllowedUser')
  secureMethod(arg1: string, arg2: string): string {
    return `This is secure: ${arg1}, ${arg2}`;
  }
}

export default SecureObject;
