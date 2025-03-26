/**
 * Module responsible for updating Discord presence in response to live player state.
 */
import {
    DISCORD_APPLICATION_ID,
    DISCORD_RP_ASSET_ID,
} from '../shared/DiscordConstants';
import { ActivityTypes, DiscordActivity } from '../shared/DiscordTypes';
import * as BackgroundUtils from '../background/BackgroundUtils';
import { DiscordSocket } from '../shared/DiscordSocket';

export default async function setupDiscordPresencePublisher() {
    const { accessToken: discordAccessToken } =
        await BackgroundUtils.getToken();

    const discordSocket = new DiscordSocket(discordAccessToken);
    let lastPresence: DiscordActivity | undefined;
    async function updateDiscordPresence(
        channel: number | null,
        showName?: string,
    ) {
        const newPresence =
            channel != null
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
                      state: `Channel ${channel}`,
                      buttons: ['Listen In'],
                      metadata: {
                          button_urls: ['https://nts.live'],
                      },
                  }
                : undefined;

        // Lazy deep comparison
        if (JSON.stringify(lastPresence) === JSON.stringify(newPresence)) {
            return;
        }
        await discordSocket.ensureConnected();
        discordSocket.updatePresence(newPresence);
        lastPresence = newPresence;
    }

    const livePlayer = document.getElementById(
        'nts-live-header',
    ) as HTMLDivElement;

    const channelPlayerObserver = new MutationObserver(() => {
        const playingChannel = document.querySelector('.live-channel--playing');
        console.log('Live player changed.');
        if (playingChannel) {
            const channelNumber = playingChannel.classList.contains('channel-2')
                ? 2
                : 1;
            const showName =
                playingChannel.querySelector(
                    'h3.live-channel--collapsed__broadcast__heading',
                )?.textContent ?? undefined;
            updateDiscordPresence(channelNumber, showName);
        } else {
            updateDiscordPresence(null);
        }
    });
    channelPlayerObserver.observe(livePlayer, {
        childList: true,
        subtree: true,
    });
    console.info('Loaded Discord presence module...');
}
