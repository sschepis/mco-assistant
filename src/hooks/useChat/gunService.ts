// src/hooks/useChat/gunService.ts
'use client';

import { useEffect, useCallback } from 'react';
import { type Message } from '@/types'; // Remove unused Conversation import
import { getGunInstance } from '@/lib/mco/gun';
import type { IGunInstance } from '@/lib/mco/gun'; // Import type explicitly if needed elsewhere
import { ChatState } from './state'; // Import state type

// Helper to safely parse Gun data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeParseGunData = (data: any): any | null => {
    if (data === null || typeof data !== 'object') return null;
    const cleanedData = { ...data };
    delete cleanedData['_'];
    if (Object.keys(cleanedData).length === 0) return null;
    return cleanedData;
};

interface GunServiceProps {
    state: ChatState;
}

export function useGunService({ state }: GunServiceProps) {
    // Destructure needed state values and setters
    const {
        gunRef,
        setConversations,
        setMessages,
        setIsLoading,
        messageListenersRef,
        currentConversationId // <<< Restore this
    } = state;

    // --- Initialization ---
    useEffect(() => {
        let isMounted = true;
        const initGun = async () => {
            const instance = await getGunInstance();
            if (isMounted && instance) {
                gunRef.current = instance;
                // No longer setting isGunInitialized state here
                console.log('[gunService] Gun instance obtained.');
            } else if (isMounted) {
                console.error('[gunService] Failed to get Gun instance.');
            }
        };
        initGun();
        return () => { isMounted = false; }; // Cleanup mount status
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once

    // --- Conversation Loading ---
    useEffect(() => {
        if (!gunRef.current) return; // Wait for gun instance

        let isMounted = true;
        const conversationsNode = gunRef.current.get('chat/conversations');

        // Use type assertion for Gun methods & suppress specific eslint warning
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (conversationsNode as any).map().on((data: any, key: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (!isMounted) return;
            const convData = safeParseGunData(data);
            if (convData && convData.id && convData.timestamp) {
                setConversations(prev => {
                    const existingIndex = prev.findIndex(c => c.id === key);
                    const newConv = { id: key, title: convData.title || `Chat ${key}`, timestamp: convData.timestamp };
                    const updated = [...prev]; // Use const
                    if (existingIndex > -1) {
                        if (prev[existingIndex].timestamp < newConv.timestamp || prev[existingIndex].title !== newConv.title) {
                            updated[existingIndex] = newConv; // Reassignment is fine here
                        } else { return prev; } // No change
                    } else {
                        updated.push(newConv);
                    }
                    return updated.sort((a, b) => b.timestamp - a.timestamp);
                });
            } else if (data === null) {
                setConversations(prev => prev.filter(c => c.id !== key));
            }
        });

        return () => {
            isMounted = false;
            if (conversationsNode) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (conversationsNode as any).off(); // Suppress eslint warning
                console.log("Turned off conversations listener (gunService).");
            }
        };
    }, [gunRef, setConversations]); // Depend on gunRef and setter

    // --- Message Loading ---
    useEffect(() => {
        // Use the destructured currentConversationId here for dependency tracking
        if (!currentConversationId || !gunRef.current) {
            setMessages([]); // Clear messages if no conversation selected
            return;
        }

        let isMounted = true;
        const currentId = currentConversationId; // Capture current ID for this effect instance

        // Turn off previous listener
        Object.keys(messageListenersRef.current).forEach(listenerId => {
            if (listenerId !== currentId && messageListenersRef.current[listenerId]) {
                console.log(`Turning off message listener for previous convo: ${listenerId}`);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (messageListenersRef.current[listenerId] as any).off(); // Suppress eslint warning
                delete messageListenersRef.current[listenerId];
            }
        });

        // Avoid setting up listener if it already exists
        if (messageListenersRef.current[currentId]) {
            console.log(`Listener already active for convo: ${currentId}`);
            return;
        }

        console.log(`Loading messages for convo: ${currentId}`);
        setMessages([]);
        setIsLoading(true);

        const messagesNode = gunRef.current.get(`chat/conversations/${currentId}/messages`);
        messageListenersRef.current[currentId] = messagesNode as IGunInstance; // Store listener with type

        const loadedMessages: Message[] = [];
        let initialLoadComplete = false;
        const loadTimeout = setTimeout(() => {
            if (!initialLoadComplete && isMounted) {
                console.log("Message load timeout.");
                setIsLoading(false);
                initialLoadComplete = true;
            }
        }, 3000);

        // Use type assertion for Gun methods & suppress specific eslint warning
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (messagesNode as any).map().on((data: any, key: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (!isMounted) return;
            const msgData = safeParseGunData(data);
            if (msgData?.id && msgData?.role && msgData?.content) {
                const existingIndex = loadedMessages.findIndex(m => m.id === key);
                if (existingIndex === -1) loadedMessages.push(msgData as Message);
                else loadedMessages[existingIndex] = msgData as Message;

                loadedMessages.sort((a, b) => parseInt(a.id) - parseInt(b.id));
                setMessages([...loadedMessages]);

                if (!initialLoadComplete) {
                    clearTimeout(loadTimeout);
                    setIsLoading(false);
                    initialLoadComplete = true;
                }
            } else if (data === null) {
                const indexToRemove = loadedMessages.findIndex(m => m.id === key);
                if (indexToRemove > -1) {
                    loadedMessages.splice(indexToRemove, 1);
                    setMessages([...loadedMessages]);
                }
            }
        });

        // Check for empty conversation
        setTimeout(() => {
            if (isMounted && loadedMessages.length === 0 && !initialLoadComplete) {
                 // Use type assertion for Gun methods & suppress specific eslint warning
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (messagesNode as any).once((data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    if (isMounted && loadedMessages.length === 0 && !initialLoadComplete) {
                        const nodeData = safeParseGunData(data);
                        if (!nodeData || Object.keys(nodeData).length === 0) {
                            console.log(`Convo ${currentId} appears empty.`);
                            clearTimeout(loadTimeout);
                            setIsLoading(false);
                            initialLoadComplete = true;
                        }
                    }
                });
            }
        }, 500);

        return () => {
            isMounted = false;
            clearTimeout(loadTimeout);
            // Listener cleanup happens in main hook cleanup or when ID changes
        };
    // Use the destructured currentConversationId in the dependency array
    }, [currentConversationId, gunRef, messageListenersRef, setMessages, setIsLoading]);

    // --- Save Message ---
    const saveMessageToGun = useCallback((message: Message) => {
        // Access the latest currentConversationId directly from the state object
        const convId = state.currentConversationId;
        if (gunRef.current && convId) {
            try {
                console.log(`Saving message ${message.id} to Gun convo ${convId}...`);
                gunRef.current.get(`chat/conversations/${convId}/messages`).get(message.id).put(message);
            } catch (gunError) {
                console.error("Error saving message to Gun:", gunError);
            }
        } else {
            console.warn(`Gun instance (${!!gunRef.current}) or conversationId (${convId}) not available, cannot save message.`);
        }
    // Depend only on gunRef and the state object reference
    }, [gunRef, state]);

    // --- Cleanup All Listeners ---
    useEffect(() => {
        // This effect runs only once on mount to return the main cleanup function
        return () => {
            console.log("Cleaning up all Gun listeners in gunService...");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.values(messageListenersRef.current).forEach(listener => (listener as any).off()); // Suppress eslint warning
            messageListenersRef.current = {};
            // Conversation listener is cleaned up in its own effect
        };
    }, [messageListenersRef]); // Depend on the ref object itself

    return {
        saveMessageToGun
        // Expose other gun-related functions if needed (e.g., deleteConversation)
    };
}