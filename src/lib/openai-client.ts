import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { listMCPTools, callMCPTool, type MCPTool } from './mcp-client.js';

export interface Message {
    role: 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
    tool_call_id?: string;
}

/**
 * Convert MCP tools to OpenAI tool format
 */
function mcpToolsToOpenAITools(mcpTools: MCPTool[]): ChatCompletionTool[] {
    return mcpTools.map((tool) => ({
        type: 'function',
        function: {
            name: `mcp_${tool.name}`,
            description: tool.description,
            parameters: tool.inputSchema,
        },
    }));
}

/**
 * Create OpenAI client
 */
export function createOpenAIClient(apiKey: string): OpenAI {
    return new OpenAI({
        baseURL: 'https://api.thesys.dev/v1/embed',
        apiKey,
        dangerouslyAllowBrowser: true, // Required for client-side usage
    });
}

/**
 * Get available tools from MCP server and convert to OpenAI format
 */
export async function getAvailableTools(
    mcpServerUrl: string,
    mcpClientId: string
): Promise<ChatCompletionTool[]> {
    try {
        const mcpTools = await listMCPTools(mcpServerUrl, mcpClientId);
        return mcpToolsToOpenAITools(mcpTools);
    } catch (error) {
        console.error('Failed to fetch MCP tools:', error);
        // Return basic tools as fallback
        return [
            {
                type: 'function',
                function: {
                    name: 'list_mcp_tools',
                    description: 'List all available tools on the MCP server.',
                    parameters: { type: 'object', properties: {} },
                },
            },
            {
                type: 'function',
                function: {
                    name: 'call_mcp_tool',
                    description: 'Execute a specific tool on the MCP server.',
                    parameters: {
                        type: 'object',
                        properties: {
                            toolName: { type: 'string', description: 'The name of the tool to call.' },
                            args: { type: 'object', description: 'A JSON object of arguments for the tool.' },
                        },
                        required: ['toolName'],
                    },
                },
            },
        ];
    }
}

/**
 * Handle tool calls from OpenAI
 */
async function handleToolCalls(
    toolCalls: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>,
    mcpServerUrl: string,
    mcpClientId: string
): Promise<Message[]> {
    const toolMessages: Message[] = [];

    for (const toolCall of toolCalls) {
        try {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            let result: unknown;

            if (functionName === 'list_mcp_tools') {
                const tools = await listMCPTools(mcpServerUrl, mcpClientId);
                result = { tools };
            } else if (functionName === 'call_mcp_tool') {
                const toolName = args.toolName;
                const toolArgs = args.args || {};
                result = await callMCPTool(mcpServerUrl, mcpClientId, toolName, toolArgs);
            } else if (functionName.startsWith('mcp_')) {
                // Direct MCP tool call
                const toolName = functionName.replace('mcp_', '');
                result = await callMCPTool(mcpServerUrl, mcpClientId, toolName, args);
            } else {
                result = { error: `Unknown tool: ${functionName}` };
            }

            toolMessages.push({
                role: 'tool',
                content: JSON.stringify(result),
                tool_call_id: toolCall.id,
            });
        } catch (error) {
            toolMessages.push({
                role: 'tool',
                content: JSON.stringify({ error: String(error) }),
                tool_call_id: toolCall.id,
            });
        }
    }

    return toolMessages;
}

/**
 * Stream chat completion with tool calling support
 */
export async function* streamChatCompletion(
    openai: OpenAI,
    messages: Message[],
    mcpServerUrl: string,
    mcpClientId: string,
    tools: ChatCompletionTool[],
    maxToolCallDepth: number = 5
): AsyncGenerator<{ type: 'content' | 'tool_calls' | 'tool_result' | 'done'; data: unknown }, void, unknown> {
    if (maxToolCallDepth <= 0) {
        yield {
            type: 'done',
            data: { role: 'assistant', content: 'Maximum tool call depth reached' },
        };
        return;
    }
    const conversationMessages: ChatCompletionMessageParam[] = messages.map((msg) => {
        if (msg.role === 'tool') {
            return {
                role: 'tool',
                content: msg.content || '',
                tool_call_id: msg.tool_call_id!,
            };
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            return {
                role: 'assistant',
                content: msg.content,
                tool_calls: msg.tool_calls.map((tc) => ({
                    id: tc.id,
                    type: tc.type,
                    function: tc.function,
                })),
            };
        }
        return {
            role: msg.role,
            content: msg.content || '',
        };
    });

    const stream = await openai.chat.completions.create({
        model: 'c1/openai/gpt-5/v-20250930',
        messages: conversationMessages,
        tools: tools.length > 0 ? tools : undefined,
        stream: true,
    });

    let assistantMessage: Message = {
        role: 'assistant',
        content: '',
        tool_calls: [],
    };

    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
            assistantMessage.content = (assistantMessage.content || '') + delta.content;
            yield { type: 'content', data: delta.content };
        }

        if (delta.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;
                if (!assistantMessage.tool_calls) {
                    assistantMessage.tool_calls = [];
                }
                if (!assistantMessage.tool_calls[index]) {
                    assistantMessage.tool_calls[index] = {
                        id: toolCallDelta.id || '',
                        type: 'function',
                        function: {
                            name: '',
                            arguments: '',
                        },
                    };
                }
                if (toolCallDelta.function?.name) {
                    assistantMessage.tool_calls[index].function.name += toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                    assistantMessage.tool_calls[index].function.arguments += toolCallDelta.function.arguments;
                }
            }
            yield { type: 'tool_calls', data: assistantMessage.tool_calls };
        }
    }

    // Check if we have tool calls to execute
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        yield { type: 'done', data: assistantMessage };

        // Execute tool calls
        const toolMessages = await handleToolCalls(
            assistantMessage.tool_calls,
            mcpServerUrl,
            mcpClientId
        );

        // Yield tool messages so they can be displayed
        for (const toolMessage of toolMessages) {
            yield { type: 'tool_result', data: toolMessage };
        }

        // Recursively call with tool results
        const newMessages = [...messages, assistantMessage, ...toolMessages];
        yield* streamChatCompletion(openai, newMessages, mcpServerUrl, mcpClientId, tools, maxToolCallDepth - 1);
    } else {
        if (assistantMessage.tool_calls?.length === 0) {
            delete assistantMessage.tool_calls;
        }
        yield { type: 'done', data: assistantMessage };
    }
}

