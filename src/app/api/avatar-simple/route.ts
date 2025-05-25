/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

// Simple mock implementation for demonstration
interface MockAvatar {
  userId: string;
  personality: {
    communicationStyle: {
      formality: number;
      directness: number;
      empathy: number;
      humor: number;
      technicality: number;
      responseLength: string;
      explanationDepth: string;
    };
    preferences: {
      proactivityLevel: number;
      interruptionTolerance: number;
      contextDepth: string;
      privacyLevel: string;
      learningStyle: string;
    };
    traits: {
      decisionMakingStyle: string;
      workStyle: string;
      communicationPreference: string;
      problemSolvingApproach: string;
      feedbackStyle: string;
    };
    version: number;
    lastUpdated: string;
  };
  bonding: {
    trustLevel: number;
    familiarity: number;
    relationshipStage: string;
    totalInteractions: number;
    positiveInteractions: number;
  };
  adaptive: {
    proactivityLevel: number;
    interventionFrequency: number;
    learningRate: number;
    adaptationCount: number;
  };
  interactions: Array<{
    id: string;
    message: string;
    response: string;
    timestamp: string;
  }>;
}

// In-memory storage for demo (in production, this would use a database)
const avatars = new Map<string, MockAvatar>();

function createDefaultAvatar(userId: string): MockAvatar {
  return {
    userId,
    personality: {
      communicationStyle: {
        formality: 0.5,
        directness: 0.6,
        empathy: 0.7,
        humor: 0.4,
        technicality: 0.7,
        responseLength: 'moderate',
        explanationDepth: 'moderate'
      },
      preferences: {
        proactivityLevel: 0.5,
        interruptionTolerance: 0.6,
        contextDepth: 'standard',
        privacyLevel: 'selective',
        learningStyle: 'mixed'
      },
      traits: {
        decisionMakingStyle: 'analytical',
        workStyle: 'focused',
        communicationPreference: 'conversational',
        problemSolvingApproach: 'methodical',
        feedbackStyle: 'constructive'
      },
      version: 1,
      lastUpdated: new Date().toISOString()
    },
    bonding: {
      trustLevel: 0.3,
      familiarity: 0.1,
      relationshipStage: 'introduction',
      totalInteractions: 0,
      positiveInteractions: 0
    },
    adaptive: {
      proactivityLevel: 0.5,
      interventionFrequency: 3,
      learningRate: 0.1,
      adaptationCount: 0
    },
    interactions: []
  };
}

function generateAvatarResponse(userMessage: string, avatar: MockAvatar): string {
  const { personality, bonding } = avatar;
  const style = personality.communicationStyle;
  
  // Simple response generation based on personality
  let response = "";
  
  // Analyze message type
  const message = userMessage.toLowerCase();
  
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    if (bonding.relationshipStage === 'introduction') {
      response = "Hello! I'm excited to get to know you better. This is the beginning of our journey together as I learn your preferences and become your personal AI assistant.";
    } else if (bonding.relationshipStage === 'developing') {
      response = "Hi there! I'm getting to know your style better with each conversation. How can I help you today?";
    } else {
      response = "Hey! Good to see you again. I'm here and ready to assist with whatever you need.";
    }
  } else if (message.includes('how are you') || message.includes('how do you feel')) {
    response = `I'm doing well and continuously learning about you! We're in the ${bonding.relationshipStage} stage of our relationship, and I'm ${(bonding.familiarity * 100).toFixed(0)}% familiar with your preferences.`;
  } else if (message.includes('help') || message.includes('assist')) {
    if (style.technicality > 0.6) {
      response = "I can provide technical assistance, detailed explanations, and help with complex problem-solving. What specific area would you like support with?";
    } else {
      response = "I'm here to help! What do you need assistance with today?";
    }
  } else if (message.includes('project') || message.includes('work')) {
    response = "I'd be happy to help with your projects! I can assist with planning, problem-solving, or providing insights based on what I've learned about your work style.";
  } else if (message.includes('learn') || message.includes('study')) {
    if (personality.preferences.learningStyle === 'visual') {
      response = "For learning, I can help break down concepts visually or suggest diagrams and visual aids that might help with your visual learning preference.";
    } else {
      response = "I can help you learn by providing explanations tailored to your learning style. What topic interests you?";
    }
  } else {
    // Generic response based on personality
    if (style.empathy > 0.7) {
      response = "I understand you're reaching out, and I want to make sure I give you the most helpful response possible.";
    } else if (style.directness > 0.7) {
      response = "I need a bit more context to give you the best assistance. Could you tell me more about what you're looking for?";
    } else {
      response = "That's an interesting point. I'm here to help and learn more about how you prefer to interact.";
    }
    
    // Add personality-specific touches
    if (style.humor > 0.6) {
      response += " 😊";
    }
    
    if (style.technicality > 0.7) {
      response += " I can provide detailed technical analysis if that would be helpful.";
    }
  }
  
  // Adjust formality
  if (style.formality < 0.3) {
    response = response.replace(/\bI am\b/g, "I'm").replace(/\bdo not\b/g, "don't").replace(/\bcannot\b/g, "can't");
  }
  
  return response;
}

