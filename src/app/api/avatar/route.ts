/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getPersonalAvatarSystem, PersonalAvatarSystem } from '../../../ai/PersonalAvatarSystem';
import SimpleConfiguration from '../../../SimpleConfiguration';
import Logger from '../../../utils/Logger';

const logger = Logger.getInstance();

// Initialize the Personal Avatar System (singleton)
let systemInitialized = false;

async function ensureSystemInitialized(): Promise<PersonalAvatarSystem> {
  const system = getPersonalAvatarSystem();
  
  if (!systemInitialized && !system.isSystemInitialized()) {
    try {
      // Create a simplified configuration for the avatar system
      const config = SimpleConfiguration.getInstance();
      await system.initialize(config);
      systemInitialized = true;
      logger.info('Personal Avatar System initialized via API');
    } catch (error) {
      logger.error('Failed to initialize Personal Avatar System:', error);
      throw error;
    }
  }
  
  return system;
}

// POST /api/avatar - Create or interact with avatar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, message, sessionId, avatarConfig, feedback, interactionId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const system = await ensureSystemInitialized();

    switch (action) {
      case 'create_avatar': {
        if (!avatarConfig) {
          // Use default configuration
          const defaultConfig = PersonalAvatarSystem.createDefaultAvatarConfig(userId);
          await system.createAvatar(userId, defaultConfig);
        } else {
          await system.createAvatar(userId, avatarConfig);
        }

        return NextResponse.json({
          success: true,
          message: `Personal Avatar created for user: ${userId}`,
          hasAvatar: system.hasAvatar(userId)
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
        if (!system.hasAvatar(userId)) {
          const defaultConfig = PersonalAvatarSystem.createDefaultAvatarConfig(userId);
          await system.createAvatar(userId, defaultConfig);
        }

        const response = await system.processInteraction(userId, message, sessionId);

        return NextResponse.json({
          success: true,
          response: response.content,
          context: {
            personalityFactors: response.context.personalityFactors,
            relationshipStage: response.personality.relationshipStage,
            confidenceLevel: response.context.confidenceLevel,
            suggestions: response.suggestions?.map(s => ({
              type: s.type,
              content: s.content,
              urgency: s.urgency
            }))
          },
          metadata: {
            processingTime: response.metadata.processingTime,
            personalityVersion: response.metadata.personalityVersion,
            adaptationApplied: response.metadata.adaptationApplied
          }
        });
      }

      case 'provide_feedback': {
        if (!interactionId || !feedback) {
          return NextResponse.json(
            { error: 'Interaction ID and feedback are required' },
            { status: 400 }
          );
        }

        await system.provideFeedback(userId, interactionId, feedback);

        return NextResponse.json({
          success: true,
          message: 'Feedback processed successfully'
        });
      }

      case 'get_avatar_info': {
        const personality = await system.getAvatarPersonality(userId);
        const bonding = await system.getBondingMetrics(userId);
        const adaptive = await system.getAdaptiveSettings(userId);

        return NextResponse.json({
          success: true,
          avatar: {
            exists: system.hasAvatar(userId),
            personality: personality ? {
              communicationStyle: personality.communicationStyle,
              preferences: personality.preferences,
              traits: personality.traits,
              version: personality.version,
              lastUpdated: personality.updatedAt
            } : null,
            bonding: bonding ? {
              trustLevel: bonding.trustLevel,
              familiarity: bonding.familiarity,
              relationshipStage: bonding.relationshipStage,
              totalInteractions: bonding.interactionQuality.totalInteractions,
              positiveInteractions: bonding.interactionQuality.positiveInteractions
            } : null,
            adaptive: adaptive ? {
              proactivityLevel: adaptive.proactivityLevel,
              interventionFrequency: adaptive.interventionFrequency,
              learningRate: adaptive.learningRate,
              adaptationCount: adaptive.adaptationHistory.length
            } : null
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
    logger.error('Error in avatar API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET /api/avatar - Get system status and avatar information
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action') || 'status';

    const system = await ensureSystemInitialized();

    switch (action) {
      case 'status': {
        const stats = await system.getSystemStats();
        return NextResponse.json({
          success: true,
          system: {
            initialized: system.isSystemInitialized(),
            totalAvatars: stats.totalAvatars,
            activeAvatars: stats.activeAvatars,
            systemHealth: stats.systemHealth
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

        const hasAvatar = system.hasAvatar(userId);
        if (!hasAvatar) {
          return NextResponse.json({
            success: true,
            avatar: {
              exists: false,
              message: 'No avatar found for this user'
            }
          });
        }

        const personality = await system.getAvatarPersonality(userId);
        const bonding = await system.getBondingMetrics(userId);

        return NextResponse.json({
          success: true,
          avatar: {
            exists: true,
            relationshipStage: bonding?.relationshipStage || 'introduction',
            trustLevel: bonding?.trustLevel || 0,
            familiarity: bonding?.familiarity || 0,
            totalInteractions: bonding?.interactionQuality.totalInteractions || 0,
            communicationStyle: personality?.communicationStyle || {},
            preferences: personality?.preferences || {}
          }
        });
      }

      case 'export_data': {
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required for data export' },
            { status: 400 }
          );
        }

        const exportData = await system.exportAvatarData(userId);
        return NextResponse.json({
          success: true,
          data: exportData
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error: any) {
    logger.error('Error in avatar GET API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/avatar - Remove avatar
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

    const system = await ensureSystemInitialized();
    const removed = await system.removeAvatar(userId);

    return NextResponse.json({
      success: true,
      removed,
      message: removed 
        ? `Avatar removed for user: ${userId}` 
        : `No avatar found for user: ${userId}`
    });

  } catch (error: any) {
    logger.error('Error in avatar DELETE API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}