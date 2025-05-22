/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react'; // Remove useEffect, useRef (no longer needed for MemoryManager here)
import { useChat } from '@/hooks/useChat/index'; // Update import path for the refactored hook
// Remove MemoryManager import from client-side component: import { MemoryManager } from '@/ai/associativeMemory';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatArea from './ChatArea';
import InputArea from './InputArea';
import ModelConfigSidebar from './ModelConfigSidebar';

interface LayoutProps {
  initialPrompt?: string;
}

const Layout: React.FC<LayoutProps> = ({ initialPrompt = '' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelConfigOpen] = useState(true); // Default open on larger screens

  // State for model configuration
  const [temperature, setTemperature] = useState(0.7); // Default temperature
  const [maxTokens, setMaxTokens] = useState(1000); // Default max_tokens (needs mapping from Short/Medium/Long)
  const [systemPrompt, setSystemPrompt] = useState("You are an AI assistant with access to the following tools:\n\n1. Server-side tools (executed on the server):\n   - bash_tool: Executes bash commands on the server and returns the result\n     Usage: When the user asks about files, system information, or needs to run commands\n\n2. Client-side tools (executed in the user's browser):\n   - update_dom: Updates the innerHTML of DOM elements matching a CSS selector\n     Usage: [[update_dom(selector, `content`)]]\n     Example: [[update_dom(#time, `Current time: ${new Date().toLocaleTimeString()}`)]]\n     Note: This tool is processed client-side; use it for updating UI elements directly\n\nChoose the appropriate tool for each task. Use bash_tool for server operations and use update_dom for UI updates."); // Default system prompt (matches backend default)
  // TODO: Add state for other params like top_p, penalties if needed

  // Get state and functions from the refactored useChat hook
  const {
    messages,
    isLoading,
    sendMessage,
    handleCopy,
    handleRegenerate,
    messagesEndRef,
    // Conversation related items <<< ADD THESE
    conversations,
    currentConversationId,
    createNewConversation,
    switchConversation,
    // Removed isGunInitialized
  } = useChat(initialPrompt);

  // Remove client-side MemoryManager state and initialization logic
  // const memoryManagerRef = useRef<MemoryManager | null>(null);
  // const [isMemoryManagerInitialized, setIsMemoryManagerInitialized] = useState(false);
  // useEffect(() => { ... }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Handler for InputArea's onSendMessage prop
  const handleSendMessage = (message: string, files: File[]) => {
    // Pass current config state to sendMessage
    // TODO: Handle file uploads properly - pass them to sendMessage
    sendMessage(message, files, { temperature, maxTokens, systemPrompt });
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
  const handleMemorySearch = async (query: string) => {
    console.log(`Layout: Triggering memory search API for query: "${query}"`);
    try {
      // TODO: Get session ID from context/state if needed by API
      // const currentSessionId = 'default_session'; // Placeholder

      const response = await fetch('/api/memory/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          // sessionId: currentSessionId, // Include if API uses it
        }),
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
            temperature={temperature}
            setTemperature={setTemperature}
            maxTokens={maxTokens} // Pass maxTokens state
            setMaxTokens={setMaxTokens} // Pass setMaxTokens setter
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            onMemorySearch={handleMemorySearch} // Pass the search handler
            // Pass other config state/setters if added
          />
        </div>
      </div>
    </div>
  );
};

export default Layout;