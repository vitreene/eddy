import { fromPromise } from "xstate";
import React, { useEffect, useState } from "react";
import type { Route } from "./+types/home";

import { PlayerRunner, type PlayerProps } from "~/player";

import { EditEvent } from "@/parts/event-edit";
import { sceneLogic, SceneLogicContext } from "@/provider/scene-logic";

import { getScene, getScenes, type SceneComp, type SceneRef } from "@/api/db";
import { SceneTreeView } from "@/parts/scene-tree-view";
import { EditItem } from "@/parts/item-edit";
import { buildScene } from "@/player/builder/builder";
// import { DemoTransformEditor } from "@/components/position-editor/exemple";

// import * as scene02 from "../demos/scenes/scene-02";
import { Menu } from "@/parts/menu";

export function meta() {
	return [{ title: "Eddy" }, { name: "description", content: "l'éditeur de séquences" }];
}

export async function loader({ params }: Route.LoaderArgs) {
	const scene = params?.id ? await getScene(Number(params?.id)) : null;
	const scenes = await getScenes();
	return { scene, scenes };
}

interface HomeProps {
	scene: SceneComp;
	scenes: Array<SceneRef>;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	console.log("**** HOME : loaderData ", loaderData);

	return (
		<SceneLogicContext.Provider>
			<AppLayout data={loaderData} />
		</SceneLogicContext.Provider>
	);
}

const AppLayout = React.memo(function AppLayout({ data }: { data: HomeProps }) {
	const [scene, setScene] = useState<PlayerProps & { styles?: string }>({
		persos: [],
		events: new Map(),
		styles: ""
	});

	const actorRef = SceneLogicContext.useActorRef();
	useEffect(() => {
		actorRef.subscribe((snapshot) => {
			console.log("snapshot", snapshot.status, snapshot.context);
			const { active, ...state } = snapshot.context;
			if (Object.keys(state).length) {
				const sc = buildScene(state);

				setScene(sc);
			}
		});
	}, [actorRef]);

	useEffect(() => {
		actorRef.send({ type: "init", payload: data.scene });
	}, [actorRef, data.scene]);
	console.log("SCENE", scene);
	return (
		<main className="app-layout">
			<section className="base-layout layout-menu">
				<Menu scenes={data.scenes} />
			</section>
			<section className="base-layout layout-chutier">
				<p className="border-primary-500 border-b-2">Chutier</p>
			</section>
			<section className="base-layout layout-capsules w-60">
				<SceneTreeView />
			</section>

			<section className="base-layout layout-player">
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
