'use client';

import React, { RefObject } from 'react';
import ChatComponent from '@/components/ChatComponent'; // Import the existing chat component
import { type Message } from '@/types'; // Import Message type

// Assuming Font Awesome is set up globally or via a different method in Next.js

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  handleCopy: (text: string) => void;
  handleRegenerate: (messageIndex: number) => void;
  messagesEndRef: RefObject<HTMLDivElement>;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  handleCopy,
  handleRegenerate,
  messagesEndRef,
}) => {

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-dark-900 relative text-gray-800 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-6 bg-white dark:bg-dark-900"> {/* Add padding-bottom */}
        {/* Pass all necessary props to ChatComponent */}
        <ChatComponent
          messages={messages}
          isLoading={isLoading}
          handleCopy={handleCopy}
          handleRegenerate={handleRegenerate}
          // Input handling is now done in InputArea, so don't pass input/setInput/handleSubmit
        />
        {/* Div for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatArea;