/* eslint-disable @typescript-eslint/no-explicit-any */
// Corrected imports using relative paths
// Removed duplicate import of MultiContextObject
import { contextMethod } from '../decorators/DecoratorFactory'; // Removed withErrorHandling
import { DataProvider } from '../types';
import DomainManager from './DomainManager';
import ObjectManager from './ObjectManager';
import ErrorHandler from '../utils/ErrorHandler';
import { SERVER_CONTEXT } from '../Contexts'; // Import SERVER_CONTEXT
import MultiContextObject from '../core/MultiContextObject'; // Import MultiContextObject for instantiation

// Removed redundant assignments for imported decorators

export class NetworkManager {
  public static instances: { [key: string]: NetworkManager } = {};
  private domainManager: DomainManager;
  private objectManager: ObjectManager;
  private errorHandler: ErrorHandler;

  private constructor(private provider: DataProvider) {
    this.domainManager = DomainManager.getInstance(provider);
    this.objectManager = ObjectManager.newInstance(provider);
    this.errorHandler = new ErrorHandler(); // Correct instantiation
  }

  static newInstance(provider: DataProvider): NetworkManager {
    if (!this.instances[provider.name]) {
      this.instances[provider.name] = new NetworkManager(provider);
    }
    return this.instances[provider.name];
  }

  // Removed @withErrorHandling, added try...catch
  public async getObject(id: string): Promise<MultiContextObject> {
    try {
      const objectData = await this.provider.get(['objects', id]);
      if (!objectData) {
        throw new Error(`Object with id ${id} not found`);
      }
      // Instantiate and deserialize
      // Ensure objectData has necessary fields (id, objectType, contexts)
      const obj = new MultiContextObject(
        objectData.id || id,
        objectData.objectType || 'unknown',
        objectData.contexts || [],
        this.provider,
        this,
        this.objectManager,
        objectData // Pass raw data as options for fromJSON potentially
      );
      obj.fromJSON(objectData); // Call fromJSON on the instance
      return obj;
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'NetworkManager.getObject');
      throw error; // Re-throw after handling
    }
  }

  // Removed @withErrorHandling
  public connect(domainName: string): void {
    // No provider call, error handling likely not needed unless connection logic added
    console.log(`Connected to domain: ${domainName}`);
  }

  // Removed @withErrorHandling, added try...catch
  public async registerObject(object: MultiContextObject): Promise<void> {
    try {
      await this.provider.set(['objects', object.id], object.toJSON());
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'NetworkManager.registerObject');
      throw error;
    }
  }

  // Removed @withErrorHandling, added try...catch for initial set and checkResult
  public async invokeRemoteMethod(objectId: string, methodName: string, args: any[]): Promise<any> {
    const invocationId = `${objectId}:${methodName}:${Date.now()}`;
    try {
      await this.provider.set(['invocations', invocationId], { args, status: 'pending' });
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'NetworkManager.invokeRemoteMethod (set)');
      throw error;
    }

    return new Promise((resolve, reject) => {
      const checkResult = async () => {
        try {
          const result = await this.provider.get(['invocations', invocationId]);
          if (result?.status === 'completed') {
            resolve(result.returnValue);
          } else if (result?.status === 'error') {
            reject(new Error(result.error || 'Unknown remote invocation error'));
          } else {
            setTimeout(checkResult, 100); // Continue polling
          }
        } catch (error) {
          // Handle error during polling/get
          this.errorHandler.handleError(error as Error, 'NetworkManager.invokeRemoteMethod (get)');
          // Decide whether to reject or keep polling based on error type
          reject(error); // Reject on polling error for now
        }
      };
      checkResult();
    });
  }

  // Removed @withErrorHandling, added try...catch
  public async sendStateUpdate(objectId: string, newState: any): Promise<void> {
    try {
      await this.provider.set(['states', objectId], newState);
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'NetworkManager.sendStateUpdate');
      throw error;
    }
  }

  // Removed @withErrorHandling (on/once/off might not need it unless provider throws)
  public onStateUpdate(objectId: string, callback: (state: any) => void): void {
    this.provider.on(['states', objectId], callback);
  }

  // Removed @withErrorHandling
  public onceStateUpdate(objectId: string, callback: (state: any) => void): void {
    this.provider.once(['states', objectId], callback);
  }

  // Removed @withErrorHandling
  public offStateUpdate(objectId: string, callback: (state: any) => void): void {
    this.provider.off(['states', objectId], callback);
  }

  // Removed @withErrorHandling, added try...catch
  public async verifyDomainSignature(domainName: string, signature: string): Promise<boolean> {
    try {
      const domainConfig = await this.domainManager.getDomainConfig(domainName);
      if (!domainConfig) {
        throw new Error(`Domain ${domainName} not found`);
      }
      return await this.provider.verify(signature, domainConfig.publicKey);
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'NetworkManager.verifyDomainSignature');
      throw error;
    }
  }

  // Removed @withErrorHandling, added try...catch
  public async syncObject<T extends MultiContextObject>(object: T): Promise<void> {
    try {
      const remoteState = await this.provider.get(['states', object.id]);
      if (remoteState) {
        object.setState(remoteState);
      } else {
        await this.sendStateUpdate(object.id, object.getState());
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'NetworkManager.syncObject');
      throw error;
    }
  }

  @contextMethod(SERVER_CONTEXT) // Corrected context
  // Removed @withErrorHandling, added try...catch
  public async handleRemoteInvocation(invocationId: string): Promise<void> {
    let invocation;
    try {
      invocation = await this.provider.get(['invocations', invocationId]);
      if (!invocation || invocation.status !== 'pending') {
        return; // Not pending or doesn't exist
      }

      const [objectId, methodName] = invocationId.split(':');
      const object = await this.getObject(objectId); // getObject now handles its own errors
      const method = (object as any)[methodName];

      if (typeof method !== 'function') {
        throw new Error(`Method ${methodName} not found on object ${objectId}`);
      }

      const result = await method.apply(object, invocation.args);
      await this.provider.set(['invocations', invocationId], { ...invocation, status: 'completed', returnValue: result });

    } catch (error) {
      this.errorHandler.handleError(error as Error, `NetworkManager.handleRemoteInvocation (${invocationId})`);
      // Attempt to update invocation status to error even if handling failed
      try {
        await this.provider.set(['invocations', invocationId], { ...(invocation || {}), status: 'error', error: (error as Error).message });
      } catch (updateError) {
        this.errorHandler.handleError(updateError as Error, `NetworkManager.handleRemoteInvocation (updateErrorStatus)`);
      }
    }
  }
}