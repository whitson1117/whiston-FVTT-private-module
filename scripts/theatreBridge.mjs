import {Theatre} from "./theatre/scripts/Theatre.js";
import CONSTANTS from "./theatre/scripts/constants/constants.js";

export default class TheatreBridge {
    static get instance() {
        return Theatre?.instance ?? window.theatre ?? null;
    }

    static getTheatreId(actorId) {
        return `${CONSTANTS.PREFIX_ACTOR_ID}${actorId}`;
    }

    static getActor(actorId) {
        return actorId ? game.actors.get(actorId) : null;
    }

    static isReady() {
        return !!this.instance?.theatreNavBar;
    }

    static isActorStaged(actorId) {
        const actor = this.getActor(actorId);
        if (!actor || !this.isReady()) return false;
        return Theatre.isActorStaged(actor);
    }

    static async toggleActorStage(actorId) {
        const actor = this.getActor(actorId);
        if (!actor) return false;
        if (!this.isReady()) {
            ui.notifications?.warn(game.i18n.localize("MRKB.TheatreNotReady") || "Theatre is not ready yet.");
            return false;
        }

        if (Theatre.isActorStaged(actor)) {
            Theatre.removeFromNavBar(actor);
            return false;
        }

        Theatre.addToNavBar(actor);
        await this.activateActor(actorId);
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
        if (!this.isReady()) return;
        const actor = this.getActor(actorId);
        if (!actor || !Theatre.isActorStaged(actor)) return;

        const theatreId = this.getTheatreId(actorId);
        if (this.instance.speakingAs !== theatreId) {
            await this.instance.activateInsertById(theatreId);
        }
        this.instance.setUserTyping(game.user.id, theatreId);
    }

    static async clearSpeaking() {
        if (!this.isReady()) return;

        const theatreId = this.instance.speakingAs;
        if (theatreId && theatreId !== CONSTANTS.NARRATOR) {
            await this.instance.activateInsertById(theatreId);
        }
        this.instance.removeUserTyping(game.user.id);
    }
}
