/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataProvider } from '../types'; // Corrected import path

export default class BaseDataProvider implements DataProvider {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
    get(keypath: string[]): Promise<any> {
        throw new Error('Method not implemented.');
    }
    set(keypath: string[], value: any): Promise<void> {
        throw new Error('Method not implemented.');
    }
    put(keypath: string[], value: any): Promise<void> {
        throw new Error('Method not implemented.');
    }
    del(keypath: string[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    on(keypath: string[], callback: (value: any) => void): void {
        throw new Error('Method not implemented.');
    }
    once(keypath: string[], callback: (value: any) => void): void {
        throw new Error('Method not implemented.');
    }
    off(keypath: string[], callback: (value: any) => void): void {
        throw new Error('Method not implemented.');
    }
    verify(signature: string, publicKey: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    sign(data: any, privateKey: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    decrypt(data: any, privateKey: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    encrypt(data: any, publicKey: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    auth(credentials: any): Promise<any> {
        throw new Error('Method not implemented.');
    }
    pair(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    login(username: string, password: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    register(username: string, password: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
    logout(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    checkAuthStatus(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    
}