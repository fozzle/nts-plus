import browser from 'webextension-polyfill';
import { MessageType } from '../shared/Constants';

export function getToken() {
    return browser.runtime.sendMessage(browser.runtime.id, {
        type: MessageType.GET_TOKEN,
    }) as Promise<{ accessToken: string }>;
}

export function getTokenWithAuth() {
    return browser.runtime.sendMessage(browser.runtime.id, {
        type: MessageType.LAUNCH_AUTHORIZATION,
    }) as Promise<{ accessToken: string }>;
}

export function revokeTokens() {
    return browser.runtime.sendMessage(browser.runtime.id, {
        type: MessageType.REVOKE_TOKENS,
    }) as Promise<boolean>
}