const CONSTANTS = {
    MODULE_ID: "whiston-FVTT-private-module",
    PATH: `modules/whiston-FVTT-private-module/`,
    PREFIX_I18N: `Theatre`,
    FLAGS: {},
    API: {
        EVENT_TYPE: {
            sceneevent: "sceneevent",
            typingevent: "typingevent",
            resyncevent: "resyncevent",
            reqresync: "reqresync",
        },
    },
    SOCKET: "module.whiston-FVTT-private-module",
    NARRATOR: "Narrator",
    ICONLIB: "modules/whiston-FVTT-private-module/assets/graphics/emotes",
    DEFAULT_PORTRAIT: "icons/mystery-man.png",
    PREFIX_ACTOR_ID: "theatre-",
    MAX_NUM_ACTORS_ON_CONTROL_GROUP: 5,
};

CONSTANTS.PATH = `modules/${CONSTANTS.MODULE_ID}/`;
CONSTANTS.SOCKET = `module.${CONSTANTS.MODULE_ID}`;
CONSTANTS.ICONLIB = `${CONSTANTS.PATH}assets/graphics/emotes`;

export default CONSTANTS;

