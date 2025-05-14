import browser from 'webextension-polyfill';
import { DISCORD_APPLICATION_ID } from './DiscordConstants';

const EXPIRATION_TOLERANCE_MS = 1000 * 60 * 60;

const DiscordOAuthEndpoints = {
    AUTHORIZE: 'https://discord.com/oauth2/authorize',
    TOKEN: 'https://discord.com/api/oauth2/token',
    REVOKE: 'https://discord.com/api/oauth2/token/revoke',
};

async function generateCodeChallenge(codeVerifier: string) {
    var digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function generateRandomString(length: number) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

async function authorizeDiscord() {
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const redirectURL = browser.identity.getRedirectURL();

    const authorizationURL = new URL(DiscordOAuthEndpoints.AUTHORIZE);
    authorizationURL.search = new URLSearchParams({
        redirect_uri: redirectURL,
        scope: 'identify sdk.social_layer_presence',
        client_id: DISCORD_APPLICATION_ID,
        response_type: 'code',
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
    }).toString();

    console.info('Launching authorization with redirect:', redirectURL);
    const resultURL = new URL(
        await browser.identity.launchWebAuthFlow({
            url: authorizationURL.toString(),
            interactive: true,
        }),
    );
    console.log('NTS-Plus', 'Authorization complete.');
    const accessCode = resultURL.searchParams.get('code');
    if (!accessCode) {
        throw new Error("Didn't receive access code");
    }
    return { accessCode, codeVerifier };
}

async function exchangeAccessCode(
    accessCode: string,
    codeVerifier: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const tokenURL = new URL(DiscordOAuthEndpoints.TOKEN);
    const body = new URLSearchParams({
        client_id: DISCORD_APPLICATION_ID,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: browser.identity.getRedirectURL(),
        code: accessCode,
    }).toString();
    const resp = await (
        await fetch(tokenURL.toString(), {
            method: 'post',
            headers: { 'Content-type': 'application/x-www-form-urlencoded' },
            body,
        })
    ).json();

    return {
        accessToken: resp.access_token,
        refreshToken: resp.refresh_token,
        expiresIn: resp.expires_in,
    };
}

async function exchangeRefreshToken(
    refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const tokenURL = new URL(DiscordOAuthEndpoints.TOKEN);
    const body = new URLSearchParams({
        client_id: DISCORD_APPLICATION_ID,
        grant_type: 'refresh_token',
        redirect_uri: browser.identity.getRedirectURL(),
        refresh_token: refreshToken,
    }).toString();
    const resp = await (
        await fetch(tokenURL.toString(), {
            method: 'post',
            headers: { 'Content-type': 'application/x-www-form-urlencoded' },
            body,
        })
    ).json();

    return {
        accessToken: resp.access_token,
        refreshToken: resp.refresh_token,
        expiresIn: resp.expires_in,
    };
}

async function revokeToken(accessToken: string) {
    const tokenURL = new URL(DiscordOAuthEndpoints.REVOKE);
    const body = new URLSearchParams({
        client_id: DISCORD_APPLICATION_ID,
        token: accessToken,
        token_type_hint: 'access_token',
    });
    await fetch(tokenURL.toString(), {
        method: 'post',
        headers: { 'Content-type': 'application/x-www-form-urlencoded' },
        body,
    });
}

export class DiscordAuth {
    #accessToken: string = '';
    private refreshToken: string = '';
    private expiration: number = -1;
    private initialized = false;
    #onTokenUpdated: ((token: string) => void) | undefined;

    async init() {
        const result = await browser.storage.sync.get({
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            expiration: this.expiration,
        });
        this.accessToken = result.accessToken as string;
        this.refreshToken = result.refreshToken as string;
        this.expiration = result.expiration as number;
        this.initialized = true;

        browser.storage.sync.onChanged.addListener(this.#handleStorageChange);
    }

    private get accessToken() {
        return this.#accessToken;
    }

    private set accessToken(newToken: string) {
        this.#accessToken = newToken;
        this.#onTokenUpdated?.(newToken);
    }

    onTokenUpdated = (callback: (token: string) => void) => {
        this.#onTokenUpdated = callback;
    };

    #handleStorageChange = (changes: Record<string, { newValue?: unknown }>) => {
        for (let [key, { newValue }] of Object.entries(changes)) {
            if (newValue == null) continue;
            if (key === 'accessToken' && newValue !== this.accessToken) {
                this.accessToken = newValue as string;
            } else if (key === 'refreshToken') {
                this.refreshToken = newValue as string;
            } else if (key === 'expiration') {
                this.expiration = newValue as number;
            }
        }
    };

    #updateStorageAndCache({
        accessToken,
        refreshToken,
        expiresIn,
    }: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }) {
        const expiration = Date.now() + expiresIn * 1000;

        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiration = expiration;
        browser.storage.sync.set({
            accessToken,
            refreshToken,
            expiration,
        });
    }

    async revokeTokens() {
        if (!this.accessToken) {
            return;
        }
        await revokeToken(this.accessToken);
        this.#updateStorageAndCache({
            accessToken: '',
            refreshToken: '',
            expiresIn: -1,
        });
    }

    async getDiscordAccessToken(allowReauth: boolean): Promise<string> {
        if (!this.initialized) {
            throw new Error('Trying to read from uninitialized DiscordAuth');
        }

        if (this.accessToken) {
            if (this.expiration > Date.now() + EXPIRATION_TOLERANCE_MS) {
                return this.accessToken;
            }

            // Try to refresh if we are nearing expiration
            const refreshResults = await exchangeRefreshToken(this.refreshToken);
            this.#updateStorageAndCache(refreshResults);
            return refreshResults.accessToken;
        }

        if (!allowReauth) {
            return '';
        }

        // New Oauth authorization
        const { accessCode, codeVerifier } = await authorizeDiscord();
        const exchangeResults = await exchangeAccessCode(accessCode, codeVerifier);
        this.#updateStorageAndCache(exchangeResults);
        return exchangeResults.accessToken;
    }
}
