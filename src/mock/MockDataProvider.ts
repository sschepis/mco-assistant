/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataProvider } from '../types'; // Corrected import path

import { EventEmitter } from 'events';

class MockDataProvider implements DataProvider {
  public readonly name: string = 'MockDataProvider';

  private data: Record<string, any> = {};
  private eventEmitter: EventEmitter = new EventEmitter();
  private subscriptions: Map<string, Set<(value: any) => void>> = new Map();

  constructor() {
    this.eventEmitter.setMaxListeners(100);
  }
  register(username: string, password: string): Promise<any> {
    return Promise.resolve({ user: username, token: password });
  }
  checkAuthStatus(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private getKeyString(keypath: string[]): string {
    return keypath.join('.');
  }

  private getNestedValue(obj: any, keypath: string[]): any {
    return keypath.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : undefined, obj);
  }

  private setNestedValue(obj: any, keypath: string[], value: any): void {
    const lastKey = keypath.pop();
    const target = keypath.reduce((acc, key) => {
      if (acc[key] === undefined) acc[key] = {};
      return acc[key];
    }, obj);
    target[lastKey!] = value;
  }

  async get(keypath: string[]): Promise<any> {
    return this.getNestedValue(this.data, keypath);
  }

  async set(keypath: string[], value: any): Promise<void> {
    this.setNestedValue(this.data, [...keypath], value);
    this.triggerCallbacks(keypath, value);
  }

  async put(keypath: string[], value: any): Promise<void> {
    const existingData = await this.get(keypath) || {};
    const newData = { ...existingData, ...value };
    await this.set(keypath, newData);
  }

  async del(keypath: string[]): Promise<void> {
    const parent = this.getNestedValue(this.data, keypath.slice(0, -1));
    if (parent) {
      delete parent[keypath[keypath.length - 1]];
    }
    this.triggerCallbacks(keypath, null);
  }

  on(keypath: string[], callback: (value: any) => void): void {
    const key = this.getKeyString(keypath);
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(callback);

    const currentValue = this.getNestedValue(this.data, keypath);
    if (currentValue !== undefined) {
      setTimeout(() => callback(currentValue), 0);
    }
  }

  once(keypath: string[], callback: (value: any) => void): void {
    const onceCallback = (value: any) => {
      this.off(keypath, onceCallback);
      callback(value);
    };
    this.on(keypath, onceCallback);
  }

  off(keypath: string[], callback: (value: any) => void): void {
    const key = this.getKeyString(keypath);
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)!.delete(callback);
    }
  }

  private triggerCallbacks(keypath: string[], value: any): void {
    while (keypath.length > 0) {
      const key = this.getKeyString(keypath);
      if (this.subscriptions.has(key)) {
        for (const callback of this.subscriptions.get(key)!) {
          setTimeout(() => callback(value), 0);
        }
      }
      keypath.pop();
    }
  }

  async verify(signature: string, publicKey: string): Promise<boolean> {
    return true;
  }

  async sign(data: any, privateKey: string): Promise<string> {
    return 'mockedSignature';
  }

  async decrypt(data: any, privateKey: string): Promise<any> {
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  async encrypt(data: any, publicKey: string): Promise<any> {
    return JSON.stringify(data);
  }

  async auth(credentials: any): Promise<any> {
    return { user: 'mockedUser', token: 'mockedToken' };
  }

  async pair(): Promise<any> {
    return { pub: 'mockedPublicKey', priv: 'mockedPrivateKey', epub: 'mockedEpub', epriv: 'mockedEpriv' };
  }

  // Helper methods for testing
  mockSet(keypath: string[], value: any): void {
    this.setNestedValue(this.data, keypath, value);
  }

  mockGet(keypath: string[]): any {
    return this.getNestedValue(this.data, keypath);
  }

  mockTriggerEvent(keypath: string[], value: any): void {
    this.triggerCallbacks(keypath, value);
  }

  mockClear(): void {
    this.data = {};
    this.subscriptions.clear();
  }

  login(username: string, password: string): Promise<any> {
    return Promise.resolve({ user: username, token: password });
  }

  logout(): Promise<void> {
    return Promise.resolve();
  }

  
}

export default MockDataProvider;