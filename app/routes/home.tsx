import { fromPromise } from "xstate";
import React, { useEffect, useState } from "react";
import type { Route } from "./+types/home";

import { PlayerRunner, type PlayerProps } from "~/player";

import { EditEvent } from "@/parts/event-edit";
import { sceneLogic, SceneLogicContext } from "@/provider/scene-logic";

import { getScene, getScenes, type SceneRef } from "~/api/db";
import { SceneTreeView } from "@/parts/scene-tree-view";
import { EditItem } from "@/parts/item-edit";
import { buildScene } from "@/player/builder/builder";
// import { DemoTransformEditor } from "@/components/position-editor/exemple";

import * as scene02 from "../demos/scenes/scene-02";
import { Menu } from "@/parts/menu";

export function meta() {
	return [{ title: "Eddy" }, { name: "description", content: "l'éditeur de séquences" }];
}

export async function loader({ params }: Route.LoaderArgs) {
	const scene = params?.id ? await getScene(Number(params?.id)) : null;
	const scenes = await getScenes();
	return { scene, scenes };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	console.log("loaderData SceneComp", loaderData);

	const logic = React.useMemo(() => {
		return sceneLogic.provide({
			actors: {
				initContext: fromPromise(async () => {
					return Promise.resolve(loaderData.scene || {});
				})
			}
		});
	}, [loaderData]);

	return (
		<SceneLogicContext.Provider logic={logic}>
			<AppLayout data={{ scenes: loaderData.scenes }} />
		</SceneLogicContext.Provider>
	);
}

const AppLayout = React.memo(function AppLayout({ data }: { data: { scenes: Array<SceneRef> } }) {
	console.log("DATA", data);

	const [scene, setScene] = useState<PlayerProps & { styles?: string }>({
		persos: scene02.persos,
		events: scene02.eventtimes,
		styles: ""
	});

	const actorRef = SceneLogicContext.useActorRef();
	useEffect(() => {
		actorRef.subscribe((snapshot) => {
			console.log("snapshot", snapshot.status, snapshot.context);
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
			<section className="base-layout layout-menu">
				<Menu scenes={data.scenes} />
			</section>
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
