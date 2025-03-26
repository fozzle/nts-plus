import {
    DiscordGatewayOpcodes,
    DiscordGatewayMessage,
    DiscordActivity,
    DiscordReconnectableCloseCodes,
} from '../shared/DiscordTypes';

const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg';
const DISCONNECT_TIMEOUT = 20 * 1000;

export class DiscordSocket {
    #socket: WebSocket | undefined;
    #accessToken: string;
    #resumeGatewayURL: string | undefined;
    #sessionId: string = '';
    #connectPromise?: Promise<void>;
    #connectResolve: () => void = () => null;
    #destroyTimeout?: number;
    #heartbeatInterval?: number;
    #heartbeatTimeout?: number;
    #sequenceNumber: number | null = null;

    constructor(accessToken: string) {
        this.#accessToken = accessToken;
    }

    ensureConnected() {
        if (!this.#socket) {
            this.#connect(DISCORD_GATEWAY_URL);
        }
        return this.#connectPromise;
    }

    updatePresence(activity?: DiscordActivity) {
        if (activity == null) {
            this.#scheduleDisconnect();
        } else {
            this.#cancelDisconnect();
        }
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

    /** Private */

    #connect(gatewayURL: string) {
        this.#connectPromise = new Promise((resolve) => {
            this.#connectResolve = resolve;
        });
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
            console.info('Discord socket closed with terminal code', code);
            this.#disconnect();
        }
    };

    #handleHello(data: Record<string, unknown>) {
        if (this.#sessionId !== '' && this.#resumeGatewayURL != null) {
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
        // Tear down old socket without explicitly closing.
        this.#socket?.removeEventListener('message', this.#handleSocketMessage);
        this.#socket?.removeEventListener('close', this.#handleDisconnect);
        this.#socket = undefined;

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
        this.#connectResolve();
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

    #scheduleDisconnect() {
        this.#destroyTimeout = window.setTimeout(() => {
            this.#disconnect();
        }, DISCONNECT_TIMEOUT);
    }

    #cancelDisconnect() {
        window.clearTimeout(this.#destroyTimeout);
    }

    #disconnect() {
        this.#socket?.close(1000);
        this.#socket = undefined;
        this.#sessionId = '';
        this.#resumeGatewayURL = undefined;
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
