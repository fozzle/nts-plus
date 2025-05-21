/**
 * Background script manages Discord token and provides it to content scripts if needed.
 */

import browser from 'webextension-polyfill';
import { DiscordAuth } from '../shared/DiscordAuth';
import { NTSPlusMessage } from '../shared/Types';
import { MessageType } from '../shared/Constants';

const discordAuth = new DiscordAuth();
async function init() {
    const initDiscordAuth = await discordAuth.init();
    console.log('NTS Plus Background Script loaded');

    discordAuth.onTokenUpdated(async (accessToken: string) => {
        const tabs = await browser.tabs.query({});
        tabs.forEach((tab) => {
            const tabId = tab.id;
            if (tabId == null) return;
            browser.tabs.sendMessage(tabId, {
                type: MessageType.TOKEN_UPDATE,
                accessToken,
            } as NTSPlusMessage);
        });
    });

    // Subscribe to messages
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (sender.id !== browser.runtime.id) return true;
        let messageCast = message as NTSPlusMessage;

        switch (messageCast.type) {
            case MessageType.GET_TOKEN: {
                async function getToken() {
                    await initDiscordAuth;
                    try {
                        const token = await discordAuth.getDiscordAccessToken(false);
                        sendResponse({ accessToken: token });
                    } catch (e) {
                        sendResponse({ accessToken: '' });
                    }
                }
                getToken();
                return true;
            }
            case MessageType.LAUNCH_AUTHORIZATION: {
                async function authorizeAndGetToken() {
                    await initDiscordAuth;
                    try {
                        const token = await discordAuth.getDiscordAccessToken(true);
                        sendResponse({ accessToken: token });
                    } catch (e) {
                        sendResponse({ accessToken: '' });
                    }
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
}

init();
