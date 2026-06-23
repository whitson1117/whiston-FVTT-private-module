import CONSTANTS from "./constants/constants.js";
import Logger from "./lib/Logger.js";

export let theatreSocket;

export function registerSocket() {
  Logger.debug("Registered theatreSocket");
  if (theatreSocket) {
    return theatreSocket;
  }

  if (globalThis.socketlib && game.modules.get("socketlib")?.active) {
    theatreSocket = socketlib.registerModule(CONSTANTS.MODULE_ID);
  } else {
    const handlers = new Map();
    game.socket?.on(CONSTANTS.SOCKET, (packet) => {
      if (!packet || packet?.payload?.senderId === game.user.id) return;
      const handler = handlers.get(packet.handler);
      if (handler) handler(packet.payload);
    });
    theatreSocket = {
      register(handler, callback) {
        handlers.set(handler, callback);
      },
      executeForEveryone(handler, payload) {
        game.socket?.emit(CONSTANTS.SOCKET, { handler, payload });
      },
    };
    Logger.warn("socketlib is not active; Theatre is using Foundry's module socket fallback.", false);
  }

  game.modules.get(CONSTANTS.MODULE_ID).socket = theatreSocket;
  return theatreSocket;
}
