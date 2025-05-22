'use client';

import React from 'react'; // Import React
import { type Message } from '../types'; // Import Message type
import ChatMessage from './ChatMessage'; // Import the new component with relative path

interface ChatComponentProps {
  messages: Message[];
  isLoading: boolean; // Keep isLoading to potentially show loading states on messages
  handleCopy: (text: string) => void;
  handleRegenerate: (messageIndex: number) => void;
}

export default function ChatComponent({
  messages,
  isLoading, // Use the prop
  handleCopy,
  handleRegenerate,
}: ChatComponentProps) {
  // No useChat hook here anymore
  // No input form state or handlers here anymore

  // Removed the outer div and form, as this component now only renders the messages list
  // The parent (ChatArea) provides the scrolling container and max-width
  return (
    <>
      {messages.length > 0 ? (
        messages.map((message, index) => (
          // Use the new ChatMessage component to render each message
          <ChatMessage
            key={message.id}
            message={message}
            index={index}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            // Pass isLoading to potentially show loading state on the last message
            // isLoading={isLoading && index === messages.length - 1} // Removed isLastMessage, adjust isLoading logic if needed in ChatMessage
          />
        ))
      ) : (
        <div className="text-center text-gray-500 py-20 pt-4">
          Start a new conversation with Nexus AI.
        </div>
      )}
      {/* Show loading indicator if a response is being generated */}
      {isLoading && (
        <div className="flex justify-center items-center p-4">
          <div className="typing-indicator"> {/* Use existing typing indicator style? */}
             <span></span>
             <span></span>
             <span></span>
          </div>
          {/* Or a simple text indicator: <span className="text-sm text-gray-500">Loading...</span> */}
        </div>
      )}
      {/* The messagesEndRef div is now managed by ChatArea */}
    </>
  );
}