// src/hooks/useChat/conversationManager.ts
'use client';

import { useCallback } from 'react';
import { type Conversation } from '@/types';
import { ChatState } from './state'; // Import state type

interface ConversationManagerProps {
    state: ChatState;
}

export function useConversationManager({ state }: ConversationManagerProps) {
    const {
        gunRef,
        setIsLoading,
        setCurrentConversationId,
        currentConversationId // Needed for switch check
    } = state;

    const createNewConversation = useCallback(async () => {
        if (!gunRef.current) {
            console.error("Gun not initialized, cannot create conversation.");
            return;
        }
        console.log("Creating new conversation...");
        setIsLoading(true); // Indicate loading while creating/switching
        const newId = Date.now().toString();
        const newConversation: Conversation = {
            id: newId,
            title: `New Chat ${new Date().toLocaleTimeString()}`, // Simple initial title
            timestamp: Date.now()
        };

        try {
            // Put the new conversation data. Gun handles persistence asynchronously.
            // We won't await a direct callback here, as it's not standard for put.
            gunRef.current!.get('chat/conversations').get(newId).put(newConversation);

            console.log("Initiated put for new conversation in Gun:", newConversation);
            // The gunService useEffect listening to conversations should pick this up eventually.
            // We proceed optimistically. Error handling might need refinement based on Gun's behavior.

            // Switch to the new conversation
            console.log(`[convManager] Setting currentConversationId to: ${newId}`); // Log before setting
            setCurrentConversationId(newId); // This will trigger message loading useEffect in gunService
        } catch (error) {
            console.error("[convManager] Error creating new conversation in Gun:", error);
        } finally {
            setIsLoading(false);
        }
    }, [gunRef, setIsLoading, setCurrentConversationId]); // Dependencies

    const switchConversation = useCallback((id: string) => {
        if (id === currentConversationId) {
            console.log("Already in conversation:", id);
            return; // No need to switch if already selected
        }
        console.log("Switching conversation to:", id);
        setCurrentConversationId(id);
        // Message loading is handled by the gunService useEffect watching currentConversationId
    }, [currentConversationId, setCurrentConversationId]); // Dependencies

    return {
        createNewConversation,
        switchConversation,
    };
}