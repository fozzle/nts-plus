export enum DiscordGatewayOpcodes {
    DISPATCH = 0,
    HEARTBEAT = 1,
    IDENTIFY = 2,
    UPDATE_PRESENCE = 3,
    READY = 4,
    RESUME = 6,
    RECONNECT = 7,
    INVALID_SESSION = 9,
    HELLO = 10,
}

export enum ActivityTypes {
    PLAYING = 0,
    LISTENING = 2,
}

export type DiscordCloseCodes = DiscordReconnectableCloseCodes | DiscordNoReconnectCloseCodes;
   

export enum DiscordReconnectableCloseCodes {
    UNKNOWN = 4000,
    UNKNOWN_OPCODE = 4001,
    DECODE_ERROR = 4002,
    NOT_AUTHENTICATED = 4003,
    ALREADY_AUTHENTICATED = 4005,
    INVALID_SEQUENCE = 4007,
    RATE_LIMITED = 4008,
    SESSION_TIMEOUT = 4009,
}

export enum DiscordNoReconnectCloseCodes {
    AUTHENTICATION_FAILED = 4004,
    INVALID_SHARD = 4010,
    SAHARDING_REQUIRED = 4011,
    INVALID_API_VERSION = 4012,
    INVALID_INTENTS = 4013,
    DISALLOWED_INTENTS = 4014,
}

export type DiscordGatewayMessage =
    | {
          op: DiscordGatewayOpcodes.DISPATCH;
          d: Record<string, unknown>;
          s: number;
          t: string;
      }
    | {
          op: DiscordGatewayOpcodes.HEARTBEAT;
          d: number;
      }
    | {
          op: Exclude<
              DiscordGatewayOpcodes,
              DiscordGatewayOpcodes.DISPATCH | DiscordGatewayOpcodes.HEARTBEAT
          >;
          d: Record<string, unknown>;
      };

export interface DiscordActivity {
    name: string;
    type: number;
    timestamps?: {
        start?: number,
        end?: number
    },
    details?: string,
    state?: string
    application_id?: string,
    buttons?: {label: string, url: string}[]
}

export interface DiscordUser {
    id: string,
    username: string,
    avatar?: string
}
