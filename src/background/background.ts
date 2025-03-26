/**
 * Background script manages Discord token and provides it to content scripts if needed.
 */

import browser from 'webextension-polyfill';
import { DiscordAuth } from '../shared/DiscordAuth';
import { NTSPlusMessage } from '../shared/Types';
import { MessageType } from '../shared/Constants';

const discordAuth = new DiscordAuth();
const initDiscordAuth = discordAuth.init();
console.log('NTS Plus Background Script loaded');

// Subscribe to messages
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('background received message', message, sender);

    if (sender.id !== browser.runtime.id) return true;
    let messageCast = message as NTSPlusMessage;

    switch (messageCast.type) {
        case MessageType.GET_TOKEN: {
            async function getToken() {
                await initDiscordAuth;
                const token = await discordAuth.getDiscordAccessToken(false);
                sendResponse({ accessToken: token });
            }
            getToken();
            return true;
        }
        case MessageType.LAUNCH_AUTHORIZATION: {
            async function authorizeAndGetToken() {
                await initDiscordAuth;
                const token = await discordAuth.getDiscordAccessToken(true);
                sendResponse({ accessToken: token });
            }
            authorizeAndGetToken();
            return true;
        }
        case MessageType.REVOKE_TOKENS: {
            async function revokeTokens() {
                await initDiscordAuth;
                await discordAuth.revokeTokens();
                sendResponse(true);
            }
            revokeTokens();
            return true;
        }
        default: {
            sendResponse('Unknown message type');
            return true;
        }
    }
});
