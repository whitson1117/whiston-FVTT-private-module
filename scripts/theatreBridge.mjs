import {MODULE_ID} from "./constants.mjs";

const THEATRE_PREFIX = "theatre-";
const NARRATOR = "Narrator";

export default class TheatreBridge {
    static get instance() {
        return this.theatreClass?.instance ?? window.theatre ?? null;
    }

    static get theatreClass() {
        return window.Theatre ?? null;
    }

    static get api() {
        return game.modules.get(MODULE_ID)?.api ?? null;
    }

    static wait(ms = 0) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    static getTheatreId(actorId) {
        return `${THEATRE_PREFIX}${actorId}`;
    }

    static getActor(actorId) {
        return actorId ? game.actors.get(actorId) : null;
    }

    static isReady() {
        return !!this.instance?.theatreNavBar;
    }

    static async ensureReady() {
        if (this.isReady()) return true;
        try {
            const theatreModule = await import("./theatre/module.js");
            theatreModule?.initializeTheatre?.();
        } catch (error) {
            console.error(`${MODULE_ID} | Theatre integration failed to initialize`, error);
        }
        this.instance?.initialize?.();
        return this.isReady();
    }

    static isActorStaged(actorId) {
        const actor = this.getActor(actorId);
        if (!actor || !this.isReady()) return false;
        return this.api?.isActorStaged?.(actor) ?? this.theatreClass?.isActorStaged?.(actor) ?? false;
    }

    static async toggleActorStage(actorId) {
        const actor = this.getActor(actorId);
        if (!actor) return false;
        if (!await this.ensureReady()) {
            ui.notifications?.warn(game.i18n.localize("MRKB.TheatreNotReady") || "Theatre is not ready yet.");
            return false;
        }

        if (this.isActorStaged(actorId)) {
            if (this.api?.removeFromNavBar) this.api.removeFromNavBar(actor);
            else this.theatreClass?.removeFromNavBar?.(actor);
            if (this.instance?.speakingAs === this.getTheatreId(actorId)) {
                this.instance.removeUserTyping?.(game.user.id);
            }
            return false;
        }

        if (this.api?.addToNavBar) this.api.addToNavBar(actor);
        else this.theatreClass?.addToNavBar?.(actor);
        if (game.user.character?.id === actorId) {
            await this.wait(50);
            await this.activateActor(actorId);
        }
        return true;
    }

    static async toggleCurrentActorStage(event) {
        event?.preventDefault();
        event?.stopPropagation();

        const actorId = game.user.character?.id;
        if (!actorId) {
            ui.notifications?.warn(game.i18n.localize("MRKB.SelectActorBeforeStage") || "Select an actor first.");
            return false;
        }
        return this.toggleActorStage(actorId);
    }

    static async activateActor(actorId) {
        if (!await this.ensureReady()) return;
        const actor = this.getActor(actorId);
        if (!actor || !this.isActorStaged(actorId)) return;

        const theatreId = this.getTheatreId(actorId);
        if (this.instance.speakingAs !== theatreId) {
            await this.instance.activateInsertById(theatreId);
        }
        this.instance.setUserTyping(game.user.id, theatreId);
        this.instance.renderEmoteMenu?.();
        if (!this.instance.rendering) this.instance._renderTheatre?.(performance.now());
    }

    static async clearSpeaking() {
        if (!await this.ensureReady()) return;

        const theatreId = this.instance.speakingAs;
        if (theatreId && theatreId !== NARRATOR) {
            await this.instance.activateInsertById(theatreId);
        }
        this.instance.removeUserTyping(game.user.id);
    }
}
