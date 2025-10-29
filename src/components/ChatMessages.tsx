import { type Message } from '@/lib/openai-client';
import { useRef } from 'react';
import { C1Component } from '@thesysai/genui-sdk';

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    if (message.role === 'user') {
        return (
            <div className="flex justify-end mb-4">
                <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
        );
    }

    if (message.role === 'assistant') {
        const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;
        return (
            <div className="flex items-start gap-3 justify-end">
                <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[80%]">
                    {hasToolCalls && !message.content && (
                        <div className="mb-2 text-sm text-gray-600 italic">
                            Using tools...
                        </div>
                    )}
                    {message.content && (
                        <C1Component c1Response={message.content} isStreaming={true} />
                    )}
                </div>
            </div>
        );
    }

    if (message.role === 'tool') {
        let toolResult: unknown;
        try {
            toolResult = JSON.parse(message.content || '{}');
        } catch {
            toolResult = message.content;
        }

        return (
            <details className="mb-4 bg-gray-50 rounded-lg px-4 py-2 max-w-[80%]">
                <summary className="cursor-pointer text-sm text-gray-600 font-medium">
                    Tool Result
                </summary>
                <pre className="mt-2 text-xs overflow-auto max-h-64 p-2 bg-white rounded border">
                    {JSON.stringify(toolResult, null, 2)}
                </pre>
            </details>
        );
    }

    return null;
}

interface ChatMessagesProps {
    messages: Message[];
}

export function ChatMessages(props: ChatMessagesProps) {
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const { messages } = props;

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                    Start a conversation by typing a message below
                </div>
            )}
            {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
            ))}
        </div>
    );
}

