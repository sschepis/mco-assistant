/* eslint-disable @typescript-eslint/no-explicit-any */
import MultiContextObject from '@/core/MultiContextObject';
import { contextAware } from '@/decorators/DecoratorFactory';
import { DataProvider } from '../types'; // Corrected import path

export default class AuthObject extends MultiContextObject {
    constructor(public id: string, public provider: DataProvider, public networkManager: any, public objectManager: any) {
      super(id, 'AuthObject', [
        { name: 'browser', version: '1.0' },
        { name: 'server', version: '1.0' },
        { name: 'auth', version: '1.0' }
      ], provider, networkManager, objectManager);
  
      this.registerMethod('login', { name: 'auth', version: '1.0' }, this.login.bind(this));
      this.registerMethod('register', { name: 'auth', version: '1.0' }, this.register.bind(this));
      this.registerMethod('logout', { name: 'auth', version: '1.0' }, this.logout.bind(this));
      this.registerMethod('checkAuthStatus', { name: 'browser', version: '1.0' }, this.checkAuthStatus.bind(this));
    }
  
    @contextAware({ name: 'auth', version: '1.0' }) // Removed descriptor property
    async login(username: string, password: string): Promise<boolean> {
        return await this.provider.login(username, password);
    }
  
    @contextAware({ name: 'auth', version: '1.0' })
    async register(username: string, password: string): Promise<boolean> {
        return await this.provider.register(username, password);
    }
  
    @contextAware({ name: 'auth', version: '1.0' })
    async logout(): Promise<void> {
        await this.provider.logout();
    }
  
    @contextAware({ name: 'browser', version: '1.0' })
    async checkAuthStatus(): Promise<boolean> {
        return await this.provider.checkAuthStatus();
    }
  }