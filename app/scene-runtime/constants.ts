export const SCENE_ID = "container-scene";
export const ROOT = "root-scene";
export const ROOT_SCENE_WRAPPER_ID = "root-scene-wrapper";
export const ROOT_SCENE_CLASSNAME = `
#${ROOT_SCENE_WRAPPER_ID}{
    display: grid;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    container-type: size;
    container-name: scene;
}

.${ROOT}{
    display: grid;
    grid-row: 1 / -1;
    grid-column: 1 / -1;
    overflow: hidden;
}
`;
