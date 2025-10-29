Based on the provided codebase, here is a detailed specification for implementing a fully client-side OpenAI chatbot with tool-calling capabilities that interact with an OAuth-protected MCP (Model Context Protocol) server.

### **1. Overview & Architecture**

#### 1.1. Purpose
The goal is to create a web-based chatbot application that runs entirely in the user's browser. This application will use an OpenAI language model to power its conversational abilities. The model will be capable of calling "tools," which are functions that execute requests against a user-specified MCP server. All interactions with the MCP server must be authenticated using the OAuth 2.0 Authorization Code Flow with PKCE.

#### 1.2. Architecture
The application is a Single Page Application (SPA) with no backend component for its core logic. All state management, business logic, and API calls will be handled directly by the browser.

*   **Chat UI (React):** The user interacts with a standard chat interface. This can be built by adapting existing components from the `client/src/components/` directory.
*   **OpenAI Integration:** The official `openai` JavaScript library will be used to stream chat completions. The application will manage the chat history and handle tool call requests from the model.
*   **MCP Integration (`@modelcontextprotocol/sdk`):** The MCP SDK will be used to communicate with the target MCP server. Given the client-side context, the `StreamableHTTPClientTransport` is the required transport layer.
*   **Authentication Layer:** A dedicated module will manage credentials:
    *   **OpenAI API Key:** Sourced from the user and stored in `localStorage`.
    *   **MCP OAuth Tokens:** Acquired via a client-side OAuth flow and stored in `sessionStorage` or `localStorage`. This logic can be adapted from the existing `client/src/lib/auth.ts` and `client/src/components/AuthDebugger.tsx` components.

### **2. User Interface (UI) Components**

The UI should be composed of the following key areas, leveraging existing components where possible:

#### 2.1. Main Chat View
*   **Message Display Area:** A scrollable container that renders the conversation history. It must support messages from the `user`, `assistant`, and `tool`.
    *   Assistant messages containing tool calls should be visually distinct, perhaps showing a "thinking" or "tool in use" indicator.
    *   Tool results should be displayed in a collapsed view (e.g., using a `<details>` tag or a custom component like the existing `JsonView`) to avoid cluttering the chat.
*   **Chat Input Form:** A text input field and a "Send" button for user messages. The input should be disabled while the assistant is generating a response or executing a tool.

#### 2.2. Settings Panel
A dedicated, persistent panel (or modal) for configuration. This can be a new tab within the existing `Sidebar.tsx` component.
*   **OpenAI API Key Input:**
    *   A password-style input field for the user to enter their OpenAI API Key.
    *   A "Save" button to store the key in `localStorage`.
    *   A visual indicator (e.g., a green checkmark) to show if a key is currently saved.
*   **MCP Server URL Input:**
    *   A text input for the user to specify the base URL of the target MCP server (e.g., `http://localhost:3000/mcp`). This can reuse the logic for the `sseUrl` input in `Sidebar.tsx`.
*   **OAuth Configuration Section:**
    *   **Client ID Input:** A field for the user's OAuth Client ID.
    *   **Scopes Input:** A field for the required OAuth scopes (e.g., `read write`).
    *   **"Connect to MCP Server" Button:** Initiates the OAuth flow if no valid token is present.
    *   **Status Indicator:** Displays the current OAuth status (e.g., "Disconnected", "Connected as [user]", "Authentication Expired").

### **3. State Management**

The application's root component (e.g., `App.tsx`) will manage the following state:

*   `openaiApiKey: string | null`: The user's OpenAI API key.
*   `mcpServerUrl: string`: The URL of the target MCP server.
*   `mcpClientId: string`: The OAuth client ID.
*   `mcpScopes: string`: The requested OAuth scopes.
*   `mcpAuthTokens: OAuthTokens | null`: The stored OAuth tokens (`access_token`, `refresh_token`, etc.).
*   `chatHistory: Message[]`: An array of messages representing the conversation, conforming to the OpenAI API's message format.
*   `isAssistantThinking: boolean`: A flag to disable user input while waiting for a response.

### **4. Core Logic & Workflow**

