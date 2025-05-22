/* eslint-disable @typescript-eslint/no-explicit-any */
import MultiContextObject from '../core/MultiContextObject';
import BaseDataProvider from '../data-providers/BaseDataProvider'; // Corrected import path and style

export default class ObjectManager {
  public static instances: { [key: string]: ObjectManager } = {};
  private objects: Map<string, MultiContextObject> = new Map();

  registerObject(object: MultiContextObject): void {
    this.objects.set(object.id, object);
  }

  // Added provider parameter to constructor if needed, or adjust newInstance logic
  // For now, assuming constructor doesn't need provider directly
  static newInstance(provider: BaseDataProvider): ObjectManager {
    if (!ObjectManager.instances[provider.name]) {
      ObjectManager.instances[provider.name] = new ObjectManager(); // Pass provider if constructor needs it
    }
    return ObjectManager.instances[provider.name];
  }

  // Removed provider parameter from createObject, assuming it's available elsewhere (e.g., via 'this')
  createObject<T extends MultiContextObject>(objectType: string, data: any): Promise<T> {
     // Need to get provider, networkManager etc. from somewhere, maybe 'this' or passed in data?
     // Assuming they are passed in 'data' for now based on addObject usage
    return this.addObject(objectType, data);
  }

  async getObject<T extends MultiContextObject>(id: string): Promise<T> {
    const object = this.objects.get(id);
    if (!object) {
      throw new Error(`Object with id ${id} not found`);
    }
    return object as T;
  }

  async addObject<T extends MultiContextObject>(objectType: string, data: any): Promise<T> {
    // Assuming data contains necessary managers and provider
    const { provider, networkManager, eventManager } = data;
    // Pass 'this' as the objectManager instance
    const object = new MultiContextObject(this.generateId(), objectType, [], provider, networkManager, this, eventManager);
    this.objects.set(object.id, object);
    return object as T;
  }

  async updateObject<T extends MultiContextObject>(id: string, data: any): Promise<T> {
    const object = await this.getObject<T>(id);
    object.update(data);
    return object;
  }

  async deleteObject(objectType: string, id: string): Promise<void> {
    this.objects.delete(id);
  }
  
  hasObject(id: string): boolean {
    return this.objects.has(id);
  }

  removeObject(id: string): void {
    this.objects.delete(id);
  }

  getAllObjects(): MultiContextObject[] {
    return Array.from(this.objects.values());
  }

  getObjectsByType(objectType: string): MultiContextObject[] {
    return Array.from(this.objects.values()).filter(obj => obj.objectType === objectType);
  }

  getObjectsByContext(contextName: string): MultiContextObject[] {
    return Array.from(this.objects.values()).filter(obj => obj.contexts.includes(contextName as any));
  }

  generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}