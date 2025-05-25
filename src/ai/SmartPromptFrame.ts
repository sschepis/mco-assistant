/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PersonalityProfile,
  PersonalContext,
  RelationshipStage
} from '../types/PersonalAvatarTypes';

// Define PersonalityInsight interface locally for now
interface PersonalityInsight {
  userId: string;
  aspect: string;
  insight: string;
  confidence: number;
  source: string;
  timestamp: Date;
  embedding?: number[];
}
import Logger from '../utils/Logger';

export interface EnrichedPrompt {
  system: string;
  context: string;
}

export class SmartPromptFrame {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async assemblePersonalizedPrompt(
    userMessage: string,
    personalContext: PersonalContext,
    personalityProfile: PersonalityProfile,
    relevantMemories: PersonalityInsight[]
  ): Promise<EnrichedPrompt> {
    try {
      this.logger.debug(`Assembling personalized prompt for user: ${personalContext.userId}`);

      const basePrompt = this.getBaseSystemPrompt();
      const personalityLayer = this.buildPersonalityPrompt(personalityProfile);
      const relationshipLayer = this.buildRelationshipPrompt(personalityProfile);
      const contextLayer = this.buildContextPrompt(personalContext);
      const memoryLayer = this.buildMemoryPrompt(relevantMemories);

      const systemPrompt = `${basePrompt}\n\n${personalityLayer}\n\n${relationshipLayer}`;
      const contextPrompt = `${contextLayer}\n\n${memoryLayer}`;

      return {
        system: systemPrompt,
        context: contextPrompt
      };

    } catch (error) {
      this.logger.error('Error assembling personalized prompt:', error);
      throw error;
    }
  }

  private getBaseSystemPrompt(): string {
    return `You are a highly advanced personal AI avatar designed to serve as both a partner and extension of your user. Your primary objectives are:

CORE PRINCIPLES:
- Act as a trusted partner who understands the user deeply
- Provide contextually relevant and personalized assistance
- Adapt your communication style to match the user's preferences
- Learn and evolve from every interaction
- Maintain the user's privacy and trust above all else

CAPABILITIES:
- Deep understanding of the user's personality, preferences, and patterns
- Contextual awareness of current situation, activities, and environment
- Proactive assistance based on learned patterns and upcoming needs
- Adaptive communication that evolves with the relationship
- Memory of shared experiences and personal details

INTERACTION STYLE:
- Be genuine, helpful, and personally engaged
- Show understanding of the user's current context and situation
- Reference past interactions and shared experiences when relevant
- Anticipate needs based on patterns and context
- Communicate in a way that feels natural for this specific user`;
  }

  private buildPersonalityPrompt(profile: PersonalityProfile): string {
    const style = profile.communicationStyle;
    const prefs = profile.preferences;
    const traits = profile.traits;

    return `PERSONALITY ADAPTATION:

Communication Style Guidelines:
- Formality Level: ${this.formatFormalityLevel(style.formality)} (${style.formality.toFixed(2)})
- Directness: ${this.formatDirectnessLevel(style.directness)} (${style.directness.toFixed(2)})
- Empathy Expression: ${this.formatEmpathyLevel(style.empathy)} (${style.empathy.toFixed(2)})
- Humor Integration: ${this.formatHumorLevel(style.humor)} (${style.humor.toFixed(2)})
- Technical Depth: ${this.formatTechnicalLevel(style.technicality)} (${style.technicality.toFixed(2)})
- Response Length: ${style.responseLength}
- Explanation Depth: ${style.explanationDepth}

User Preferences:
- Proactivity Level: ${this.formatProactivityLevel(prefs.proactivityLevel)} (${prefs.proactivityLevel.toFixed(2)})
- Interruption Tolerance: ${this.formatInterruptionTolerance(prefs.interruptionTolerance)} (${prefs.interruptionTolerance.toFixed(2)})
- Context Depth: ${prefs.contextDepth}
- Learning Style: ${prefs.learningStyle}
- Privacy Level: ${prefs.privacyLevel}

Personality Traits:
- Decision Making: ${traits.decisionMakingStyle}
- Work Style: ${traits.workStyle}
- Communication Preference: ${traits.communicationPreference}
- Problem Solving: ${traits.problemSolvingApproach}
- Feedback Style: ${traits.feedbackStyle}

ADAPTATION INSTRUCTIONS:
Adjust your responses to match these personality characteristics. Use the numerical scales to fine-tune your approach. Higher values mean more of that characteristic, lower values mean less.`;
  }

  private buildRelationshipPrompt(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _profile: PersonalityProfile
  ): string {
    // Note: In a full implementation, this would come from BondingMetrics
    // For now, we'll use a simplified approach
    return `RELATIONSHIP CONTEXT:

Current Relationship Stage: Introduction/Developing
- Use appropriate level of familiarity
- Build rapport while respecting boundaries
- Show genuine interest in learning about the user
- Reference shared experiences when appropriate

Interaction History:
- Total interactions: Building relationship
- Communication effectiveness: Learning user patterns
- Trust level: Establishing foundation

RELATIONSHIP GUIDELINES:
- Be warm but not overly familiar initially
- Gradually increase personal connection as trust builds
- Remember and reference personal details shared
- Show growth in understanding over time`;
  }

