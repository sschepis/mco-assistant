/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react'; // Remove useEffect, useRef (no longer needed for MemoryManager here)
import { useChat } from '@/hooks/useChat/index'; // Update import path for the refactored hook
// Remove MemoryManager import from client-side component: import { MemoryManager } from '@/ai/associativeMemory';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatArea from './ChatArea';
import InputArea from './InputArea';
import ModelConfigSidebar, { MemorySearchParameters } from './ModelConfigSidebar'; // Import MemorySearchParameters

interface LayoutProps {
  initialPrompt?: string;
}

const Layout: React.FC<LayoutProps> = ({ initialPrompt = '' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelConfigOpen] = useState(true); // Default open on larger screens

  // State for model configuration
  const [maxTokens, setMaxTokens] = useState(1000); // Default max_tokens
  
  // Personal Avatar AI state - always enabled
  const enableAvatarMode = true;
  const userId = 'default-user'; // Fixed user ID since system is always in personal avatar mode

  // Get state and functions from the refactored useChat hook
  const {
    messages,
    isLoading,
    sendMessage,
    handleCopy,
    handleRegenerate,
    messagesEndRef,
    // Conversation related items
    conversations,
    currentConversationId,
    createNewConversation,
    switchConversation,
    renameConversation,
    deleteConversation,
    duplicateConversation,
    pinConversation,
    archiveConversation,
    exportConversation,
    importConversation,
    // generateSmartTitle // TODO: Add UI for smart title generation
  } = useChat(initialPrompt);

  // Remove client-side MemoryManager state and initialization logic
  // const memoryManagerRef = useRef<MemoryManager | null>(null);
  // const [isMemoryManagerInitialized, setIsMemoryManagerInitialized] = useState(false);
  // useEffect(() => { ... }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Handler for InputArea's onSendMessage prop
  const handleSendMessage = (message: string, files: File[]) => {
    // Pass current config state including avatar mode to sendMessage
    // TODO: Handle file uploads properly - pass them to sendMessage
    sendMessage(message, files, {
      maxTokens,
      enableAvatarMode,
      userId
    });
  };

  // TODO: Map response length slider (0, 1, 2) to actual maxTokens values
  // Example mapping (adjust as needed):
  // const mapResponseLengthToMaxTokens = (value: number): number => {
  //   if (value === 0) return 500; // Short
  //   if (value === 1) return 1000; // Medium
  //   if (value === 2) return 2000; // Long
  //   return 1000; // Default
  // };

  // Memory search handler function calls the new API endpoint
  const handleMemorySearch = async (params: MemorySearchParameters) => {
    console.log(`Layout: Triggering memory search API with params:`, params);
    try {
      // TODO: Get session ID from context/state if needed by API
      const currentSessionId = 'default_session'; // Placeholder, ensure this is handled if API needs it

      const requestBody: any = {
        query: params.query,
        sessionId: currentSessionId, // Example: always pass session ID
      };

      if (params.filterType && params.filterType !== 'all') {
        requestBody.filterType = params.filterType;
      }
      if (params.filterDateStart) {
        requestBody.filterDateStart = params.filterDateStart;
      }
      if (params.filterDateEnd) {
        requestBody.filterDateEnd = params.filterDateEnd;
      }
      // Add other filters from params to requestBody as needed

      const response = await fetch('/api/memory/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const results = await response.json();
      console.log("Layout: Received memory search results:", results);
      // Assuming the API returns data compatible with MemorySearchResult type
      return results;

    } catch (error) {
      console.error("Error calling memory search API:", error);
      // Optionally, show an error to the user via state/toast
      return []; // Return empty array on error
    }
  };

  // Handler for exporting a conversation
  const handleExportConversation = async (id: string) => {
    try {
      const exportData = await exportConversation(id);
      if (exportData) {
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `conversation-${exportData.conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting conversation:', error);
    }
  };

  // Handler for importing a conversation
  // TODO: Add import UI button
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleImportConversation = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Basic validation
      if (!importData.conversation || !importData.messages) {
        throw new Error('Invalid conversation file format');
      }

      const newId = await importConversation(importData);
      if (newId) {
        console.log('Conversation imported successfully:', newId);
      }
    } catch (error) {
      console.error('Error importing conversation:', error);
      alert('Error importing conversation. Please check the file format.');
    }
    
    // Clear the input
    event.target.value = '';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-dark-800 text-gray-800 dark:text-white transition-colors duration-300 border-transparent dark:border-blue-600">
      {/* Pass conversation state and functions to Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={toggleSidebar}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={createNewConversation}
        onSwitchChat={switchConversation}
        onRenameConversation={renameConversation}
        onDeleteConversation={deleteConversation}
        onDuplicateConversation={duplicateConversation}
        onPinConversation={pinConversation}
        onArchiveConversation={archiveConversation}
        onExportConversation={handleExportConversation}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-800 shadow-lg dark:shadow-blue-500/20">
         {/* Pass current conversation title to Header (optional) */}
         {/* Find current conversation title */}
         {(() => { // IIFE to avoid cluttering render logic
            const currentTitle = conversations.find(c => c.id === currentConversationId)?.title || 'Chat';
            return <Header onToggleSidebar={toggleSidebar} currentChatTitle={currentTitle} />;
         })()}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-900">
            {/* Pass chat state and handlers to ChatArea */}
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              handleCopy={handleCopy}
              handleRegenerate={handleRegenerate}
              messagesEndRef={messagesEndRef as any} // Pass ref for scrolling
            />
            {/* Pass send handler and loading state to InputArea */}
            {/* Removed console.log and isReady prop */}
            <InputArea
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </main>
          {/* Pass config state and setters to ModelConfigSidebar */}
          <ModelConfigSidebar
            isOpen={isModelConfigOpen}
            maxTokens={maxTokens}
            setMaxTokens={setMaxTokens}
            onMemorySearch={handleMemorySearch}
          />
        </div>
      </div>
    </div>
  );
};

export default Layout;