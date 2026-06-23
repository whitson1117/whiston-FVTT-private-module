import ChatHandler from "./chatHandler.mjs";
import ChatEditor from "./chatEditor.mjs";
import Setting from "./setting.mjs";
import ControlButtons from "./controlButtons.mjs";
import ActorControl from "./actorControl.mjs";
import ChatHotkey from "./chatHotkey.mjs";
import TurnNotice from "./turnNotice.mjs";
import SystemSpecific from "./systemSpecific.js";
import TypingAlert from "./typingAlert.mjs";
import {MODULE_ID} from "./constants.mjs";

import("./theatre/module.js").catch((error) => {
    console.error(`${MODULE_ID} | Theatre integration failed to load`, error);
});

const getHTMLElement = (element) => element instanceof HTMLElement ? element : element?.[0] ?? null;

Hooks.once("init", () => {
    //CONFIG.debug.hooks = true;
    Setting.register();
    if (game.system.id === "fatex") SystemSpecific.killFateXChatStyles();
});
Hooks.once("ready", () => {
    const chatLog = getHTMLElement(ui.chat?.element)?.querySelector(".chat-log");
    const isColoredChat = game.settings.get(MODULE_ID, "colored-chat");
    if (isColoredChat) chatLog?.classList.remove("themed", "theme-light");
});
Hooks.on("renderAbstractSidebarTab", (tab) => {
    if (tab.id === "chat") {
        ActorControl.initialize();
        ChatEditor.initialize();
        ChatHotkey.initialize();
        ControlButtons.initialize();
        TypingAlert.initialize();
        TypingAlert.clearOldTypingAlerts();
        TypingAlert.startClearingInterval();

        const isColoredChat = game.settings.get(MODULE_ID, "colored-chat");
        const isNewFont = game.settings.get(MODULE_ID, "new-font");

        const chatLog = getHTMLElement(tab.element)?.querySelector(".chat-log");
        if (!chatLog) return;
        if (isColoredChat) chatLog.classList.add("color-applied");
        if (isNewFont) chatLog.classList.add("font-applied");
    }
});
Hooks.on("combatTurnChange", (combatData) => {
    TurnNotice.notice(combatData);
});
Hooks.on("chatMessage", (chatLog, message, sender) => ChatHandler.chatProcessor(chatLog, message, sender));
Hooks.on("preCreateChatMessage", (message, source, options, id) => ChatHandler.preProcesser(message, source, options, id));
Hooks.on("createChatMessage", (message, option, id) => ChatHandler.createProcesser(message, option, id));
Hooks.on("renderChatMessageHTML", (message, html, data) => ChatHandler.renderProcesser(message, html, data));
Hooks.on("deleteChatMessage", ChatHandler.fixChatFlag.bind(ChatHandler, false));
Hooks.on("updateUser", (user, changed) => {
    if (user.id === game.user.id && Object.hasOwn(changed, "character")) {
        ActorControl._refresh();
    }
});
Hooks.on("getChatMessageContextOptions", (chatLog, options) => {
    const editOption = {
        name: game.i18n.localize("MRKB.Edit"),
        icon: '<i class="fa-solid fa-pen-to-square"></i>',
        condition: li => {
            const message = game.messages.get(li.dataset.messageId);
            return ((game.user.isGM || message.isAuthor) && message.type !== 5);
        },
        callback: li => ChatEditor._edit(li.dataset.messageId)
    }
    options.splice(3, 0, editOption);
});
