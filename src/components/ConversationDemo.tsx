'use client';

import React from 'react';
import { useChat } from '@/hooks/useChat/index';

const ConversationDemo: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    createNewConversation,
    switchConversation,
    renameConversation,
    duplicateConversation,
    pinConversation,
    archiveConversation,
    exportConversation
  } = useChat();

  const handleTestOperations = async () => {
    console.log('=== Conversation Demo Operations ===');
    
    // Create a new conversation
    console.log('1. Creating new conversation...');
    await createNewConversation();
    
    // List current conversations
    console.log('2. Current conversations:', conversations.length);
    conversations.forEach(conv => {
      console.log(`   - ${conv.title} (ID: ${conv.id}, Pinned: ${conv.pinned}, Archived: ${conv.archived})`);
    });

    if (conversations.length > 0) {
      const firstConv = conversations[0];
      
      // Test rename
      console.log('3. Renaming conversation...');
      await renameConversation(firstConv.id, 'Demo Conversation');
      
      // Test pin
      console.log('4. Pinning conversation...');
      await pinConversation(firstConv.id, true);
      
      // Test export
      console.log('5. Exporting conversation...');
      const exportData = await exportConversation(firstConv.id);
      console.log('   Export data:', exportData);
      
      // Test duplicate
      console.log('6. Duplicating conversation...');
      await duplicateConversation(firstConv.id);
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Conversation Management Demo
      </h3>
      
      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Current conversation: {currentConversationId || 'None'}</p>
          <p>Total conversations: {conversations.length}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={createNewConversation}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            New Conversation
          </button>
          
          <button
            onClick={handleTestOperations}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Test Operations
          </button>
          
          {conversations.length > 0 && (
            <>
              <button
                onClick={() => conversations[0] && renameConversation(conversations[0].id, `Renamed at ${new Date().toLocaleTimeString()}`)}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Rename First
              </button>
              
              <button
                onClick={() => conversations[0] && pinConversation(conversations[0].id, !conversations[0].pinned)}
                className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                Toggle Pin First
              </button>
              
              <button
                onClick={() => conversations[0] && archiveConversation(conversations[0].id, !conversations[0].archived)}
                className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
              >
                Toggle Archive First
              </button>
            </>
          )}
        </div>
        
        <div className="border-t pt-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Conversation List:
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-2 text-xs rounded cursor-pointer transition-colors ${
                  conv.id === currentConversationId
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
                onClick={() => switchConversation(conv.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {conv.pinned && <i className="fas fa-thumbtack text-blue-500 mr-1"></i>}
                    {conv.title}
                    {conv.archived && <i className="fas fa-archive text-gray-400 ml-1"></i>}
                  </span>
                  <span className="text-gray-500">
                    {new Date(conv.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {conv.tags && conv.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {conv.tags.map(tag => (
                      <span key={tag} className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-gray-500 text-center py-4">No conversations yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationDemo;