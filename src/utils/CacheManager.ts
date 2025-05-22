interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export default class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<any>>;

  private constructor() {
    this.cache = new Map();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set<T>(key: string, value: T, ttl: number = Infinity): void {
    const expiry = ttl !== Infinity ? Date.now() + ttl : Infinity;
    this.cache.set(key, { value, expiry });
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      if (entry.expiry !== Infinity && entry.expiry < Date.now()) {
        this.cache.delete(key);
        return undefined;
      }
      return entry.value as T;
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  getValues<T>(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.value as T);
  }

  getEntries<T>(): [string, T][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value as T]);
  }

  setWithExpiry<T>(key: string, value: T, expiry: number): void {
    this.cache.set(key, { value, expiry });
  }

  getWithExpiry<T>(key: string): [T | undefined, number | undefined] {
    const entry = this.cache.get(key);
    if (entry) {
      return [entry.value as T, entry.expiry];
    }
    return [undefined, undefined];
  }

  setWithTTL<T>(key: string, value: T, ttl: number): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  getWithTTL<T>(key: string): [T | undefined, number | undefined] {
    const entry = this.cache.get(key);
    if (entry) {
      const remainingTTL = entry.expiry !== Infinity ? entry.expiry - Date.now() : undefined;
      return [entry.value as T, remainingTTL];
    }
    return [undefined, undefined];
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  size(): number {
    return this.cache.size;
  }

  forEach(callback: (value: any, key: string, cache: Map<string, CacheEntry<any>>) => void): void {
    this.cache.forEach((entry, key) => {
      callback(entry.value, key, this.cache);
    });
  }

  fromJSON(data: any): void {
    this.cache = new Map(data.cache);
  }

  toJSON(): object {
    return { cache: Array.from(this.cache.entries()) };
  }
}