import { fromPromise } from "xstate";
import React, { useEffect, useState } from "react";
import type { Route } from "./+types/home";

import { PlayerRunner, type PlayerProps } from "~/player";

import { EditEvent } from "@/parts/event-edit";
import { sceneLogic, SceneLogicContext } from "@/provider/scene-logic";

import { getScene, type SceneComp } from "~/api/db";
import { SceneTreeView } from "@/parts/scene-tree-view";
import { EditItem } from "@/parts/item-edit";
import { buildScene } from "@/player/builder/builder";
// import { DemoTransformEditor } from "@/components/position-editor/exemple";

import * as scene02 from "../demos/scenes/scene-02";

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
	// console.log("loaderData SceneComp", loaderData);

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
	const [scene, setScene] = useState<PlayerProps & { styles?: string }>({
		persos: scene02.persos,
		events: scene02.eventtimes,
		styles: ""
	});

	//TODO data doit etre recalculé a chaque modif -> dans player
	// player si modif ne rejoue pas, se place à l'endroit de la modif et se met en pause

	// const scene = buildPlay(data);

	const actorRef = SceneLogicContext.useActorRef();
	useEffect(() => {
		actorRef.subscribe((snapshot) => {
			console.log("snapshot", snapshot.context);

			const { active, ...state } = snapshot.context;
			if (Object.keys(state).length) {
				const sc = buildScene(state);
				console.log(sc);

				setScene(sc);
			}
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
				<PlayerRunner scene={scene} />
				{/* <DemoTransformEditor /> */}
			</section>
			<section className="base-layout layout-infos">
				<EditItem />
			</section>
			<section className="base-layout layout-edit">
				<EditEvent />
			</section>
		</main>
	);
});
