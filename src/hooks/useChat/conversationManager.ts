// src/hooks/useChat/conversationManager.ts
'use client';

import { useCallback } from 'react';
import { type Conversation, type ConversationExport } from '@/types';
import { ChatState } from './state'; // Import state type

interface ConversationManagerProps {
    state: ChatState;
}

export function useConversationManager({ state }: ConversationManagerProps) {
    const {
        gunRef,
        setIsLoading,
        setCurrentConversationId,
        currentConversationId, // Needed for switch check
        conversations,
        messages
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
            timestamp: Date.now(),
            lastModified: Date.now(),
            messageCount: 0,
            tags: [],
            pinned: false,
            archived: false
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

    const renameConversation = useCallback(async (id: string, newTitle: string) => {
        if (!gunRef.current) {
            console.error("Gun not initialized, cannot rename conversation.");
            return false;
        }

        try {
            const conversation = conversations.find(c => c.id === id);
            if (!conversation) {
                console.error("Conversation not found:", id);
                return false;
            }

            const updatedConversation = {
                ...conversation,
                title: newTitle,
                lastModified: Date.now()
            };

            gunRef.current.get('chat/conversations').get(id).put(updatedConversation);
            console.log(`Renamed conversation ${id} to: ${newTitle}`);
            return true;
        } catch (error) {
            console.error("Error renaming conversation:", error);
            return false;
        }
    }, [gunRef, conversations]);

    const deleteConversation = useCallback(async (id: string) => {
        if (!gunRef.current) {
            console.error("Gun not initialized, cannot delete conversation.");
            return false;
        }

        try {
            // Delete conversation metadata
            gunRef.current.get('chat/conversations').get(id).put(null);
            
            // Delete all messages in the conversation
            gunRef.current.get(`chat/conversations/${id}/messages`).put(null);
            
            console.log(`Deleted conversation: ${id}`);
            
            // If we're deleting the current conversation, switch to another one or create new
            if (id === currentConversationId) {
                const remainingConversations = conversations.filter(c => c.id !== id);
                if (remainingConversations.length > 0) {
                    setCurrentConversationId(remainingConversations[0].id);
                } else {
                    // Create a new conversation if no others exist
                    await createNewConversation();
                }
            }
            
            return true;
        } catch (error) {
            console.error("Error deleting conversation:", error);
            return false;
        }
    }, [gunRef, currentConversationId, conversations, setCurrentConversationId, createNewConversation]);

    const duplicateConversation = useCallback(async (id: string) => {
        if (!gunRef.current) {
            console.error("Gun not initialized, cannot duplicate conversation.");
            return null;
        }

        try {
            const conversation = conversations.find(c => c.id === id);
            if (!conversation) {
                console.error("Conversation not found:", id);
                return null;
            }

            const newId = Date.now().toString();
            const duplicatedConversation: Conversation = {
                ...conversation,
                id: newId,
                title: `${conversation.title} (Copy)`,
                timestamp: Date.now(),
                lastModified: Date.now()
            };

            // Save the duplicated conversation
            gunRef.current.get('chat/conversations').get(newId).put(duplicatedConversation);

            // Note: This is a simplified duplication - in a real implementation,
            // you'd want to properly copy all messages from the source conversation
            // const messagesNode = gunRef.current.get(`chat/conversations/${id}/messages`);
            // const newMessagesNode = gunRef.current.get(`chat/conversations/${newId}/messages`);
            console.log(`Duplicated conversation ${id} as ${newId}`);
            
            return newId;
        } catch (error) {
            console.error("Error duplicating conversation:", error);
            return null;
        }
    }, [gunRef, conversations]);

    const updateConversationTags = useCallback(async (id: string, tags: string[]) => {
        if (!gunRef.current) {
            console.error("Gun not initialized, cannot update conversation tags.");
            return false;
        }

        try {
            const conversation = conversations.find(c => c.id === id);
            if (!conversation) {
                console.error("Conversation not found:", id);
                return false;
            }

            const updatedConversation = {
                ...conversation,
                tags,
                lastModified: Date.now()
            };

            gunRef.current.get('chat/conversations').get(id).put(updatedConversation);
            console.log(`Updated tags for conversation ${id}:`, tags);
            return true;
        } catch (error) {
            console.error("Error updating conversation tags:", error);
            return false;
        }
    }, [gunRef, conversations]);

    const pinConversation = useCallback(async (id: string, pinned: boolean) => {
        if (!gunRef.current) {
            console.error("Gun not initialized, cannot pin/unpin conversation.");
            return false;
        }

        try {
            const conversation = conversations.find(c => c.id === id);
            if (!conversation) {
                console.error("Conversation not found:", id);
                return false;
            }

            const updatedConversation = {
                ...conversation,
                pinned,
                lastModified: Date.now()
            };

            gunRef.current.get('chat/conversations').get(id).put(updatedConversation);
            console.log(`${pinned ? 'Pinned' : 'Unpinned'} conversation: ${id}`);
            return true;
        } catch (error) {
            console.error("Error pinning/unpinning conversation:", error);
            return false;
        }
    }, [gunRef, conversations]);

    const archiveConversation = useCallback(async (id: string, archived: boolean) => {
        if (!gunRef.current) {
            console.error("Gun not initialized, cannot archive/unarchive conversation.");
            return false;
        }

        try {
            const conversation = conversations.find(c => c.id === id);
            if (!conversation) {
                console.error("Conversation not found:", id);
                return false;
            }

            const updatedConversation = {
                ...conversation,
                archived,
                lastModified: Date.now()
            };

            gunRef.current.get('chat/conversations').get(id).put(updatedConversation);
            console.log(`${archived ? 'Archived' : 'Unarchived'} conversation: ${id}`);
            return true;
        } catch (error) {
            console.error("Error archiving/unarchiving conversation:", error);
            return false;
        }
    }, [gunRef, conversations]);

    const exportConversation = useCallback(async (id: string): Promise<ConversationExport | null> => {
        try {
            const conversation = conversations.find(c => c.id === id);
            if (!conversation) {
                console.error("Conversation not found:", id);
                return null;
            }

            // Get messages for this conversation (use current messages if it's the active conversation)
            const conversationMessages = id === currentConversationId ? messages : [];
            
            const exportData: ConversationExport = {
                conversation,
                messages: conversationMessages,
                exportDate: Date.now(),
                version: '1.0'
            };

            return exportData;
        } catch (error) {
            console.error("Error exporting conversation:", error);
            return null;
        }
    }, [conversations, currentConversationId, messages]);

    const importConversation = useCallback(async (exportData: ConversationExport): Promise<string | null> => {
        if (!gunRef.current) {
            console.error("Gun not initialized, cannot import conversation.");
            return null;
        }

        try {
            const newId = Date.now().toString();
            const importedConversation: Conversation = {
                ...exportData.conversation,
                id: newId,
                timestamp: Date.now(),
                lastModified: Date.now()
            };

            // Save the imported conversation
            gunRef.current.get('chat/conversations').get(newId).put(importedConversation);

            // Import all messages
            const messagesNode = gunRef.current.get(`chat/conversations/${newId}/messages`);
            exportData.messages.forEach((message) => {
                messagesNode.get(message.id).put(message);
            });

            console.log(`Imported conversation as ${newId}`);
            return newId;
        } catch (error) {
            console.error("Error importing conversation:", error);
            return null;
        }
    }, [gunRef]);

    const generateSmartTitle = useCallback(async (id: string): Promise<boolean> => {
        try {
            const conversation = conversations.find(c => c.id === id);
            if (!conversation) {
                console.error("Conversation not found:", id);
                return false;
            }

            // Get the first few messages to generate a smart title
            const conversationMessages = id === currentConversationId ? messages : [];
            if (conversationMessages.length === 0) {
                return false;
            }

            // Simple title generation based on first user message
            const firstUserMessage = conversationMessages.find(m => m.role === 'user');
            if (firstUserMessage) {
                const smartTitle = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
                return await renameConversation(id, smartTitle);
            }

            return false;
        } catch (error) {
            console.error("Error generating smart title:", error);
            return false;
        }
    }, [conversations, currentConversationId, messages, renameConversation]);

    return {
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
    };
}