import TypingAlert from "./typingAlert.mjs";

export default class Setting {
	static get(key) {
		return game.settings.get("whiston-FVTT-private-module", key);
	}
	static set(type, url) {
	    game.settings.set("whiston-FVTT-private-module", type, url);
	}
	static register() {
		game.settings.register("whiston-FVTT-private-module", "font-size", {
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
			onChange: (value) => document.querySelector(".chat-log").style.setProperty("--font-size", value + "px")
		});
		game.settings.register("whiston-FVTT-private-module", "use-portrait", {
			name: "MRKB.UsePortrait",
			hint: "MRKB.UsePortraitHint",
			scope: "world",
			config: true,
			type: Boolean,
			default: true,
			onChange: () => window.location.reload()
		});
		game.settings.register("whiston-FVTT-private-module", "chat-merge", {
			name: "MRKB.ChatMerge",
			hint: "MRKB.ChatMergeHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			onChange: () => window.location.reload()
		});
		game.settings.register("whiston-FVTT-private-module", "colored-chat", {
			name: "MRKB.ColoredChat",
			hint: "MRKB.ColoredChatHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			onChange: (value) => {
				const chatLog = ui.chat.element.querySelector(".chat-log");
				chatLog.classList.toggle("color-applied", value);
			}
		});
		game.settings.register("whiston-FVTT-private-module", "new-font", {
			name: "MRKB.NewFont",
			hint: "MRKB.NewFontHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			onChange: (value) => {
				const chatLog = ui.chat.element.querySelector(".chat-log");
				chatLog.classList.toggle("font-applied", value);
			}
		});

		game.settings.register("whiston-FVTT-private-module", "actor-favorites", {
			name: "액터 즐겨찾기",
			scope: "client",
			config: false,
			type: Array,
			default: []
		});
		game.settings.register("whiston-FVTT-private-module", "talk-mode", {
			name: "대화 모드",
			scope: "client",
			config: false,
			type: String,
			default: "normal"
		});
		
		/*UTILITY*/

		game.settings.register("whiston-FVTT-private-module", "typing-players", {
			name: "입력 중인 플레이어",
			scope: "client",
			config: false,
			type: Array,
			default: [],
			onChange: (value) => TypingAlert.handleTypingAlert(value)
		});

		/*UI Toggle*/

		game.settings.register("whiston-FVTT-private-module", "ui-actor", {
			name: "액터 셀렉터 토글",
			hint: "",
			scope: "client",
			config: false,
			type: Boolean,
			default: false
		});
		game.settings.register("whiston-FVTT-private-module", "ui-favorites", {
			name: "액터 즐겨찾기 토글",
			hint: "",
			scope: "client",
			config: false,
			type: Boolean,
			default: true
		});
		game.settings.register("whiston-FVTT-private-module", "ui-msgMode", {
			name: "메시지 모드 토글",
			hint: "",
			scope: "client",
			config: false,
			type: Boolean,
			default: false
		});
	}
}