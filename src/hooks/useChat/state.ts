import { useState, useRef } from 'react';
import { type Message, type Conversation } from '@/types';
import type { IGunInstance } from '@/lib/mco/gun'; // Assuming IGunInstance is exported

export function useChatState(initialPrompt = '') {
    const [messages, setMessages] = useState<Message[]>([]);
    // Input state might be better managed within InputArea, but keep for compatibility if handleSubmit is used
    const [input, setInput] = useState(initialPrompt);
    const [isLoading, setIsLoading] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    // Removed isGunInitialized state

    // Refs remain part of the core state management
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Update inputRef type to include HTMLTextAreaElement
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const gunRef = useRef<IGunInstance | null>(null);
    const messageListenersRef = useRef<Record<string, IGunInstance>>({}); // Use IGunInstance type

    return {
        messages, setMessages,
        input, setInput, // Keep for now
        isLoading, setIsLoading,
        conversations, setConversations,
        currentConversationId, setCurrentConversationId,
        // Removed isGunInitialized from return
        messagesEndRef,
        inputRef,
        gunRef,
        messageListenersRef,
    };
}

// Define the type for the state returned by the hook
export type ChatState = ReturnType<typeof useChatState>;