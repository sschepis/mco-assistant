import { MemoryManager } from './associativeMemory';
import * as lancedb from '@lancedb/lancedb';
import * as embeddings from '@energetic-ai/embeddings';
import fs from 'fs/promises';
import path from 'path';

// These constants should ideally be imported or kept in sync with associativeMemory.ts
const DEFAULT_VECTOR_DIMENSION = 384;
const TABLE_DIMENSIONS_FILENAME = "table_dimensions.json";
const PERSISTENT_TABLE_NAME = "persistent_memory";
const SESSION_TABLE_PREFIX = "session_";
// Manually define these for testing, ensure they match the ones in MemoryManager
const CURRENT_PERSISTENT_SCHEMA_VERSION = 1;
const CURRENT_SESSION_SCHEMA_VERSION = 1;


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
        };
        mockDb = {
            openTable: jest.fn().mockResolvedValue(mockTable),
            createEmptyTable: jest.fn().mockResolvedValue(mockTable),
            dropTable: jest.fn().mockResolvedValue(undefined),
        };
        (lancedb.connect as jest.Mock).mockResolvedValue(mockDb);

        mockEmbeddingModel = {
            embed: jest.fn(async (texts: string[]) => texts.map(text => Array(mockEmbeddingModel.dimension).fill(0.1))),
            dimension: DEFAULT_VECTOR_DIMENSION, // Default to a standard dimension
        };
        (embeddings.initModel as jest.Mock).mockResolvedValue(mockEmbeddingModel);

        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.readFile as jest.Mock).mockResolvedValue('{}'); // Default: empty dimensions file
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        assistant = { query: jest.fn() };

        consoleSpyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        consoleSpyError = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleSpyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpyWarn.mockRestore();
        consoleSpyError.mockRestore();
        consoleSpyLog.mockRestore();
    });

    describe('Constants Verification', () => {
        it('schema version constants should be defined and be numbers', () => {
            // This test isn't directly on MemoryManager, but on the constants it uses.
            // If these were exported from MemoryManager, we'd import & check them.
            // For now, we check the test file's copies.
            expect(CURRENT_PERSISTENT_SCHEMA_VERSION).toEqual(expect.any(Number));
            expect(CURRENT_SESSION_SCHEMA_VERSION).toEqual(expect.any(Number));
        });
    });

    describe('Initialization (MemoryManager.initialize)', () => {
        it('should set actualVectorDimension from the model if valid', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);
            // @ts-ignore
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
            expect(sessionSchema.fields.find((f: any) => f.name === 'vector').type.listSize).toBe(128);
            expect(persistentSchema.fields.find((f: any) => f.name === 'vector').type.listSize).toBe(128);
        });

        it('should fallback to DEFAULT_VECTOR_DIMENSION for schema generation if dimension is invalid and log error', async () => {
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            const schema = memoryManager._generateSchema(0, 'session');
            expect(consoleSpyError).toHaveBeenCalledWith(expect.stringContaining('CRITICAL: Invalid dimension (0) provided for schema generation. Falling back to default dimension:'));
            expect(schema.fields.find((f: any) => f.name === 'vector').type.listSize).toBe(DEFAULT_VECTOR_DIMENSION);
        });
    });
    
    describe('_loadTableDimensions (New TableInfo structure)', () => {
        it('loads new format (dimension + schemaVersion)', async () => {
            const tableData = { 'table1': { dimension: 128, schemaVersion: 1 } };
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(tableData));
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual(tableData);
            expect(fs.writeFile).not.toHaveBeenCalled(); // No upgrade, no save
        });

        it('loads old format (just dimension), upgrades, logs, and saves', async () => {
            const oldFormatData = { 'table1': 128 };
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(oldFormatData));
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            const expectedNewFormat = { 'table1': { dimension: 128, schemaVersion: 1 } };
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual(expectedNewFormat);
            expect(consoleSpyLog).toHaveBeenCalledWith(expect.stringContaining("INFO: Upgraded table info for 'table1' to new format (dimension: 128, schemaVersion: 1)."));
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(dbPath, TABLE_DIMENSIONS_FILENAME),
                JSON.stringify(expectedNewFormat, null, 2),
                'utf-8'
            );
        });

        it('loads mixed old/new format entries', async () => {
            const mixedData = { 
                'oldTable': 256, 
                'newTable': { dimension: 128, schemaVersion: 1 } 
            };
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mixedData));
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            const expectedData = {
                'oldTable': { dimension: 256, schemaVersion: 1 },
                'newTable': { dimension: 128, schemaVersion: 1 }
            };
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual(expectedData);
            expect(consoleSpyLog).toHaveBeenCalledWith(expect.stringContaining("INFO: Upgraded table info for 'oldTable'"));
            expect(fs.writeFile).toHaveBeenCalled();
        });

        it('loads entry missing schemaVersion, defaults to 1, logs, and saves', async () => {
            const missingVersionData = { 'table1': { dimension: 128 } };
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(missingVersionData));
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            const expectedData = { 'table1': { dimension: 128, schemaVersion: 1 } };
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual(expectedData);
            expect(consoleSpyLog).toHaveBeenCalledWith(expect.stringContaining("INFO: Table 'table1' in table_dimensions.json lacks schemaVersion. Assuming version 1."));
            expect(fs.writeFile).toHaveBeenCalled();
        });

        it('loads entry missing dimension, defaults to DEFAULT_VECTOR_DIMENSION, logs, and saves', async () => {
            const missingDimensionData = { 'table1': { schemaVersion: 1 } };
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(missingDimensionData));
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            const expectedData = { 'table1': { dimension: DEFAULT_VECTOR_DIMENSION, schemaVersion: 1 } };
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual(expectedData);
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining("WARNING: Table 'table1' in table_dimensions.json lacks a valid dimension. Using default:"));
            expect(fs.writeFile).toHaveBeenCalled();
        });
        
        it('loads empty JSON file, results in empty tableDimensions', async () => {
            (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));
             const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual({});
            expect(fs.writeFile).not.toHaveBeenCalled();
        });

        it('loads corrupted JSON file, results in empty tableDimensions, logs warning', async () => {
            (fs.readFile as jest.Mock).mockRejectedValue(new SyntaxError("Unexpected token"));
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual({});
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining('Error loading table dimensions from'));
        });

        it('file not found, results in empty tableDimensions, logs info', async () => {
            const enoentError:any = new Error("ENOENT error");
            enoentError.code = 'ENOENT';
            (fs.readFile as jest.Mock).mockRejectedValue(enoentError);
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            await memoryManager._loadTableDimensions();
            // @ts-ignore
            expect(memoryManager.tableDimensions).toEqual({});
            expect(consoleSpyLog).toHaveBeenCalledWith(expect.stringContaining('Table dimensions file not found.'));
        });
    });

    describe('_saveTableDimensions (New TableInfo structure)', () => {
        it('saves TableInfo objects correctly', async () => {
            const memoryManager = new MemoryManager(assistant, dbPath);
            const tableData = { 
                'table1': { dimension: 128, schemaVersion: 1 },
                'table2': { dimension: 256, schemaVersion: 2 }
            };
            // @ts-ignore
            memoryManager.tableDimensions = tableData;
            // @ts-ignore
            await memoryManager._saveTableDimensions();
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(dbPath, TABLE_DIMENSIONS_FILENAME),
                JSON.stringify(tableData, null, 2),
                'utf-8'
            );
        });
    });

    describe('ensureTableExists (Schema Versioning and Migration Logic)', () => {
        const pTableName = PERSISTENT_TABLE_NAME;
        const sTableName = `${SESSION_TABLE_PREFIX}${sessionId}`;

        it('Scenario 1: New Table Creation - records dimension and current schema version', async () => {
            mockDb.openTable.mockRejectedValue(new Error('Table not found'));
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);

            // @ts-ignore
            await memoryManager.ensureTableExists(pTableName, memoryManager.persistentSchema);
            // @ts-ignore
            expect(memoryManager.tableDimensions[pTableName]).toEqual({
                dimension: 128,
                schemaVersion: CURRENT_PERSISTENT_SCHEMA_VERSION 
            });
            expect(fs.writeFile).toHaveBeenCalledTimes(1); // Once for this table

            // @ts-ignore
            await memoryManager.ensureTableExists(sTableName, memoryManager.sessionSchema);
            // @ts-ignore
            expect(memoryManager.tableDimensions[sTableName]).toEqual({
                dimension: 128,
                schemaVersion: CURRENT_SESSION_SCHEMA_VERSION
            });
            expect(fs.writeFile).toHaveBeenCalledTimes(2); // Again for this second table
        });

        it('Scenario 2: Existing Table, Matching Dimension & Schema Version - no migration/warnings', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            memoryManager.tableDimensions = {
                [pTableName]: { dimension: 128, schemaVersion: CURRENT_PERSISTENT_SCHEMA_VERSION }
            };
            // @ts-ignore // Initialize schemas
            await memoryManager.initialize(sessionId); 
            // @ts-ignore
            const saveSpy = jest.spyOn(memoryManager, '_saveTableDimensions');
            // @ts-ignore
            const migrateSpy = jest.spyOn(memoryManager, '_migrateTable');
            
            // @ts-ignore
            await memoryManager.ensureTableExists(pTableName, memoryManager.persistentSchema);

            expect(migrateSpy).not.toHaveBeenCalled();
            expect(saveSpy).not.toHaveBeenCalled();
            expect(consoleSpyWarn).not.toHaveBeenCalledWith(expect.stringContaining('Dimension mismatch'));
            expect(consoleSpyWarn).not.toHaveBeenCalledWith(expect.stringContaining('Schema version mismatch'));
            migrateSpy.mockRestore();
            saveSpy.mockRestore();
        });

        it('Scenario 3: Existing Table, Dimension Mismatch (Schema Version Matches) - logs warning, no migration', async () => {
            mockEmbeddingModel.dimension = 256; // Current model dimension
            const memoryManager = new MemoryManager(assistant, dbPath);
             // @ts-ignore
            memoryManager.tableDimensions = {
                [pTableName]: { dimension: 128, schemaVersion: CURRENT_PERSISTENT_SCHEMA_VERSION } // Stored
            };
            await memoryManager.initialize(sessionId);
            // @ts-ignore
            const migrateSpy = jest.spyOn(memoryManager, '_migrateTable');

            // @ts-ignore
            await memoryManager.ensureTableExists(pTableName, memoryManager.persistentSchema);
            
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining(`Dimension mismatch for table '${pTableName}'. Stored: 128, Current Model: 256`));
            expect(migrateSpy).not.toHaveBeenCalled();
            migrateSpy.mockRestore();
        });

        it('Scenario 4: Existing Table, Schema Version Older (Migration Triggered)', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            memoryManager.tableDimensions = {
                [pTableName]: { dimension: 128, schemaVersion: 0 } // Older schema version
            };
            await memoryManager.initialize(sessionId);

            const mockNewTable = { name: 'new_mock_table_instance' };
            mockDb.openTable
                .mockResolvedValueOnce(mockTable) // Initial open for check
                .mockResolvedValueOnce(mockNewTable); // Second open after migration

            // @ts-ignore
            const migrateSpy = jest.spyOn(memoryManager, '_migrateTable').mockResolvedValue(undefined);
            // @ts-ignore
            const saveSpy = jest.spyOn(memoryManager, '_saveTableDimensions');

            // @ts-ignore
            const returnedTable = await memoryManager.ensureTableExists(pTableName, memoryManager.persistentSchema);

            expect(migrateSpy).toHaveBeenCalledWith(
                pTableName,
                { dimension: 128, schemaVersion: 0 }, // oldStoredInfo
                // @ts-ignore
                memoryManager.persistentSchema,       // newExpectedSchema
                CURRENT_PERSISTENT_SCHEMA_VERSION,    // newExpectedVersion
                128                                   // newExpectedDimension
            );
            // _migrateTable internally calls _saveTableDimensions after updating tableDimensions
            // So, tableDimensions should be updated by the _migrateTable spy if it were the real one.
            // Since we mock _migrateTable, we'll assume it updates tableDimensions correctly for this test's scope.
            // And then _saveTableDimensions would be called by it.
            // For this test, we check if _migrateTable was called. The _migrateTable specific test will check its internals.
            
            expect(returnedTable).toBe(mockNewTable); // Ensure the re-opened table instance is returned
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining(`Schema version mismatch for table '${pTableName}'. Stored: 0, Current: ${CURRENT_PERSISTENT_SCHEMA_VERSION}. Migration may be needed.`));
            
            migrateSpy.mockRestore();
            saveSpy.mockRestore();
        });


        it('Scenario 5: Existing Table, Schema Version Newer - critical warning, no migration', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            // @ts-ignore
            memoryManager.tableDimensions = {
                [pTableName]: { dimension: 128, schemaVersion: CURRENT_PERSISTENT_SCHEMA_VERSION + 1 } // Newer
            };
            await memoryManager.initialize(sessionId);
            // @ts-ignore
            const migrateSpy = jest.spyOn(memoryManager, '_migrateTable');

            // @ts-ignore
            await memoryManager.ensureTableExists(pTableName, memoryManager.persistentSchema);

            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining(`CRITICAL WARNING: Table '${pTableName}' has a future schema version`));
            expect(migrateSpy).not.toHaveBeenCalled();
            migrateSpy.mockRestore();
        });

        it('Scenario 6: Existing Table, Not in tableDimensions - assumes current, saves', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
            // tableDimensions is empty
            await memoryManager.initialize(sessionId); // Schemas are generated
            // @ts-ignore
            const saveSpy = jest.spyOn(memoryManager, '_saveTableDimensions');

            // @ts-ignore
            await memoryManager.ensureTableExists(pTableName, memoryManager.persistentSchema);
            
            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining(`Information for existing table '${pTableName}' not found in tracking file. Assuming current model dimension (128) and schema version, then saving.`));
            // @ts-ignore
            expect(memoryManager.tableDimensions[pTableName]).toEqual({
                dimension: 128,
                schemaVersion: CURRENT_PERSISTENT_SCHEMA_VERSION
            });
            expect(saveSpy).toHaveBeenCalledTimes(1);
            saveSpy.mockRestore();
        });
        
        it('Scenario 7: Migration Fails (Error in _migrateTable)', async () => {
            mockEmbeddingModel.dimension = 128;
            const memoryManager = new MemoryManager(assistant, dbPath);
             // @ts-ignore
            memoryManager.tableDimensions = {
                [pTableName]: { dimension: 128, schemaVersion: 0 } // Setup for migration
            };
            await memoryManager.initialize(sessionId);
            
            const migrationError = new Error("DB error during dropTable");
            // @ts-ignore
            jest.spyOn(memoryManager, '_migrateTable').mockRejectedValue(migrationError);

            await expect(
                // @ts-ignore
                memoryManager.ensureTableExists(pTableName, memoryManager.persistentSchema)
            ).rejects.toThrow(migrationError); // The original error from _migrateTable should be re-thrown

            expect(consoleSpyError).toHaveBeenCalledWith(
                expect.stringContaining(`CRITICAL: Migration failed for table '${pTableName}'. The table may be in an inconsistent state. Error: ${migrationError.message}`)
            );
        });
    });

    describe('_migrateTable (Direct Test)', () => {
        const testTableName = 'migrationTestTable';
        const oldInfo = { dimension: 64, schemaVersion: 0 };
        const newVersion = 1;
        const newDimension = 128;

        it('should log, drop, create, update dimensions, and save', async () => {
            mockEmbeddingModel.dimension = newDimension;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId); // To setup this.db and this.actualVectorDimension
            // @ts-ignore
            const newSchema = memoryManager._generateSchema(newDimension, 'session');
            // @ts-ignore
            const saveSpy = jest.spyOn(memoryManager, '_saveTableDimensions');

            // @ts-ignore
            await memoryManager._migrateTable(testTableName, oldInfo, newSchema, newVersion, newDimension);

            expect(consoleSpyWarn).toHaveBeenCalledWith(expect.stringContaining(`Attempting to migrate table '${testTableName}' from schema version ${oldInfo.schemaVersion} (dimension ${oldInfo.dimension}) to schema version ${newVersion} (dimension ${newDimension}). Current simple migration will drop and recreate the table, resulting in data loss for this table.`));
            expect(mockDb.dropTable).toHaveBeenCalledWith(testTableName);
            expect(mockDb.createEmptyTable).toHaveBeenCalledWith(testTableName, newSchema);
            // @ts-ignore
            expect(memoryManager.tableDimensions[testTableName]).toEqual({
                dimension: newDimension,
                schemaVersion: newVersion
            });
            expect(saveSpy).toHaveBeenCalled();
            expect(consoleSpyLog).toHaveBeenCalledWith(expect.stringContaining(`Table '${testTableName}' dropped successfully`));
            expect(consoleSpyLog).toHaveBeenCalledWith(expect.stringContaining(`Table '${testTableName}' recreated successfully`));
            expect(consoleSpyLog).toHaveBeenCalledWith(expect.stringContaining(`Table info for '${testTableName}' updated and saved after migration.`));
            saveSpy.mockRestore();
        });

        it('should handle error during dropTable and re-throw', async () => {
            const dropError = new Error("Failed to drop");
            mockDb.dropTable.mockRejectedValue(dropError);
            
            mockEmbeddingModel.dimension = newDimension;
            const memoryManager = new MemoryManager(assistant, dbPath);
            await memoryManager.initialize(sessionId);
            // @ts-ignore
            const newSchema = memoryManager._generateSchema(newDimension, 'session');

            await expect(
                 // @ts-ignore
                memoryManager._migrateTable(testTableName, oldInfo, newSchema, newVersion, newDimension)
            ).rejects.toThrow(`Migration failed for table ${testTableName}: ${dropError.message}`);
            
            expect(consoleSpyError).toHaveBeenCalledWith(expect.stringContaining(`CRITICAL: Error during migration of table '${testTableName}'`));
            expect(mockDb.createEmptyTable).not.toHaveBeenCalled(); // Should not be called if drop fails
        });
    });
});
