# MCP Chat: OpenAI with External Tools via MCP

This is a simple web-based chat application that demonstrates how to integrate an OpenAI-powered assistant with external tools provided by a Model Context Protocol (MCP) server.

## Overview

The application provides a chat interface where a user can interact with an AI assistant. The assistant can leverage a set of "tools" to perform actions beyond its built-in capabilities. These tools are dynamically fetched from a configurable MCP server, allowing for flexible and extensible functionality. The application uses OAuth 2.0 to securely authenticate and authorize with the MCP server.

## Features

*   **Chat Interface**: A simple, clean interface for chatting with an AI assistant.
*   **OpenAI Integration**: Uses the OpenAI API for generating responses.
*   **External Tools via MCP**: Dynamically lists and calls tools from any MCP-compliant server.
*   **OAuth 2.0 Authentication**: Securely connects to the MCP server using the Authorization Code Grant flow.
*   **Streaming Responses**: Assistant responses are streamed in real-time.
*   **Tool Calling**: The assistant can decide to call one or more external tools to fulfill a user's request.
*   **Configurable Settings**: Users can configure their OpenAI API key and the MCP server URL through a settings panel.

## How It Works

1.  **Configuration**: The user provides their OpenAI API key and the URL of an MCP server in the settings panel.
2.  **Tool Discovery**: When a conversation starts, the application queries the MCP server to get a list of available tools.
3.  **Chat Completion Request**: The user's message, along with the list of available tools, is sent to the OpenAI API.
4.  **Tool Invocation**: If the OpenAI model decides to use a tool, the application receives a tool call request. It then calls the specified tool on the MCP server with the provided arguments.
5.  **Tool Result**: The result from the tool call is sent back to the OpenAI model.
6.  **Final Response**: The model processes the tool result and generates a final response, which is streamed back to the user.

Authentication with the MCP server is handled via OAuth 2.0. The first time a tool is called, the user is redirected to the MCP server to authorize the application. Subsequent calls will use a stored access token.

## Getting Started

### Prerequisites

*   Node.js and npm (or yarn/pnpm)
*   An OpenAI API key
*   Access to an MCP server and a client ID for OAuth 2.0

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd c1-oauth-mcp
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  Run the application (see next step).
2.  Open the application in your browser.
3.  Click on "Show Settings".
4.  Enter your OpenAI API key.
5.  Enter the URL of your MCP server.

### Running the Application

```bash
npm run dev
```

This will start the development server, typically at `http://localhost:5173`.

## Project Structure

*   `src/components/`: Contains the React components for the UI.
    *   `ChatMessages.tsx`: Displays the chat history.
    *   `ChatInput.tsx`: The input field for sending messages.
    *   `SettingsPanel.tsx`: The panel for configuring API keys and server URLs.
    *   `AuthCallback.tsx`: Handles the OAuth 2.0 callback.
*   `src/lib/`: Contains the core logic of the application.
    *   `auth.ts`: Implements the OAuth 2.0 client provider for MCP.
    *   `mcp-client.ts`: The client for interacting with the MCP server (listing/calling tools).
    *   `openai-client.ts`: The client for interacting with the OpenAI API, including tool call handling.
*   `src/App.tsx`: The main application component that ties everything together.
