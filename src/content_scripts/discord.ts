/**
 * Module responsible for updating Discord presence in response to live player state.
 */
import { DISCORD_APPLICATION_ID, DISCORD_RP_ASSET_ID } from '../shared/DiscordConstants';
import { ActivityTypes, DiscordActivity } from '../shared/DiscordTypes';
import * as BackgroundUtils from '../background/BackgroundUtils';
import { DiscordSocket } from '../shared/DiscordSocket';
import { debounce } from '../shared/debounce';
import browser from 'webextension-polyfill';
import { MessageType } from '../shared/Constants';
import { NTSPlusMessage } from '../shared/Types';

// These are the only fields that can change, just want to avoid re-sending presence with new start timestamps
// just because something minor changed.
function pickActivityForComparison(activity: DiscordActivity | undefined) {
    return activity != null ? { details: activity.details, state: activity.state } : undefined;
}

class DiscordPresencePublisher {
    #discordSocket: DiscordSocket = new DiscordSocket('');
    #lastPresence: DiscordActivity | undefined;
    #channelPlayerObserver: MutationObserver;
    #soundcloudPlayerObserver: MutationObserver;

    constructor(accessToken: string) {
        this.updateAccessToken(accessToken);
        this.#channelPlayerObserver = new MutationObserver(() => {
            console.info('Live Player Update');
            this.handleMutation();
        });
        const livePlayer = document.getElementById('nts-live-header') as HTMLDivElement;
        this.#channelPlayerObserver.observe(livePlayer, {
            childList: true,
            subtree: true,
        });

        this.#soundcloudPlayerObserver = new MutationObserver(() => {
            console.info('Soundcloud Player Update');
            this.handleMutation();
        });
        const archivePlayer = document.querySelector('.soundcloud-player') as HTMLDivElement;
        this.#soundcloudPlayerObserver.observe(archivePlayer, {
            childList: true,
            subtree: true,
        });

        window.addEventListener('message', this.handleWindowMessage);
    }

    updateAccessToken(accessToken: string) {
        this.#discordSocket?.destroy();
        this.#discordSocket = new DiscordSocket(accessToken);
        this.#discordSocket.onResume = this.publishLastPresence;
    }

    destroy() {
        window.removeEventListener('message', this.handleWindowMessage);
        this.#channelPlayerObserver.disconnect();
        this.#soundcloudPlayerObserver.disconnect();
        this.#discordSocket.destroy();
    }

    handleWindowMessage = (message: MessageEvent) => {
        const messagePayload = message.data;
        if (typeof messagePayload !== 'object') return;
        if (messagePayload.ntsPlus !== true) return;
        switch (messagePayload.type) {
            case 'play':
            case 'pause':
                console.info('Mixcloud Player Update', messagePayload.type);
                this.handleMutation(messagePayload.type);
        }
    };

    updateCurrentPresence = (showName: string | null, channel?: 'archive' | 1 | 2) => {
        const newPresence =
            showName != null
                ? {
                      name: 'NTS Radio',
                      type: ActivityTypes.LISTENING,
                      timestamps: {
                          start: Date.now(),
                      },
                      assets: {
                          large_image: DISCORD_RP_ASSET_ID,
                      },
                      details: showName,
                      application_id: DISCORD_APPLICATION_ID,
                      state: typeof channel === 'number' ? `Channel ${channel}` : 'Archive',
                      buttons: ['Listen In'],
                      metadata: {
                          button_urls: ['https://nts.live'],
                      },
                  }
                : undefined;

        // Lazy mans deep comparison
        if (
            JSON.stringify(pickActivityForComparison(newPresence)) ===
            JSON.stringify(pickActivityForComparison(this.#lastPresence))
        ) {
            return Promise.resolve();
        }
        this.#lastPresence = newPresence;
        return this.publishLastPresence();
    };

    /**
     * Since we're essentially scraping, wait a bit to ensure HTML state has settled before determining
     * what we're listening to.
     */
    handleMutation = debounce((mixCloudEvent?: 'play' | 'pause') => {
        const playingChannel = document.querySelector('.live-channel--playing');
        const activeSoundcloudPlayer = document.querySelector(
            '.soundcloud-player:not(.visually-hidden)',
        );
        let channelNumber: Parameters<typeof this.updateCurrentPresence>[1];
        let showName: string | null = null;

        if (playingChannel) {
            channelNumber = playingChannel.classList.contains('channel-2') ? 2 : 1;
            showName =
                playingChannel.querySelector('h3.live-channel--collapsed__broadcast__heading')
                    ?.textContent ?? null;
        } else if (activeSoundcloudPlayer && !mixCloudEvent) {
            const soundcloudAudioElement = activeSoundcloudPlayer?.querySelector('audio');
            channelNumber = 'archive';
            showName =
                soundcloudAudioElement?.paused === false
                    ? (document.querySelector('.expanded-episode-player h2')?.textContent ?? null)
                    : null;
        } else if (mixCloudEvent === 'play') {
            // Weirdly this information is available in soundcloud. Simpler than having mixcloud pass stuff to us.
            channelNumber = 'archive';
            showName = document.querySelector('.expanded-episode-player h2')?.textContent ?? null;
        }

        console.info('NTS Plus: Listening to', showName, 'on', channelNumber);
        this.updateCurrentPresence(showName, channelNumber);
    }, 1000);

    publishLastPresence = async () => {
        if (this.#discordSocket.hasToken()) {
            console.info('NTS Plus publishing Discord presence');
            await this.#discordSocket.ensureConnected();
            this.#discordSocket.updatePresence(this.#lastPresence);
        }
    };
}

let presencePublisher: DiscordPresencePublisher | undefined;
browser.runtime.onMessage.addListener((message: unknown, sender: any) => {
    if (sender.id !== browser.runtime.id) return;
    let messageCast = message as NTSPlusMessage;
    switch (messageCast.type) {
        case MessageType.TOKEN_UPDATE:
            presencePublisher?.updateAccessToken(messageCast.accessToken);
            presencePublisher?.publishLastPresence();
            return;
        default:
            return;
    }
});

export default async function setupDiscordPresencePublisher() {
    const { accessToken } = await BackgroundUtils.getToken();
    presencePublisher = new DiscordPresencePublisher(accessToken);

    console.info('Loaded Discord presence module...');
}