#### 4.1. Application Initialization
1.  On load, the app checks `localStorage` for a saved OpenAI API key and MCP server settings.
2.  It checks `sessionStorage` for existing MCP OAuth tokens for the configured server URL.
3.  If a refresh token is available and the access token is expired, it should silently attempt a token refresh in the background.

#### 4.2. Chat Message Workflow
1.  The user types a message and clicks "Send". The user message is added to `chatHistory`.
2.  The UI is set to a "thinking" state.
3.  The entire `chatHistory` is sent to the OpenAI Chat Completions API with `stream: true`. The available MCP tools must be included in the `tools` parameter of the request.
4.  The application streams the response from OpenAI.
5.  **If the response is a standard message:** The content is streamed and appended to the assistant's message in the UI.
6.  **If the response contains `tool_calls`:**
    a.  The "thinking" indicator changes to "Using tools...".
    b.  The `tool_calls` array is parsed. For each tool call:
        i.  The function name and arguments are extracted (e.g., name: `list_tools`, arguments: `{}`).
        ii. The corresponding MCP method is invoked (see **Section 4.3**).
    c.  The results from all tool calls are collected.
    d.  A new message with `role: 'tool'` is created for each result and appended to `chatHistory`.
    e.  The updated `chatHistory` (now including the tool calls and their results) is sent back to the OpenAI API in a new request.
    f.  The final natural language response from the model is streamed to the UI.
7.  The UI is returned to an active state.

#### 4.3. MCP Tool Call Workflow
1.  **Define Available Tools:** A static or dynamic list of tools available to the OpenAI model must be defined. This list maps a tool name (e.g., `list_mcp_tools`) to an MCP request.

    *Example Tool Definition:*
    ```typescript
    const mcpTools: ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'list_mcp_tools',
          description: 'List all available tools on the MCP server.',
          parameters: { type: 'object', properties: {} }
        }
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
              args: { type: 'object', description: 'A JSON object of arguments for the tool.' }
            },
            required: ['toolName']
          }
        }
      }
    ];
    ```

2.  **Execute MCP Request:** When OpenAI requests a tool call:
    a.  Instantiate an `InspectorOAuthClientProvider` (from `client/src/lib/auth.ts`) with the MCP server URL and scopes.
    b.  Check for a valid `access_token`. If it's missing or expired, trigger the refresh or full OAuth flow.
    c.  Instantiate `StreamableHTTPClientTransport` with the server URL. The transport's `fetch` option must be configured to include the `Authorization: Bearer <access_token>` header on all outgoing requests.
    d.  Create an MCP `Client` instance and connect it using the transport.
    e.  Construct and send the MCP request (e.g., `client.listTools()` or `client.callTool(...)`).
    f.  Await the response from the MCP server.
    g.  The JSON result from the MCP server is returned to be formatted as the tool message.
    h.  The MCP client connection should be closed.

### **5. Authentication Specifics**

#### 5.1. OpenAI API Key
*   The key must **only** be stored in the browser's `localStorage`.
*   The key must **never** be sent to any service other than `api.openai.com`.
*   The UI should provide a button to clear the key from `localStorage`.

#### 5.2. MCP Server OAuth 2.0 Flow
*   The application must implement the **Authorization Code Flow with PKCE**. The existing `pkce-challenge` library can be used.
*   When authentication is required, the app will:
    1.  Generate a `code_verifier` and `code_challenge`.
    2.  Store the `code_verifier` in `sessionStorage`.
    3.  Redirect the user to the MCP server's authorization endpoint with the `client_id`, `redirect_uri`, `scope`, and `code_challenge`.
*   A dedicated callback page (e.g., `/oauth/callback`, as seen in `App.tsx`) will handle the redirect from the authorization server. It will:
    1.  Extract the `authorization_code` from the URL.
    2.  Retrieve the `code_verifier` from `sessionStorage`.
    3.  Exchange the code and verifier for an `access_token` and `refresh_token` at the token endpoint.
    4.  Store the tokens securely (e.g., in `sessionStorage` for the current session).
    5.  Redirect the user back to the main chat interface.

