/**
 * Background script manages Discord token and provides it to content scripts if needed.
 */

import browser from 'webextension-polyfill';
import { DiscordAuth } from '../shared/DiscordAuth';

const discordAuth = new DiscordAuth();
const initDiscordAuth = discordAuth.init();

// Subscribe to messages
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id) return true;
    let messageCast = message as Record<string, unknown>;
    if (messageCast.request === 'get_token') {
        async function getToken() {
            await initDiscordAuth;
            const token = await discordAuth.getDiscordAccessToken(false);
            sendResponse({ accessToken: token });
        }
        getToken();
        return true;
    }

    sendResponse(false);
    return true;
});
