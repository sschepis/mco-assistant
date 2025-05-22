import { MemoryManager } from './associativeMemory';
import * as lancedb from '@lancedb/lancedb';
import * as embeddings from '@energetic-ai/embeddings';
import fs from 'fs/promises';
import path from 'path'; // Corrected import

// These constants should ideally be imported or kept in sync with associativeMemory.ts
const DEFAULT_VECTOR_DIMENSION = 384;
const TABLE_DIMENSIONS_FILENAME = "table_dimensions.json";
const PERSISTENT_TABLE_NAME = "persistent_memory"; // Added from associativeMemory.ts
const SESSION_TABLE_PREFIX = "session_"; // Added from associativeMemory.ts


// Mock external modules
jest.mock('@lancedb/lancedb');
jest.mock('@energetic-ai/embeddings');
jest.mock('fs/promises');

describe('MemoryManager', () => {
    let mockDb: any;
    let mockTable: any;
    let mockEmbeddingModel: any;
    let assistant: any;
    const dbPath = './test_db_path';
    const sessionId = 'test-session';
    let consoleSpyWarn: jest.SpyInstance;
    let consoleSpyError: jest.SpyInstance;
    let consoleSpyLog: jest.SpyInstance;


    beforeEach(() => {
        jest.clearAllMocks();

        mockTable = {
            add: jest.fn().mockResolvedValue(undefined),
            search: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue([]),
            // schema: jest.fn().mockReturnValue({ fields: [{ name: 'vector', type: { listSize: 0 } }] }), // Mock schema if needed
        };
        mockDb = {
            // connect: jest.fn().mockResolvedValue(mockDb), // This was for a static method, lancedb.connect is the static one
            openTable: jest.fn().mockResolvedValue(mockTable),
            createEmptyTable: jest.fn().mockResolvedValue(mockTable),
            dropTable: jest.fn().mockResolvedValue(undefined),
            tableNames: jest.fn().mockResolvedValue([]), // Add if used
        };
        (lancedb.connect as jest.Mock).mockResolvedValue(mockDb);

        mockEmbeddingModel = {
            embed: jest.fn(async (texts: string[]) => texts.map(text => Array(mockEmbeddingModel.dimension).fill(0.1))),
            dimension: 3, // Default to a small, valid dimension for tests
        };
        (embeddings.initModel as jest.Mock).mockResolvedValue(mockEmbeddingModel);

        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.readFile as jest.Mock).mockResolvedValue('{}'); // Default: empty dimensions file
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        assistant = {
            query: jest.fn(),
        };

        // Spy on console methods
        consoleSpyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        consoleSpyError = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleSpyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpyWarn.mockRestore();
        consoleSpyError.mockRestore();
        consoleSpyLog.mockRestore();
    });

    describe('Initialization (MemoryManager.initialize)', () => {
        it('should set actualVectorDimension from the model if valid', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);
            // @ts-ignore Accessing private member for test
            expect(memoryManager.actualVectorDimension).toBe(128);
            // @ts-ignore
            expect(memoryManager.persistentSchema.fields.find(f => f.name === 'vector').type.listSize).toBe(128);
            // @ts-ignore
            expect(memoryManager.sessionSchema.fields.find(f => f.name === 'vector').type.listSize).toBe(128);
        });

        it('should fallback to DEFAULT_VECTOR_DIMENSION if model dimension is 0', async () => {
            mockEmbeddingModel.dimension = 0;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);
            // @ts-ignore
            expect(memoryManager.actualVectorDimension).toBe(DEFAULT_VECTOR_DIMENSION);
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining('CRITICAL: Could not determine a valid embedding dimension from the model (received: 0). Falling back to default dimension:'));
             // @ts-ignore
            expect(memoryManager.persistentSchema.fields.find(f => f.name === 'vector').type.listSize).toBe(DEFAULT_VECTOR_DIMENSION);
        });

        it('should fallback to DEFAULT_VECTOR_DIMENSION if model dimension is negative', async () => {
            mockEmbeddingModel.dimension = -5;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);
            // @ts-ignore
            expect(memoryManager.actualVectorDimension).toBe(DEFAULT_VECTOR_DIMENSION);
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining('CRITICAL: Could not determine a valid embedding dimension from the model (received: -5). Falling back to default dimension:'));
        });

        it('should fallback to DEFAULT_VECTOR_DIMENSION if model dimension is undefined', async () => {
            mockEmbeddingModel.dimension = undefined;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);
            // @ts-ignore
            expect(memoryManager.actualVectorDimension).toBe(DEFAULT_VECTOR_DIMENSION);
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining('CRITICAL: Could not determine a valid embedding dimension from the model (received: undefined). Falling back to default dimension:'));
        });
        
        it('should generate schemas using actualVectorDimension', async () => {
            mockEmbeddingModel.dimension = 768;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);
            // @ts-ignore
            expect(memoryManager.sessionSchema).not.toBeNull();
            // @ts-ignore
            expect(memoryManager.persistentSchema).not.toBeNull();
            // @ts-ignore
            const sessionVectorField = memoryManager.sessionSchema.fields.find(f => f.name === 'vector');
            expect(sessionVectorField.type.listSize).toBe(768);
            // @ts-ignore
            const persistentVectorField = memoryManager.persistentSchema.fields.find(f => f.name === 'vector');
            expect(persistentVectorField.type.listSize).toBe(768);
        });

        it('should call _loadTableDimensions during initialization', async () => {
            const memoryManager = new MemoryManager(assistant, dbPath);
            // Spy on the private method
            // @ts-ignore
            const loadSpy = jest.spyOn(memoryManager, '_loadTableDimensions');
            await memoryManager.initialize(sessionId);
            expect(loadSpy).toHaveBeenCalledTimes(1);
            loadSpy.mockRestore();
        });
    });

    describe('Schema Generation (_generateSchema - tested via initialize)', () => {
        it('should create schemas with correct structure for a valid dimension', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);
            
            // @ts-ignore
            const sessionSchema = memoryManager.sessionSchema;
            // @ts-ignore
            const persistentSchema = memoryManager.persistentSchema;

            expect(sessionSchema).toBeDefined();
            expect(persistentSchema).toBeDefined();

            const sessionVectorField = sessionSchema.fields.find((f: any) => f.name === 'vector');
            expect(sessionVectorField).toBeDefined();
            expect(sessionVectorField.type.listSize).toBe(128);
            expect(sessionSchema.fields.some((f: any) => f.name === 'text')).toBe(true);
            expect(sessionSchema.fields.some((f: any) => f.name === 'source')).toBe(true);
            
            const persistentVectorField = persistentSchema.fields.find((f: any) => f.name === 'vector');
            expect(persistentVectorField).toBeDefined();
            expect(persistentVectorField.type.listSize).toBe(128);
            expect(persistentSchema.fields.some((f: any) => f.name === 'text')).toBe(true);
            expect(persistentSchema.fields.some((f: any) => f.name === 'source_ids')).toBe(true);
        });

        it('should fallback to DEFAULT_VECTOR_DIMENSION for schema generation if dimension is invalid and log error', async () => {
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore call private method for test
            const schema = memoryManager._generateSchema(0, 'session');
            expect(consoleSpyError).toHaveBeenCalledWith(expect.stringContaining('CRITICAL: Invalid dimension (0) provided for schema generation. Falling back to default dimension:'));
            const vectorField = schema.fields.find((f: any) => f.name === 'vector');
            expect(vectorField.type.listSize).toBe(DEFAULT_VECTOR_DIMENSION);

            // @ts-ignore
            const schema2 = memoryManager._generateSchema(-10, 'persistent');
            expect(consoleSpyError).toHaveBeenCalledWith(expect.stringContaining('CRITICAL: Invalid dimension (-10) provided for schema generation. Falling back to default dimension:'));
            const vectorField2 = schema2.fields.find((f: any) => f.name === 'vector');
            expect(vectorField2.type.listSize).toBe(DEFAULT_VECTOR_DIMENSION);
        });
    });

    describe('Dimension Mismatch Handling (ensureTableExists)', () => {
        const testTableName = 'test_table';

        it('Scenario 1: New Table Creation - records dimension and saves', async () => {
            mockDb.openTable.mockRejectedValue(new Error('Table not found')); // Simulate table not existing
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId); // This sets actualVectorDimension and schemas

            // @ts-ignore
            await memoryManager.ensureTableExists(testTableName, memoryManager.sessionSchema);
            
            // @ts-ignore
            expect(memoryManager.tableDimensions[testTableName]).toBe(128);
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(dbPath, TABLE_DIMENSIONS_FILENAME),
                JSON.stringify({ [testTableName]: 128 }, null, 2),
                'utf-8'
            );
            expect(mockDb.createEmptyTable).toHaveBeenCalled();
        });

        it('Scenario 2: Existing Table, Matching Dimension - no warning', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore Pre-populate tableDimensions
            memoryManager.tableDimensions = { [testTableName]: 128 };
            // @ts-ignore
            const saveSpy = jest.spyOn(memoryManager, '_saveTableDimensions'); // ensure it's not called unnecessarily

            await memoryManager.initialize(sessionId); // actualVectorDimension will be 128
             // @ts-ignore
            await memoryManager.ensureTableExists(testTableName, memoryManager.sessionSchema);

            expect(consoleSpyWarn).not.toHaveBeenCalledWith(expect.stringContaining('Dimension mismatch'));
            expect(saveSpy).not.toHaveBeenCalled();
            saveSpy.mockRestore();
        });

        it('Scenario 3: Existing Table, Mismatched Dimension - logs warning', async () => {
            mockEmbeddingModel.dimension = 768; // Current model dimension
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            memoryManager.tableDimensions = { [testTableName]: 128 }; // Stored dimension is different

            await memoryManager.initialize(sessionId); // actualVectorDimension will be 768
             // @ts-ignore
            await memoryManager.ensureTableExists(testTableName, memoryManager.sessionSchema);

            expect(consoleSpyWarn).toHaveBeenCalledWith(
                expect.stringContaining(`WARNING: Dimension mismatch for table '${testTableName}'. Stored: 128, Current Model: 768.`)
            );
        });
        
        it('Scenario 4: Existing Table, Dimension Not Tracked - logs warning and saves current dimension', async () => {
            mockEmbeddingModel.dimension = 256;
            const memoryManager = new MemoryManager(assistant, dbPath);
             // @ts-ignore tableDimensions is initially empty
            
            await memoryManager.initialize(sessionId); // actualVectorDimension will be 256
            // @ts-ignore
            await memoryManager.ensureTableExists(testTableName, memoryManager.sessionSchema);

            expect(consoleSpyWarn).toHaveBeenCalledWith(
                expect.stringContaining(`WARNING: Dimension for existing table '${testTableName}' not found in tracking file. Assuming current model dimension: 256 and saving it.`)
            );
            // @ts-ignore
            expect(memoryManager.tableDimensions[testTableName]).toBe(256);
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(dbPath, TABLE_DIMENSIONS_FILENAME),
                JSON.stringify({ [testTableName]: 256 }, null, 2),
                'utf-8'
            );
        });
    });

    describe('table_dimensions.json Handling (_loadTableDimensions / _saveTableDimensions)', () => {
        it('_loadTableDimensions: File not found (ENOENT) - tableDimensions empty, logs info', async () => {
            const enoentError: any = new Error("File not found");
            enoentError.code = 'ENOENT';
            (fs.readFile as jest.Mock).mockRejectedValue(enoentError);
            
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual({});
            expect(consoleSpyLog).toHaveBeenCalledWith(expect.stringContaining('Table dimensions file not found. Will be created if new tables are made.'));
        });

        it('_loadTableDimensions: Corrupted JSON - tableDimensions empty, logs warning', async () => {
            (fs.readFile as jest.Mock).mockResolvedValue("this is not json");
            
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual({});
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining('Error loading table dimensions from'));
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining('Unexpected token'));
        });

        it('_loadTableDimensions: Valid JSON - tableDimensions populated', async () => {
            const jsonData = { 'table1': 128, 'table2': 512 };
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(jsonData));
            
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual(jsonData);
            expect(consoleSpyLog).toHaveBeenCalledWith("Table dimensions loaded successfully from:", path.join(dbPath, TABLE_DIMENSIONS_FILENAME));

        });

        it('_saveTableDimensions: called with correct data and path', async () => {
            const memoryManager = new MemoryManager(assistant, dbPath);
            const testData = { 'myTable': 384 };
            // @ts-ignore
            memoryManager.tableDimensions = testData;
            // @ts-ignore
            await memoryManager._saveTableDimensions();

            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(dbPath, TABLE_DIMENSIONS_FILENAME),
                JSON.stringify(testData, null, 2),
                'utf-8'
            );
             expect(consoleSpyLog).toHaveBeenCalledWith("Table dimensions saved successfully to:", path.join(dbPath, TABLE_DIMENSIONS_FILENAME));
        });
        
        it('_saveTableDimensions: logs error if writeFile fails', async () => {
            (fs.writeFile as jest.Mock).mockRejectedValue(new Error("Disk full"));
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            memoryManager.tableDimensions = { 'someTable': 100 };
            // @ts-ignore
            await memoryManager._saveTableDimensions();
            expect(consoleSpyError).toHaveBeenCalledWith(expect.stringContaining('Error saving table dimensions'));
            expect(consoleSpyError).toHaveBeenCalledWith(expect.stringContaining('Disk full'));
        });
    });
});

// Helper to get session table name, mirrors the one in MemoryManager
// const getSessionTableName = (sessionId: string) => `${SESSION_TABLE_PREFIX}${sessionId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
