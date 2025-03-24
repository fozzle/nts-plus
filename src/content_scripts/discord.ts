/**
 * Module responsible for updating Discord presence in response to live player state.
 */
import {
    DISCORD_APPLICATION_ID,
    DISCORD_RP_ASSET_ID,
} from '../shared/DiscordConstants';
import {
    DiscordGatewayOpcodes,
    DiscordGatewayMessage,
    DiscordActivity,
    ActivityTypes,
    DiscordReconnectableCloseCodes,
} from '../shared/DiscordTypes';
import browser from 'webextension-polyfill';

const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg';

let discordSocket: DiscordSocket | null = null;

export default function setupDiscordPresencePublisher() {
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
                  // TODO: This is broken for some reason, but in theory we can add this if it works again.
                  //   buttons: [{label: "Listen In", url: "https://www.nts.live"}]
              }
            : undefined;

    if (!discordSocket) {
        const { accessToken: discordAccessToken } =
            (await browser.runtime.sendMessage(browser.runtime.id, {
                request: 'get_token',
            })) as { accessToken: string };
        if (!discordAccessToken) return;
        discordSocket = new DiscordSocket(discordAccessToken);
    }

    await discordSocket.waitReady();
    discordSocket.updatePresence(newPresence);
}

class DiscordSocket {
    #socket: WebSocket | undefined;
    #accessToken: string;
    #resumeGatewayURL: string | undefined;
    #sessionId: string = '';
    #waitReadyPromise?: Promise<void>;
    #waitReadyResolve: () => void = () => null;
    #heartbeatInterval?: number;
    #heartbeatTimeout?: number;
    #sequenceNumber: number | null = null;

    constructor(accessToken: string) {
        this.#connect(DISCORD_GATEWAY_URL);
        this.#accessToken = accessToken;
        this.#waitReadyPromise = new Promise((resolve) => {
            this.#waitReadyResolve = resolve;
        });
    }

    waitReady() {
        return this.#waitReadyPromise;
    }

    #connect(gatewayURL: string) {
        this.#socket = new WebSocket(gatewayURL);
        this.#socket.addEventListener('message', this.#handleSocketMessage);
        this.#socket.addEventListener('close', this.#handleDisconnect);
    }

    #handleSocketMessage = ({ data }: MessageEvent) => {
        const parsed = JSON.parse(data) as DiscordGatewayMessage;

        switch (parsed.op) {
            case DiscordGatewayOpcodes.DISPATCH:
                if (parsed.s) {
                    this.#sequenceNumber = parsed.s as number;
                }
                return this.#handleDispatch(parsed.t, parsed.d);
            case DiscordGatewayOpcodes.HELLO:
                return this.#handleHello(parsed.d);
            case DiscordGatewayOpcodes.RECONNECT:
                return this.#handleReconnect();
            default:
            // Nothing to do here...
        }
    };

    #handleDisconnect = ({ code }: CloseEvent) => {
        console.info('Discord Socket Disconnected.');
        if (code in DiscordReconnectableCloseCodes) {
            this.#handleReconnect();
        } else {
            console.error('Discord socket closed with terminal code', code);
        }
    };

    #handleHello(data: Record<string, unknown>) {
        if (this.#sessionId != null && this.#resumeGatewayURL != null) {
            return this.#sendResume();
        }

        if (this.#heartbeatTimeout) {
            clearTimeout(this.#heartbeatTimeout);
        }

        this.#send({
            op: DiscordGatewayOpcodes.IDENTIFY,
            d: {
                token: `Bearer ${this.#accessToken}`,
                properties: {
                    os: 'unknown',
                    browser: navigator.userAgent,
                    device: 'unknown',
                },
            },
        });
        this.#heartbeatInterval = data.heartbeat_interval as number;
        this.#heartbeatTimeout = window.setTimeout(() => {
            this.#heartbeat();
        }, this.#heartbeatInterval * Math.random());
    }

    #handleReconnect() {
        this.#socket?.close(1000);

        setTimeout(() => {
            this.#connect(this.#resumeGatewayURL ?? DISCORD_GATEWAY_URL);
        }, 1000);
    }

    #handleDispatch(event: string, data: Record<string, unknown>) {
        if (event === 'READY') {
            return this.#handleReady(data);
        }
    }

    #handleReady(data: Record<string, unknown>) {
        this.#resumeGatewayURL = data.resume_gateway_url as string;
        this.#sessionId = data.session_id as string;
        this.#waitReadyResolve();
        console.info('Discord Socket Connected.');
    }

    #sendResume() {
        this.#send({
            op: DiscordGatewayOpcodes.RESUME,
            d: {
                token: `Bearer ${this.#accessToken}`,
                session_id: this.#sessionId,
                seq: this.#sequenceNumber,
            },
        });
    }

    updatePresence(activity?: DiscordActivity) {
        this.#send({
            op: DiscordGatewayOpcodes.UPDATE_PRESENCE,
            d: {
                since: null,
                activities: activity ? [activity] : [],
                status: 'online',
                afk: false,
            },
        });
    }

    #heartbeat() {
        this.#send({
            op: DiscordGatewayOpcodes.HEARTBEAT,
            d: this.#sequenceNumber!,
        });
        this.#heartbeatTimeout = window.setTimeout(() => {
            this.#heartbeat();
        }, this.#heartbeatInterval!);
    }

    #send(payload: DiscordGatewayMessage) {
        const serialized = JSON.stringify(payload);
        this.#socket?.send(serialized);
    }
}
