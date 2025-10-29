import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalStorageOAuthProvider } from '@/lib/auth';
import { listMCPTools, closeMCPClient } from '@/lib/mcp-client';

interface SettingsPanelProps {
    openaiApiKey: string | null;
    mcpServerUrl: string;
    onOpenAIKeyChange: (key: string | null) => void;
    onMCPConfigChange: (config: {
        serverUrl: string;
    }) => void;
}

export function SettingsPanel({
    openaiApiKey,
    mcpServerUrl,
    onOpenAIKeyChange,
    onMCPConfigChange,
}: SettingsPanelProps) {
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [serverUrlInput, setServerUrlInput] = useState(mcpServerUrl);
    const [authProvider, setAuthProvider] = useState<LocalStorageOAuthProvider | null>(null);
    const [tokens, setTokens] = useState<any | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    useEffect(() => {
        if (mcpServerUrl) {
            const provider = new LocalStorageOAuthProvider(
                new URL('/oauth/callback', window.location.origin),
                { client_id: '' }
            );
            setAuthProvider(provider);
            setTokens(provider.tokens());
        }
    }, [mcpServerUrl]);


    const handleSaveOpenAIKey = () => {
        if (apiKeyInput.trim()) {
            localStorage.setItem('openai_api_key', apiKeyInput.trim());
            onOpenAIKeyChange(apiKeyInput.trim());
            setApiKeyInput('');
        }
    };

    const handleClearOpenAIKey = () => {
        localStorage.removeItem('openai_api_key');
        onOpenAIKeyChange(null);
    };

    const handleSaveMCPConfig = async () => {
        const serverUrl = serverUrlInput.trim();
        await closeMCPClient();
        setTokens(null);

        onMCPConfigChange({ serverUrl });

        if (!serverUrl) return;

        setIsConnecting(true);
        setConnectionError(null);
        try {
            await listMCPTools(serverUrl, '');

            const provider = new LocalStorageOAuthProvider(
                new URL('/oauth/callback', window.location.origin),
                { client_id: '' }
            );
            setAuthProvider(provider);
            const newTokens = provider.tokens();
            setTokens(newTokens);
        } catch (error: any) {
            console.error('Connection failed', error);
            if (error.name !== 'UnauthorizedError') {
                setConnectionError(error.message);
            }
            authProvider?.invalidateCredentials('tokens');
            setTokens(null);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        await closeMCPClient();
        setTokens(null);
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>OpenAI Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="api-key">OpenAI API Key</Label>
                        <div className="flex gap-2">
                            <Input
                                id="api-key"
                                type="password"
                                placeholder="sk-..."
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleSaveOpenAIKey}>Save</Button>
                        </div>
                        {openaiApiKey && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <span className="text-green-500">✓</span>
                                <span>API key saved</span>
                                <Button variant="ghost" size="sm" onClick={handleClearOpenAIKey}>
                                    Clear
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>MCP Server Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="server-url">MCP Server URL</Label>
                        <Input
                            id="server-url"
                            type="url"
                            placeholder="http://localhost:3000/mcp"
                            value={serverUrlInput}
                            onChange={(e) => setServerUrlInput(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSaveMCPConfig} className="w-full" disabled={isConnecting}>
                        {isConnecting ? 'Connecting...' : 'Save & Connect'}
                    </Button>

                    {connectionError && (
                        <p className="text-sm text-red-600">{connectionError}</p>
                    )}

                    {tokens && (
                        <Button variant="outline" onClick={handleDisconnect} className="w-full">
                            Disconnect
                        </Button>
                    )}

                    <div className="space-y-2">
                        <Label>OAuth Status</Label>
                        <div className="flex items-center gap-2">
                            {tokens ? (
                                <>
                                    <span className="text-green-500">✓</span>
                                    <span className="text-sm text-green-600">Connected</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-gray-400">○</span>
                                    <span className="text-sm text-gray-600">Disconnected</span>
                                    <p className="text-xs text-gray-500">Save configuration to connect.</p>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

