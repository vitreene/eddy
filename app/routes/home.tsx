import { useReducer } from "react";
import type { Route } from "./+types/home";

import { PlayerRunner } from "~/player";
import { Capsules } from "~/parts/capsules";
import { getScene, type SceneComp } from "~/api/db";
import { EditMedia } from "~/parts/media-edit";
import { EditCapsule } from "~/parts/capsule-edit";
import { reducer as sceneReducer, SceneContext } from "~/provider/scene-provider";
import { reducer as editMediaReducer, EditMediaContext } from "~/provider/edit-media-provider";
import * as scene02 from "../demos/scenes/scene-02";
import { buildPlay } from "@/player/builder/build-play";
import React from "react";

export function meta() {
	return [{ title: "New React Router App" }, { name: "description", content: "Welcome to React Router!" }];
}

const SCENE_ID = 1;
export async function loader({ params }: Route.LoaderArgs) {
	const scene: SceneComp = await getScene(SCENE_ID);
	return scene;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	// console.log('loaderData', loaderData);Ò

	// console.log('REF_DATA', { persos: scene02.persos, events: Object.fromEntries(scene02.eventtimes.entries()) });

	// console.log('SCENE->', { persos: scenePlay.persos, events: Object.fromEntries(scenePlay.events.entries()) });

	const [editStateScene, dispatchEditStateScene] = useReducer(sceneReducer, {
		capsuleId: null,
		elementId: null,
		activeCue: null,
		activeAction: null
	});

	/*
	pour test : 
	remplacer les reducers par Xstate
	- créer deux machines equivalentes, 
	- implementer dans les composants 
	
	*/
	const [editMediaState, dispatchEditMediaState] = useReducer(editMediaReducer, {
		intro: {
			ref: "",
			text: "",
			start: 0,
			end: 0,
			id: ""
		}
	});

	return (
		<SceneContext value={{ scene: loaderData, state: editStateScene, dispatch: dispatchEditStateScene }}>
			<EditMediaContext value={{ state: editMediaState, dispatch: dispatchEditMediaState }}>
				<AppLayout data={loaderData} />
			</EditMediaContext>
		</SceneContext>
	);
}

const AppLayout = React.memo(function AppLayout({ data }: { data: SceneComp }) {
	//TODO data doit etre recalculé a chaque modif -> dans player
	// player si modif ne rejoue pas, se place à l'endroit de la modif et se met en pause
	const scene = buildPlay(data);
	return (
		<main className="app-layout">
			<section className="base-layout layout-menu">Eddy</section>
			<section className="base-layout layout-chutier">Chutier</section>
			<section className="base-layout layout-capsules">
				<Capsules />
			</section>
			<section className="base-layout layout-capsule-edit flex">
				<EditCapsule />
			</section>
			<section className="base-layout layout-player flex flex-col">
				<PlayerRunner scene={scene} />
			</section>
			<section className="base-layout layout-infos"></section>
			<section className="base-layout layout-edit">
				<EditMedia />
			</section>
		</main>
	);
});

/* 
a revoir :
- la scene n'est lue q'au demarage et enregistrée que périodiquement, 
- la scene est un objet en memoire 

*/