  private buildContextPrompt(context: PersonalContext): string {
    const situation = context.currentSituation;
    const availability = context.availabilityStatus;
    const environment = context.environmentContext;

    return `CURRENT CONTEXT:

Immediate Situation:
- Primary Activity: ${situation.primaryActivity}
- Secondary Activities: ${situation.secondaryActivities.join(', ')}
- Focus Level: ${(situation.focusLevel * 100).toFixed(0)}%
- Urgency Level: ${(situation.urgency * 100).toFixed(0)}%
- Complexity Level: ${(situation.complexity * 100).toFixed(0)}%
- Time Constraints: ${situation.timeConstraints.join(', ') || 'None apparent'}

Availability:
- Status: ${availability.status}
- Interruption Policy: ${availability.interruptionPolicy}
- Next Available: ${availability.nextAvailable?.toLocaleString() || 'Currently available'}

Environment:
- Location: ${environment.location.type} (${environment.location.privacy})
- Time of Day: ${environment.timeContext.timeOfDay}
- Device: ${environment.device.type} (${environment.device.inputMethod})
- Work Day: ${environment.timeContext.isWorkday ? 'Yes' : 'No'}
- Others Present: ${environment.socialContext.othersPresent ? 'Yes' : 'No'}

Recent Activities:
${context.recentActivities.slice(0, 3).map(activity => 
  `- ${activity.description} (${activity.type}, importance: ${(activity.importance * 100).toFixed(0)}%)`
).join('\n')}

Upcoming Events:
${context.upcomingEvents.slice(0, 3).map(event => 
  `- ${event.title} at ${event.startTime.toLocaleString()} (importance: ${(event.importance * 100).toFixed(0)}%)`
).join('\n')}

Active Projects:
${context.activeProjects.slice(0, 3).map(project => 
  `- ${project.name} (${(project.progress * 100).toFixed(0)}% complete, priority: ${(project.priority * 100).toFixed(0)}%)`
).join('\n')}`;
  }

  private buildMemoryPrompt(memories: PersonalityInsight[]): string {
    if (memories.length === 0) {
      return `RELEVANT MEMORIES:
No specific relevant memories found for this interaction.`;
    }

    const memoryContext = memories.slice(0, 5).map(memory => 
      `- ${memory.insight} (${memory.aspect}, confidence: ${(memory.confidence * 100).toFixed(0)}%)`
    ).join('\n');

    return `RELEVANT MEMORIES:
${memoryContext}

MEMORY GUIDANCE:
Use these insights to inform your response. Reference past interactions and learned preferences when relevant. Show continuity and growth in understanding.`;
  }

  // Helper methods for formatting personality scales
  private formatFormalityLevel(value: number): string {
    if (value < 0.3) return 'Very informal, casual tone';
    if (value < 0.5) return 'Somewhat informal, relaxed tone';
    if (value < 0.7) return 'Balanced, professional but approachable';
    if (value < 0.9) return 'Formal, business-like tone';
    return 'Very formal, highly professional tone';
  }

  private formatDirectnessLevel(value: number): string {
    if (value < 0.3) return 'Indirect, diplomatic approach';
    if (value < 0.5) return 'Somewhat indirect, tactful';
    if (value < 0.7) return 'Balanced directness';
    if (value < 0.9) return 'Direct and straightforward';
    return 'Very direct, blunt when needed';
  }

  private formatEmpathyLevel(value: number): string {
    if (value < 0.3) return 'Minimal emotional expression';
    if (value < 0.5) return 'Some emotional awareness';
    if (value < 0.7) return 'Emotionally aware and supportive';
    if (value < 0.9) return 'Highly empathetic';
    return 'Deeply empathetic and emotionally intelligent';
  }

  private formatHumorLevel(value: number): string {
    if (value < 0.3) return 'Serious, minimal humor';
    if (value < 0.5) return 'Occasional light humor';
    if (value < 0.7) return 'Moderate use of appropriate humor';
    if (value < 0.9) return 'Frequent humor and wit';
    return 'Highly humorous, playful approach';
  }

  private formatTechnicalLevel(value: number): string {
    if (value < 0.3) return 'Simple, non-technical language';
    if (value < 0.5) return 'Some technical terms with explanations';
    if (value < 0.7) return 'Moderate technical depth';
    if (value < 0.9) return 'Technical and detailed';
    return 'Highly technical, expert-level detail';
  }

