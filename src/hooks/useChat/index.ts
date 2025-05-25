/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useChat/index.ts
'use client';

// Removed unused useEffect import
import { useChatState } from './state';
import { useGunService } from './gunService';
import { useApiService } from './apiService';
import { useConversationManager } from './conversationManager';
import { handleCopy, useAutoScroll, useFocusInput } from './uiHelpers';

// Main hook that orchestrates the different parts
export function useChat(initialPrompt = '') {
    // 1. Initialize State
    const state = useChatState(initialPrompt);

    // 2. Initialize Services (passing specific state values/setters)
    // Gun service initializes gunRef
    const { saveMessageToGun } = useGunService({ state });

    // Initialize API service, passing necessary props including the setter
    const { sendMessage, handleRegenerate } = useApiService({
        messages: state.messages,
        setMessages: state.setMessages,
        setIsLoading: state.setIsLoading,
        currentConversationId: state.currentConversationId, // Pass the current ID
        setCurrentConversationId: state.setCurrentConversationId, // <<< Pass setter
        inputRef: state.inputRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>, // Cast type here
        saveMessageToGun,
    });

    const {
        createNewConversation,
        switchConversation,
        renameConversation,
        deleteConversation,
        duplicateConversation,
        updateConversationTags,
        pinConversation,
        archiveConversation,
        exportConversation,
        importConversation,
        generateSmartTitle
    } = useConversationManager({ state });

    // 3. Initialize UI Helper Hooks
    useAutoScroll(state.messages, state.messagesEndRef);
    useFocusInput(state.inputRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>); // Cast ref type

    // Removed useEffect for automatic conversation creation

    // 4. Return combined interface
    return {
        // State values
        messages: state.messages,
        isLoading: state.isLoading,
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        // Removed isGunInitialized

        // Refs (if needed by consuming component)
        messagesEndRef: state.messagesEndRef,
        inputRef: state.inputRef,

        // Functions
        sendMessage,
        handleRegenerate,
        handleCopy, // Directly expose from uiHelpers
        
        // Conversation management functions
        createNewConversation,
        switchConversation,
        renameConversation,
        deleteConversation,
        duplicateConversation,
        updateConversationTags,
        pinConversation,
        archiveConversation,
        exportConversation,
        importConversation,
        generateSmartTitle,

        // Include input state if handleSubmit is still used/needed
        // input: state.input,
        // setInput: state.setInput,
    };
}

// Export the hook type
export type UseChatReturn = ReturnType<typeof useChat>;