# C1 OAuth MCP - Client-Side OpenAI Chatbot

A fully client-side web application that integrates OpenAI's GPT-4 with OAuth-protected MCP (Model Context Protocol) servers. Built with React, TypeScript, and Vite.

## Features

- **Fully Client-Side**: No backend required - all logic runs in the browser
- **OpenAI Integration**: Uses GPT-4o with streaming responses
- **MCP Tool Calling**: Automatically discovers and calls tools from MCP servers
- **OAuth 2.0 PKCE**: Secure authentication flow with PKCE for MCP server access
- **Well-Known Discovery**: Automatically discovers OAuth endpoints using standard `.well-known` paths
- **Token Management**: Automatic token refresh and secure storage

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **OpenAI SDK** - GPT-4 integration
- **MCP SDK** - Model Context Protocol support
- **React Router** - Routing

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

## Configuration

### OpenAI API Key

1. Open the settings panel
2. Enter your OpenAI API key
3. Click "Save"

The API key is stored locally in your browser's `localStorage` and never sent to any server other than OpenAI.

### MCP Server Configuration

1. **MCP Server URL**: The base URL of your MCP server (e.g., `http://localhost:3000/mcp`)
2. **OAuth Client ID**: Your OAuth client ID
3. **OAuth Scopes**: Required scopes (e.g., `read write`)

After saving the configuration, click "Connect to MCP Server" to initiate the OAuth flow.

## OAuth Flow

The application uses OAuth 2.0 Authorization Code Flow with PKCE:

1. **Discovery**: Automatically discovers OAuth endpoints using:
   - `/.well-known/oauth-protected-resource` on the MCP server
   - `/.well-known/oauth-authorization-server` on the authorization server

2. **Authorization**: User is redirected to the authorization server

3. **Callback**: After authorization, the user is redirected back to `/oauth/callback`

4. **Token Exchange**: The authorization code is exchanged for access and refresh tokens

5. **Storage**: Tokens are stored in `sessionStorage` and automatically refreshed when expired

## Usage

1. Configure your OpenAI API key in settings
2. Configure your MCP server details
3. Complete the OAuth authentication flow
4. Start chatting! The assistant will automatically use available MCP tools when needed

## Security Considerations

- **API Keys**: Stored in `localStorage` (persists across sessions)
- **OAuth Tokens**: Stored in `sessionStorage` (cleared when tab closes)
- **PKCE**: Prevents authorization code interception attacks
- **CSRF Protection**: Uses state parameter to prevent CSRF attacks
- **HTTPS**: All communication must use HTTPS in production

## Project Structure

```
src/
├── lib/
│   ├── auth.ts           # OAuth authentication logic
│   ├── mcp-client.ts     # MCP client integration
│   ├── openai-client.ts  # OpenAI integration with tool calling
│   └── utils.ts          # Utility functions
├── components/
│   ├── ui/               # Reusable UI components
│   ├── ChatMessages.tsx  # Message display component
│   ├── ChatInput.tsx     # Chat input component
│   ├── SettingsPanel.tsx # Settings configuration
│   └── OAuthCallback.tsx # OAuth callback handler
└── App.tsx               # Main application component
```

## License

MIT

