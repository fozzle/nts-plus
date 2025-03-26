import { MessageType } from './Constants';

export type NTSPlusMessage =
    | {
          type: MessageType.GET_TOKEN;
      }
    | {
          type: MessageType.LAUNCH_AUTHORIZATION;
      }
    | {
          type: MessageType.REVOKE_TOKENS;
      };