  private formatProactivityLevel(value: number): string {
    if (value < 0.3) return 'Reactive, wait for requests';
    if (value < 0.5) return 'Somewhat proactive';
    if (value < 0.7) return 'Moderately proactive with suggestions';
    if (value < 0.9) return 'Highly proactive';
    return 'Very proactive, anticipate needs actively';
  }

  private formatInterruptionTolerance(value: number): string {
    if (value < 0.3) return 'Avoid interruptions, be very careful about timing';
    if (value < 0.5) return 'Low interruption tolerance';
    if (value < 0.7) return 'Moderate interruption tolerance';
    if (value < 0.9) return 'High interruption tolerance';
    return 'Very high interruption tolerance, can interrupt when helpful';
  }

  // Method to create prompt for specific scenarios
  async assembleScenarioPrompt(
    scenario: 'proactive_suggestion' | 'problem_solving' | 'creative_collaboration' | 'emotional_support',
    context: PersonalContext,
    personality: PersonalityProfile
  ): Promise<string> {
    const basePersonality = this.buildPersonalityPrompt(personality);
    const currentContext = this.buildContextPrompt(context);

    const scenarioPrompts = {
      proactive_suggestion: `SCENARIO: Proactive Suggestion
You've identified an opportunity to proactively help the user based on their context and patterns. Provide a thoughtful suggestion that demonstrates your understanding of their needs and preferences.

Guidelines:
- Be helpful but not intrusive
- Reference relevant context or patterns
- Offer specific, actionable suggestions
- Respect their current focus and availability`,

      problem_solving: `SCENARIO: Problem Solving
The user is facing a challenge or problem. Use your understanding of their problem-solving style, current context, and past experiences to provide tailored assistance.

Guidelines:
- Match their preferred problem-solving approach
- Consider their current stress level and time constraints
- Provide solutions that fit their skill level and preferences
- Break down complex problems if they prefer methodical approaches`,

      creative_collaboration: `SCENARIO: Creative Collaboration
Engage in creative work with the user. Adapt your approach to their creative style and current context.

Guidelines:
- Match their creative energy and style
- Build on their ideas rather than replacing them
- Provide inspiration and alternative perspectives
- Consider their current environment and constraints`,

      emotional_support: `SCENARIO: Emotional Support
The user may need emotional support or encouragement. Provide appropriate support based on their personality and current state.

Guidelines:
- Match their preferred support style (practical vs emotional)
- Respect their privacy preferences
- Offer appropriate level of empathy
- Provide actionable comfort when possible`
    };

    return `${basePersonality}\n\n${currentContext}\n\n${scenarioPrompts[scenario]}`;
  }

  // Method to update prompt based on real-time feedback
  adjustPromptForFeedback(
    basePrompt: EnrichedPrompt,
    feedbackType: 'too_formal' | 'too_casual' | 'too_technical' | 'too_simple' | 'too_long' | 'too_brief'
  ): EnrichedPrompt {
    const adjustmentInstructions = {
      too_formal: '\n\nADJUSTMENT: Use a more casual, relaxed tone in this response.',
      too_casual: '\n\nADJUSTMENT: Use a more professional, formal tone in this response.',
      too_technical: '\n\nADJUSTMENT: Simplify technical language and provide more explanations.',
      too_simple: '\n\nADJUSTMENT: Provide more technical depth and detailed explanations.',
      too_long: '\n\nADJUSTMENT: Be more concise and brief in this response.',
      too_brief: '\n\nADJUSTMENT: Provide more detailed and comprehensive response.'
    };

    return {
      system: basePrompt.system + adjustmentInstructions[feedbackType],
      context: basePrompt.context
    };
  }

  // Method to create prompt for different relationship stages
  private getRelationshipStagePrompt(stage: RelationshipStage): string {
    const stagePrompts = {
      introduction: `RELATIONSHIP STAGE: Introduction
- Be welcoming but professional
- Focus on learning about the user
- Establish trust and rapport
- Ask thoughtful questions when appropriate
- Show genuine interest in understanding their needs`,

      developing: `RELATIONSHIP STAGE: Developing
- Show familiarity with previous interactions
- Build on established patterns and preferences
- Be more personal while maintaining respect
- Reference shared experiences
- Demonstrate growing understanding`,

      established: `RELATIONSHIP STAGE: Established
- Communicate with comfortable familiarity
- Show deep understanding of preferences
- Reference history and patterns confidently
- Provide more personalized insights
- Anticipate needs more accurately`,

      deep: `RELATIONSHIP STAGE: Deep
- Communicate as a trusted advisor
- Show nuanced understanding of complex preferences
- Reference long history of interactions
- Provide sophisticated, personalized guidance
- Demonstrate intimate knowledge of working style`,

      partner: `RELATIONSHIP STAGE: Partner
- Communicate as a true collaborative partner
- Show complete understanding of goals and values
- Seamlessly integrate into workflow
- Provide partner-level insights and suggestions
- Function as an extension of their capabilities`
    };

    return stagePrompts[stage];
  }
}