/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Gun from "gun";
import "gun/sea";
import "gun/lib/webrtc";
import "gun/lib/radix";
import "gun/lib/radisk";
import "gun/lib/store";
import "gun/lib/rindexed";
import BaseDataProvider from "./BaseDataProvider";
import { EventEmitter } from "events";
import { DataProvider } from '../types'; // Corrected import path

// Removed GunDataProviderOptions interface as options are handled by the instance creator

export default class GunDataProvider extends BaseDataProvider implements DataProvider {
    private gun: any; // Should ideally have a more specific Gun type if available
    private user: any; // Gun user object type
    private eventEmitter: EventEmitter;
    private subscriptions: Map<string, Set<(value: any) => void>>;

    /**
     * Creates an instance of GunDataProvider.
     * @param gunInstance - A pre-initialized Gun instance.
     */
    constructor(gunInstance: any) { // Accept Gun instance directly
        super('GunDataProvider');
        if (!gunInstance) {
            throw new Error("GunDataProvider requires a pre-initialized Gun instance.");
        }
        this.gun = gunInstance;
        this.eventEmitter = new EventEmitter();
        this.subscriptions = new Map();
    }

    async login(username: string, password: string): Promise<any> {
        try {
            this.user = this.gun.user().recall({ sessionStorage: true });
            const result = await this.user.auth(username, password);
            this.eventEmitter.emit('login', { username });
            return result;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    async register(username: string, password: string): Promise<any> {
        try {
            this.user = this.gun.user();
            const result = await this.user.create(username, password);
            this.eventEmitter.emit('register', { username });
            return result;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    async logout(): Promise<void> {
        this.user.leave();
        this.eventEmitter.emit('logout');
    }

    async checkAuthStatus(): Promise<boolean> {
        return new Promise((resolve) => {
            this.user.recall({ sessionStorage: true }, (ack: any) => {
                resolve(!!ack.pub);
            });
        });
    }

    async get(keypath: string[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.gun.get(keypath.join('/')).once((data: any, _key: string) => {
                if (data === undefined) {
                    reject(new Error(`No data found for keypath: ${keypath.join('/')}`));
                } else {
                    resolve(data);
                }
            });
        });
    }

    async put(keypath: string[], value: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get(keypath.join('/')).put(value, (ack: any) => {
                if (ack.err) {
                    reject(new Error(`Failed to put data: ${ack.err}`));
                } else {
                    this.eventEmitter.emit('put', { keypath, value });
                    resolve();
                }
            });
        });
    }

    async del(keypath: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get(keypath.join('/')).put(null, (ack: any) => {
                if (ack.err) {
                    reject(new Error(`Failed to delete data: ${ack.err}`));
                } else {
                    this.eventEmitter.emit('delete', { keypath });
                    resolve();
                }
            });
        });
    }

    on(keypath: string[], callback: (value: any) => void): void {
        const key = keypath.join('/');
        if (!this.subscriptions.has(key)) {
            this.subscriptions.set(key, new Set());
        }
        this.subscriptions.get(key)!.add(callback);

        this.gun.get(key).on((data: any, _gunKey: string) => {
            callback(data);
        });
    }

    once(keypath: string[], callback: (value: any) => void): void {
        this.gun.get(keypath.join('/')).once((data: any, _key: string) => {
            callback(data);
        });
    }

    off(keypath: string[], callback: (value: any) => void): void {
        const key = keypath.join('/');
        if (this.subscriptions.has(key)) {
            this.subscriptions.get(key)!.delete(callback);
            if (this.subscriptions.get(key)!.size === 0) {
                this.subscriptions.delete(key);
                this.gun.get(key).off();
            }
        }
    }

    async verify(signature: string, publicKey: string): Promise<boolean> {
        return Gun.SEA.verify(signature, publicKey);
    }

    async sign(data: any, pair: any): Promise<string> {
        return Gun.SEA.sign(data, pair);
    }

    async decrypt(data: any, pair: any): Promise<any> {
        return Gun.SEA.decrypt(data, pair);
    }

    async encrypt(data: any, pair: any): Promise<any> {
        return Gun.SEA.encrypt(data, pair);
    }

    async pair(): Promise<any> {
        return Gun.SEA.pair();
    }

    onAuthEvent(event: 'login' | 'register' | 'logout', callback: (data: any) => void): void {
        this.eventEmitter.on(event, callback);
    }

    offAuthEvent(event: 'login' | 'register' | 'logout', callback: (data: any) => void): void {
        this.eventEmitter.off(event, callback);
    }
}