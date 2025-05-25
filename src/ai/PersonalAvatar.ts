/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';
import {
  PersonalityProfile,
  BondingMetrics,
  UserInteraction,
  PersonalContext,
  AdaptiveSettings,
  AvatarResponse,
  InteractionFeedback,
  PersonalAvatarConfig,
  CommunicationStyle,
  SharedExperience,
  ExperienceType,
  RelationshipStage,
  AdaptationEvent,
  CommunicationAdjustment,
  PersonalityApplication,
  ProactiveSuggestion
} from '../types/PersonalAvatarTypes';
import { PersonalMemoryManager } from './PersonalMemoryManager';
import DynamicAISystem from './DynamicAISystem';
import { PersonalContextManager } from '../context/PersonalContextManager';
import { SmartPromptFrame } from './SmartPromptFrame';
import { WebIntelligenceTool } from './tools/WebIntelligenceTool';
import Logger from '../utils/Logger';

export class PersonalAvatar {
  private userId: string;
  private personalityProfile: PersonalityProfile | null = null;
  private bondingMetrics: BondingMetrics | null = null;
  private adaptiveSettings: AdaptiveSettings | null = null;
  private memoryManager: PersonalMemoryManager;
  private aiSystem: DynamicAISystem;
  private contextManager: PersonalContextManager;
  private promptFrame: SmartPromptFrame;
  private webIntelligence: WebIntelligenceTool;
  private logger: Logger;
  private isInitialized = false;

  constructor(
    userId: string,
    memoryManager: PersonalMemoryManager,
    aiSystem: DynamicAISystem,
    contextManager: PersonalContextManager,
    promptFrame: SmartPromptFrame
  ) {
    this.userId = userId;
    this.memoryManager = memoryManager;
    this.aiSystem = aiSystem;
    this.contextManager = contextManager;
    this.promptFrame = promptFrame;
    this.webIntelligence = new WebIntelligenceTool(process.env.SERPER_API_KEY);
    this.logger = Logger.getInstance();
  }

  async initialize(config: PersonalAvatarConfig): Promise<void> {
    try {
      this.logger.info(`Initializing Personal Avatar for user: ${this.userId}`);

      // Load or create personality profile
      this.personalityProfile = await this.loadOrCreatePersonalityProfile(config.initialPersonality);
      
      // Load or create bonding metrics
      this.bondingMetrics = await this.loadOrCreateBondingMetrics();
      
      // Load or create adaptive settings
      this.adaptiveSettings = await this.loadOrCreateAdaptiveSettings(config.adaptationSettings);

      // Initialize context manager with privacy settings
      await this.contextManager.initialize(this.userId, config.privacySettings, config.dataSourceSettings);

      this.isInitialized = true;
      this.logger.info(`Personal Avatar initialized successfully for user: ${this.userId}`);

    } catch (error) {
      this.logger.error(`Failed to initialize Personal Avatar for user ${this.userId}:`, error);
      throw error;
    }
  }

