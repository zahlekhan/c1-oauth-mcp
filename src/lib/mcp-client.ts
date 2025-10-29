import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { LocalStorageOAuthProvider } from './auth.js';

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties?: Record<string, unknown>;
        required?: string[];
    };
}

let transport: StreamableHTTPClientTransport | null = null;
let client: Client | null = null;
let currentServerUrl: string | null = null;

function getAuthProvider(clientId: string) {
    return new LocalStorageOAuthProvider(
        new URL('/oauth/callback', window.location.origin),
        {
            client_id: clientId,
            client_name: 'c1-oauth-mcp-client',
            redirect_uris: [new URL('/oauth/callback', window.location.origin).toString()],
            token_endpoint_auth_method: 'none',
            grant_types: ['authorization_code'],
            response_types: ['code'],
        }
    );
}

export function getTransport(serverUrl: string, clientId: string): StreamableHTTPClientTransport {
    if (transport && currentServerUrl === serverUrl) {
        return transport;
    }

    if (transport) {
        transport.close();
    }

    const authProvider = getAuthProvider(clientId);

    transport = new StreamableHTTPClientTransport(
        new URL(serverUrl),
        {
            authProvider,
        }
    );
    currentServerUrl = serverUrl;
    client = null; // Invalidate client when transport changes
    return transport;
}

/**
 * Create an authenticated MCP client
 */
export async function getMCPClient(
    serverUrl: string,
    clientId: string
): Promise<Client> {
    if (client && currentServerUrl === serverUrl) {
        return client;
    }

    if (client) {
        await client.close();
    }

    const transport = getTransport(serverUrl, clientId);
    client = new Client(
        {
            name: 'c1-oauth-mcp-client',
            version: '1.0.0',
        },
        {
            capabilities: {},
        }
    );

    await client.connect(transport);
    currentServerUrl = serverUrl;
    return client;
}

export async function closeMCPClient() {
    if (client) {
        await client.close();
        client = null;
    }
    if (transport) {
        await transport.close();
        transport = null;
    }
    currentServerUrl = null;
}

/**
 * List available tools from MCP server
 */
export async function listMCPTools(
    serverUrl: string,
    clientId: string
): Promise<MCPTool[]> {
    const mcpClient = await getMCPClient(serverUrl, clientId);
    const response = await mcpClient.listTools();
    return response.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema as MCPTool['inputSchema'],
    }));
}

/**
 * Call a specific tool on the MCP server
 */
export async function callMCPTool(
    serverUrl: string,
    clientId: string,
    toolName: string,
    args: Record<string, unknown> = {}
): Promise<unknown> {
    const mcpClient = await getMCPClient(serverUrl, clientId);
    const response = await mcpClient.callTool({
        name: toolName,
        arguments: args,
    });
    return response.content;
}

