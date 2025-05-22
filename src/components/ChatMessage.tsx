// src/components/ChatMessage.tsx
'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ChatMessage.module.css';
import { type Message } from '../types'; // Import Message type with relative path
// Assuming Font Awesome is set up globally or via a different method in Next.js

interface ChatMessageProps {
  message: Message;
  index: number; // Needed for regeneration
  onCopy: (text: string) => void;
  onRegenerate: (index: number) => void;
  // Add other handlers for edit, thumbs up/down, etc. if needed
}

// Component to render message content with appropriate markdown styling
const MessageContent = ({ content }: { content: string }) => {
  return (
    <div className={styles.markdownContent}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};


const ChatMessage: React.FC<ChatMessageProps> = ({ message, index, onCopy, onRegenerate }) => {
  const isUser = message.role === 'user';
  const bubbleBg = isUser ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/30' : 'bg-gray-100 dark:bg-dark-800 border border-gray-200 dark:border-gray-800';
  const roleColor = isUser ? 'text-primary-600 dark:text-primary-400' : 'text-green-600 dark:text-green-400'; // Example AI color
  const roleName = isUser ? 'You' : 'Nexus AI'; // Example AI name, could be dynamic
  const iconClass = isUser ? 'fas fa-user' : 'fas fa-robot';
  const iconBg = isUser ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-green-200 dark:bg-green-900/30 border border-green-300 dark:border-green-800/30';
  const iconColor = isUser ? 'text-white' : 'text-green-800 dark:text-green-400';

  // TODO: Add state/handlers for edit, thumbs up/down if implementing
  // TODO: Get timestamp from message object if available

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'justify-end' : ''}`}>
      {/* Icon/Avatar (Conditional order for user) */}
      {!isUser && (
        <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center ${iconColor} flex-shrink-0`}>
          <i className={iconClass}></i> {/* Ensure Font Awesome is loaded */}
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`flex-1 max-w-[85%]`}>
        <div className={`${bubbleBg} rounded-lg p-4`}>
          {/* Message Header */}
          <div className="flex justify-between items-start mb-2">
            <p className={`font-medium ${roleColor}`}>{roleName}</p>
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button onClick={() => onCopy(message.content)} className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="Copy">
                <i className="fas fa-copy text-xs"></i> {/* Ensure Font Awesome is loaded */}
              </button>
              {isUser && (
                <button className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="Edit">
                  <i className="fas fa-edit text-xs"></i> {/* Ensure Font Awesome is loaded */}
                </button>
              )}
              {!isUser && (
                <>
                  <button onClick={() => onRegenerate(index)} className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors" title="Regenerate">
                     <i className="fas fa-sync-alt text-xs"></i> {/* Regenerate Icon */}
                  </button>
                  <button className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors" title="Good response">
                    <i className="fas fa-thumbs-up text-xs"></i> {/* Ensure Font Awesome is loaded */}
                  </button>
                  <button className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Bad response">
                    <i className="fas fa-thumbs-down text-xs"></i> {/* Ensure Font Awesome is loaded */}
                  </button>
                </>
              )}
               <button className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="More options">
                 <i className="fas fa-ellipsis text-xs"></i> {/* Ensure Font Awesome is loaded */}
               </button>
            </div>
          </div>

          {/* Message Content - Using CSS module for styling */}
          <div>
             <MessageContent content={message.content} />
          </div>

           {/* File Attachment Display (Example) */}
           {/* TODO: Get attachment info from message object */}
           {isUser && message.content.includes("financial sector") && ( // Example condition
             <div className="flex items-center space-x-2 mt-3">
               <div className="flex-shrink-0 bg-dark-700 rounded p-1 flex items-center border border-gray-700">
                 <i className="fas fa-file-pdf text-red-400 mr-1 text-xs"></i>
                 <span className="text-xs truncate text-gray-300" style={{ maxWidth: '100px' }}>market-research.pdf</span>
               </div>
             </div>
           )}

        </div>
        {/* Timestamp and Token Count */}
        <div className="text-xs text-gray-500 mt-1 text-right">
          {/* TODO: Add actual timestamp */}
          <span>Today at 12:30 PM</span>
          {!isUser && message.usage && (
            <span className="ml-2">· {message.usage.totalTokens ?? 0} tokens</span>
          )}
           {!isUser && message.includedMemoryCount !== undefined && message.includedMemoryCount > 0 && (
             <span className="ml-2">· {message.includedMemoryCount} memories</span>
           )}
        </div>
      </div>

      {/* Icon/Avatar (User) */}
      {isUser && (
        <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center ${iconColor} flex-shrink-0`}>
          <i className={iconClass}></i> {/* Ensure Font Awesome is loaded */}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;