  async processInteraction(
    userMessage: string,
    sessionId: string,
    interactionContext?: any
  ): Promise<AvatarResponse> {
    if (!this.isInitialized) {
      throw new Error('Personal Avatar not initialized. Call initialize() first.');
    }

    const interactionId = uuidv4();
    const timestamp = new Date();

    try {
      this.logger.debug(`Processing interaction ${interactionId} for user: ${this.userId}`);

      // 1. Gather current personal context
      const personalContext = await this.contextManager.gatherCurrentContext();

      // 2. Get relevant memories and personality insights
      const relevantMemories = await this.memoryManager.queryPersonalityInsights(
        this.userId,
        userMessage,
        10
      );

      // 3. Build personalized prompt using Smart Prompt Frame
      const enrichedPrompt = await this.promptFrame.assemblePersonalizedPrompt(
        userMessage,
        personalContext,
        this.personalityProfile!,
        relevantMemories
      );

      // 4. Generate AI response with personality application
      const aiResponse: any = await this.aiSystem.chat([
        { role: 'system', content: enrichedPrompt.system },
        { role: 'user', content: enrichedPrompt.context + '\n\n' + userMessage }
      ]);

      // 5. Apply personality adjustments to response
      const personalizedResponse = await this.applyPersonalityToResponse(
        aiResponse.choices?.[0]?.message?.content || aiResponse.response || String(aiResponse),
        personalContext
      );

      // 6. Generate proactive suggestions if appropriate
      const suggestions = await this.generateProactiveSuggestions(personalContext, userMessage);

      // 7. Create interaction record
      const interaction: UserInteraction = {
        id: interactionId,
        userId: this.userId,
        sessionId,
        timestamp,
        userMessage,
        avatarResponse: personalizedResponse.content,
        context: {
          currentActivity: personalContext.currentSituation.primaryActivity,
          timeOfDay: this.getTimeOfDay(),
          availabilityStatus: personalContext.availabilityStatus.status,
          recentEvents: personalContext.recentActivities.map((a: any) => a.description).slice(0, 3),
          activeProjects: personalContext.activeProjects.map((p: any) => p.name).slice(0, 3),
          environmentType: personalContext.environmentContext.location.type as any,
          ...interactionContext
        },
        metadata: {
          provider: 'personal_avatar',
          model: 'dynamic',
          tokensUsed: aiResponse.usage?.total_tokens || aiResponse.usage?.totalTokens || 0,
          processingTime: Date.now() - timestamp.getTime(),
          contextSources: ['personality', 'bonding', 'personal_context', 'memory'],
          personalityVersion: this.personalityProfile!.version,
          memoryRetrievals: relevantMemories.length
        }
      };

      // 8. Store interaction for learning
      await this.memoryManager.storeUserInteraction(interaction);

      // 9. Update bonding metrics based on interaction
      await this.updateBondingMetrics(interaction);

      // 10. Create comprehensive avatar response
      const avatarResponse: AvatarResponse = {
        content: personalizedResponse.content,
        context: {
          personalContext,
          relevantMemories: relevantMemories.map(m => m.insight),
          personalityFactors: personalizedResponse.personalityFactors,
          adaptationApplied: personalizedResponse.adaptationApplied,
          confidenceLevel: this.calculateConfidenceLevel(relevantMemories, personalContext)
        },
        personality: personalizedResponse.personality,
        suggestions,
        actions: [], // Will be populated by specific action generators
        metadata: {
          processingTime: Date.now() - timestamp.getTime(),
          memoryQueries: relevantMemories.length,
          contextSources: ['personality_profile', 'bonding_metrics', 'personal_context', 'adaptive_settings'],
          personalityVersion: this.personalityProfile!.version,
          adaptationApplied: personalizedResponse.adaptationApplied.length > 0,
          privacyFiltersApplied: personalizedResponse.privacyFiltersApplied
        }
      };

      this.logger.debug(`Interaction ${interactionId} processed successfully`);
      return avatarResponse;

    } catch (error) {
      this.logger.error(`Error processing interaction ${interactionId}:`, error);
      throw error;
    }
  }

  async updatePersonalityFromInteraction(interaction: UserInteraction, feedback?: InteractionFeedback): Promise<void> {
    if (!this.personalityProfile) return;

    try {
      this.logger.debug(`Updating personality from interaction: ${interaction.id}`);

      const adjustments: CommunicationAdjustment[] = [];

      // Analyze user message patterns for communication style insights
      // Analyze user message patterns for communication style insights
      // const messageAnalysis = this.analyzeUserMessage(interaction.userMessage);
      
      // Analyze feedback for satisfaction indicators
      if (feedback) {
        const feedbackAdjustments = this.analyzeFeedbackForAdjustments(feedback);
        adjustments.push(...feedbackAdjustments);
      }

      // Analyze implicit feedback from response patterns
      const implicitAdjustments = this.analyzeImplicitFeedback(interaction);
      adjustments.push(...implicitAdjustments);

      // Apply adjustments to personality profile
      if (adjustments.length > 0) {
        this.applyPersonalityAdjustments(adjustments);
        
        // Update personality profile in memory
        this.personalityProfile.updatedAt = new Date();
        this.personalityProfile.version += 1;
        await this.memoryManager.storePersonalityProfile(this.personalityProfile);

        // Record adaptation event
        const adaptationEvent: AdaptationEvent = {
          id: uuidv4(),
          type: 'communication_style',
          trigger: `Interaction feedback analysis`,
          adjustment: adjustments,
          confidence: this.calculateAdjustmentConfidence(adjustments),
          timestamp: new Date()
        };

        this.adaptiveSettings!.adaptationHistory.push(adaptationEvent);
        await this.memoryManager.storeAdaptiveSettings(this.adaptiveSettings!);
      }

    } catch (error) {
      this.logger.error(`Error updating personality from interaction:`, error);
    }
  }

