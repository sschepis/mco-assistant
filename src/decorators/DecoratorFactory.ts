"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { performance } from 'perf_hooks';
import Configuration from '../Configuration';
import AIProviderManager from '../managers/AIProviderManager';
import { encrypt, decrypt } from '../security/utils/Crypto';
import { ContextType } from '../types'; // Corrected import path

export async function encryptedFor(publicKey: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const self = this as any;
      if (!self.encryptedFunctions) {
        self.encryptedFunctions = {};
      }
      if (!self.encryptedFunctions[propertyKey]) {
        self.encryptedFunctions[propertyKey] = await encrypt(originalMethod.toString(), publicKey);
      }
      const decryptedFunc = await decrypt(self.encryptedFunctions[propertyKey], self.user.pair());
      return eval(`(${decryptedFunc})`)(...args);
    };
    return descriptor;
  };
}

// Modified to accept an array of allowed contexts
export function contextMethod(allowedContexts: ContextType | ContextType[]) {
  const contexts = Array.isArray(allowedContexts) ? allowedContexts : [allowedContexts];
  const allowedNames = contexts.map(c => c.name);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value; // Capture original method here
      descriptor.value = async function (...args: any[]) {
          const self = this as any;
          const currentContextName = self.getCurrentContext()?.name;
          // Check if the current context name is in the allowed list
          if (!currentContextName || !allowedNames.includes(currentContextName)) {
              throw new Error(`Method ${propertyKey} can only be called in contexts [${allowedNames.join(', ')}], but was called in ${currentContextName || 'unknown'}`);
          }
          // Ensure originalMethod is defined before applying
          if (typeof originalMethod !== 'function') {
             throw new Error(`Original method for ${propertyKey} is not a function.`);
          }
          return originalMethod.apply(this, args);
      };
      return descriptor;
  };
}

export function contextAware(...allowedContexts: ContextType[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const curContext = (this as any).getCurrentContext();
      const alllowedContextNames = allowedContexts.map(c => c.name);
      console.log(`function ${propertyKey} called in context ${curContext}`);
      if (!alllowedContextNames.includes(curContext)) {
        throw new Error(`Method can only be called in contexts: ${allowedContexts.map(c => c.name).join(', ')} but was called in ${(this as any).getCurrentContext().name}`);
      }
      return originalMethod.apply(this, args) ;
    };
    return descriptor;
  };
}

export function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    const result = originalMethod.apply(this, args);
    const end = performance.now();
    console.log(`${propertyKey} execution time: ${end - start} milliseconds`);
    return result;
  };
  return descriptor;
}

export function retry(maxAttempts: number = 3, delay: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      let attempts = 0;
      while (attempts < maxAttempts) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };
    return descriptor;
  };
}

export function validateInput(validator: (input: any) => boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      if (!validator(args[0])) {
        throw new Error(`Invalid input for ${propertyKey}`);
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}

export function cacheResult(ttl: number = 60000) {
  const cache = new Map<string, { value: any, timestamp: number }>();
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const key = `${propertyKey}:${JSON.stringify(args)}`;
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }
      const result = originalMethod.apply(this, args);
      cache.set(key, { value: result, timestamp: Date.now() });
      return result;
    };
    return descriptor;
  };
}

export function debounce(delay: number = 300) {
  let timeoutId: NodeJS.Timeout | number;
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      clearTimeout(timeoutId as NodeJS.Timeout);
      timeoutId = setTimeout(() => originalMethod.apply(this, args), delay);
    };
    return descriptor;
  };
}

export function throttle(limit: number = 300) {
  let inThrottle: boolean;
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      if (!inThrottle) {
        originalMethod.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
    return descriptor;
  };
}

export function versionControl(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const versions = new Map<string, any>();
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    const result = originalMethod.apply(this, args);
    const version = `v${versions.size + 1}`;
    versions.set(version, result);
    return { result, version };
  };
  descriptor.value.getVersion = (version: string) => versions.get(version);
  descriptor.value.getAllVersions = () => Array.from(versions.entries());
  return descriptor;
}

export function rateLimit(limit: number, interval: number) {
  const calls: number[] = [];
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const now = Date.now();
      calls.push(now);
      calls.splice(0, calls.length - limit);
      if (calls.length === limit && now - calls[0] < interval) {
        throw new Error(`Rate limit exceeded for ${propertyKey}`);
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}

export function transactional(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    console.log(`Starting transaction for ${propertyKey}`);
    try {
      const result = await originalMethod.apply(this, args);
      console.log(`Committing transaction for ${propertyKey}`);
      return result;
    } catch (error) {
      console.log(`Rolling back transaction for ${propertyKey}`);
      throw error;
    }
  };
  return descriptor;
}

export function eventEmitter(eventName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: { emit: (event: string, data: any) => void }, ...args: any[]) {
      const result = originalMethod.apply(this, args);
      this.emit(eventName, { method: propertyKey, args, result });
      return result;
    };
    return descriptor;
  };
}


export function contextSwitch(contextSelector: (input: any) => ContextType) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.value = async function (this: { executeInContext: (context: ContextType, methodName: string, ...args: any[]) => Promise<any> },
      ...args: any[]) {
      const selectedContext = contextSelector(args[0]);
      return this.executeInContext(selectedContext, propertyKey, ...args);
    };
    return descriptor;
  };
}

export function contextSwitcher(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (this: {
      executeInContext: (context: ContextType, methodName: string, ...args: any[]) => Promise<any>,
      setCurrentContext: (context: ContextType) => void,
      getCurrentContext: () => ContextType
    },
    context: ContextType, ...args: any[]) {
    const originalContext = this.getCurrentContext();
    this.setCurrentContext(context);
    try {
      return await originalMethod.apply(this, args);
    } finally {
      this.setCurrentContext(originalContext);
    }
  };
  return descriptor;
}

// Changed modelSelector to return string (provider name)
export function aiModelSwitch(modelSelector: (input: any) => string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: {
      executeInContext: (context: ContextType, methodName: string, ...args: any[]) => Promise<any>,
      getCurrentContext: () => ContextType,
      configuration: Configuration,
      promptManager: any,
      toolManager: any,
      stateManager: any,
      actionQueue: any,
      memoryManager: any, // Add memoryManager
      sessionId: string // Add sessionId
    },
    ...args: any[]) {
      const selectedModel = modelSelector(args[0]);
      const aiProvider = AIProviderManager.newInstance(
        this.configuration,
        this.promptManager,
        this.toolManager,
        this.stateManager,
        this.actionQueue,
        this.memoryManager, // Pass memoryManager
        this.sessionId // Pass sessionId
      ).getProvider(selectedModel);
      return originalMethod.apply({ aiProvider }, args);
    };
    return descriptor;
  };
}

export function configDependent(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (this: { configuration: Configuration }, ...args: any[]) {
    if (!this.configuration) {
      throw new Error('Configuration not set');
    }
    return originalMethod.apply(this, args);
  };
  return descriptor;
}