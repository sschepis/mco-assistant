/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';
import {NetworkManager} from './NetworkManager';
import { DataProvider } from '../types'; // Corrected import path

export default class EventManager {
  private static instance: EventManager;
  private eventEmitter: EventEmitter;
  private networkManager: NetworkManager;

  private constructor(provider: DataProvider) {
    this.eventEmitter = new EventEmitter();
    this.networkManager = NetworkManager.newInstance(provider);
  }

  static getInstance(provider: DataProvider): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager(provider);
    }
    return EventManager.instance;
  }

  async emit(objectId: string, eventName: string, data: any): Promise<void> {
    const object = await this.networkManager.getObject(objectId);
    if (!object) {
      throw new Error(`Object with id ${objectId} not found`);
    }
    this.eventEmitter.emit(this.getEventKey(objectId, eventName), data);
    await this.networkManager.sendStateUpdate(objectId, { lastEmittedEvent: eventName });
  }

  on(objectId: string, eventName: string, callback: (data: any) => void): void {
    this.eventEmitter.on(this.getEventKey(objectId, eventName), callback);
  }

  once(objectId: string, eventName: string, callback: (data: any) => void): void {
    this.eventEmitter.once(this.getEventKey(objectId, eventName), callback);
  }

  off(objectId: string, eventName: string, callback: (data: any) => void): void {
    this.eventEmitter.off(this.getEventKey(objectId, eventName), callback);
  }

  private getEventKey(objectId: string, eventName: string): string {
    return `${objectId}:${eventName}`;
  }

  async syncEvents(objectId: string): Promise<void> {
    const object = await this.networkManager.getObject(objectId);
    if (!object) {
      throw new Error(`Object with id ${objectId} not found`);
    }
    const lastEmittedEvent = object.getState().lastEmittedEvent;
    if (lastEmittedEvent) {
      this.eventEmitter.emit(this.getEventKey(objectId, lastEmittedEvent), object.getState());
    }
  }

  async subscribeToStateUpdates(objectId: string): Promise<void> {
    await this.networkManager.onStateUpdate(objectId, (state: any) => {
      if (state.lastEmittedEvent) {
        this.eventEmitter.emit(this.getEventKey(objectId, state.lastEmittedEvent), state);
      }
    });
  }

  async unsubscribeFromStateUpdates(objectId: string): Promise<void> {
    await this.networkManager.offStateUpdate(objectId, () => {});
  }
}


/*



*/