  async adjustProactivityLevel(feedback: InteractionFeedback): Promise<void> {
    if (!this.adaptiveSettings) return;

    try {
      const currentLevel = this.adaptiveSettings.proactivityLevel;
      let adjustment = 0;

      if (feedback.explicit) {
        // Use explicit feedback to adjust proactivity
        if (feedback.explicit.rating < 3) {
          adjustment = -0.1; // Reduce proactivity if rated poorly
        } else if (feedback.explicit.rating > 4) {
          adjustment = 0.05; // Slightly increase if rated highly
        }
      }

      if (feedback.implicit) {
        // Use implicit signals
        if (!feedback.implicit.followUpAction && !feedback.implicit.conversationContinued) {
          adjustment -= 0.05; // Reduce if user doesn't engage further
        } else if (feedback.implicit.followUpAction) {
          adjustment += 0.03; // Increase if user takes action
        }
      }

      if (adjustment !== 0) {
        this.adaptiveSettings.proactivityLevel = Math.max(0, Math.min(1, currentLevel + adjustment));
        
        const adaptationEvent: AdaptationEvent = {
          id: uuidv4(),
          type: 'proactivity_level',
          trigger: 'User feedback analysis',
          adjustment: { previous: currentLevel, new: this.adaptiveSettings.proactivityLevel },
          confidence: Math.abs(adjustment) * 2, // Higher adjustment = higher confidence
          timestamp: new Date()
        };

        this.adaptiveSettings.adaptationHistory.push(adaptationEvent);
        this.adaptiveSettings.lastUpdated = new Date();
        
        await this.memoryManager.storeAdaptiveSettings(this.adaptiveSettings);
        
        this.logger.info(`Adjusted proactivity level from ${currentLevel} to ${this.adaptiveSettings.proactivityLevel}`);
      }

    } catch (error) {
      this.logger.error('Error adjusting proactivity level:', error);
    }
  }

  private async loadOrCreatePersonalityProfile(initialPersonality?: Partial<PersonalityProfile>): Promise<PersonalityProfile> {
    let profile = await this.memoryManager.getPersonalityProfile(this.userId);
    
    if (!profile) {
      this.logger.info(`Creating new personality profile for user: ${this.userId}`);
      
      profile = {
        userId: this.userId,
        communicationStyle: {
          formality: initialPersonality?.communicationStyle?.formality ?? 0.5,
          directness: initialPersonality?.communicationStyle?.directness ?? 0.6,
          empathy: initialPersonality?.communicationStyle?.empathy ?? 0.7,
          humor: initialPersonality?.communicationStyle?.humor ?? 0.4,
          technicality: initialPersonality?.communicationStyle?.technicality ?? 0.7,
          responseLength: initialPersonality?.communicationStyle?.responseLength ?? 'moderate',
          explanationDepth: initialPersonality?.communicationStyle?.explanationDepth ?? 'moderate'
        },
        preferences: {
          proactivityLevel: initialPersonality?.preferences?.proactivityLevel ?? 0.5,
          interruptionTolerance: initialPersonality?.preferences?.interruptionTolerance ?? 0.6,
          contextDepth: initialPersonality?.preferences?.contextDepth ?? 'moderate',
          privacyLevel: initialPersonality?.preferences?.privacyLevel ?? 'selective',
          learningStyle: initialPersonality?.preferences?.learningStyle ?? 'mixed',
          timePreferences: [],
          topicInterests: []
        },
        traits: {
          decisionMakingStyle: initialPersonality?.traits?.decisionMakingStyle ?? 'analytical',
          workStyle: initialPersonality?.traits?.workStyle ?? 'focused',
          communicationPreference: initialPersonality?.traits?.communicationPreference ?? 'conversational',
          problemSolvingApproach: initialPersonality?.traits?.problemSolvingApproach ?? 'methodical',
          feedbackStyle: initialPersonality?.traits?.feedbackStyle ?? 'constructive'
        },
        decisionPatterns: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      await this.memoryManager.storePersonalityProfile(profile);
    }

    return profile;
  }

  private async loadOrCreateBondingMetrics(): Promise<BondingMetrics> {
    let metrics = await this.memoryManager.getBondingMetrics(this.userId);
    
    if (!metrics) {
      this.logger.info(`Creating new bonding metrics for user: ${this.userId}`);
      
      metrics = {
        userId: this.userId,
        trustLevel: 0.3, // Start with moderate trust
        familiarity: 0.1, // Low initial familiarity
        communicationEffectiveness: 0.5, // Neutral starting point
        sharedExperiences: [],
        interactionQuality: {
          averageResponseTime: 0,
          contextAccuracy: 0.5,
          helpfulness: 0.5,
          relevance: 0.5,
          personalConnection: 0.2,
          totalInteractions: 0,
          positiveInteractions: 0,
          lastUpdated: new Date()
        },
        relationshipStage: 'introduction',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.memoryManager.storeBondingMetrics(metrics);
    }

    return metrics;
  }

  private async loadOrCreateAdaptiveSettings(initialSettings?: Partial<AdaptiveSettings>): Promise<AdaptiveSettings> {
    let settings = await this.memoryManager.getAdaptiveSettings(this.userId);
    
    if (!settings) {
      this.logger.info(`Creating new adaptive settings for user: ${this.userId}`);
      
      settings = {
        userId: this.userId,
        proactivityLevel: initialSettings?.proactivityLevel ?? 0.5,
        interventionFrequency: initialSettings?.interventionFrequency ?? 3,
        preferredTimings: [],
        communicationAdjustments: [],
        learningRate: initialSettings?.learningRate ?? 0.1,
        adaptationHistory: [],
        lastUpdated: new Date()
      };

      await this.memoryManager.storeAdaptiveSettings(settings);
    }

    return settings;
  }

  private async applyPersonalityToResponse(
    aiResponse: string,
    context: PersonalContext
  ): Promise<{
    content: string;
    personality: PersonalityApplication;
    personalityFactors: string[];
    adaptationApplied: string[];
    privacyFiltersApplied: string[];
  }> {
    const personalityFactors: string[] = [];
    const adaptationApplied: string[] = [];
    const privacyFiltersApplied: string[] = [];

    // Apply communication style adjustments
    const adjustedResponse = aiResponse;
    
    if (this.personalityProfile) {
      const style = this.personalityProfile.communicationStyle;
      
      // Adjust formality
      if (style.formality < 0.3) {
        personalityFactors.push('informal_tone');
        adaptationApplied.push('reduced_formality');
      } else if (style.formality > 0.7) {
        personalityFactors.push('formal_tone');
        adaptationApplied.push('increased_formality');
      }

      // Adjust directness
      if (style.directness > 0.7) {
        personalityFactors.push('direct_communication');
        adaptationApplied.push('increased_directness');
      }

      // Adjust empathy
      if (style.empathy > 0.7) {
        personalityFactors.push('empathetic_response');
        adaptationApplied.push('increased_empathy');
      }

      // Adjust technical level based on context
      if (context.currentSituation.complexity > 0.7 && style.technicality > 0.6) {
        personalityFactors.push('technical_detail');
        adaptationApplied.push('increased_technical_depth');
      }
    }

    const personalTouches: string[] = [];
    
    // Add relationship stage appropriate touches
    if (this.bondingMetrics) {
      switch (this.bondingMetrics.relationshipStage) {
        case 'introduction':
          personalTouches.push('introductory_approach');
          break;
        case 'developing':
          personalTouches.push('building_rapport');
          break;
        case 'established':
          personalTouches.push('familiar_tone');
          break;
        case 'deep':
          personalTouches.push('intimate_understanding');
          break;
        case 'partner':
          personalTouches.push('collaborative_partner');
          break;
      }
    }

    return {
      content: adjustedResponse,
      personality: {
        styleAdjustments: this.personalityProfile?.communicationStyle || {},
        personalTouches,
        relationshipStage: this.bondingMetrics?.relationshipStage || 'introduction',
        bondingElements: personalityFactors
      },
      personalityFactors,
      adaptationApplied,
      privacyFiltersApplied
    };
  }

  private async generateProactiveSuggestions(
    context: PersonalContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userMessage: string
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    if (!this.adaptiveSettings || this.adaptiveSettings.proactivityLevel < 0.3) {
      return suggestions; // Low proactivity, minimal suggestions
    }

    // Check for upcoming events that might need preparation
    const upcomingEvents = context.upcomingEvents
      .filter(event => event.startTime.getTime() - Date.now() < 2 * 60 * 60 * 1000) // Next 2 hours
      .slice(0, 2);

    for (const event of upcomingEvents) {
      if (event.importance > 0.6) {
        suggestions.push({
          type: 'task_reminder',
          content: `You have "${event.title}" coming up at ${event.startTime.toLocaleTimeString()}. Would you like help preparing?`,
          reasoning: 'Important upcoming event detected',
          urgency: event.importance,
          confidence: 0.8,
          timing: new Date(event.startTime.getTime() - 30 * 60 * 1000) // 30 minutes before
        });
      }
    }

    // Check for project-related suggestions
    const activeProjects = context.activeProjects.filter(p => p.priority > 0.6).slice(0, 2);
    for (const project of activeProjects) {
      if (project.blockers.length > 0) {
        suggestions.push({
          type: 'optimization',
          content: `I noticed "${project.name}" has some blockers. Would you like to discuss strategies to address them?`,
          reasoning: 'High priority project with blockers detected',
          urgency: project.priority,
          confidence: 0.7
        });
      }
    }

    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  }

  private async updateBondingMetrics(interaction: UserInteraction): Promise<void> {
    if (!this.bondingMetrics) return;

    try {
      // Update interaction counts
      this.bondingMetrics.interactionQuality.totalInteractions += 1;

      // Estimate if this was a positive interaction (simple heuristic)
      const isPositive = this.estimateInteractionPositivity(interaction);
      if (isPositive) {
        this.bondingMetrics.interactionQuality.positiveInteractions += 1;
      }

      // Gradually increase familiarity
      this.bondingMetrics.familiarity = Math.min(1, this.bondingMetrics.familiarity + 0.01);

      // Update trust based on successful interactions
      if (isPositive) {
        this.bondingMetrics.trustLevel = Math.min(1, this.bondingMetrics.trustLevel + 0.005);
      }

      // Update relationship stage based on metrics
      this.updateRelationshipStage();

      // Add shared experience if significant
      if (interaction.context.currentActivity && interaction.userMessage.length > 50) {
        const experience: SharedExperience = {
          id: uuidv4(),
          type: this.categorizeExperience(interaction),
          description: `Discussed ${interaction.context.currentActivity}`,
          context: interaction.userMessage.substring(0, 100),
          satisfaction: isPositive ? 0.8 : 0.4,
          significance: this.calculateSignificance(interaction),
          timestamp: interaction.timestamp,
          relatedTopics: [interaction.context.currentActivity || 'general']
        };

        this.bondingMetrics.sharedExperiences.push(experience);
        
        // Keep only recent experiences (last 100)
        if (this.bondingMetrics.sharedExperiences.length > 100) {
          this.bondingMetrics.sharedExperiences = this.bondingMetrics.sharedExperiences
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 100);
        }
      }

      this.bondingMetrics.updatedAt = new Date();
      await this.memoryManager.storeBondingMetrics(this.bondingMetrics);

    } catch (error) {
      this.logger.error('Error updating bonding metrics:', error);
    }
  }

  private estimateInteractionPositivity(interaction: UserInteraction): boolean {
    // Simple heuristic to estimate if interaction was positive
    const positiveIndicators = [
      interaction.userMessage.toLowerCase().includes('thank'),
      interaction.userMessage.toLowerCase().includes('great'),
      interaction.userMessage.toLowerCase().includes('perfect'),
      interaction.userMessage.toLowerCase().includes('excellent'),
      interaction.userMessage.length > 20, // Longer messages often indicate engagement
      interaction.avatarResponse.length > 50 // Substantial response suggests helpful interaction
    ];

    return positiveIndicators.filter(Boolean).length >= 2;
  }

  private updateRelationshipStage(): void {
    if (!this.bondingMetrics) return;

    const { familiarity, trustLevel, interactionQuality } = this.bondingMetrics;
    const totalInteractions = interactionQuality.totalInteractions;
    const positiveRatio = totalInteractions > 0 ? 
      interactionQuality.positiveInteractions / totalInteractions : 0;

    let newStage: RelationshipStage = 'introduction';

    if (totalInteractions > 100 && trustLevel > 0.8 && familiarity > 0.8 && positiveRatio > 0.8) {
      newStage = 'partner';
    } else if (totalInteractions > 50 && trustLevel > 0.7 && familiarity > 0.7 && positiveRatio > 0.7) {
      newStage = 'deep';
    } else if (totalInteractions > 20 && trustLevel > 0.5 && familiarity > 0.5 && positiveRatio > 0.6) {
      newStage = 'established';
    } else if (totalInteractions > 5 && trustLevel > 0.3 && familiarity > 0.3) {
      newStage = 'developing';
    }

    if (newStage !== this.bondingMetrics.relationshipStage) {
      this.logger.info(`Relationship stage evolved from ${this.bondingMetrics.relationshipStage} to ${newStage}`);
      this.bondingMetrics.relationshipStage = newStage;
    }
  }

  private categorizeExperience(interaction: UserInteraction): ExperienceType {
    const message = interaction.userMessage.toLowerCase();
    
    if (message.includes('problem') || message.includes('issue') || message.includes('error')) {
      return 'problem_solving';
    } else if (message.includes('learn') || message.includes('understand') || message.includes('explain')) {
      return 'learning';
    } else if (message.includes('create') || message.includes('design') || message.includes('build')) {
      return 'creative_collaboration';
    } else if (message.includes('decide') || message.includes('choose') || message.includes('should')) {
      return 'decision_making';
    } else if (message.includes('feel') || message.includes('stressed') || message.includes('worried')) {
      return 'emotional_support';
    } else if (message.includes('code') || message.includes('debug') || message.includes('implement')) {
      return 'technical_assistance';
    } else {
      return 'casual_conversation';
    }
  }

  private calculateSignificance(interaction: UserInteraction): number {
    // Calculate significance based on various factors
    let significance = 0.3; // Base significance

    // Length indicates depth of engagement
    if (interaction.userMessage.length > 100) significance += 0.2;
    if (interaction.avatarResponse.length > 200) significance += 0.2;

    // Complex context indicates important interaction
    if (interaction.context.activeProjects.length > 0) significance += 0.1;
    if (interaction.context.environmentType === 'work') significance += 0.1;

    // Processing time indicates complexity
    if (interaction.metadata.processingTime > 2000) significance += 0.1;

    return Math.min(1, significance);
  }

  private analyzeUserMessage(message: string): any {
    // Analyze user message for communication style insights
    return {
      length: message.length,
      complexity: this.estimateComplexity(message),
      tone: this.estimateTone(message),
      directness: this.estimateDirectness(message)
    };
  }

  private analyzeFeedbackForAdjustments(feedback: InteractionFeedback): CommunicationAdjustment[] {
    const adjustments: CommunicationAdjustment[] = [];

    if (feedback.explicit) {
      if (feedback.explicit.tone < 3) {
        adjustments.push({
          aspect: 'empathy',
          direction: 'increase',
          magnitude: 0.1,
          confidence: 0.7,
          reasoning: 'User rated tone poorly',
          appliedAt: new Date()
        });
      }

      if (feedback.explicit.helpfulness < 3) {
        adjustments.push({
          aspect: 'technicality',
          direction: 'increase',
          magnitude: 0.05,
          confidence: 0.6,
          reasoning: 'User found response not helpful enough',
          appliedAt: new Date()
        });
      }
    }

    return adjustments;
  }

  private analyzeImplicitFeedback(interaction: UserInteraction): CommunicationAdjustment[] {
    const adjustments: CommunicationAdjustment[] = [];

    // If user message is very short after a long response, they might prefer brevity
    if (interaction.userMessage.length < 20 && interaction.avatarResponse.length > 200) {
      adjustments.push({
        aspect: 'responseLength',
        direction: 'decrease',
        magnitude: 0.05,
        confidence: 0.4,
        reasoning: 'User response much shorter than avatar response',
        appliedAt: new Date()
      });
    }

    return adjustments;
  }

  private applyPersonalityAdjustments(adjustments: CommunicationAdjustment[]): void {
    if (!this.personalityProfile) return;

    for (const adjustment of adjustments) {
      const style = this.personalityProfile.communicationStyle;
      const current = style[adjustment.aspect as keyof CommunicationStyle] as number;
      
      if (typeof current === 'number') {
        const delta = adjustment.direction === 'increase' ? adjustment.magnitude : -adjustment.magnitude;
        const newValue = Math.max(0, Math.min(1, current + delta));
        (style[adjustment.aspect as keyof CommunicationStyle] as any) = newValue;
        
        this.logger.debug(`Adjusted ${adjustment.aspect} from ${current} to ${newValue}`);
      }
    }
  }

  private calculateAdjustmentConfidence(adjustments: CommunicationAdjustment[]): number {
    if (adjustments.length === 0) return 0;
    return adjustments.reduce((sum, adj) => sum + adj.confidence, 0) / adjustments.length;
  }

  private calculateConfidenceLevel(memories: any[], context: PersonalContext): number {
    // Calculate confidence based on available data
    let confidence = 0.5; // Base confidence

    // More memories = higher confidence
    confidence += Math.min(0.3, memories.length * 0.03);

    // Rich context = higher confidence
    if (context.activeProjects.length > 0) confidence += 0.1;
    if (context.recentActivities.length > 0) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private estimateComplexity(text: string): number {
    // Simple complexity estimation based on length and vocabulary
    const words = text.split(/\s+/).length;
    const avgWordLength = text.replace(/\s+/g, '').length / words;
    return Math.min(1, (words * avgWordLength) / 1000);
  }

  private estimateTone(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'excellent', 'perfect', 'wonderful', 'amazing', 'thanks'];
    const negativeWords = ['bad', 'awful', 'terrible', 'wrong', 'error', 'problem'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private estimateDirectness(text: string): number {
    // Simple heuristic for directness
    const directIndicators = text.match(/\b(need|want|should|must|will|do)\b/gi) || [];
    const questionMarks = (text.match(/\?/g) || []).length;
    const politeWords = (text.match(/\b(please|could|would|might)\b/gi) || []).length;
    
    return Math.min(1, (directIndicators.length - politeWords * 0.5 + questionMarks * 0.3) / text.split(/\s+/).length * 10);
  }

  // Getter methods for accessing current state
  getPersonalityProfile(): PersonalityProfile | null {
    return this.personalityProfile;
  }

  getBondingMetrics(): BondingMetrics | null {
    return this.bondingMetrics;
  }

  getAdaptiveSettings(): AdaptiveSettings | null {
    return this.adaptiveSettings;
  }

  getRelationshipStage(): RelationshipStage {
    return this.bondingMetrics?.relationshipStage || 'introduction';
  }

  getTrustLevel(): number {
    return this.bondingMetrics?.trustLevel || 0;
  }

  getFamiliarityLevel(): number {
    return this.bondingMetrics?.familiarity || 0;
  }

  // Web Intelligence Methods

  /**
   * Conduct web research on a topic
   * @param query - Research query
   * @param options - Research options
   * @returns Promise<string> - Research results
   */
  async conductWebResearch(
    query: string,
    options: {
      maxResults?: number;
      includeContent?: boolean;
      type?: 'research' | 'news' | 'quick';
    } = {}
  ): Promise<string> {
    try {
      if (!this.webIntelligence.isConfigured()) {
        return "I don't currently have access to web search capabilities. Please configure the SERPER_API_KEY to enable web research.";
      }

      this.logger.info(`Conducting web research for user ${this.userId}: "${query}"`);

      let result: string;
      const { type = 'research', maxResults = 3, includeContent = true } = options;

      switch (type) {
        case 'news':
          result = await this.webIntelligence.getNews(query, maxResults);
          break;
        case 'quick':
          result = await this.webIntelligence.quickResearch(query, maxResults);
          break;
        case 'research':
        default:
          if (includeContent) {
            result = await this.webIntelligence.deepResearch(query, maxResults);
          } else {
            result = await this.webIntelligence.quickResearch(query, maxResults);
          }
          break;
      }

      // Apply personality to the research presentation
      const personalizedResult = await this.personalizeWebResearchResponse(result, query);

      // Store the research interaction in memory
      await this.memoryManager.storeUserInteraction({
        id: uuidv4(),
        userId: this.userId,
        sessionId: uuidv4(),
        userMessage: `Research request: ${query}`,
        avatarResponse: personalizedResult,
        timestamp: new Date(),
        context: {
          timeOfDay: this.getTimeOfDay(),
          availabilityStatus: 'available',
          recentEvents: [],
          activeProjects: [],
          environmentType: 'work'
        },
        metadata: {
          provider: 'web_intelligence',
          model: 'serper',
          tokensUsed: 0,
          processingTime: 0,
          contextSources: ['web_search'],
          personalityVersion: 1,
          memoryRetrievals: 0
        }
      });

      this.logger.info(`Web research completed for user ${this.userId}`);
      return personalizedResult;

    } catch (error) {
      this.logger.error(`Web research failed for user ${this.userId}:`, error);
      return `I encountered an issue while researching "${query}". ${error instanceof Error ? error.message : 'Please try again later.'}`;
    }
  }

  /**
   * Parse content from a specific URL
   * @param url - URL to parse
   * @param context - Optional context for why this URL is being parsed
   * @returns Promise<string> - Parsed content
   */
  async parseWebContent(url: string, context?: string): Promise<string> {
    try {
      this.logger.info(`Parsing web content for user ${this.userId}: ${url}`);

      const result = await this.webIntelligence.parseUrl(url, context);

      // Apply personality to content presentation
      const personalizedResult = await this.personalizeContentResponse(result, url, context);

      // Store the parsed content interaction in memory
      await this.memoryManager.storeUserInteraction({
        id: uuidv4(),
        userId: this.userId,
        sessionId: uuidv4(),
        userMessage: `Parse content from: ${url}`,
        avatarResponse: personalizedResult,
        timestamp: new Date(),
        context: {
          timeOfDay: this.getTimeOfDay(),
          availabilityStatus: 'available',
          recentEvents: [],
          activeProjects: [],
          environmentType: 'work'
        },
        metadata: {
          provider: 'web_intelligence',
          model: 'cheerio',
          tokensUsed: 0,
          processingTime: 0,
          contextSources: ['web_content'],
          personalityVersion: 1,
          memoryRetrievals: 0
        }
      });

      this.logger.info(`Web content parsing completed for user ${this.userId}`);
      return personalizedResult;

    } catch (error) {
      this.logger.error(`Web content parsing failed for user ${this.userId}:`, error);
      return `I couldn't parse the content from ${url}. ${error instanceof Error ? error.message : 'Please check the URL and try again.'}`;
    }
  }

  /**
   * Get current news about a topic
   * @param topic - Topic to search for news about
   * @param maxResults - Maximum number of news results
   * @returns Promise<string> - Formatted news summary
   */
  async getCurrentNews(topic: string, maxResults: number = 5): Promise<string> {
    try {
      if (!this.webIntelligence.isConfigured()) {
        return "I don't currently have access to news search capabilities. Please configure the SERPER_API_KEY to enable news retrieval.";
      }

      this.logger.info(`Getting current news for user ${this.userId}: "${topic}"`);

      const news = await this.webIntelligence.getNews(topic, maxResults);

      // Apply personality to news presentation
      const personalizedNews = await this.personalizeNewsResponse(news, topic);

      // Store the news interaction in memory
      await this.memoryManager.storeUserInteraction({
        id: uuidv4(),
        userId: this.userId,
        sessionId: uuidv4(),
        userMessage: `News request: ${topic}`,
        avatarResponse: personalizedNews,
        timestamp: new Date(),
        context: {
          timeOfDay: this.getTimeOfDay(),
          availabilityStatus: 'available',
          recentEvents: [],
          activeProjects: [],
          environmentType: 'work'
        },
        metadata: {
          provider: 'web_intelligence',
          model: 'serper_news',
          tokensUsed: 0,
          processingTime: 0,
          contextSources: ['news_search'],
          personalityVersion: 1,
          memoryRetrievals: 0
        }
      });

      this.logger.info(`News retrieval completed for user ${this.userId}`);
      return personalizedNews;

    } catch (error) {
      this.logger.error(`News retrieval failed for user ${this.userId}:`, error);
      return `I couldn't get current news about "${topic}". ${error instanceof Error ? error.message : 'Please try again later.'}`;
    }
  }

  /**
   * Proactively suggest web research based on conversation context
   * @param conversationContext - Recent conversation context
   * @returns Promise<ProactiveSuggestion[]> - Research suggestions
   */
  async suggestWebResearch(conversationContext: string): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    try {
      // Analyze conversation for research opportunities
      const topics = this.extractResearchTopics(conversationContext);
      
      for (const topic of topics) {
        suggestions.push({
          type: 'web_research',
          content: `Would you like me to research "${topic}" for you?`,
          reasoning: this.getPersonalizedResearchReason(),
          urgency: 0.3,
          confidence: 0.7
        });
      }

      return suggestions;

    } catch (error) {
      this.logger.error(`Failed to suggest web research for user ${this.userId}:`, error);
      return [];
    }
  }

  /**
   * Personalize web research response based on user's communication style
   */
  private async personalizeWebResearchResponse(
    result: string,
    query: string
  ): Promise<string> {
    let personalizedIntro = '';
    
    if (this.personalityProfile) {
      const style = this.personalityProfile.communicationStyle;
      
      if (style.formality < 0.3) {
        personalizedIntro = `Here's what I found on "${query}":\n\n`;
      } else if (style.formality > 0.7) {
        personalizedIntro = `I have conducted research on "${query}" and found the following information:\n\n`;
      } else {
        personalizedIntro = `I researched "${query}" for you. Here are the results:\n\n`;
      }

      if (style.empathy > 0.7) {
        personalizedIntro += `I hope this information helps you with what you're working on!\n\n`;
      }
    } else {
      personalizedIntro = `Here's what I found about "${query}":\n\n`;
    }

    return personalizedIntro + result;
  }

  /**
   * Personalize content response based on user preferences
   */
  private async personalizeContentResponse(
    result: string,
    url: string,
    context?: string
  ): Promise<string> {
    let personalizedIntro = '';
    
    if (this.personalityProfile) {
      const style = this.personalityProfile.communicationStyle;
      
      if (style.formality < 0.3) {
        personalizedIntro = context
          ? `Got the content from that link (${context}):\n\n`
          : `Here's what's on that page:\n\n`;
      } else {
        personalizedIntro = context
          ? `I have parsed the content from the provided URL (${context}):\n\n`
          : `I have extracted the following content from the webpage:\n\n`;
      }
    } else {
      personalizedIntro = `Content from ${url}:\n\n`;
    }

    return personalizedIntro + result;
  }

  /**
   * Personalize news response based on user preferences
   */
  private async personalizeNewsResponse(news: string, topic: string): Promise<string> {
    let personalizedIntro = '';
    
    if (this.personalityProfile) {
      const style = this.personalityProfile.communicationStyle;
      
      if (style.formality < 0.3) {
        personalizedIntro = `Here's the latest news on "${topic}":\n\n`;
      } else {
        personalizedIntro = `I have retrieved the current news regarding "${topic}":\n\n`;
      }

      if (style.empathy > 0.7) {
        personalizedIntro += `I'll keep you updated if any significant developments occur.\n\n`;
      }
    } else {
      personalizedIntro = `Current news about "${topic}":\n\n`;
    }

    return personalizedIntro + news;
  }

  /**
   * Extract potential research topics from conversation context
   */
  private extractResearchTopics(context: string): string[] {
    const topics: string[] = [];
    
    // Simple keyword extraction for research opportunities
    const researchKeywords = [
      'what is', 'how to', 'why does', 'when did', 'where is',
      'tell me about', 'explain', 'research', 'find out', 'look up'
    ];

    const sentences = context.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase().trim();
      
      for (const keyword of researchKeywords) {
        if (lowerSentence.includes(keyword)) {
          // Extract the topic after the keyword
          const keywordIndex = lowerSentence.indexOf(keyword);
          const topicPart = sentence.substring(keywordIndex + keyword.length).trim();
          
          if (topicPart.length > 5 && topicPart.length < 100) {
            topics.push(topicPart);
          }
        }
      }
    }

    return topics.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Get personalized reason for research suggestion
   */
  private getPersonalizedResearchReason(): string {
    if (this.personalityProfile) {
      const style = this.personalityProfile.communicationStyle;
      
      if (style.formality < 0.3) {
        return `Thought you might want to know more about this!`;
      } else if (style.empathy > 0.7) {
        return `I noticed you mentioned this and thought some research might be helpful.`;
      } else {
        return `This topic appeared relevant to our conversation.`;
      }
    }
    
    return `This seems like something worth researching.`;
  }

  /**
   * Check if web intelligence is configured and available
   * @returns boolean - True if web intelligence is available
   */
  isWebIntelligenceAvailable(): boolean {
    return this.webIntelligence.isConfigured();
  }
}