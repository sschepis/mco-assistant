/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface AvatarInfo {
  exists: boolean;
  personality?: {
    communicationStyle: any;
    preferences: any;
    traits: any;
    version: number;
    lastUpdated: string;
  };
  bonding?: {
    trustLevel: number;
    familiarity: number;
    relationshipStage: string;
    totalInteractions: number;
    positiveInteractions: number;
  };
  adaptive?: {
    proactivityLevel: number;
    interventionFrequency: number;
    learningRate: number;
    adaptationCount: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'avatar';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export default function PersonalAvatarDemo() {
  // Fixed user ID since system is always in personal avatar mode
  const userId = 'default-user';
  const [sessionId] = useState<string>(() => uuidv4());
  const [avatarInfo, setAvatarInfo] = useState<AvatarInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load system status and avatar info on component mount
  useEffect(() => {
    loadSystemStatus();
    loadAvatarInfo();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/avatar-real?action=status');
      const data = await response.json();
      if (data.success) {
        setSystemStatus(data.system);
      }
    } catch (error) {
      console.error('Error loading system status:', error);
    }
  };

  const loadAvatarInfo = async () => {
    try {
      const response = await fetch(`/api/avatar-real?action=avatar_info&userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setAvatarInfo(data.avatar);
      }
    } catch (error) {
      console.error('Error loading avatar info:', error);
    }
  };

  const createAvatar = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/avatar-real', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_avatar',
          userId: userId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await loadAvatarInfo();
        addMessage('system', `Personal Avatar created successfully! Ready to start building a relationship.`);
      } else {
        setError(data.error || 'Failed to create avatar');
      }
    } catch (error: any) {
      setError(`Error creating avatar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);

    // Add user message to chat
    addMessage('user', userMessage);

    try {
      const response = await fetch('/api/avatar-real', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          userId: userId,
          message: userMessage,
          sessionId: sessionId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Add avatar response to chat
        addMessage('avatar', data.response, {
          personalityFactors: data.context?.personalityFactors,
          relationshipStage: data.context?.relationshipStage,
          confidenceLevel: data.context?.confidenceLevel,
          suggestions: data.context?.suggestions,
          processingTime: data.metadata?.processingTime,
          adaptationApplied: data.metadata?.adaptationApplied
        });

        // Refresh avatar info to show learning progress
        setTimeout(() => loadAvatarInfo(), 1000);
      } else {
        setError(data.error || 'Failed to send message');
        addMessage('system', `Error: ${data.error || 'Failed to send message'}`);
      }
    } catch (error: any) {
      setError(`Error sending message: ${error.message}`);
      addMessage('system', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (role: 'user' | 'avatar' | 'system', content: string, metadata?: any) => {
    const message: ChatMessage = {
      id: uuidv4(),
      role: role === 'system' ? 'avatar' : role,
      content,
      timestamp: new Date(),
      metadata
    };
    setMessages(prev => [...prev, message]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatValue = (value: number): string => {
    return (value * 100).toFixed(1) + '%';
  };

  const getRelationshipStageColor = (stage: string): string => {
    switch (stage) {
      case 'introduction': return 'text-blue-600';
      case 'developing': return 'text-green-600';
      case 'established': return 'text-purple-600';
      case 'deep': return 'text-indigo-600';
      case 'partner': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: '700',
          color: 'var(--color-text-base)',
          marginBottom: '8px'
        }}>
          Personal Avatar AI Demo
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Experience an AI that learns your personality, builds a relationship with you, and adapts to become your personal assistant and partner.
        </p>
      </div>

      {/* System Status */}
      {systemStatus && (
        <div style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'var(--color-text-base)',
            marginBottom: '16px'
          }}>
            System Status
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #e0f2fe'
            }}>
              <div style={{ color: '#0369a1', fontWeight: '500', fontSize: '0.875rem' }}>System Health</div>
              <div style={{ color: '#0284c7', fontSize: '1.5rem', fontWeight: '700', textTransform: 'capitalize' }}>
                {systemStatus.systemHealth}
              </div>
            </div>
            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #e0f2fe'
            }}>
              <div style={{ color: '#0369a1', fontWeight: '500', fontSize: '0.875rem' }}>Total Avatars</div>
              <div style={{ color: '#0284c7', fontSize: '1.5rem', fontWeight: '700' }}>
                {systemStatus.totalAvatars}
              </div>
            </div>
            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #e0f2fe'
            }}>
              <div style={{ color: '#0369a1', fontWeight: '500', fontSize: '0.875rem' }}>Initialized</div>
              <div style={{ color: '#0284c7', fontSize: '1.5rem', fontWeight: '700' }}>
                {systemStatus.initialized ? 'Yes' : 'No'}
              </div>
            </div>
            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #e0f2fe'
            }}>
              <div style={{ color: '#0369a1', fontWeight: '500', fontSize: '0.875rem' }}>Active Users</div>
              <div style={{ color: '#0284c7', fontSize: '1.5rem', fontWeight: '700' }}>
                {systemStatus.activeAvatars.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Controls */}
      {!avatarInfo?.exists && (
        <div style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'var(--color-text-base)',
            marginBottom: '16px'
          }}>
            Welcome to Your Personal Avatar
          </h2>
          <p style={{
            color: 'var(--color-text-muted)',
            marginBottom: '20px'
          }}>
            Create your AI avatar to start building a personalized relationship
          </p>
          <button
            onClick={createAvatar}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Creating...' : 'Create Your Avatar'}
          </button>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <p style={{ color: '#991b1b' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        {/* Avatar Information */}
        <div style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'var(--color-text-base)',
            marginBottom: '16px'
          }}>
            Avatar Information
          </h2>
          
          {!avatarInfo?.exists ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤖</div>
              <p style={{ color: 'var(--color-text-muted)' }}>No avatar information available</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Relationship Metrics */}
              {avatarInfo.bonding && (
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                  <h3 style={{ fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '12px' }}>
                    Relationship Status
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Stage:</span>
                      <span style={{
                        fontWeight: '500',
                        textTransform: 'capitalize',
                        color: getRelationshipStageColor(avatarInfo.bonding.relationshipStage) === 'text-blue-600' ? '#2563eb' : '#059669'
                      }}>
                        {avatarInfo.bonding.relationshipStage}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Trust Level:</span>
                      <span style={{ fontWeight: '500' }}>{formatValue(avatarInfo.bonding.trustLevel)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Familiarity:</span>
                      <span style={{ fontWeight: '500' }}>{formatValue(avatarInfo.bonding.familiarity)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Interactions:</span>
                      <span style={{ fontWeight: '500' }}>
                        {avatarInfo.bonding.positiveInteractions}/{avatarInfo.bonding.totalInteractions}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Communication Style */}
              {avatarInfo.personality && (
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                  <h3 style={{ fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '12px' }}>
                    Communication Style
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Formality:</span>
                      <span>{formatValue(avatarInfo.personality.communicationStyle.formality)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Directness:</span>
                      <span>{formatValue(avatarInfo.personality.communicationStyle.directness)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Empathy:</span>
                      <span>{formatValue(avatarInfo.personality.communicationStyle.empathy)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Technical:</span>
                      <span>{formatValue(avatarInfo.personality.communicationStyle.technicality)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Adaptive Learning */}
              {avatarInfo.adaptive && (
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                  <h3 style={{ fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '12px' }}>
                    Learning Progress
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Proactivity:</span>
                      <span>{formatValue(avatarInfo.adaptive.proactivityLevel)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Adaptations:</span>
                      <span>{avatarInfo.adaptive.adaptationCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Learning Rate:</span>
                      <span>{formatValue(avatarInfo.adaptive.learningRate)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <div style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            Chat with Your Avatar
          </h2>
          
          {/* Messages */}
          <div style={{
            height: '400px',
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            backgroundColor: '#f9fafb'
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: '#000000', fontWeight: '500' }}>Start a conversation with your avatar!</p>
                <p style={{ fontSize: '0.875rem', marginTop: '8px', color: '#333333' }}>
                  Try asking about your projects, schedule, or just say hello.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: message.role === 'user' ? '#2563eb' : 'white',
                        color: message.role === 'user' ? 'white' : '#000000',
                        border: message.role === 'user' ? 'none' : '1px solid var(--color-border)'
                      }}
                    >
                      <p style={{ fontSize: '0.875rem', margin: 0, color: message.role === 'user' ? 'white' : '#000000', fontWeight: '500' }}>{message.content}</p>
                      {message.metadata && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '0.75rem',
                          opacity: 0.75,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          {message.metadata.relationshipStage && (
                            <div>Stage: {message.metadata.relationshipStage}</div>
                          )}
                          {message.metadata.processingTime && (
                            <div>Response time: {message.metadata.processingTime}ms</div>
                          )}
                          {message.metadata.suggestions && message.metadata.suggestions.length > 0 && (
                            <div>💡 {message.metadata.suggestions.length} suggestion(s)</div>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '4px' }}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading || !avatarInfo?.exists}
              style={{
                flex: '1',
                padding: '8px 12px',
                border: '1px solid var(--color-input-border)',
                borderRadius: '6px',
                fontSize: '1rem',
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-input-text)',
                opacity: isLoading || !avatarInfo?.exists ? 0.5 : 1
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !currentMessage.trim() || !avatarInfo?.exists}
              style={{
                padding: '8px 16px',
                backgroundColor: isLoading || !currentMessage.trim() || !avatarInfo?.exists ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: isLoading || !currentMessage.trim() || !avatarInfo?.exists ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>

          {!avatarInfo?.exists && (
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginTop: '8px',
              textAlign: 'center'
            }}>
              Create an avatar first to start chatting
            </p>
          )}
        </div>
      </div>
    </div>
  );
}