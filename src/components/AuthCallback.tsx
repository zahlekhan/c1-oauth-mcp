import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTransport } from '@/lib/mcp-client';

export function AuthCallback() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [error, setError] = useState<string | null>(null);
    const processedRef = useRef(false);

    useEffect(() => {
        const handleCallback = async () => {
            if (processedRef.current) {
                return;
            }
            processedRef.current = true;

            const code = searchParams.get('code');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setStatus('error');
                setError(errorParam);
                return;
            }

            if (!code) {
                setStatus('error');
                setError('Missing authorization code');
                return;
            }

            // Get server URL from localStorage (set during settings change)
            const serverUrl = localStorage.getItem('mcp_server_url');

            if (!serverUrl) {
                setStatus('error');
                setError('Missing MCP configuration. Please configure in settings.');
                return;
            }

            try {
                const transport = getTransport(serverUrl, '');
                await transport.finishAuth(code);
                setStatus('success');

                // Redirect to main app after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } catch (err) {
                setStatus('error');
                setError(err instanceof Error ? err.message : String(err));
            }
        };

        handleCallback();
    }, [searchParams]);

    if (status === 'processing') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing authentication...</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-green-500 text-4xl mb-4">✓</div>
                    <h1 className="text-2xl font-bold mb-2">Authentication Successful</h1>
                    <p className="text-gray-600">Redirecting to chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md">
                <div className="text-red-500 text-4xl mb-4">✗</div>
                <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
                <p className="text-gray-600 mb-4">{error}</p>
                <a href="/" className="text-blue-600 hover:underline">
                    Return to home
                </a>
            </div>
        </div>
    );
}
