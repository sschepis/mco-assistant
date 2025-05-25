/* eslint-disable @typescript-eslint/no-unused-vars */
// src/hooks/useChat/apiService.ts
'use client';

import { useCallback } from 'react'; // Import useCallback
import { type Message, type UsageInfo } from '@/types';
import { handleToolCall, handleToolCalls } from './toolHandler'; // Import both functions

// Import tool call interface definition
interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

// Define the structure for the config object passed to the API
interface ApiConfig {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    enableAvatarMode?: boolean;
    userId?: string;
}

// Define the props needed by the API service hook/functions
interface ApiServiceProps {
    // Pass specific state values and setters needed
    messages: Message[];
    setMessages: (fn: (prev: Message[]) => Message[]) => void;
    setIsLoading: (loading: boolean) => void;
    currentConversationId: string | null; // Pass the ID directly
    setCurrentConversationId: (id: string | null) => void; // <<< Add setter
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
    saveMessageToGun: (message: Message) => void; // Function to save message
}

export function useApiService({
    messages,
    setMessages,
    setIsLoading,
    currentConversationId, // Use the direct prop
    setCurrentConversationId, // <<< Get setter
    inputRef,
    saveMessageToGun
}: ApiServiceProps) {
    // No need to destructure from state object anymore for these

    // Extracted API call logic, wrapped in useCallback
    const submitMessages = useCallback(async (messagesToSend: Message[], config?: ApiConfig) => {
        // Use the currentConversationId prop (captured by useCallback)
        // No longer need to check here, server handles null ID
        // if (!currentConversationId) { ... }

        setIsLoading(true);
        const assistantMessageId = (Date.now() + 1).toString();
        let currentContent = '';
        let finalUsage: UsageInfo | null = null;
        let finalMemoryCount = 0;
        // Removed unused receivedConversationId variable

        // Add placeholder message
        const placeholderMessage: Message = { id: assistantMessageId, role: 'assistant', content: '...' };
        setMessages(prev => [...prev, placeholderMessage]);

        try {
            const requestBody = {
                messages: messagesToSend,
                conversationId: currentConversationId, // <<< Send current ID (can be null)
                ...(config?.temperature !== undefined && { temperature: config.temperature }),
                ...(config?.maxTokens !== undefined && { max_tokens: config.maxTokens }),
                ...(config?.systemPrompt !== undefined && { system_prompt: config.systemPrompt }),
                ...(config?.enableAvatarMode !== undefined && { enableAvatarMode: config.enableAvatarMode }),
                ...(config?.userId !== undefined && { userId: config.userId }),
            };
            console.log("Sending request to API with body:", requestBody);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok || !response.body) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} ${errorText}`);
            }

            // --- Stream Processing ---
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let partialData = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                const chunk = decoder.decode(value, { stream: !done });
                partialData += chunk;

                const events = partialData.split('\n\n');
                partialData = events.pop() || '';

                for (const event of events) {
                    if (event.trim() === '') continue;
                    const dataLine = event.split('\n').find(line => line.startsWith('data:'));
                    if (dataLine) {
                        const jsonData = dataLine.substring(5).trim();
                        try {
                            const parsedData = JSON.parse(jsonData);
                            if (parsedData.type === 'chunk' && parsedData.content) {
                                currentContent += parsedData.content;
                                // Update placeholder content in state
                                setMessages(prev => prev.map(msg =>
                                    msg.id === assistantMessageId ? { ...msg, content: handleToolCall(currentContent) } : msg
                                ));
                            } else if (parsedData.type === 'tool_calls' && parsedData.tool_calls) {
                                // Handle structured tool calls
                                console.log('Received tool calls:', parsedData.tool_calls);
                                // Execute tool calls
                                handleToolCalls(parsedData.tool_calls);
                                
                                // Update the message to indicate tool calls were handled
                                const toolCallsDescription = parsedData.tool_calls
                                    .filter((tc: ToolCall) => tc.function?.name === 'update_dom')
                                    .map((tc: ToolCall) => {
                                        try {
                                            const args = JSON.parse(tc.function.arguments);
                                            return `Updated content for ${args.selector}`;
                                        } catch (e) {
                                            return 'Updated page content';
                                        }
                                    })
                                    .join(', ');
                                
                                if (toolCallsDescription) {
                                    if (!currentContent) {
                                        currentContent = "I've updated the page for you.";
                                    }
                                    // Update message with a note about the tool execution
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId ? { ...msg, content: currentContent } : msg
                                    ));
                                }
                            } else if (parsedData.type === 'metadata') {
                                finalUsage = parsedData.usage ? {
                                    promptTokens: parsedData.usage.prompt_tokens,
                                    completionTokens: parsedData.usage.completion_tokens,
                                    totalTokens: parsedData.usage.total_tokens,
                                } : null;
                                finalMemoryCount = parsedData.includedMemoryCount || 0;
                                // Metadata no longer contains conversationId
                                // The conversation ID is now only managed on the client side
                                // and through the request body
                            }
                        } catch (e) { console.warn("Failed to parse SSE data line:", jsonData, e); }
                    } else { console.warn("Received SSE event without 'data:' line:", event); }
                }
            }
            // --- End Stream Processing ---

            const finalAssistantMessage: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: currentContent || "...", // Don't process with handleToolCall again
                usage: finalUsage,
                includedMemoryCount: finalMemoryCount
            };

            // *** Add Log Here ***
            console.log('[apiService] Final message object before setMessages:', JSON.stringify(finalAssistantMessage));

            // Update state with final message
            setMessages(prev => {
                const updatedMessages = prev.map(msg => msg.id === assistantMessageId ? finalAssistantMessage : msg);
                // *** Add Log Here ***
                console.log('[apiService] State after mapping final message:', JSON.stringify(updatedMessages));
                return updatedMessages;
            });

            // Save final assistant message (using the ID active when submitMessages was called)
            // If a new ID was received, subsequent saves will use it.
            saveMessageToGun(finalAssistantMessage);

        } catch (error) {
            console.error('Error processing stream or sending message:', error);
            // Update placeholder with error message
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId ? { ...msg, content: `Sorry, error processing request: ${error instanceof Error ? error.message : String(error)}` } : msg
            ));
        } finally {
            setIsLoading(false);
            // Use a short delay for focus to ensure input is ready after loading state changes
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [currentConversationId, setIsLoading, setMessages, saveMessageToGun, inputRef]); // Dependencies for submitMessages

    // Function to send message programmatically, wrapped in useCallback
    const sendMessage = useCallback(async (content: string, files?: File[], config?: ApiConfig) => {
        // Removed check for currentConversationId - server will handle null
        console.log("Sending message programmatically:", content, "Files:", files, "Config:", config);
        const userInput = content.trim();

        // TODO: Handle file uploads
        if (!userInput && (!files || files.length === 0)) {
            console.log("Empty input and no files, not sending");
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userInput,
            // attachments: ... // Add later if needed
        };

        console.log("Adding user message:", userMessage);

        // Save user message first (using the ID active when sendMessage was called)
        saveMessageToGun(userMessage);

        // Update state immediately using functional update
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        // Call the reusable submit function, passing the current messages + new user message
        // submitMessages will use the currentConversationId from its own closure/props
        await submitMessages([...messages, userMessage], config);
    }, [messages, setMessages, setIsLoading, saveMessageToGun, submitMessages]); // Dependencies for sendMessage

    // Function to handle regenerating a response, wrapped in useCallback
    const handleRegenerate = useCallback(async (messageIndex: number) => {
        console.log("Regenerating response for message index:", messageIndex);
        // Use the currentConversationId prop (captured by useCallback)
        // Keep check here, regeneration needs an existing conversation
        if (messageIndex <= 0 || !currentConversationId) {
            console.warn("Cannot regenerate: Invalid index or no active conversation.");
            return;
        }

        const historyToResend = messages.slice(0, messageIndex); // Use current messages from state
        const lastUserMessage = historyToResend.findLast(m => m.role === 'user');

        if (!lastUserMessage) {
            console.error("Could not find a user message to regenerate from.");
            return;
        }

        // Remove the assistant message being regenerated and any subsequent messages using functional update
        setMessages(() => historyToResend); // Use functional update even if just setting directly
        setIsLoading(true);

        // TODO: Decide if regeneration should reuse the original config or current config
        await submitMessages(historyToResend);
    }, [currentConversationId, messages, setMessages, setIsLoading, submitMessages]); // Dependencies for handleRegenerate

    return {
        sendMessage,
        handleRegenerate,
    };
}