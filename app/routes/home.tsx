import React, { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/home";

import { PlayerRunner, type PlayerProps } from "~/player";

import { EditEvent } from "@/parts/event-edit";
import { SceneLogicContext } from "@/provider/scene-logic";

import { getAllContents, getScene, getScenes, type Content, type SceneComp, type SceneRef } from "@/api/db";
import { SceneTreeView } from "@/parts/scene-tree";
import { EditItem } from "@/parts/item-edit";
import { buildScene } from "@/player/builder/builder";
import { DemoTransformEditor } from "@/components/position-editor/exemple";

// import * as scene02 from "../demos/scenes/scene-02";
import { Menu } from "@/parts/menu";
import { Chutier } from "@/parts/chutier";
import { ResponsiveBackgroundSliceGrid } from "@/demos/split-image";
import { PinDemo } from "@/demos/Pins";

export function meta() {
	return [{ title: "Eddy" }, { name: "description", content: "l'éditeur de séquences" }];
}

export async function loader({ params }: Route.LoaderArgs) {
	const scene = params?.id ? await getScene(Number(params?.id)) : null;
	const scenes = await getScenes();
	const allContents = await getAllContents();
	return { scene, scenes, allContents };
}

interface HomeProps {
	scene: SceneComp;
	scenes: Array<SceneRef>;
	allContents: Content[];
}

export default function Home({ loaderData }: Route.ComponentProps) {
	//console.log("**** HOME : loaderData ", loaderData);

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
	const previousSceneStateRef = useRef<SceneComp | null>(null);

	const actorRef = SceneLogicContext.useActorRef();
	useEffect(() => {
		const subscription = actorRef.subscribe((snapshot) => {
			const { active, ...state } = snapshot.context;
			if (!Object.keys(state).length) return;
			if (!hasSceneDataChanged(previousSceneStateRef.current, state)) return;

			previousSceneStateRef.current = state;
			setScene(buildScene(state));
		});

		return () => subscription.unsubscribe();
	}, [actorRef]);

	useEffect(() => {
		actorRef.send({ type: "init", payload: data.scene });
	}, [actorRef, data.scene]);

	// console.log("SCENE", scene);
	return (
		<main className="app-layout">
			<section className="base-layout layout-menu">
				<Menu scenes={data.scenes} sceneId={data.scene.id} />
			</section>
			<section className="base-layout layout-chutier">
				<Chutier allContents={data.allContents} />
			</section>
			<section className="base-layout layout-capsules w-60">
				<SceneTreeView />
			</section>

			<section className="base-layout layout-player">
				{/* <ResponsiveBackgroundSliceGrid src="/images/DSCF6975-crop.jpg" /> */}
				<PlayerRunner scene={scene} />
				{/* <DemoTransformEditor /> */}
				{/* <PinDemo imageSrc="/images/DSCF6975-crop.jpg" /> */}
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

function hasSceneDataChanged(previous: SceneComp | null, next: SceneComp): boolean {
	if (!previous) return true;
	return (
		previous.id !== next.id ||
		previous.title !== next.title ||
		previous.main !== next.main ||
		previous.events !== next.events ||
		previous.sceneContents !== next.sceneContents ||
		previous.capsules !== next.capsules ||
		previous.items !== next.items ||
		previous.contents !== next.contents ||
		previous.decors !== next.decors ||
		previous.theme !== next.theme
	);
}
