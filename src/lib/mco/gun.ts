/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// This file conditionally imports Gun.js only on the client side
// Using 'use client' directive ensures this code only runs on the client

// Define better types for Gun
export interface IGunInstance { // Add export keyword
  on: (event: string, callback: (data: unknown) => void) => void;
  get: (key: string) => IGunInstance;
  put: (data: unknown) => IGunInstance;
  set: (data: unknown) => IGunInstance;
  [key: string]: unknown;
}

interface IGunConstructor {
  (options?: Record<string, unknown>): IGunInstance;
  SEA?: unknown;
  [key: string]: unknown;
}

let Gun: IGunConstructor | null = null;
let gunInstance: IGunInstance | null = null;

// TODO: Add configuration for peers, persistence options, etc.
const gunOptions = {
  peers: ['http://localhost:8765/gun'], // Example peer, replace with actual config
  // localStorage: false, // Disable localStorage persistence if needed
  // radisk: true, // Enable RAD (Redis Adapter) if using Redis
};

/**
 * Initializes and/or returns a singleton Gun instance.
 * Ensures that only one Gun instance is created for the application context.
 * Only works on the client side.
 */
export const getGunInstance = async (): Promise<IGunInstance | null> => {
  // Only run on client side - this is redundant with 'use client' but kept for clarity
  if (typeof window === 'undefined') {
    console.log('Gun is not available on the server side');
    return null;
  }

  // Lazy-load Gun only on the client side
  if (!Gun) {
    try {
      // Dynamic import with proper import() syntax
      const gunModule = await import('gun');
      Gun = gunModule.default as any;

      // Import plugins using dynamic import()
      await import('gun/sea');
      await import('gun/lib/radisk');

    } catch (error) {
      console.error('Failed to load Gun.js:', error);
      return null;
    }
  }

  if (!gunInstance && Gun) {
    console.log('Initializing Gun instance with options:', gunOptions);
    gunInstance = Gun(gunOptions);
    // Log gun status (optional)
    gunInstance.on('hi', (peer: unknown) => {
      console.log('Connected to peer:', peer);
    });
    gunInstance.on('bye', (peer: unknown) => {
      console.log('Disconnected from peer:', peer);
    });
  }
  return gunInstance;
};

// Optional: Export a safe version of Gun constructor
export const safeGun = async (): Promise<IGunConstructor | null> => {
  if (typeof window === 'undefined') return null;
  if (!Gun) {
    try {
      const gunModule = await import('gun');
      Gun = gunModule.default as any;
    } catch (error) {
      console.error('Failed to load Gun.js:', error);
      return null;
    }
  }
  return Gun;
};