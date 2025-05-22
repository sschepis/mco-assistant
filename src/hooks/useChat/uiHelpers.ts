// src/hooks/useChat/uiHelpers.ts
'use client';

import { useEffect, RefObject } from 'react';
import { Message } from '@/types'; // Assuming Message type is defined in types.ts

// Function to handle copying text to clipboard
export const handleCopy = async (text: string): Promise<void> => {
    try {
        await navigator.clipboard.writeText(text);
        console.log('Copied to clipboard!');
        // Optional: Show a temporary confirmation message (e.g., using a toast library)
    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Optional: Show an error message to the user
    }
};

// Hook to handle auto-scrolling
// Accept RefObject<HTMLDivElement | null> to match useRef(null) initialization
export function useAutoScroll(messages: Message[], messagesEndRef: RefObject<HTMLDivElement | null>): void {
    useEffect(() => {
        // Check if ref.current exists before calling scrollIntoView
        if (messagesEndRef.current) {
            // Use a small timeout to ensure the DOM has updated before scrolling
            // This helps prevent the message from disappearing after streaming
            setTimeout(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
                }
            }, 50);
        }
    }, [messages, messagesEndRef]); // Depend on messages and the ref itself
}

// Hook to handle focusing the input field
export function useFocusInput(inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>): void { // Allow textarea too
    useEffect(() => {
        // Use a short delay to ensure the input is rendered and focusable, especially after loading states change
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 100); // Adjust delay if needed
        return () => clearTimeout(timer); // Cleanup timer on unmount or re-render
    }, [inputRef]); // Depend on the ref
}

// Note: handleRegenerate is moved to apiService.ts as it triggers an API call (submitMessages)