// src/app/api/chat/route.ts
import { deepseekProvider, type ToolDefinition, type ToolCall } from '@/lib/ai/models';
import { spawn } from 'child_process';
import path from 'path';
// Rely on global ReadableStream for Edge Runtime compatibility

// System message to inform the AI about available tools
const SYSTEM_MESSAGE = `
You are an AI assistant with access to the following tools:

1. Server-side tools (executed on the server):
   - bash_tool: Executes bash commands on the server and returns the result
     Usage: When the user asks about files, system information, or needs to run commands

2. Client-side tools (executed in the user's browser):
   - update_dom: Updates the innerHTML of DOM elements matching a CSS selector
     Usage: Call this tool with appropriate arguments to update DOM elements
     Example parameters: { "selector": "#time", "content": "Current time: ${new Date().toLocaleTimeString()}" }
     Note: This tool is processed client-side; use it for updating UI elements directly

Choose the appropriate tool for each task. Use bash_tool for server operations and use update_dom for UI updates.
`;

// Define our Message type for the request
interface RequestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Define the expected request body structure including config and optional conversationId
interface ChatRequestBody {
  messages: RequestMessage[];
  conversationId?: string | null; // Optional ID from client
  temperature?: number;
  max_tokens?: number;
  // top_k is not supported by the current DeepSeekProvider implementation
  // top_p?: number;
  // frequency_penalty?: number;
  // presence_penalty?: number;
  system_prompt?: string;
}

// Define types for our API communication
interface FormattedMessage {
  role: string;
  content: string; // Ensure content is always string for provider
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

// Define a type for the bash tool result
interface BashResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  error?: string;
}