function updateAvatarFromInteraction(avatar: MockAvatar, userMessage: string, avatarResponse: string) {
  // Simulate learning from interaction
  avatar.bonding.totalInteractions += 1;
  
  // Simple positivity detection
  const message = userMessage.toLowerCase();
  const isPositive = message.includes('thank') || message.includes('great') || message.includes('good') || message.includes('perfect');
  
  if (isPositive) {
    avatar.bonding.positiveInteractions += 1;
    avatar.bonding.trustLevel = Math.min(1, avatar.bonding.trustLevel + 0.01);
  }
  
  // Gradually increase familiarity
  avatar.bonding.familiarity = Math.min(1, avatar.bonding.familiarity + 0.02);
  
  // Update relationship stage
  const positiveRatio = avatar.bonding.totalInteractions > 0 ? 
    avatar.bonding.positiveInteractions / avatar.bonding.totalInteractions : 0;
  
  if (avatar.bonding.totalInteractions > 20 && avatar.bonding.trustLevel > 0.7 && positiveRatio > 0.7) {
    avatar.bonding.relationshipStage = 'established';
  } else if (avatar.bonding.totalInteractions > 5 && avatar.bonding.trustLevel > 0.4) {
    avatar.bonding.relationshipStage = 'developing';
  }
  
  // Store interaction
  avatar.interactions.push({
    id: Date.now().toString(),
    message: userMessage,
    response: avatarResponse,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 50 interactions
  if (avatar.interactions.length > 50) {
    avatar.interactions = avatar.interactions.slice(-50);
  }
  
  avatar.personality.lastUpdated = new Date().toISOString();
  avatar.personality.version += 1;
}

// POST /api/avatar-simple
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, message, sessionId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create_avatar': {
        const avatar = createDefaultAvatar(userId);
        avatars.set(userId, avatar);

        return NextResponse.json({
          success: true,
          message: `Personal Avatar created for user: ${userId}`,
          hasAvatar: true
        });
      }

      case 'chat': {
        if (!message || !sessionId) {
          return NextResponse.json(
            { error: 'Message and session ID are required for chat' },
            { status: 400 }
          );
        }

        // Ensure avatar exists
        if (!avatars.has(userId)) {
          const avatar = createDefaultAvatar(userId);
          avatars.set(userId, avatar);
        }

        const avatar = avatars.get(userId)!;
        const response = generateAvatarResponse(message, avatar);
        updateAvatarFromInteraction(avatar, message, response);

        return NextResponse.json({
          success: true,
          response,
          context: {
            personalityFactors: ['adaptive_communication', 'learning_engagement'],
            relationshipStage: avatar.bonding.relationshipStage,
            confidenceLevel: Math.min(1, avatar.bonding.totalInteractions * 0.1),
            suggestions: []
          },
          metadata: {
            processingTime: Math.floor(Math.random() * 500) + 200,
            personalityVersion: avatar.personality.version,
            adaptationApplied: avatar.bonding.totalInteractions > 5
          }
        });
      }

      case 'get_avatar_info': {
        const avatar = avatars.get(userId);
        
        return NextResponse.json({
          success: true,
          avatar: avatar ? {
            exists: true,
            personality: avatar.personality,
            bonding: avatar.bonding,
            adaptive: avatar.adaptive
          } : {
            exists: false,
            message: 'No avatar found for this user'
          }
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error in avatar API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET /api/avatar-simple
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action') || 'status';

    switch (action) {
      case 'status': {
        return NextResponse.json({
          success: true,
          system: {
            initialized: true,
            totalAvatars: avatars.size,
            activeAvatars: Array.from(avatars.keys()),
            systemHealth: 'healthy'
          }
        });
      }

      case 'avatar_info': {
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required for avatar info' },
            { status: 400 }
          );
        }

        const avatar = avatars.get(userId);
        if (!avatar) {
          return NextResponse.json({
            success: true,
            avatar: {
              exists: false,
              message: 'No avatar found for this user'
            }
          });
        }

        return NextResponse.json({
          success: true,
          avatar: {
            exists: true,
            relationshipStage: avatar.bonding.relationshipStage,
            trustLevel: avatar.bonding.trustLevel,
            familiarity: avatar.bonding.familiarity,
            totalInteractions: avatar.bonding.totalInteractions,
            communicationStyle: avatar.personality.communicationStyle,
            preferences: avatar.personality.preferences
          }
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error in avatar GET API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/avatar-simple
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const removed = avatars.delete(userId);

    return NextResponse.json({
      success: true,
      removed,
      message: removed 
        ? `Avatar removed for user: ${userId}` 
        : `No avatar found for user: ${userId}`
    });

  } catch (error: any) {
    console.error('Error in avatar DELETE API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}