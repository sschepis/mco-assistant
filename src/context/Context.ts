/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataProvider } from '../types'; // Corrected import path


interface ContextConfig {
    credentials: {
        username: string;
        password: string;
    };
}

class Context {
    name: string;
    config: ContextConfig;
    user: any;
    keyPair: any;

    constructor(name: string, config: ContextConfig, public provider: DataProvider) {
        this.name = name;
        this.config = config;
        // we have to  add a method to DataProvider
        this.user = null;
        this.keyPair = null;
    }

    async initialize(): Promise<void> {
        await this.authenticate();
        this.setupListeners();
    }

    async authenticate(): Promise<void> {
        this.user = await this.provider.auth(this.config.credentials);
        this.keyPair = await this.provider.pair();
    }

    async setupListeners() {
        (await this.provider.get([this.name, 'calls'])).on(async (data: any, _key: string) => {
            if (data) {
                const decrypted = await this.decryptData(data);
                const result = await this.executeMethod(decrypted.method, ...decrypted.args);
                const response = await this.encryptData({ callId: data.callId, response: result });
                (await this.provider.get([this.name, 'responses'])).set(response);
            }
        });
    }

    async encryptData(data: any): Promise<string> {
        return await this.provider.encrypt(JSON.stringify(data), this.keyPair);
    }

    async decryptData(encryptedData: string): Promise<any> {
        const decrypted = await this.provider.decrypt(encryptedData, this.keyPair);
        return JSON.parse(decrypted);
    }

    async signData(data: any): Promise<string> {
        return await this.provider.sign(data, this.user.pair());
    }

    async executeMethod(_methodName: string, ..._args: any[]): Promise<any> {
        // Implementation would depend on how methods are defined for each context
        // This could involve calling a local function, making an API call, etc.
    }
}

export default Context;