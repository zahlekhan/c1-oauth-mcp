import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatMessages } from '@/components/ChatMessages';
import { ChatInput } from '@/components/ChatInput';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AuthCallback } from '@/components/AuthCallback';
import { createOpenAIClient, getAvailableTools, streamChatCompletion, type Message } from '@/lib/openai-client';
import { ThemeProvider } from '@thesysai/genui-sdk';


function ChatView({
    openaiApiKey,
    mcpServerUrl,
    messages,
    onMessagesChange,
    isAssistantThinking,
    onThinkingChange,
}: {
    openaiApiKey: string | null;
    mcpServerUrl: string;
    messages: Message[];
    onMessagesChange: (messages: Message[]) => void;
    isAssistantThinking: boolean;
    onThinkingChange: (thinking: boolean) => void;
}) {
    const handleSend = async (userMessage: string) => {
        if (!openaiApiKey) {
            alert('Please configure your OpenAI API key in settings');
            return;
        }

        if (!mcpServerUrl) {
            alert('Please configure MCP server settings');
            return;
        }

        // Add user message
        const newMessages: Message[] = [
            ...messages,
            { role: 'user', content: userMessage },
        ];
        onMessagesChange(newMessages);
        onThinkingChange(true);

        try {
            // Initialize OpenAI client
            const openai = createOpenAIClient(openaiApiKey);

            // Get available tools
            const tools = await getAvailableTools(mcpServerUrl, '');

            // Stream chat completion
            let currentMessages = newMessages;
            let currentAssistantMessage: Message | null = null;
            let accumulatedContent = '';

            for await (const chunk of streamChatCompletion(openai, currentMessages, mcpServerUrl, '', tools)) {
                if (chunk.type === 'content') {
                    accumulatedContent += String(chunk.data);
                    if (!currentAssistantMessage) {
                        currentAssistantMessage = {
                            role: 'assistant',
                            content: accumulatedContent,
                        };
                    } else {
                        currentAssistantMessage.content = accumulatedContent;
                    }
                    onMessagesChange([...currentMessages, currentAssistantMessage]);
                } else if (chunk.type === 'tool_calls') {
                    if (!currentAssistantMessage) {
                        currentAssistantMessage = {
                            role: 'assistant',
                            content: accumulatedContent,
                            tool_calls: chunk.data as Message['tool_calls'],
                        };
                    } else {
                        currentAssistantMessage.tool_calls = chunk.data as Message['tool_calls'];
                    }
                    onMessagesChange([...currentMessages, currentAssistantMessage]);
                } else if (chunk.type === 'tool_result') {
                    // Add tool result message to history
                    const toolMessage = chunk.data as Message;
                    // Ensure the assistant message with tool calls is in the history
                    if (currentAssistantMessage) {
                        currentMessages = [...currentMessages, currentAssistantMessage, toolMessage];
                    } else {
                        // If no assistant message yet, we might have already added it in a previous done event
                        currentMessages = [...currentMessages, toolMessage];
                    }
                    onMessagesChange(currentMessages);
                    currentAssistantMessage = null;
                    accumulatedContent = '';
                } else if (chunk.type === 'done') {
                    const finalMessage = chunk.data as Message;
                    // Update current messages with final message
                    const updatedMessages = [...currentMessages];
                    const lastIndex = updatedMessages.length - 1;
                    if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
                        updatedMessages[lastIndex] = finalMessage;
                    } else {
                        updatedMessages.push(finalMessage);
                    }

                    // If there are tool calls, we'll get tool results in the next iteration
                    // Otherwise, update and finish
                    if (!finalMessage.tool_calls || finalMessage.tool_calls.length === 0) {
                        onMessagesChange(updatedMessages);
                    } else {
                        currentMessages = updatedMessages;
                        currentAssistantMessage = null;
                        accumulatedContent = '';
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            };
            onMessagesChange([...newMessages, errorMessage]);
        } finally {
            onThinkingChange(false);
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <div className="flex-1 overflow-hidden">
                <ChatMessages messages={messages} />
            </div>
            <ChatInput onSend={handleSend} disabled={isAssistantThinking} />
            {isAssistantThinking && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-100 px-4 py-2 rounded-lg shadow">
                    <span className="text-sm text-gray-600">Assistant is thinking...</span>
                </div>
            )}
        </div>
    );
}

function App() {
    const [openaiApiKey, setOpenAIKey] = useState<string | null>(null);
    const [mcpServerUrl, setMCPServerUrl] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAssistantThinking, setIsAssistantThinking] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Load configuration on mount
    useEffect(() => {
        const savedApiKey = localStorage.getItem('openai_api_key');
        if (savedApiKey) {
            setOpenAIKey(savedApiKey);
        }

        const savedServerUrl = localStorage.getItem('mcp_server_url');
        if (savedServerUrl) setMCPServerUrl(savedServerUrl);
    }, []);

    const handleMCPConfigChange = (config: {
        serverUrl: string;
    }) => {
        setMCPServerUrl(config.serverUrl);
        localStorage.setItem('mcp_server_url', config.serverUrl);
    };

    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <div className="flex h-screen bg-gray-50">
                                {/* Sidebar */}
                                <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
                                    <div className="p-4 border-b border-gray-200">
                                        <h1 className="text-xl font-bold">MCP Chat</h1>
                                        <button
                                            onClick={() => setShowSettings(!showSettings)}
                                            className="mt-2 text-sm text-blue-600 hover:underline"
                                        >
                                            {showSettings ? 'Hide' : 'Show'} Settings
                                        </button>
                                    </div>
                                    {showSettings && (
                                        <SettingsPanel
                                            openaiApiKey={openaiApiKey}
                                            mcpServerUrl={mcpServerUrl}
                                            onOpenAIKeyChange={(key) => {
                                                setOpenAIKey(key);
                                                if (key) {
                                                    localStorage.setItem('openai_api_key', key);
                                                } else {
                                                    localStorage.removeItem('openai_api_key');
                                                }
                                            }}
                                            onMCPConfigChange={handleMCPConfigChange}
                                        />
                                    )}
                                </div>

                                {/* Main Chat Area */}
                                <div className="flex-1 flex flex-col relative">
                                    <ChatView
                                        openaiApiKey={openaiApiKey}
                                        mcpServerUrl={mcpServerUrl}
                                        messages={messages}
                                        onMessagesChange={setMessages}
                                        isAssistantThinking={isAssistantThinking}
                                        onThinkingChange={setIsAssistantThinking}
                                    />
                                </div>
                            </div>
                        }
                    />
                    <Route path="/oauth/callback" element={<AuthCallback />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;

