import React, { useEffect, useState } from "react";
import type { Route } from "./+types/home";

import { PlayerRunner, type PlayerProps } from "~/player";

import { EditEvent } from "@/parts/event-edit";
import { SceneLogicContext } from "@/provider/scene-logic";
import { loadSceneLogicUiPreferences } from "@/provider/scene-logic.ui-preferences";

import { getAllContents, getScene, getScenes, type Content, type SceneComp, type SceneRef } from "@/api/db";
import { SceneTreeView } from "@/parts/scene-tree";
import { EditItem } from "@/parts/item-edit";
import { buildScene } from "@/player/builder";
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
	const sequenceFlushToken = SceneLogicContext.useSelector(
		(state) => Number(state.context.active.sequenceFlushToken) || 0
	);

	useEffect(() => {
		actorRef.send({ type: "init", payload: data.scene });
		const uiPreferences = loadSceneLogicUiPreferences();
		if (uiPreferences) {
			actorRef.send({ type: "active-set", payload: uiPreferences });
		}
	}, [actorRef, data.scene]);

	useEffect(() => {
		if (!sequenceFlushToken) return;
		const snapshot = actorRef.getSnapshot();
		const { active, ...state } = snapshot.context;
		if (!Object.keys(state).length) return;
		setScene(buildScene(state));
		actorRef.send({ type: "sequence-flush-consumed", payload: { token: sequenceFlushToken } });
	}, [actorRef, sequenceFlushToken]);

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
				<EditItem allContents={data.allContents} />
			</section>
			<section className="base-layout layout-edit">
				<EditEvent />
			</section>
		</main>
	);
});
