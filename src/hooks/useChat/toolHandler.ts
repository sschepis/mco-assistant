// src/hooks/useChat/toolHandler.ts
'use client';

interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

// Handle structured tool calls properly
export const handleToolCalls = (toolCalls: ToolCall[] | undefined): void => {
    if (!toolCalls || toolCalls.length === 0) return;

    // Process each tool call
    toolCalls.forEach(toolCall => {
        if (toolCall.function?.name === 'update_dom') {
            try {
                const args = JSON.parse(toolCall.function.arguments);
                const selector = args.selector;
                const content = args.content;

                console.log(`Tool call: update_dom("${selector}", "${content}")`);

                // Execute the DOM update
                setTimeout(() => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length === 0) {
                            console.error(`No elements found with selector: ${selector}`);
                            return;
                        }

                        elements.forEach(el => {
                            // Process any JavaScript template literals in the content
                            const processedContent = content.replace(/\${([^}]*)}/g, (_match: string, expression: string) => {
                                try {
                                    // Using Function constructor to safely evaluate JavaScript expressions
                                    return new Function(`return ${expression}`)();
                                } catch (evalError) {
                                    console.error('Error evaluating JS expression:', evalError);
                                    return `[Error evaluating: ${expression}]`;
                                }
                            });
                            el.innerHTML = processedContent;
                        });

                        console.log(`Updated ${elements.length} element(s) with selector: ${selector}`);
                    } catch (error) {
                        console.error('Error executing DOM update:', error);
                    }
                }, 0);
            } catch (parseError) {
                console.error('Error parsing tool call arguments:', parseError);
            }
        }
    });
};

// For backward compatibility - process embedded tool calls in message content
export const handleToolCall = (message: string): string => {
    if (!message) return message;

    let modifiedMessage = message;

    // First try to detect and handle tool calls in structured JSON format
    try {
        // Look for tool call objects in the message
        const regex = /{[\s\S]*?"function"[\s\S]*?"name"[\s\S]*?"update_dom"[\s\S]*?}/g;
        const matches = modifiedMessage.match(regex);

        if (matches) {
            for (const match of matches) {
                try {
                    // Parse the tool call
                    const toolCallObj = JSON.parse(match);
                    if (toolCallObj.function?.name === 'update_dom') {
                        const args = JSON.parse(toolCallObj.function.arguments);
                        const selector = args.selector;
                        const content = args.content;

                        console.log(`Tool call (legacy format): update_dom("${selector}", "${content}")`);

                        // Execute the DOM update
                        setTimeout(() => {
                            try {
                                const elements = document.querySelectorAll(selector);
                                if (elements.length === 0) {
                                    console.error(`No elements found with selector: ${selector}`);
                                    return;
                                }

                                elements.forEach(el => {
                                    // Process any JavaScript template literals in the content
                                    const processedContent = content.replace(/\${([^}]*)}/g, (_match: string, expression: string) => {
                                        try {
                                            // Using Function constructor to safely evaluate JavaScript expressions
                                            return new Function(`return ${expression}`)();
                                        } catch (evalError) {
                                            console.error('Error evaluating JS expression:', evalError);
                                            return `[Error evaluating: ${expression}]`;
                                        }
                                    });
                                    el.innerHTML = processedContent;
                                });

                                console.log(`Updated ${elements.length} element(s) with selector: ${selector}`);
                            } catch (error) {
                                console.error('Error executing DOM update:', error);
                            }
                        }, 0);

                        // Remove the tool call from the message
                        modifiedMessage = modifiedMessage.replace(match, '');
                    }
                } catch (parseError) {
                    console.error('Error parsing tool call:', parseError);
                }
            }
        }
    } catch (error) {
        console.error('Error processing structured tool calls:', error);
    }

    // Remove all legacy string pattern formats that might be embedded in message content
    // These should be removed once all clients are migrated to use structured tool calls
    
    // First handle update_dom pattern
    const updateDomRegex = /\[\[update_dom\(([^,]+),\s*`([^`]+)`\)\]\]/g;
    modifiedMessage = modifiedMessage.replace(updateDomRegex, (_match, selector, value) => {
        try {
            // Clean the selector
            const cleanSelector = selector.trim().replace(/['"]/g, '');
            console.log(`Tool call (legacy pattern): update_dom("${cleanSelector}", "${value}")`);

            // Execute the DOM update on the next tick
            setTimeout(() => {
                try {
                    const elements = document.querySelectorAll(cleanSelector);
                    if (elements.length === 0) {
                        console.error(`No elements found with selector: ${cleanSelector}`);
                        return;
                    }

                    elements.forEach(el => {
                        // Process any JavaScript template literals in the content
                        const processedValue = value.replace(/\${([^}]*)}/g, (__match: string, expression: string) => {
                            try {
                                return new Function(`return ${expression}`)();
                            } catch (evalError) {
                                console.error('Error evaluating JS expression:', evalError);
                                return `[Error evaluating: ${expression}]`;
                            }
                        });
                        el.innerHTML = processedValue;
                    });

                    console.log(`Updated ${elements.length} element(s) with selector: ${cleanSelector}`);
                } catch (error) {
                    console.error('Error executing DOM update:', error);
                }
            }, 0);

            // Return empty string to remove the tool call from the message
            return '';
        } catch (error) {
            console.error('Error processing tool call:', error);
            return `[Error executing update_dom: ${error instanceof Error ? error.message : String(error)}]`;
        }
    });
    
    // Also handle bash_tool and other similar patterns
    const bashToolRegex = /\[\[bash_tool\(([^)]+)\)\]\]/g;
    modifiedMessage = modifiedMessage.replace(bashToolRegex, () => {
        console.log('Removing bash_tool pattern from message');
        return '';
    });
    
    // Generic catch-all for any remaining tool call patterns
    const genericToolRegex = /\[\[[a-zA-Z0-9_]+\([^)]*\)\]\]/g;
    modifiedMessage = modifiedMessage.replace(genericToolRegex, () => {
        console.log('Removing generic tool pattern from message');
        return '';
    });

    // Return the modified message with all tool calls removed
    return modifiedMessage;
};