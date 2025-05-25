/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Re-export everything from the refactored memory modules for backwards compatibility
export * from './memory';

// Legacy export for any existing imports
export { MemoryManager, AssociativeMemory } from './memory';