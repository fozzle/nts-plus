/**
 * Module responsible for updating Discord presence in response to live player state.
 */
import { DISCORD_APPLICATION_ID, DISCORD_RP_ASSET_ID } from '../shared/DiscordConstants';
import { ActivityTypes, DiscordActivity } from '../shared/DiscordTypes';
import * as BackgroundUtils from '../background/BackgroundUtils';
import { DiscordSocket } from '../shared/DiscordSocket';
import { debounce } from '../shared/debounce';

export default async function setupDiscordPresencePublisher() {
    const { accessToken: discordAccessToken } = await BackgroundUtils.getToken();

    if (!discordAccessToken) return;

    function pickForCompare(activity: DiscordActivity | undefined) {
        return activity != null ? { details: activity.details, state: activity.state } : undefined;
    }

    const discordSocket = new DiscordSocket(discordAccessToken);
    discordSocket.onResume = refreshPresence;

    // These are the only fields that can change, just want to avoid re-sending presence with new start timestamps
    // just because something minor changed.
    let lastPresence: DiscordActivity | undefined;
    async function updateDiscordPresence(showName: string | null, channel?: 'archive' | 1 | 2) {
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
            JSON.stringify(pickForCompare(newPresence)) ===
            JSON.stringify(pickForCompare(lastPresence))
        ) {
            return;
        }
        await discordSocket.ensureConnected();
        discordSocket.updatePresence(newPresence);
        lastPresence = newPresence;
    }

    async function refreshPresence() {
        console.info('Refreshing Presence');
        discordSocket.updatePresence(lastPresence);
    }

    /**
     * Since we're essentially scraping, wait a bit to ensure HTML state has settled before determining
     * what we're listening to.
     */
    const handleMutation = debounce((mixCloudEvent?: 'play' | 'pause') => {
        const playingChannel = document.querySelector('.live-channel--playing');
        const activeSoundcloudPlayer = document.querySelector(
            '.soundcloud-player:not(.visually-hidden)',
        );
        let channelNumber: Parameters<typeof updateDiscordPresence>[1];
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

        console.info('Updating Discord presence', showName, channelNumber);
        updateDiscordPresence(showName, channelNumber);
    }, 1000);

    const channelPlayerObserver = new MutationObserver(() => {
        console.info('Live Player Update');
        handleMutation();
    });
    const livePlayer = document.getElementById('nts-live-header') as HTMLDivElement;
    channelPlayerObserver.observe(livePlayer, {
        childList: true,
        subtree: true,
    });

    const soundcloudPlayerObserver = new MutationObserver(() => {
        console.info('Soundcloud Player Update');
        handleMutation();
    });
    const archivePlayer = document.querySelector('.soundcloud-player') as HTMLDivElement;
    soundcloudPlayerObserver.observe(archivePlayer, {
        childList: true,
        subtree: true,
    });

    window.addEventListener('message', (message) => {
        const messagePayload = message.data;
        if (typeof messagePayload !== 'object') return;
        if (messagePayload.ntsPlus !== true) return;
        switch (messagePayload.type) {
            case 'play':
            case 'pause':
                console.info('Mixcloud Player Update', messagePayload.type);
                handleMutation(messagePayload.type);
        }
    });

    console.info('Loaded Discord presence module...');
}
