/* eslint-disable @typescript-eslint/no-explicit-any */

// Personal Avatar Core Types
export interface PersonalityProfile {
  userId: string;
  communicationStyle: CommunicationStyle;
  preferences: UserPreferences;
  traits: PersonalityTraits;
  decisionPatterns: DecisionPattern[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface CommunicationStyle {
  formality: number;        // 0-1 scale (informal to formal)
  directness: number;       // 0-1 scale (indirect to direct)
  empathy: number;          // 0-1 scale (low to high empathy)
  humor: number;            // 0-1 scale (serious to humorous)
  technicality: number;     // 0-1 scale (simple to technical)
  responseLength: 'brief' | 'moderate' | 'detailed';
  explanationDepth: 'high-level' | 'moderate' | 'detailed';
}

export interface UserPreferences {
  proactivityLevel: number;           // 0-1 scale (reactive to proactive)
  interruptionTolerance: number;      // 0-1 scale (low to high tolerance)
  contextDepth: 'minimal' | 'moderate' | 'comprehensive';
  privacyLevel: 'open' | 'selective' | 'private';
  learningStyle: 'visual' | 'textual' | 'interactive' | 'mixed';
  timePreferences: TimePreference[];
  topicInterests: TopicInterest[];
}

export interface PersonalityTraits {
  decisionMakingStyle: 'analytical' | 'intuitive' | 'collaborative' | 'decisive';
  workStyle: 'focused' | 'multitasking' | 'flexible' | 'structured';
  communicationPreference: 'concise' | 'detailed' | 'conversational' | 'formal';
  problemSolvingApproach: 'methodical' | 'creative' | 'collaborative' | 'experimental';
  feedbackStyle: 'direct' | 'gentle' | 'encouraging' | 'constructive';
}

export interface DecisionPattern {
  context: string;
  decision: string;
  reasoning: string;
  outcome: string;
  satisfaction: number; // 0-1 scale
  timestamp: Date;
}

export interface TimePreference {
  type: 'communication' | 'focus' | 'availability' | 'break';
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  daysOfWeek: number[]; // 0-6 (Sunday to Saturday)
  preference: number; // 0-1 scale (avoid to prefer)
}

export interface TopicInterest {
  topic: string;
  interest: number; // 0-1 scale
  expertise: number; // 0-1 scale
  lastEngaged: Date;
  engagementCount: number;
}

// Bonding and Relationship Types
export interface BondingMetrics {
  userId: string;
  trustLevel: number;                    // 0-1 scale
  familiarity: number;                   // 0-1 scale
  communicationEffectiveness: number;    // 0-1 scale
  sharedExperiences: SharedExperience[];
  interactionQuality: QualityMetrics;
  relationshipStage: RelationshipStage;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedExperience {
  id: string;
  type: ExperienceType;
  description: string;
  context: string;
  satisfaction: number; // 0-1 scale
  significance: number; // 0-1 scale
  timestamp: Date;
  relatedTopics: string[];
}

export interface QualityMetrics {
  averageResponseTime: number;
  contextAccuracy: number;      // 0-1 scale
  helpfulness: number;          // 0-1 scale
  relevance: number;            // 0-1 scale
  personalConnection: number;   // 0-1 scale
  totalInteractions: number;
  positiveInteractions: number;
  lastUpdated: Date;
}

export type RelationshipStage = 'introduction' | 'developing' | 'established' | 'deep' | 'partner';

export type ExperienceType = 
  | 'problem_solving' 
  | 'learning' 
  | 'creative_collaboration' 
  | 'decision_making' 
  | 'emotional_support' 
  | 'technical_assistance'
  | 'casual_conversation';

// Interaction and Context Types
export interface UserInteraction {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  userMessage: string;
  avatarResponse: string;
  context: InteractionContext;
  feedback?: InteractionFeedback;
  metadata: InteractionMetadata;
}

export interface InteractionContext {
  currentActivity?: string;
  location?: string;
  timeOfDay: string;
  mood?: MoodIndicator;
  availabilityStatus: AvailabilityStatus;
  recentEvents: string[];
  activeProjects: string[];
  environmentType: 'work' | 'personal' | 'mobile' | 'focus' | 'social';
}

export interface InteractionFeedback {
  explicit?: ExplicitFeedback;
  implicit?: ImplicitFeedback;
  satisfaction?: number; // 0-1 scale
  timestamp: Date;
}

export interface ExplicitFeedback {
  rating: number; // 1-5 scale
  helpfulness: number; // 1-5 scale
  accuracy: number; // 1-5 scale
  tone: number; // 1-5 scale
  comments?: string;
}

export interface ImplicitFeedback {
  responseTime: number; // milliseconds
  followUpAction: boolean;
  conversationContinued: boolean;
  topicChanged: boolean;
  requestedClarification: boolean;
}

export interface InteractionMetadata {
  provider: string;
  model: string;
  tokensUsed: number;
  processingTime: number;
  contextSources: string[];
  personalityVersion: number;
  memoryRetrievals: number;
}

export type MoodIndicator = 'energetic' | 'focused' | 'relaxed' | 'stressed' | 'creative' | 'tired' | 'neutral';

export type AvailabilityStatus = 'available' | 'busy' | 'do_not_disturb' | 'away' | 'in_meeting' | 'focused';

// Personal Context Types
export interface PersonalContext {
  userId: string;
  timestamp: Date;
  currentSituation: SituationContext;
  recentActivities: ActivityContext[];
  upcomingEvents: EventContext[];
  activeProjects: ProjectContext[];
  availabilityStatus: AvailabilityContext;
  environmentContext: EnvironmentContext;
}

export interface SituationContext {
  primaryActivity: string;
  secondaryActivities: string[];
  focusLevel: number; // 0-1 scale
  urgency: number; // 0-1 scale
  complexity: number; // 0-1 scale
  collaborators: string[];
  timeConstraints: string[];
}

export interface ActivityContext {
  type: ActivityType;
  description: string;
  startTime: Date;
  endTime?: Date;
  importance: number; // 0-1 scale
  energy: number; // 0-1 scale
  outcome?: string;
  relatedProjects: string[];
}

export interface EventContext {
  type: EventType;
  title: string;
  startTime: Date;
  endTime: Date;
  importance: number; // 0-1 scale
  preparation: string[];
  attendees: string[];
  relatedProjects: string[];
}

export interface ProjectContext {
  id: string;
  name: string;
  status: ProjectStatus;
  priority: number; // 0-1 scale
  deadline?: Date;
  progress: number; // 0-1 scale
  blockers: string[];
  recentActivity: string[];
  collaborators: string[];
}

export interface AvailabilityContext {
  status: AvailabilityStatus;
  until?: Date;
  reason?: string;
  interruptionPolicy: InterruptionPolicy;
  nextAvailable?: Date;
}

export interface EnvironmentContext {
  location: LocationContext;
  device: DeviceContext;
  timeContext: TimeContext;
  socialContext: SocialContext;
}

export interface LocationContext {
  type: 'home' | 'office' | 'mobile' | 'travel' | 'public' | 'private';
  name?: string;
  timezone: string;
  privacy: 'private' | 'semi-private' | 'public';
}

export interface DeviceContext {
  type: 'desktop' | 'laptop' | 'mobile' | 'tablet';
  capabilities: string[];
  limitations: string[];
  inputMethod: 'keyboard' | 'touch' | 'voice' | 'mixed';
}

export interface TimeContext {
  timeOfDay: 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'late_night';
  dayOfWeek: string;
  isWorkday: boolean;
  isHoliday: boolean;
  timeZone: string;
}

export interface SocialContext {
  othersPresent: boolean;
  privacyLevel: 'private' | 'semi-private' | 'public';
  socialSetting: 'work' | 'personal' | 'family' | 'friends' | 'public';
}

export type ActivityType = 
  | 'coding' 
  | 'meeting' 
  | 'research' 
  | 'writing' 
  | 'planning' 
  | 'communication' 
  | 'break' 
  | 'learning'
  | 'creative'
  | 'administrative';

export type EventType = 'meeting' | 'deadline' | 'appointment' | 'reminder' | 'break' | 'social' | 'travel';

export type ProjectStatus = 'planning' | 'active' | 'blocked' | 'review' | 'completed' | 'paused' | 'cancelled';

export type InterruptionPolicy = 'always' | 'urgent_only' | 'scheduled_only' | 'never';

// Adaptive Learning Types
export interface AdaptiveSettings {
  userId: string;
  proactivityLevel: number;           // 0-1 scale
  interventionFrequency: number;      // interventions per day
  preferredTimings: TimePreference[];
  communicationAdjustments: CommunicationAdjustment[];
  learningRate: number;               // 0-1 scale
  adaptationHistory: AdaptationEvent[];
  lastUpdated: Date;
}

export interface CommunicationAdjustment {
  aspect: keyof CommunicationStyle;
  direction: 'increase' | 'decrease';
  magnitude: number; // 0-1 scale
  confidence: number; // 0-1 scale
  reasoning: string;
  appliedAt: Date;
}

export interface AdaptationEvent {
  id: string;
  type: AdaptationType;
  trigger: string;
  adjustment: any;
  confidence: number; // 0-1 scale
  feedback?: string;
  success?: boolean;
  timestamp: Date;
}

export type AdaptationType = 
  | 'communication_style' 
  | 'proactivity_level' 
  | 'timing_preference' 
  | 'context_depth' 
  | 'intervention_frequency'
  | 'topic_interest'
  | 'response_format';

// Configuration and Setup Types
export interface PersonalAvatarConfig {
  userId: string;
  initialPersonality?: Partial<PersonalityProfile>;
  privacySettings: PrivacySettings;
  adaptationSettings: Partial<AdaptiveSettings>;
  dataSourceSettings: DataSourceSettings;
}

export interface PrivacySettings {
  dataSharing: 'none' | 'anonymized' | 'aggregate' | 'full';
  memoryRetention: 'session' | 'limited' | 'extended' | 'permanent';
  contextDepth: 'minimal' | 'standard' | 'comprehensive';
  externalIntegrations: ExternalIntegrationSettings;
  auditLevel: 'basic' | 'detailed' | 'comprehensive';
}

export interface ExternalIntegrationSettings {
  calendar: boolean;
  email: boolean;
  files: boolean;
  location: boolean;
  activity: boolean;
  communications: boolean;
  browsing: boolean;
  development: boolean;
}

export interface DataSourceSettings {
  enabledSources: DataSourceType[];
  updateFrequency: UpdateFrequency;
  privacyFilters: PrivacyFilter[];
  retentionPolicies: RetentionPolicy[];
}

export type DataSourceType = 
  | 'calendar' 
  | 'email' 
  | 'files' 
  | 'location' 
  | 'activity' 
  | 'communications' 
  | 'browsing' 
  | 'development'
  | 'social'
  | 'health'
  | 'finance';

export type UpdateFrequency = 'realtime' | 'frequent' | 'hourly' | 'daily' | 'manual';

export interface PrivacyFilter {
  sourceType: DataSourceType;
  rules: FilterRule[];
  enabled: boolean;
}

export interface FilterRule {
  type: 'exclude' | 'anonymize' | 'encrypt' | 'restrict';
  pattern: string;
  description: string;
}

export interface RetentionPolicy {
  dataType: string;
  retention: 'session' | 'day' | 'week' | 'month' | 'year' | 'permanent';
  autoDelete: boolean;
}

// Response and Output Types
export interface AvatarResponse {
  content: string;
  context: ResponseContext;
  personality: PersonalityApplication;
  suggestions?: ProactiveSuggestion[];
  actions?: AvatarAction[];
  metadata: ResponseMetadata;
}

export interface ResponseContext {
  personalContext: PersonalContext;
  relevantMemories: string[];
  personalityFactors: string[];
  adaptationApplied: string[];
  confidenceLevel: number; // 0-1 scale
}

export interface PersonalityApplication {
  styleAdjustments: Partial<CommunicationStyle>;
  personalTouches: string[];
  relationshipStage: RelationshipStage;
  bondingElements: string[];
}

export interface ProactiveSuggestion {
  type: SuggestionType;
  content: string;
  reasoning: string;
  urgency: number; // 0-1 scale
  confidence: number; // 0-1 scale
  timing?: Date;
}

export interface AvatarAction {
  type: ActionType;
  description: string;
  parameters: Record<string, any>;
  timing: 'immediate' | 'scheduled' | 'conditional';
  condition?: string;
}

export interface ResponseMetadata {
  processingTime: number;
  memoryQueries: number;
  contextSources: string[];
  personalityVersion: number;
  adaptationApplied: boolean;
  privacyFiltersApplied: string[];
}

export type SuggestionType =
  | 'task_reminder'
  | 'context_help'
  | 'learning_opportunity'
  | 'optimization'
  | 'social_connection'
  | 'health_wellness'
  | 'productivity_tip'
  | 'web_research'
  | 'news_update'
  | 'content_analysis';

export type ActionType = 
  | 'schedule_reminder' 
  | 'update_context' 
  | 'log_interaction' 
  | 'adapt_personality' 
  | 'suggest_proactively'
  | 'request_feedback'
  | 'update_preferences';