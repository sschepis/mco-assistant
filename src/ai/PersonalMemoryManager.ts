/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";
import { MemoryManager } from './memory';
import {
  PersonalityProfile,
  BondingMetrics,
  UserInteraction,
  PersonalContext,
  AdaptiveSettings,
  SharedExperience,
  DecisionPattern,
  InteractionFeedback,
  CommunicationAdjustment,
  AdaptationEvent
} from '../types/PersonalAvatarTypes';

// Schema version for personality tables
const PERSONALITY_SCHEMA_VERSION = 1;

// Table names for personal avatar data
const PERSONALITY_TABLE_NAME = `personality_profiles_v${PERSONALITY_SCHEMA_VERSION}`;
const BONDING_TABLE_NAME = `bonding_metrics_v${PERSONALITY_SCHEMA_VERSION}`;
const INTERACTIONS_TABLE_NAME = `user_interactions_v${PERSONALITY_SCHEMA_VERSION}`;
const PERSONAL_CONTEXT_TABLE_NAME = `personal_context_v${PERSONALITY_SCHEMA_VERSION}`;
const ADAPTIVE_SETTINGS_TABLE_NAME = `adaptive_settings_v${PERSONALITY_SCHEMA_VERSION}`;

export interface PersonalMemoryQueryOptions {
  userId: string;
  limit?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
  contextType?: string;
  interactionType?: string;
}

export interface PersonalityInsight {
  userId: string;
  aspect: string;
  insight: string;
  confidence: number;
  source: string;
  timestamp: Date;
  embedding?: number[];
}

export interface ContextPattern {
  userId: string;
  pattern: string;
  frequency: number;
  contexts: string[];
  effectiveness: number;
  lastSeen: Date;
}

export class PersonalMemoryManager extends MemoryManager {
  private personalitySchema: arrow.Schema | null = null;
  private bondingSchema: arrow.Schema | null = null;
  private interactionsSchema: arrow.Schema | null = null;
  private contextSchema: arrow.Schema | null = null;
  private adaptiveSchema: arrow.Schema | null = null;

  constructor(
    assistant: any,
    dbPath: string,
    embeddingModelSource?: string,
    factExtractionConfig?: any
  ) {
    super(assistant, dbPath, embeddingModelSource, factExtractionConfig);
  }

  async initialize(sessionId: string): Promise<void> {
    // Initialize base memory manager first
    await super.initialize(sessionId);
    
    // Create personal avatar schemas
    this._createPersonalAvatarSchemas();
    
    // Ensure personal avatar tables exist
    await this.ensurePersonalAvatarTablesExist();
    
    console.log("PersonalMemoryManager initialized with avatar capabilities.");
  }

