/* eslint-disable @typescript-eslint/no-explicit-any */
import DynamicAISystem from './DynamicAISystem';
import { PersonalMemoryManager } from './PersonalMemoryManager';
import { PersonalAvatar } from './PersonalAvatar';
import { PersonalContextManager } from '../context/PersonalContextManager';
import { SmartPromptFrame } from './SmartPromptFrame';
import SimpleConfiguration from '../SimpleConfiguration';
import {
  PersonalAvatarConfig,
  AvatarResponse,
  InteractionFeedback,
  PersonalityProfile,
  BondingMetrics,
  AdaptiveSettings
} from '../types/PersonalAvatarTypes';
import Logger from '../utils/Logger';

export class PersonalAvatarSystem {
  private aiSystem: DynamicAISystem | null = null;
  private memoryManager: PersonalMemoryManager | null = null;
  private contextManager: PersonalContextManager | null = null;
  private promptFrame: SmartPromptFrame | null = null;
  private avatars: Map<string, PersonalAvatar> = new Map();
  private logger: Logger;
  private isInitialized = false;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async initialize(config: SimpleConfiguration): Promise<void> {
    try {
      this.logger.info('Initializing Personal Avatar System...');

      // Initialize core AI system
      this.aiSystem = await DynamicAISystem.getInstance(config);

      // Initialize memory manager with avatar capabilities
      const dbPath = config.getSharedConfig('memoryDbPath') || './data/avatar_memory';
      this.memoryManager = new PersonalMemoryManager(
        this.aiSystem,
        dbPath,
        config.getSharedConfig('embeddingModel'),
        {
          providerConfigId: config.getSharedConfig('defaultProvider') || 'anthropic',
          temperature: 0.1
        }
      );

      // Initialize memory manager with a default session
      await this.memoryManager.initialize('system_session');

      // Initialize context manager
      this.contextManager = new PersonalContextManager();

      // Initialize smart prompt frame
      this.promptFrame = new SmartPromptFrame();

      this.isInitialized = true;
      this.logger.info('Personal Avatar System initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Personal Avatar System:', error);
      throw error;
    }
  }

  async createAvatar(userId: string, config: PersonalAvatarConfig): Promise<PersonalAvatar> {
    if (!this.isInitialized) {
      throw new Error('Personal Avatar System not initialized');
    }

    if (this.avatars.has(userId)) {
      this.logger.warn(`Avatar for user ${userId} already exists. Returning existing avatar.`);
      return this.avatars.get(userId)!;
    }

    try {
      this.logger.info(`Creating new Personal Avatar for user: ${userId}`);

      const avatar = new PersonalAvatar(
        userId,
        this.memoryManager!,
        this.aiSystem!,
        this.contextManager!,
        this.promptFrame!
      );

      await avatar.initialize(config);
      this.avatars.set(userId, avatar);

      this.logger.info(`Personal Avatar created successfully for user: ${userId}`);
      return avatar;

    } catch (error) {
      this.logger.error(`Failed to create avatar for user ${userId}:`, error);
      throw error;
    }
  }

  async getAvatar(userId: string): Promise<PersonalAvatar | null> {
    return this.avatars.get(userId) || null;
  }

  async removeAvatar(userId: string): Promise<boolean> {
    if (this.avatars.has(userId)) {
      this.avatars.delete(userId);
      this.logger.info(`Avatar removed for user: ${userId}`);
      return true;
    }
    return false;
  }

  async processInteraction(
    userId: string,
    message: string,
    sessionId: string,
    context?: any
  ): Promise<AvatarResponse> {
    const avatar = this.avatars.get(userId);
    if (!avatar) {
      throw new Error(`No avatar found for user: ${userId}`);
    }

    return avatar.processInteraction(message, sessionId, context);
  }

  async provideFeedback(
    userId: string,
    interactionId: string,
    feedback: InteractionFeedback
  ): Promise<void> {
    const avatar = this.avatars.get(userId);
    if (!avatar) {
      throw new Error(`No avatar found for user: ${userId}`);
    }

    // Get the interaction from memory to update personality
    const recentInteractions = await this.memoryManager!.getRecentInteractions(userId, 20);
    const interaction = recentInteractions.find(i => i.id === interactionId);

    if (interaction) {
      await avatar.updatePersonalityFromInteraction(interaction, feedback);
      await avatar.adjustProactivityLevel(feedback);
    }
  }

  async getAvatarPersonality(userId: string): Promise<PersonalityProfile | null> {
    const avatar = this.avatars.get(userId);
    return avatar ? avatar.getPersonalityProfile() : null;
  }

  async getBondingMetrics(userId: string): Promise<BondingMetrics | null> {
    const avatar = this.avatars.get(userId);
    return avatar ? avatar.getBondingMetrics() : null;
  }