// Server-side bash tool implementation from tools.json
async function executeBashCommand(command: string, workingDir?: string, timeout: number = 30000): Promise<BashResult> {
  return new Promise((resolve) => {
    try {
      const startTime = Date.now();
      const cwd = workingDir ? path.resolve(workingDir) : process.cwd();

      console.log(`Executing bash command: ${command}`);
      console.log(`Working directory: ${cwd}`);

      // Use bash to run the command to ensure full bash features
      const child = spawn('bash', ['-c', command], {
        cwd,
        env: process.env,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[STDOUT]: ${chunk}`);
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.error(`[STDERR]: ${chunk}`);
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        child.kill();
        const executionTime = Date.now() - startTime;
        resolve({
          stdout,
          stderr,
          exitCode: null,
          executionTime,
          error: `Command timed out after ${timeout}ms`
        });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const executionTime = Date.now() - startTime;

        console.log(`Command completed with exit code: ${code}`);
        console.log(`Execution time: ${executionTime}ms`);

        resolve({
          stdout,
          stderr,
          exitCode: code,
          executionTime
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        const executionTime = Date.now() - startTime;

        console.error(`Error executing command: ${err.message}`);

        resolve({
          stdout,
          stderr,
          exitCode: null,
          executionTime,
          error: err.message
        });
      });
    } catch (error) {
      console.error('Unexpected error in bash_tool:', error);
      resolve({
        stdout: '',
        stderr: '',
        exitCode: 1,
        executionTime: 0,
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
}

// Define available tools for the AI
const availableTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'bash_tool',
      description: 'Execute a bash command on the server and return the result',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The bash command to execute'
          },
          workingDir: {
            type: 'string',
            description: 'Optional working directory for the command'
          },
          timeout: {
            type: 'string',
            description: 'Optional timeout in milliseconds'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_dom',
      description: 'Updates the innerHTML of DOM elements matching a CSS selector, executed client-side',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector to target elements (e.g., "#time", ".counter")'
          },
          content: {
            type: 'string',
            description: 'HTML content to insert into the selected elements'
          }
        },
        required: ['selector', 'content']
      }
    }
  }
];

// Function to execute a tool call
async function executeToolCall(toolCall: ToolCall): Promise<string> {
  console.log(`Executing tool call: ${toolCall.function.name}`);

  if (toolCall.function.name === 'bash_tool') {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executeBashCommand(
        args.command,
        args.workingDir,
        args.timeout ? parseInt(args.timeout) : undefined
      );

      // Format the bash result as markdown
      let formattedResult = `**Command:** \`${args.command}\`\n\n`;

      if (result.stdout) {
        formattedResult += "**Output:**\n```\n" + result.stdout + "\n```\n\n";
      }

      if (result.stderr) {
        formattedResult += "**Error:**\n```\n" + result.stderr + "\n```\n\n";
      }

      if (result.error) {
        formattedResult += `**Error:** ${result.error}\n\n`;
      }

      formattedResult += `**Exit code:** ${result.exitCode !== null ? result.exitCode : 'N/A'}\n`;
      formattedResult += `**Execution time:** ${result.executionTime}ms`;

      return formattedResult;
    } catch (error) {
      console.error("Error executing bash_tool:", error);
      return `Error executing bash command: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // For client-side tools like update_dom, we just return a message and let the client handle it
  if (toolCall.function.name === 'update_dom') {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`Client-side tool call: ${toolCall.function.name}`, args);
      
      // Send the tool call directly in JSON format for the client to process
      return JSON.stringify({
        function: {
          name: 'update_dom',
          arguments: JSON.stringify(args)
        }
      });
    } catch (error) {
      console.error("Error formatting update_dom tool call:", error);
      return `Error formatting update_dom: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // For any other unimplemented tools, just log and ignore
  console.log(`Tool not implemented on server: ${toolCall.function.name}`);
  return `Tool '${toolCall.function.name}' will be processed by the client if supported`;
}

export async function POST(req: Request) {
  try {
    // Parse the request body, now expecting ChatRequestBody structure
    const requestBody: ChatRequestBody = await req.json();
    const {
      messages,
      temperature = 0.7, // Default temperature
      max_tokens = 1000, // Default max_tokens
      system_prompt = SYSTEM_MESSAGE // Default to hardcoded system message
    } = requestBody;
    let conversationId = requestBody.conversationId; // Get ID from request

    // If no conversationId is provided, generate a new one
    if (!conversationId) {
      conversationId = Date.now().toString(); // Simple ID generation
      console.log(`API Route: No conversationId provided, generated new one: ${conversationId}`);
    } else {
      console.log(`API Route: Using provided conversationId: ${conversationId}`);
    }

    console.log("API Route: Processing chat request with config:", { temperature, max_tokens });

    // Get the last user message (still needed for logging or other logic)
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();

    if (!lastUserMessage) {
      return new Response("No user message found", { status: 400 });
    }

    console.log("Last user message:", lastUserMessage.content);

    // Use the provided or default system prompt
    console.log("Using System Prompt:", system_prompt === SYSTEM_MESSAGE ? "Default" : "Custom");
    const formattedMessages: FormattedMessage[] = [
      {
        role: 'system',
        content: system_prompt // Use the system_prompt from the request or the default
      },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content || "", // Ensure content is always a string
      }))
    ];

    // Set streaming to true
    const stream = true;

    // Generate a streaming response using received or default parameters
    const streamResponse = await deepseekProvider.generateChatCompletion({
      messages: formattedMessages,
      temperature: temperature, // Use received temperature
      max_tokens: max_tokens,   // Use received max_tokens
      stream, // Set to true
      tools: availableTools,
      tool_choice: 'auto'
    });

    // Handle the stream
    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = streamResponse.getReader();
        const decoder = new TextDecoder();
        
        let firstStreamContent = ""; // Buffer for content from the first LLM stream
        const accumulatedToolCalls: ToolCall[] = [];
        let usageFromFirstStream: unknown = null; // Capture usage from the first stream
        let usageFromSecondStream: unknown = null; // Capture usage from the second stream (if any)
        
        const finalIncludedMemoryCount = 0; // Placeholder

        // --- Loop 1: Process first LLM stream ---
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
                console.log("First stream finished.");
                break; // Exit loop to process accumulated data
            }
            const chunk = decoder.decode(value, { stream: true });
            const chunkParts = chunk.split('\n').filter(p => p.trim() !== '');

            for (const part of chunkParts) {
              if (part.startsWith('data: ')) {
                const jsonData = part.substring(5).trim();
                if (jsonData === '[DONE]') {
                  console.log("First stream: Received [DONE] signal.");
                  continue;
                }
                try {
                  const jsonChunk = JSON.parse(jsonData);
                  if (jsonChunk.usage) usageFromFirstStream = jsonChunk.usage;

                  const delta = jsonChunk.choices?.[0]?.delta;
                  if (delta?.content) {
                    firstStreamContent += delta.content; // Accumulate content from first stream
                  }
                  if (delta?.tool_calls) {
                    delta.tool_calls.forEach((tc: ToolCall) => {
                      const existingCallIndex = accumulatedToolCalls.findIndex(ac => ac.id === tc.id);
                      if (existingCallIndex > -1) {
                        if (tc.function?.arguments) {
                          accumulatedToolCalls[existingCallIndex].function.arguments += tc.function.arguments;
                        }
                      } else {
                        accumulatedToolCalls.push(JSON.parse(JSON.stringify(tc)));
                      }
                    });
                  }
                } catch (parseError) {
                  console.warn("First stream: Failed to parse SSE data JSON:", jsonData, parseError);
                }
              } else if (part.trim()) {
                console.warn("First stream: Received non-SSE line:", part);
              }
            }
          }
        } catch (error) {
            console.error("Error reading from the first stream:", error);
            controller.error(error); // Propagate error to the stream
            controller.close();
            return; 
        }

        // --- Process accumulated tool calls and decide what to stream ---
        const serverSideToolCalls = accumulatedToolCalls.filter(call => call.function.name === 'bash_tool');
        const clientSideToolCalls = accumulatedToolCalls.filter(call => call.function.name === 'update_dom');
        let finalUsage = usageFromFirstStream; // Default to usage from first stream

        if (serverSideToolCalls.length > 0) {
          console.log("Handling server-side tool calls. Initial AI content (used in history):", firstStreamContent);
          
          formattedMessages.push({
            role: 'assistant',
            content: firstStreamContent || "", 
            tool_calls: serverSideToolCalls
          });

          const toolCallResults = await Promise.all(
            serverSideToolCalls.map(async (toolCall: ToolCall) => {
              const result = await executeToolCall(toolCall);
              return { tool_call_id: toolCall.id, output: result };
            })
          );

          toolCallResults.forEach(result => {
            formattedMessages.push({
              role: 'tool',
              content: result.output,
              tool_call_id: result.tool_call_id
            } as FormattedMessage);
          });

          // Make a second call to the AI
          const finalResponseStream = await deepseekProvider.generateChatCompletion({
            messages: formattedMessages,
            temperature: temperature,
            max_tokens: max_tokens,
            stream: true
            // No tools needed for the second call, as it's just generating a response based on tool results
          });

          const finalReader = finalResponseStream.getReader();
          try {
            while (true) {
              const { value: finalValue, done: finalDone } = await finalReader.read();
              if (finalDone) {
                console.log("Second stream finished.");
                break;
              }
              const finalChunk = decoder.decode(finalValue, { stream: true });
              const finalChunkParts = finalChunk.split('\n').filter(p => p.trim() !== '');
              for (const part of finalChunkParts) {
                try {
                  let jsonString = part;
                  if (part.startsWith('data:')) jsonString = part.substring(5).trim();
                  if (jsonString === '[DONE]') {
                    console.log("Second stream: Received [DONE] signal.");
                    continue;
                  }
                  
                  const jsonChunk = JSON.parse(jsonString);
                  if (jsonChunk.usage) usageFromSecondStream = jsonChunk.usage; // Capture usage from second stream
                  finalUsage = usageFromSecondStream || usageFromFirstStream; // Prioritize second stream's usage

                  const delta = jsonChunk.choices?.[0]?.delta;
                  if (delta?.content) {
                    const contentChunk = { type: 'chunk', content: delta.content };
                    controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(contentChunk) + '\n\n'));
                  }
                } catch(parseError) {
                  console.warn("Second stream: Received non-JSON chunk or parse error:", part, parseError);
                  // Optionally, if non-JSON is still considered content:
                  // const contentChunk = { type: 'chunk', content: part };
                  // controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(contentChunk) + '\n\n'));
                }
              }
            }
          } catch (error) {
            console.error("Error reading from the second stream:", error);
            controller.error(error);
            controller.close();
            return;
          }
        } else if (clientSideToolCalls.length > 0) {
          // Stream the original content if it exists
          if (firstStreamContent) {
            const contentChunk = { type: 'chunk', content: firstStreamContent };
            controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(contentChunk) + '\n\n'));
          } else { 
            // If AI only called a client tool without any preceding text, send a generic message
            const contentChunk = { type: 'chunk', content: "Okay, I'll try to update that for you." }; // Or make this more dynamic
            controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(contentChunk) + '\n\n'));
          }
          // Then send client-side tool calls
          const toolCallsChunk = { type: 'tool_calls', tool_calls: clientSideToolCalls };
          controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(toolCallsChunk) + '\n\n'));
        } else {
          // No tool calls at all, just stream the original content
          if (firstStreamContent) {
            const contentChunk = { type: 'chunk', content: firstStreamContent };
            controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(contentChunk) + '\n\n'));
          }
        }

        // Send metadata
        const metadata = {
          type: 'metadata',
          usage: finalUsage, // Use the most relevant usage info
          includedMemoryCount: finalIncludedMemoryCount
        };
        controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(metadata) + '\n\n'));
        controller.close();
      }
    });

    // Return the stream with appropriate headers for streaming JSON chunks
    return new Response(readableStream, {
      // Use text/event-stream for Server-Sent Events standard
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });

  } catch (error) {
    console.error("Error in chat completion:", error);

    // Return JSON error response
    return new Response(
      JSON.stringify({
        response: "Sorry, there was an error processing your request. Please try again.",
        error: error instanceof Error ? error.message : String(error),
        includedMemoryCount: 0 // No memories included on error
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}