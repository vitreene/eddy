import { fromPromise } from "xstate";
import React, { useEffect } from "react";
import type { Route } from "./+types/home";

// import { PlayerRunner } from "~/player";
// import { buildPlay } from "~/player/builder/build-play";
import { EditEvent } from "@/parts/event-edit";
import { sceneLogic, SceneLogicContext } from "@/provider/scene-logic";

import { EditCapsule } from "~/parts/capsule-edit";
import { getScene, type SceneComp } from "~/api/db";
import { SceneTreeView } from "@/parts/scene-tree-view";
import { EditItem } from "@/parts/item-edit";

// import * as scene02 from "../demos/scenes/scene-02";

export function meta() {
	return [{ title: "Eddy" }, { name: "description", content: "l'éditeur de séquences" }];
}

const SCENE_ID = 1;

export async function loader({ params }: Route.LoaderArgs) {
	// @ts-expect-error route provisoire
	const scene: SceneComp = await getScene(params?.id || SCENE_ID);
	return scene;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	console.log("loaderData SceneComp", loaderData);

	const logic = React.useMemo(
		() =>
			sceneLogic.provide({
				actors: {
					initContext: fromPromise(async () => {
						return Promise.resolve(loaderData);
					})
				}
			}),
		[loaderData]
	);

	return (
		<SceneLogicContext.Provider logic={logic}>
			<AppLayout data={loaderData} />
		</SceneLogicContext.Provider>
	);
}

const AppLayout = React.memo(function AppLayout({ data }: { data: SceneComp }) {
	//TODO data doit etre recalculé a chaque modif -> dans player
	// player si modif ne rejoue pas, se place à l'endroit de la modif et se met en pause

	// const scene = buildPlay(data);

	const actorRef = SceneLogicContext.useActorRef();
	useEffect(() => {
		actorRef.subscribe((snapshot) => {
			console.log("snapshot", snapshot);
		});

		console.log(actorRef);
	}, [actorRef]);

	return (
		<main className="app-layout">
			<section className="base-layout layout-menu">Eddy</section>
			<section className="base-layout layout-chutier">
				<p className="border-primary-500 border-b-2">Chutier</p>
			</section>
			<section className="base-layout layout-capsules">
				<SceneTreeView />
			</section>

			<section className="base-layout layout-player flex flex-col">
				{/* <PlayerRunner scene={scene} /> */}
			</section>
			<section className="base-layout layout-infos">
				<EditCapsule />
				<EditItem />
			</section>
			<section className="base-layout layout-edit">
				<EditEvent />
			</section>
		</main>
	);
});

/* 
erreur de conception :
- ne pas définir capsule comme un objet, sinon on duplique toute la logique de capsuleElement. 
idéalement : renommer capsuleElement 
capsuleElement -> capsuleItem ? 

cela implique que scene va désigner une capsule-maitre qui va contenir toutes les autres capsules, 
ce qui va permettre de les ordonner et leur attribuer un décor.
-> capsule n'a plus besoin de la relation decor. 

dans scene, ajouter initial : id de la capsule-maitre
dans ce cas, pas besoin de relation "capsules"  assuré par capsuleItems
->si créer une table de liaison
*/