  async getAdaptiveSettings(userId: string): Promise<AdaptiveSettings | null> {
    const avatar = this.avatars.get(userId);
    return avatar ? avatar.getAdaptiveSettings() : null;
  }

  async getSystemStats(): Promise<{
    totalAvatars: number;
    activeAvatars: string[];
    memoryStats: any;
    systemHealth: 'healthy' | 'degraded' | 'error';
  }> {
    try {
      return {
        totalAvatars: this.avatars.size,
        activeAvatars: Array.from(this.avatars.keys()),
        memoryStats: {
          // Could add memory usage stats here
          initialized: this.memoryManager !== null
        },
        systemHealth: this.isInitialized ? 'healthy' : 'error'
      };
    } catch (error) {
      this.logger.error('Error getting system stats:', error);
      return {
        totalAvatars: 0,
        activeAvatars: [],
        memoryStats: {},
        systemHealth: 'error'
      };
    }
  }

  // Utility method to create a default configuration for quick setup
  static createDefaultAvatarConfig(userId: string): PersonalAvatarConfig {
    return {
      userId,
      privacySettings: {
        dataSharing: 'none',
        memoryRetention: 'extended',
        contextDepth: 'standard',
        externalIntegrations: {
          calendar: true,
          email: false,
          files: true,
          location: false,
          activity: true,
          communications: false,
          browsing: false,
          development: true
        },
        auditLevel: 'basic'
      },
      adaptationSettings: {
        proactivityLevel: 0.5,
        interventionFrequency: 3,
        learningRate: 0.1
      },
      dataSourceSettings: {
        enabledSources: ['calendar', 'files', 'activity', 'development'],
        updateFrequency: 'hourly',
        privacyFilters: [],
        retentionPolicies: [
          {
            dataType: 'interaction',
            retention: 'month',
            autoDelete: true
          },
          {
            dataType: 'personality',
            retention: 'permanent',
            autoDelete: false
          }
        ]
      }
    };
  }

  // Method to export avatar data for backup/migration
  async exportAvatarData(userId: string): Promise<{
    personality: PersonalityProfile | null;
    bonding: BondingMetrics | null;
    adaptive: AdaptiveSettings | null;
    recentInteractions: any[];
  } | null> {
    if (!this.memoryManager) return null;

    try {
      const [personality, bonding, adaptive, interactions] = await Promise.all([
        this.memoryManager.getPersonalityProfile(userId),
        this.memoryManager.getBondingMetrics(userId),
        this.memoryManager.getAdaptiveSettings(userId),
        this.memoryManager.getRecentInteractions(userId, 100)
      ]);

      return {
        personality,
        bonding,
        adaptive,
        recentInteractions: interactions
      };
    } catch (error) {
      this.logger.error(`Error exporting avatar data for user ${userId}:`, error);
      return null;
    }
  }

  // Method to import avatar data from backup
  async importAvatarData(
    userId: string,
    data: {
      personality?: PersonalityProfile;
      bonding?: BondingMetrics;
      adaptive?: AdaptiveSettings;
    }
  ): Promise<void> {
    if (!this.memoryManager) {
      throw new Error('Memory manager not initialized');
    }

    try {
      if (data.personality) {
        await this.memoryManager.storePersonalityProfile(data.personality);
      }

      if (data.bonding) {
        await this.memoryManager.storeBondingMetrics(data.bonding);
      }

      if (data.adaptive) {
        await this.memoryManager.storeAdaptiveSettings(data.adaptive);
      }

      this.logger.info(`Avatar data imported successfully for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error importing avatar data for user ${userId}:`, error);
      throw error;
    }
  }

  // Cleanup method
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Personal Avatar System...');
      
      // Clear all avatars
      this.avatars.clear();
      
      // Reset components
      this.aiSystem = null;
      this.memoryManager = null;
      this.contextManager = null;
      this.promptFrame = null;
      this.isInitialized = false;

      this.logger.info('Personal Avatar System shut down successfully');
    } catch (error) {
      this.logger.error('Error during Personal Avatar System shutdown:', error);
      throw error;
    }
  }

  // Getter methods
  isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  getActiveAvatarCount(): number {
    return this.avatars.size;
  }

  getActiveUserIds(): string[] {
    return Array.from(this.avatars.keys());
  }

  hasAvatar(userId: string): boolean {
    return this.avatars.has(userId);
  }
}

// Singleton instance for easy access
let personalAvatarSystemInstance: PersonalAvatarSystem | null = null;

export function getPersonalAvatarSystem(): PersonalAvatarSystem {
  if (!personalAvatarSystemInstance) {
    personalAvatarSystemInstance = new PersonalAvatarSystem();
  }
  return personalAvatarSystemInstance;
}

export function resetPersonalAvatarSystem(): void {
  personalAvatarSystemInstance = null;
}