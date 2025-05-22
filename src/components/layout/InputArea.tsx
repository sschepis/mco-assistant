'use client';

import styles from './InputArea.module.css'; // Import the CSS module
import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
// Assuming Font Awesome is set up globally or via a different method in Next.js

// This component will need access to the chat state (e.g., sendMessage function)
// from the useChat hook, which should be provided via props or context.
interface InputAreaProps {
  onSendMessage: (message: string, files: File[]) => void;
  isLoading?: boolean; // To disable input during generation
  // Removed isReady prop
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading = false }) => {
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // State to hold uploaded files
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!isLoading && (trimmedMessage || uploadedFiles.length > 0)) {
      onSendMessage(trimmedMessage, uploadedFiles);
      setMessage('');
      setUploadedFiles([]); // Clear files after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setUploadedFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files!)]);
      console.log('Files selected:', event.target.files);
      // TODO: Add actual file upload logic if needed immediately
      event.target.value = ''; // Reset file input
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  // --- Drag and Drop Handlers ---
  const preventDefaults = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent) => {
    preventDefaults(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    preventDefaults(e);
    // Check if the related target is outside the dropzone area
    const dropzone = e.currentTarget as HTMLElement;
    if (!dropzone.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    preventDefaults(e);
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setUploadedFiles(prevFiles => [...prevFiles, ...Array.from(files)]);
      console.log('Files dropped:', files);
      // TODO: Add actual file upload logic
    }
  };

  return (
    <div
      className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900 flex-shrink-0"
      onDragEnter={handleDragEnter} // Attach drag listeners to the outer div
    >
      <div className="max-w-4xl mx-auto relative">
        {/* File Dropzone Overlay */}
        {isDragging && (
          <div
            id="fileDropzone"
            className={`${styles.fileDropzone} rounded-lg mb-2 p-6 text-center absolute inset-0 bg-gray-50/90 dark:bg-gray-900/90 border-2 border-dashed border-primary-500 flex flex-col justify-center items-center z-10`} // Use module class + Tailwind
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragOver={preventDefaults} // Need dragOver to allow drop
          >
            <div className="max-w-md mx-auto">
              <i className="fas fa-cloud-upload-alt text-4xl text-primary-500 mb-3 animate-float"></i> {/* Ensure Font Awesome is loaded */}
              <p className="font-medium text-lg text-gray-800 dark:text-gray-100">Drop files to upload</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Supports PDF, CSV, Excel, images (max 50MB)</p>
            </div>
          </div>
        )}

        {/* File upload preview */}
        {uploadedFiles.length > 0 && (
          <div className="flex items-center space-x-2 mb-3 overflow-x-auto pb-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg p-2 flex items-center border border-gray-300 dark:border-gray-800">
                {/* Basic file icon, could be improved */}
                <i className="fas fa-file text-gray-600 dark:text-gray-400 mr-2"></i>
                <span className="text-sm truncate text-gray-800 dark:text-gray-100" style={{ maxWidth: '120px' }}>{file.name}</span>
                <button onClick={() => removeFile(index)} className="ml-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  <i className="fas fa-times text-xs"></i> {/* Ensure Font Awesome is loaded */}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end space-x-2">
          {/* Magic/Tools Button (Placeholder) */}
          <button className="flex-shrink-0 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 p-2 rounded-lg transition-colors bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-800 h-[50px] w-11 flex items-center justify-center">
            <i className="fas fa-magic"></i> {/* Ensure Font Awesome is loaded */}
          </button>

          {/* Text Input Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={isLoading ? "Waiting for response..." : "Message Nexus AI..."} // Removed isReady check
              className="w-full pr-12 pl-4 py-3 rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-900 dark:bg-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder-gray-500 text-gray-800 dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ minHeight: '50px', maxHeight: '150px' }}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onDrop={handleDrop} // Also handle drop directly on textarea
              onDragOver={preventDefaults}
              onDragEnter={preventDefaults} // Prevent default to allow drop
              disabled={isLoading} // Only disable if loading
            />
            {/* Attachment Button */}
            <div className="absolute right-2 bottom-2 flex space-x-1">
              <button
                id="uploadButton"
                onClick={handleFileButtonClick}
                className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 rounded-full transition-colors"
                aria-label="Attach file"
              >

              </button>
              <input
                type="file"
                id="fileInput"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Send Button */}
          <button
            id="sendButton"
            onClick={handleSend}
            disabled={isLoading || (!message.trim() && uploadedFiles.length === 0)} // Disable if loading or no text/files
            className="flex-shrink-0 bg-primary-600 hover:bg-primary-700 text-white w-11 h-[50px] rounded-lg flex items-center justify-center transition-all duration-200 hover:glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600 disabled:hover:glow-none"
            aria-label="Send message"
          >
            <i className="fas fa-paper-plane"></i> {/* Ensure Font Awesome is loaded */}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;