  private _createPersonalAvatarSchemas(): void {
    const vectorDimension = this.getActualVectorDimension();

    // Personality Profile Schema
    this.personalitySchema = new arrow.Schema([
      new arrow.Field("user_id", new arrow.Utf8()),
      new arrow.Field("communication_style", new arrow.Utf8()), // JSON string
      new arrow.Field("preferences", new arrow.Utf8()), // JSON string
      new arrow.Field("traits", new arrow.Utf8()), // JSON string
      new arrow.Field("decision_patterns", new arrow.Utf8()), // JSON array
      new arrow.Field("created_at", new arrow.TimestampMillisecond()),
      new arrow.Field("updated_at", new arrow.TimestampMillisecond()),
      new arrow.Field("version", new arrow.Int32()),
      new arrow.Field("embedding", new arrow.FixedSizeList(vectorDimension, new arrow.Field("item", new arrow.Float32()))),
    ]);

    // Bonding Metrics Schema
    this.bondingSchema = new arrow.Schema([
      new arrow.Field("user_id", new arrow.Utf8()),
      new arrow.Field("trust_level", new arrow.Float32()),
      new arrow.Field("familiarity", new arrow.Float32()),
      new arrow.Field("communication_effectiveness", new arrow.Float32()),
      new arrow.Field("shared_experiences", new arrow.Utf8()), // JSON array
      new arrow.Field("interaction_quality", new arrow.Utf8()), // JSON object
      new arrow.Field("relationship_stage", new arrow.Utf8()),
      new arrow.Field("created_at", new arrow.TimestampMillisecond()),
      new arrow.Field("updated_at", new arrow.TimestampMillisecond()),
      new arrow.Field("embedding", new arrow.FixedSizeList(vectorDimension, new arrow.Field("item", new arrow.Float32()))),
    ]);

    // User Interactions Schema
    this.interactionsSchema = new arrow.Schema([
      new arrow.Field("interaction_id", new arrow.Utf8()),
      new arrow.Field("user_id", new arrow.Utf8()),
      new arrow.Field("session_id", new arrow.Utf8()),
      new arrow.Field("timestamp", new arrow.TimestampMillisecond()),
      new arrow.Field("user_message", new arrow.Utf8()),
      new arrow.Field("avatar_response", new arrow.Utf8()),
      new arrow.Field("context", new arrow.Utf8()), // JSON object
      new arrow.Field("feedback", new arrow.Utf8()), // JSON object
      new arrow.Field("metadata", new arrow.Utf8()), // JSON object
      new arrow.Field("embedding", new arrow.FixedSizeList(vectorDimension, new arrow.Field("item", new arrow.Float32()))),
    ]);

    // Personal Context Schema
    this.contextSchema = new arrow.Schema([
      new arrow.Field("user_id", new arrow.Utf8()),
      new arrow.Field("timestamp", new arrow.TimestampMillisecond()),
      new arrow.Field("situation_context", new arrow.Utf8()), // JSON object
      new arrow.Field("recent_activities", new arrow.Utf8()), // JSON array
      new arrow.Field("upcoming_events", new arrow.Utf8()), // JSON array
      new arrow.Field("active_projects", new arrow.Utf8()), // JSON array
      new arrow.Field("availability_status", new arrow.Utf8()), // JSON object
      new arrow.Field("environment_context", new arrow.Utf8()), // JSON object
      new arrow.Field("embedding", new arrow.FixedSizeList(vectorDimension, new arrow.Field("item", new arrow.Float32()))),
    ]);

    // Adaptive Settings Schema
    this.adaptiveSchema = new arrow.Schema([
      new arrow.Field("user_id", new arrow.Utf8()),
      new arrow.Field("proactivity_level", new arrow.Float32()),
      new arrow.Field("intervention_frequency", new arrow.Float32()),
      new arrow.Field("preferred_timings", new arrow.Utf8()), // JSON array
      new arrow.Field("communication_adjustments", new arrow.Utf8()), // JSON array
      new arrow.Field("learning_rate", new arrow.Float32()),
      new arrow.Field("adaptation_history", new arrow.Utf8()), // JSON array
      new arrow.Field("last_updated", new arrow.TimestampMillisecond()),
      new arrow.Field("embedding", new arrow.FixedSizeList(vectorDimension, new arrow.Field("item", new arrow.Float32()))),
    ]);

    console.log(`Personal Avatar schemas created with vector dimension: ${vectorDimension}`);
  }

  private async ensurePersonalAvatarTablesExist(): Promise<void> {
    if (!this.personalitySchema || !this.bondingSchema || !this.interactionsSchema || 
        !this.contextSchema || !this.adaptiveSchema) {
      throw new Error("Personal Avatar schemas not initialized");
    }

    // Ensure personal avatar tables exist
    await this.ensurePersonalTableExists(PERSONALITY_TABLE_NAME, this.personalitySchema);
    await this.ensurePersonalTableExists(BONDING_TABLE_NAME, this.bondingSchema);
    await this.ensurePersonalTableExists(INTERACTIONS_TABLE_NAME, this.interactionsSchema);
    await this.ensurePersonalTableExists(PERSONAL_CONTEXT_TABLE_NAME, this.contextSchema);
    await this.ensurePersonalTableExists(ADAPTIVE_SETTINGS_TABLE_NAME, this.adaptiveSchema);
  }


  // Helper method to ensure personal avatar tables exist
  private async ensurePersonalTableExists(tableName: string, schema: arrow.Schema): Promise<lancedb.Table> {
    if (!this.getDatabase()) {
      throw new Error("Database connection not initialized.");
    }
    if (!schema) {
      throw new Error(`Schema for table ${tableName} is not initialized.`);
    }

    try {
      console.log(`Attempting to open table: ${tableName}`);
      const table = await this.getDatabase().openTable(tableName);
      console.log(`Table "${tableName}" opened successfully.`);
      return table;
    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('not found')) {
        console.log(`Table "${tableName}" not found, creating...`);
        try {
          const newTable = await this.getDatabase().createEmptyTable(tableName, schema);
          console.log(`Table "${tableName}" created successfully.`);
          return newTable;
        } catch (createError) {
          console.error(`Failed to create table "${tableName}":`, createError);
          throw createError;
        }
      } else {
        console.error(`Error opening table "${tableName}":`, error);
        throw error;
      }
    }
  }

  // Personality Profile Management
  async storePersonalityProfile(profile: PersonalityProfile): Promise<void> {
    await this.checkPersonalMemoryInitialized();
    
    const profileText = `User personality: ${JSON.stringify({
      communication: profile.communicationStyle,
      preferences: profile.preferences,
      traits: profile.traits
    })}`;

    const embedding = (await this.embedTexts([profileText]))[0];
    
    const data = {
      user_id: profile.userId,
      communication_style: JSON.stringify(profile.communicationStyle),
      preferences: JSON.stringify(profile.preferences),
      traits: JSON.stringify(profile.traits),
      decision_patterns: JSON.stringify(profile.decisionPatterns),
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      version: profile.version,
      embedding: embedding
    };

    try {
      const table = await this.getDatabase().openTable(PERSONALITY_TABLE_NAME);
      
      // Check if profile exists and update or insert
      const existing = await table.search(embedding)
        .where(`user_id = '${profile.userId}'`)
        .limit(1)
        .toArray();

      if (existing.length > 0) {
        // Update existing profile
        console.log(`Updating personality profile for user: ${profile.userId}`);
        // For now, we'll add as new version since LanceDB update operations are complex
        await table.add([data]);
      } else {
        // Insert new profile
        console.log(`Creating new personality profile for user: ${profile.userId}`);
        await table.add([data]);
      }
    } catch (error) {
      console.error(`Error storing personality profile for ${profile.userId}:`, error);
      throw error;
    }
  }

  async getPersonalityProfile(userId: string): Promise<PersonalityProfile | null> {
    await this.checkPersonalMemoryInitialized();

    try {
      const table = await this.getDatabase().openTable(PERSONALITY_TABLE_NAME);
      const results = await table.search([0]) // Dummy search vector
        .where(`user_id = '${userId}'`)
        .select(['user_id', 'communication_style', 'preferences', 'traits', 'decision_patterns', 'created_at', 'updated_at', 'version'])
        .limit(1)
        .toArray();

      if (results.length === 0) return null;

      const result = results[0] as any;
      return {
        userId: result.user_id,
        communicationStyle: JSON.parse(result.communication_style),
        preferences: JSON.parse(result.preferences),
        traits: JSON.parse(result.traits),
        decisionPatterns: JSON.parse(result.decision_patterns),
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at),
        version: result.version
      };
    } catch (error) {
      console.error(`Error retrieving personality profile for ${userId}:`, error);
      return null;
    }
  }

  // Bonding Metrics Management
  async storeBondingMetrics(metrics: BondingMetrics): Promise<void> {
    await this.checkPersonalMemoryInitialized();

    const metricsText = `Bonding metrics: trust=${metrics.trustLevel}, familiarity=${metrics.familiarity}, effectiveness=${metrics.communicationEffectiveness}, stage=${metrics.relationshipStage}`;
    const embedding = (await this.embedTexts([metricsText]))[0];

    const data = {
      user_id: metrics.userId,
      trust_level: metrics.trustLevel,
      familiarity: metrics.familiarity,
      communication_effectiveness: metrics.communicationEffectiveness,
      shared_experiences: JSON.stringify(metrics.sharedExperiences),
      interaction_quality: JSON.stringify(metrics.interactionQuality),
      relationship_stage: metrics.relationshipStage,
      created_at: metrics.createdAt,
      updated_at: metrics.updatedAt,
      embedding: embedding
    };

    try {
      const table = await this.getDatabase().openTable(BONDING_TABLE_NAME);
      await table.add([data]);
      console.log(`Stored bonding metrics for user: ${metrics.userId}`);
    } catch (error) {
      console.error(`Error storing bonding metrics for ${metrics.userId}:`, error);
      throw error;
    }
  }

  async getBondingMetrics(userId: string): Promise<BondingMetrics | null> {
    await this.checkPersonalMemoryInitialized();

    try {
      const table = await this.getDatabase().openTable(BONDING_TABLE_NAME);
      // Use a filter query instead of vector search for ordering
      const results = await table.query()
        .where(`user_id = '${userId}'`)
        .select(['user_id', 'trust_level', 'familiarity', 'communication_effectiveness', 'shared_experiences', 'interaction_quality', 'relationship_stage', 'created_at', 'updated_at'])
        .limit(1)
        .toArray();
      
      // Sort results manually since we can't rely on orderBy
      results.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      if (results.length === 0) return null;

      const result = results[0] as any;
      return {
        userId: result.user_id,
        trustLevel: result.trust_level,
        familiarity: result.familiarity,
        communicationEffectiveness: result.communication_effectiveness,
        sharedExperiences: JSON.parse(result.shared_experiences),
        interactionQuality: JSON.parse(result.interaction_quality),
        relationshipStage: result.relationship_stage,
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at)
      };
    } catch (error) {
      console.error(`Error retrieving bonding metrics for ${userId}:`, error);
      return null;
    }
  }

  // User Interaction Management
  async storeUserInteraction(interaction: UserInteraction): Promise<void> {
    await this.checkPersonalMemoryInitialized();

    const interactionText = `${interaction.userMessage} ${interaction.avatarResponse}`;
    const embedding = (await this.embedTexts([interactionText]))[0];

    const data = {
      interaction_id: interaction.id,
      user_id: interaction.userId,
      session_id: interaction.sessionId,
      timestamp: interaction.timestamp,
      user_message: interaction.userMessage,
      avatar_response: interaction.avatarResponse,
      context: JSON.stringify(interaction.context),
      feedback: JSON.stringify(interaction.feedback || {}),
      metadata: JSON.stringify(interaction.metadata),
      embedding: embedding
    };

    try {
      const table = await this.getDatabase().openTable(INTERACTIONS_TABLE_NAME);
      await table.add([data]);
      console.log(`Stored interaction: ${interaction.id}`);
    } catch (error) {
      console.error(`Error storing interaction ${interaction.id}:`, error);
      throw error;
    }
  }

  async queryPersonalityInsights(userId: string, query: string, limit: number = 10): Promise<PersonalityInsight[]> {
    await this.checkPersonalMemoryInitialized();

    const queryEmbedding = (await this.embedTexts([query]))[0];

    try {
      // Search across personality profiles, bonding metrics, and interactions
      const personalityTable = await this.getDatabase().openTable(PERSONALITY_TABLE_NAME);
      const personalityResults = await personalityTable.search(queryEmbedding)
        .where(`user_id = '${userId}'`)
        .limit(Math.ceil(limit / 3))
        .toArray();

      const bondingTable = await this.getDatabase().openTable(BONDING_TABLE_NAME);
      const bondingResults = await bondingTable.search(queryEmbedding)
        .where(`user_id = '${userId}'`)
        .limit(Math.ceil(limit / 3))
        .toArray();

      const interactionsTable = await this.getDatabase().openTable(INTERACTIONS_TABLE_NAME);
      const interactionResults = await interactionsTable.search(queryEmbedding)
        .where(`user_id = '${userId}'`)
        .limit(Math.ceil(limit / 3))
        .toArray();

      // Convert results to PersonalityInsight format
      const insights: PersonalityInsight[] = [];

      personalityResults.forEach((result: any) => {
        insights.push({
          userId: result.user_id,
          aspect: 'personality_profile',
          insight: `Communication style and preferences from personality profile`,
          confidence: 1 - (result._distance || 0),
          source: 'personality_profile',
          timestamp: new Date(result.updated_at),
          embedding: result.embedding
        });
      });

      bondingResults.forEach((result: any) => {
        insights.push({
          userId: result.user_id,
          aspect: 'bonding_metrics',
          insight: `Relationship stage: ${result.relationship_stage}, Trust: ${result.trust_level}`,
          confidence: 1 - (result._distance || 0),
          source: 'bonding_metrics',
          timestamp: new Date(result.updated_at)
        });
      });

      interactionResults.forEach((result: any) => {
        insights.push({
          userId: result.user_id,
          aspect: 'interaction_pattern',
          insight: `User message pattern and response preferences`,
          confidence: 1 - (result._distance || 0),
          source: 'user_interactions',
          timestamp: new Date(result.timestamp)
        });
      });

      // Sort by confidence and return top results
      return insights
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);

    } catch (error) {
      console.error(`Error querying personality insights for ${userId}:`, error);
      return [];
    }
  }

  async getRecentInteractions(userId: string, limit: number = 20): Promise<UserInteraction[]> {
    await this.checkPersonalMemoryInitialized();

    try {
      const table = await this.getDatabase().openTable(INTERACTIONS_TABLE_NAME);
      // Use filter query for better performance with ordering
      const results = await table.query()
        .where(`user_id = '${userId}'`)
        .limit(limit * 2) // Get more results to sort manually
        .toArray();
      
      // Sort manually and limit
      const sortedResults = results
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return sortedResults.map((result: any) => ({
        id: result.interaction_id,
        userId: result.user_id,
        sessionId: result.session_id,
        timestamp: new Date(result.timestamp),
        userMessage: result.user_message,
        avatarResponse: result.avatar_response,
        context: JSON.parse(result.context),
        feedback: result.feedback ? JSON.parse(result.feedback) : undefined,
        metadata: JSON.parse(result.metadata)
      }));
    } catch (error) {
      console.error(`Error retrieving recent interactions for ${userId}:`, error);
      return [];
    }
  }

  // Personal Context Management
  async storePersonalContext(context: PersonalContext): Promise<void> {
    await this.checkPersonalMemoryInitialized();

    const contextText = `Current situation: ${context.currentSituation.primaryActivity}, availability: ${context.availabilityStatus.status}, location: ${context.environmentContext.location.type}`;
    const embedding = (await this.embedTexts([contextText]))[0];

    const data = {
      user_id: context.userId,
      timestamp: context.timestamp,
      situation_context: JSON.stringify(context.currentSituation),
      recent_activities: JSON.stringify(context.recentActivities),
      upcoming_events: JSON.stringify(context.upcomingEvents),
      active_projects: JSON.stringify(context.activeProjects),
      availability_status: JSON.stringify(context.availabilityStatus),
      environment_context: JSON.stringify(context.environmentContext),
      embedding: embedding
    };

    try {
      const table = await this.getDatabase().openTable(PERSONAL_CONTEXT_TABLE_NAME);
      await table.add([data]);
      console.log(`Stored personal context for user: ${context.userId}`);
    } catch (error) {
      console.error(`Error storing personal context for ${context.userId}:`, error);
      throw error;
    }
  }

  async getRecentPersonalContext(userId: string, limit: number = 10): Promise<PersonalContext[]> {
    await this.checkPersonalMemoryInitialized();

    try {
      const table = await this.getDatabase().openTable(PERSONAL_CONTEXT_TABLE_NAME);
      // Use filter query for better performance
      const results = await table.query()
        .where(`user_id = '${userId}'`)
        .limit(limit * 2) // Get more results to sort manually
        .toArray();
      
      // Sort manually and limit
      const sortedResults = results
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return sortedResults.map((result: any) => ({
        userId: result.user_id,
        timestamp: new Date(result.timestamp),
        currentSituation: JSON.parse(result.situation_context),
        recentActivities: JSON.parse(result.recent_activities),
        upcomingEvents: JSON.parse(result.upcoming_events),
        activeProjects: JSON.parse(result.active_projects),
        availabilityStatus: JSON.parse(result.availability_status),
        environmentContext: JSON.parse(result.environment_context)
      }));
    } catch (error) {
      console.error(`Error retrieving personal context for ${userId}:`, error);
      return [];
    }
  }

  // Adaptive Settings Management
  async storeAdaptiveSettings(settings: AdaptiveSettings): Promise<void> {
    await this.checkPersonalMemoryInitialized();

    const settingsText = `Adaptive settings: proactivity=${settings.proactivityLevel}, frequency=${settings.interventionFrequency}, learning_rate=${settings.learningRate}`;
    const embedding = (await this.embedTexts([settingsText]))[0];

    const data = {
      user_id: settings.userId,
      proactivity_level: settings.proactivityLevel,
      intervention_frequency: settings.interventionFrequency,
      preferred_timings: JSON.stringify(settings.preferredTimings),
      communication_adjustments: JSON.stringify(settings.communicationAdjustments),
      learning_rate: settings.learningRate,
      adaptation_history: JSON.stringify(settings.adaptationHistory),
      last_updated: settings.lastUpdated,
      embedding: embedding
    };

    try {
      const table = await this.getDatabase().openTable(ADAPTIVE_SETTINGS_TABLE_NAME);
      await table.add([data]);
      console.log(`Stored adaptive settings for user: ${settings.userId}`);
    } catch (error) {
      console.error(`Error storing adaptive settings for ${settings.userId}:`, error);
      throw error;
    }
  }

  async getAdaptiveSettings(userId: string): Promise<AdaptiveSettings | null> {
    await this.checkPersonalMemoryInitialized();

    try {
      const table = await this.getDatabase().openTable(ADAPTIVE_SETTINGS_TABLE_NAME);
      // Use filter query for getting adaptive settings
      const results = await table.query()
        .where(`user_id = '${userId}'`)
        .limit(10) // Get a few results to sort manually
        .toArray();
      
      // Sort manually and get the most recent
      const sortedResults = results
        .sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
        .slice(0, 1);

      if (sortedResults.length === 0) return null;

      const result = sortedResults[0] as any;
      return {
        userId: result.user_id,
        proactivityLevel: result.proactivity_level,
        interventionFrequency: result.intervention_frequency,
        preferredTimings: JSON.parse(result.preferred_timings),
        communicationAdjustments: JSON.parse(result.communication_adjustments),
        learningRate: result.learning_rate,
        adaptationHistory: JSON.parse(result.adaptation_history),
        lastUpdated: new Date(result.last_updated)
      };
    } catch (error) {
      console.error(`Error retrieving adaptive settings for ${userId}:`, error);
      return null;
    }
  }


  // Helper method to access checkInitialized from base class
  private async checkPersonalMemoryInitialized(): Promise<void> {
    return (this as any).checkInitialized();
  }
}