/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';
// Corrected import path for types
import { ContextType, DataProvider, MethodRegistry } from '../types';

import { ContextManager } from '../context/ContextManager';
import { NetworkManager } from '../managers/NetworkManager';
import ObjectManager from '../managers/ObjectManager';
import { SERVER_CONTEXT, BROWSER_CONTEXT } from '../Contexts'; // Import context objects

interface MultiContextObjectOptions {
  initialState?: any;
  methods?: { [key: string]: { context: ContextType, implementation: Function } };
  contextConfigs?: { credentials: { username: string, password: string } }[];
}

export default class MultiContextObject extends EventEmitter {
  private _methods: Map<string, { context: ContextType, implementation: Function }> = new Map();
  private _proxy: any;
  public _state: any = {};
  public contextManager: ContextManager;
  public methodRegistry: MethodRegistry = {};

  constructor(
    public readonly id: string,
    public readonly objectType: string,
    public readonly contexts: ContextType[],
    public readonly provider: DataProvider,
    public readonly networkManager: NetworkManager,
    public readonly objectManager: ObjectManager,
    options: MultiContextObjectOptions = {}
  ) {
    super();
    const contextConfigs = options.contextConfigs || (contexts ? contexts.map(() => ({ credentials: { username: '', password: '' } })) : []);
    this.contextManager = new ContextManager(contexts || [], contextConfigs);
    this.objectManager.registerObject(this);
    this._proxy = new Proxy(this, {
      get: (target, prop) => {
        if (typeof prop === 'string' && this._methods.has(prop)) {
          return (...args: any[]) => this._invokeMethod(prop, args);
        }
        return (target as any)[prop];
      }
    });

    if (options.initialState) {
      this._state = { ...options.initialState };
    }

    if (options.methods) {
      for (const [methodName, method] of Object.entries(options.methods)) {
        this.registerMethod(methodName, method.context, method.implementation);
      }
    }
  }

  static async get<T extends MultiContextObject>(provider: DataProvider, id: string): Promise<T> {
    return ObjectManager.newInstance(provider).getObject(id) as Promise<T>;
  }

  update(data: any): void {
    this.fromJSON(data);
  }
  
  public registerMethod(methodName: string, context: ContextType, implementation: Function): void {
    this._methods.set(methodName, { context, implementation });
    if (!this.methodRegistry[context as any]) {
      this.methodRegistry[context as any] = new Map();
    }
    this.methodRegistry[context as any].set(methodName, implementation);
  }

  private async _invokeMethod(methodName: string, args: any[]): Promise<any> {
    const method = this._methods.get(methodName);
    if (!method) {
      throw new Error(`Method ${methodName} not found`);
    }
    // Compare context names instead of object identity
    if (method.context.name === this.getCurrentContext().name) {
      return method.implementation.apply(this, args);
    } else {
      return this.executeInContext(method.context, methodName, ...args);
    }
  }

  // Update setState method to use networkManager
  public setState(newState: Partial<typeof this._state>) {
    this._state = { ...this._state, ...newState };
    this.emit('stateChanged', { id: this.id, newState });
    this.networkManager.sendStateUpdate(this.id, newState);
  }

  getState(): any {
    return { ...this._state };
  }

  getProxy(): this {
    return this._proxy;
  }

  getCurrentContext(): ContextType {
    // Return the actual context objects
    return typeof window === 'undefined' ? SERVER_CONTEXT : BROWSER_CONTEXT;
  }

  getCurrentProvider(): DataProvider {
    return this.provider;
  }

  toJSON(): object {
    return {
      id: this.id,
      objectType: this.objectType,
      contexts: this.contexts,
      state: this._state
    };
  }

  fromJSON(data: any): void {
    this._state = data.state;
  }

  executeInContext(context: ContextType, methodName: string, ...args: any[]): Promise<any> {
    return this.networkManager.invokeRemoteMethod(this.id, methodName, args);
  }
}

// Factory function for MultiContextObject
export function createMultiContextObject(
  id: string,
  objectType: string,
  contexts: ContextType[],
  provider: DataProvider,
  options: MultiContextObjectOptions = {}
): MultiContextObject {
  const networkManager = NetworkManager.newInstance(provider);
  const objectManager = ObjectManager.newInstance(provider);
  return new MultiContextObject(id, objectType, contexts, provider, networkManager, objectManager, options);
}