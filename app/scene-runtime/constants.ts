export const SCENE_ID = "container-scene";
export const ROOT = "root-scene";
export const ROOT_SCENE_CLASSNAME = `
.${ROOT}{display: grid;grid-area: 1 / 1 / -1 / -1;}
.${ROOT} > * {grid-area:1/-1}
`;
