import {ALTER_IMAGE} from "./constants.mjs";

const getPortrait = (id, userId) => {
    const avatar = game.users.get(userId)?.avatar ?? ALTER_IMAGE;
    return game.actors.get(id)?.img ?? avatar;
}

export default getPortrait;
