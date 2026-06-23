import TypingAlert from "./typingAlert.mjs";
import {MODULE_ID} from "./constants.mjs";

const getChatLog = () => {
	const chatElement = ui.chat?.element instanceof HTMLElement ? ui.chat.element : ui.chat?.element?.[0] ?? null;
	return chatElement?.querySelector(".chat-log") ?? document.querySelector(".chat-log");
};

export default class Setting {
	static get(key) {
		return game.settings.get(MODULE_ID, key);
	}
	static set(type, url) {
	    game.settings.set(MODULE_ID, type, url);
	}
	static register() {
		game.settings.register(MODULE_ID, "font-size", {
			name: "MRKB.FontSize",
			hint: "MRKB.FontSizeHint",
			scope: "client",
			config: true,
			type: Number,
			range: {
				min: 8,
				max: 20
			},
			default: 14,
			onChange: (value) => getChatLog()?.style.setProperty("--font-size", value + "px")
		});
		game.settings.register(MODULE_ID, "use-portrait", {
			name: "MRKB.UsePortrait",
			hint: "MRKB.UsePortraitHint",
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
			onChange: () => window.location.reload()
		});
		game.settings.register(MODULE_ID, "chat-merge", {
			name: "MRKB.ChatMerge",
			hint: "MRKB.ChatMergeHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			onChange: () => window.location.reload()
		});
		game.settings.register(MODULE_ID, "colored-chat", {
			name: "MRKB.ColoredChat",
			hint: "MRKB.ColoredChatHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			onChange: (value) => {
				getChatLog()?.classList.toggle("color-applied", value);
			}
		});
		game.settings.register(MODULE_ID, "new-font", {
			name: "MRKB.NewFont",
			hint: "MRKB.NewFontHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			onChange: (value) => {
				getChatLog()?.classList.toggle("font-applied", value);
			}
		});

		game.settings.register(MODULE_ID, "actor-favorites", {
			name: "액터 즐겨찾기",
			scope: "client",
			config: false,
			type: Array,
			default: []
		});
		game.settings.register(MODULE_ID, "talk-mode", {
			name: "대화 모드",
			scope: "client",
			config: false,
			type: String,
			default: "normal"
		});
		
		/*UTILITY*/

		game.settings.register(MODULE_ID, "typing-players", {
			name: "입력 중인 플레이어",
			scope: "client",
			config: false,
			type: Array,
			default: [],
			onChange: (value) => TypingAlert.handleTypingAlert(value)
		});

		/*UI Toggle*/

		game.settings.register(MODULE_ID, "ui-actor", {
			name: "액터 셀렉터 토글",
			hint: "",
			scope: "client",
			config: false,
			type: Boolean,
			default: false
		});
		game.settings.register(MODULE_ID, "ui-favorites", {
			name: "액터 즐겨찾기 토글",
			hint: "",
			scope: "client",
			config: false,
			type: Boolean,
			default: true
		});
		game.settings.register(MODULE_ID, "ui-msgMode", {
			name: "메시지 모드 토글",
			hint: "",
			scope: "client",
			config: false,
			type: Boolean,
			default: false
		});
	}
}