### **6. Technology Stack & Libraries**

*   **Framework:** React
*   **UI Components:** `shadcn/ui` (leveraging existing components in `client/src/components/ui/`)
*   **OpenAI SDK:** `openai`
*   **MCP SDK:** `@modelcontextprotocol/sdk`
*   **State Management:** React Hooks (`useState`, `useContext`, `useEffect`)
*   **Styling:** Tailwind CSS

### **7. Security Considerations**

*   **Credential Storage:** The OpenAI API key is sensitive. Inform the user that it is stored locally and will not be shared. Use `localStorage` for persistence across sessions. OAuth tokens are less sensitive but should be stored in `sessionStorage` to limit their lifetime to the browser tab.
*   **Cross-Site Scripting (XSS):** All content rendered from the OpenAI model or MCP server tools must be properly sanitized to prevent XSS attacks. Do not use `dangerouslySetInnerHTML`.
*   **Redirect URI Validation:** The OAuth callback handler must validate the `state` parameter to prevent Cross-Site Request Forgery (CSRF) attacks.
*   **Transport Security:** All communication with OpenAI and the MCP server must use HTTPS.


In the context of the MCP Inspector codebase, "well-known" configuration discovery refers to a standardized mechanism that allows a client application to automatically find the necessary endpoints and capabilities of a server without manual configuration. This process adheres to IETF (Internet Engineering Task Force) standards.

The discovery is performed by making HTTP GET requests to specific, standardized paths under the `/.well-known/` directory on a server. The server responds with a JSON document containing the required configuration metadata.

The codebase primarily uses this mechanism for OAuth 2.0 authentication in a two-step process:

### Step 1: Discovering the Authorization Server's Location

Before the client can get authorization details, it first needs to know where the authorization server is. It might not be the same as the MCP server (which is considered the "Protected Resource").

*   **How it works:** The client sends an HTTP GET request to a well-known endpoint on the **MCP server** itself.
*   **Endpoint:** `/.well-known/oauth-protected-resource`
*   **Purpose:** The MCP server responds with a JSON object that includes an `authorization_servers` field. This field contains a list of URIs for the authorization servers that can issue tokens for this resource.
*   **Code Reference:** This is initiated in the `metadata_discovery` step within the `OAuthStateMachine` class. The code calls the `discoverOAuthProtectedResourceMetadata` function from the MCP SDK, which handles the request to this endpoint. [cite: client/src/lib/oauth-state-machine.ts]

### Step 2: Discovering the Authorization Server's Metadata

Once the client knows the location of the authorization server, it needs to get its specific configuration, such as the URLs for authorization and token exchange.

*   **How it works:** The client sends an HTTP GET request to a well-known endpoint on the **Authorization Server** URI discovered in Step 1.
*   **Endpoint:** `/.well-known/oauth-authorization-server`
*   **Purpose:** The authorization server responds with a standard JSON object containing all its metadata, including `authorization_endpoint`, `token_endpoint`, supported scopes, and more, as defined by RFC 8414.
*   **Code Reference:** This is also part of the `metadata_discovery` step in `OAuthStateMachine`. After finding the authorization server's URL, it calls the `discoverAuthorizationServerMetadata` SDK function, which queries this second endpoint. The retrieved metadata is then stored and used to orchestrate the rest of the OAuth flow. [cite: client/src/lib/oauth-state-machine.ts]

### Why is this "Well-Known" Discovery Used?

*   **Decoupling:** It allows the MCP server (the resource) and the identity/authorization provider to be completely separate services.
*   **Standardization:** It follows established internet standards, which promotes interoperability between different MCP clients and servers without requiring custom configuration for each one.
*   **Automation:** It enables a client, like the MCP Inspector, to configure its entire authentication flow just by knowing the base URL of the target MCP server.

### Other Configuration in the Inspector

It is worth noting that the Inspector also uses a non-standard `/config` endpoint on its own proxy server. [cite: server/src/index.ts] This is used to fetch default settings like environment variables and command arguments that were passed to the proxy on startup, but it is an internal mechanism and not a "well-known" industry standard.
