/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Defines the structure for detailed error information within AIError.
 */
export interface AIErrorDetails {
    /** A specific error code (e.g., 'tool_not_found', 'api_timeout', 'invalid_input'). */
    code?: string;
    /** The original error object, if available. */
    originalError?: any;
    /** Additional context specific to the error type. */
    [key: string]: any; // Allow other properties
}

/**
 * Base class for errors originating from the AI assistant or its components.
 */
export class AIError extends Error {
    public details?: AIErrorDetails;

    constructor(message: string, details?: AIErrorDetails) {
        super(message);
        this.name = 'AIError';
        this.details = details;

        // Maintain stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AIError);
        }
    }
}

/**
 * Defines the structure for details specific to tool execution errors.
 */
export interface ToolExecutionErrorDetails extends AIErrorDetails {
    /** The name of the tool that failed. */
    toolName: string;
    /** The arguments provided to the tool when it failed. */
    arguments: any;
}

/**
 * Represents an error that occurred during the execution of an AI tool.
 */
export class ToolExecutionError extends AIError {
    // Override details type for stricter checking
    public details: ToolExecutionErrorDetails;

    constructor(message: string, details: ToolExecutionErrorDetails) {
        // Ensure the base AIError gets the details object as well
        super(message, details);
        this.name = 'ToolExecutionError';
        // Re-assign details to satisfy the stricter type override (super call handles the actual assignment)
        this.details = details;

        // Maintain stack trace starting from this specific error type
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ToolExecutionError);
        }
    }
}
