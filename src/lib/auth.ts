import {
    type OAuthClientProvider,
    type OAuthClientInformation,
    type OAuthClientInformationFull,
    type OAuthClientMetadata,
    type OAuthTokens,
} from '@modelcontextprotocol/sdk/client/auth.js';

const MCP_OAUTH_TOKENS_KEY = 'mcp_oauth_tokens';
const MCP_OAUTH_CLIENT_REGISTRATION_KEY = 'mcp_client_registration';
const MCP_OAUTH_CODE_VERIFIER_KEY = 'mcp_oauth_code_verifier';

export class LocalStorageOAuthProvider implements OAuthClientProvider {
    readonly #redirectUrl: URL;
    readonly #clientMetadata: OAuthClientMetadata;

    constructor(redirectUrl: URL, clientMetadata: OAuthClientMetadata) {
        this.#redirectUrl = redirectUrl;
        this.#clientMetadata = clientMetadata;
    }

    get redirectUrl(): string | URL {
        return this.#redirectUrl;
    }

    get clientMetadata(): OAuthClientMetadata {
        return this.#clientMetadata;
    }

    clientInformation(): OAuthClientInformation | undefined {
        const stored = localStorage.getItem(MCP_OAUTH_CLIENT_REGISTRATION_KEY);
        if (stored) {
            return JSON.parse(stored) as OAuthClientInformation;
        }
        if (this.#clientMetadata.client_id) {
            return {
                client_id: this.#clientMetadata.client_id,
                client_secret: this.#clientMetadata.client_secret,
            };
        }
    }

    saveClientInformation(clientInformation: OAuthClientInformationFull): void {
        localStorage.setItem(MCP_OAUTH_CLIENT_REGISTRATION_KEY, JSON.stringify(clientInformation));
    }

    tokens(): OAuthTokens | undefined {
        const stored = localStorage.getItem(MCP_OAUTH_TOKENS_KEY);
        if (stored) {
            return JSON.parse(stored) as OAuthTokens;
        }
    }

    saveTokens(tokens: OAuthTokens): void {
        localStorage.setItem(MCP_OAUTH_TOKENS_KEY, JSON.stringify(tokens));
    }

    redirectToAuthorization(authorizationUrl: URL): void {
        window.location.href = authorizationUrl.toString();
    }

    saveCodeVerifier(codeVerifier: string): void {
        localStorage.setItem(MCP_OAUTH_CODE_VERIFIER_KEY, codeVerifier);
    }

    codeVerifier(): string {
        return localStorage.getItem(MCP_OAUTH_CODE_VERIFIER_KEY) || '';
    }

    invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier'): void {
        if (scope === 'all' || scope === 'tokens') {
            localStorage.removeItem(MCP_OAUTH_TOKENS_KEY);
        }
        if (scope === 'all' || scope === 'client') {
            localStorage.removeItem(MCP_OAUTH_CLIENT_REGISTRATION_KEY);
        }
        if (scope === 'all' || scope === 'verifier') {
            localStorage.removeItem(MCP_OAUTH_CODE_VERIFIER_KEY);
        }
    }
}
