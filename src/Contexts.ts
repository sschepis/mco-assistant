export const CLIENT_CONTEXT = {
    name: 'client',
    version: '1.0.0'
}
export const SERVER_CONTEXT = {
    name: 'server',
    version: '1.0.0'
}
export const BROWSER_CONTEXT = {
    name: 'browser',
    version: '1.0.0'
}
export const AUTH_CONTEXT = {
    name: 'auth',
    version: '1.0.0'
}

export const contexts = [SERVER_CONTEXT, BROWSER_CONTEXT, CLIENT_CONTEXT, AUTH_CONTEXT];

export function createContext(name: string, version: string) {
    const context = {
        name,
        version,
    };
    contexts.push(context);
    return context;
}
