import React, { useState } from 'react';

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMemorySuccess?: () => void;
}

const AddMemoryModal: React.FC<AddMemoryModalProps> = ({ isOpen, onClose, onAddMemorySuccess }) => {
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemorySource, setNewMemorySource] = useState('');
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [addMemoryStatus, setAddMemoryStatus] = useState<string | null>(null);

  const handleAddMemory = async () => {
    if (!newMemoryText.trim() || !newMemorySource.trim()) {
      setAddMemoryStatus('Please enter both memory content and source.');
      return;
    }

    setIsAddingMemory(true);
    setAddMemoryStatus(null); // Clear previous status

    try {
      const response = await fetch('/api/memory/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newMemoryText,
          source: newMemorySource,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      setAddMemoryStatus('Memory added successfully!');
      setNewMemoryText('');
      setNewMemorySource('');
      if (onAddMemorySuccess) {
        onAddMemorySuccess();
      }
      // Optionally, close modal after success
      // onClose();
    } catch (error: unknown) {
      console.error("Error adding memory:", error);
      setAddMemoryStatus(`Failed to add memory: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAddingMemory(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-800 p-6 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Add New Memory</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="modal-new-memory-text" className="block text-xs font-medium text-gray-400 mb-1">Memory Content</label>
            <textarea
              id="modal-new-memory-text"
              className="w-full bg-dark-700 border border-gray-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-200 placeholder-gray-500"
              rows={4}
              placeholder="Enter new memory content..."
              value={newMemoryText}
              onChange={(e) => setNewMemoryText(e.target.value)}
            ></textarea>
          </div>
          <div>
            <label htmlFor="modal-new-memory-source" className="block text-xs font-medium text-gray-400 mb-1">Source (e.g., &apos;user_input&apos;, &apos;manual_entry&apos;)</label>
            <input
              type="text"
              id="modal-new-memory-source"
              className="w-full bg-dark-700 border border-gray-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-200 placeholder-gray-500"
              placeholder="Enter source..."
              value={newMemorySource}
              onChange={(e) => setNewMemorySource(e.target.value)}
            />
          </div>
          <button
            onClick={handleAddMemory}
            disabled={!newMemoryText.trim() || !newMemorySource.trim() || isAddingMemory}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isAddingMemory ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fas fa-plus-circle mr-2"></i>
            )}
            Add Memory
          </button>
          {addMemoryStatus && <p className="text-xs mt-2 text-center text-gray-300">{addMemoryStatus}</p>}
        </div>
      </div>
    </div>
  );
};

export default AddMemoryModal;