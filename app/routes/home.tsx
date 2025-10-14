import { useReducer } from 'react';
import type { Route } from './+types/home';

import { PlayerRunner } from '~/player';
import { Capsules } from '~/parts/capsules';
import { getScene, type SceneComp } from '~/api/db';
import { EditMedia } from '~/parts/media-edit';
import { EditCapsule } from '~/parts/capsule-edit';
import { reducer as sceneReducer, SceneContext } from '~/provider/scene-provider';
import { reducer as editMediaReducer, EditMediaContext } from '~/provider/edit-media-provider';
import * as scene02 from '../demos/scenes/scene-02';
import { buildPlay, type Store } from '@/player/builder/build-play';
import type { MapEvent, PersoDef, PersoVideoDef } from '@/player/types';

export function meta({}: Route.MetaArgs) {
	return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }];
}

const SCENE_ID = 1;
export async function loader({ params }: Route.LoaderArgs) {
	const scene: SceneComp = await getScene(SCENE_ID);
	return scene;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	console.log(loaderData);
	const scenePlay = buildPlay(loaderData);
	// console.log('REF_DATA', { persos: scene02.persos, events: Object.fromEntries(scene02.eventtimes.entries()) });

	// console.log('SCENE->', { persos: scenePlay.persos, events: Object.fromEntries(scenePlay.events.entries()) });

	const [stateScene, dispatchScene] = useReducer(sceneReducer, {
		capsuleId: null,
		elementId: null,
		activeCue: null,
		activeAction: null,
	});

	const [editMediaState, dispatchEditMediaState] = useReducer(editMediaReducer, {
		intro: {
			ref: '',
			text: '',
			start: 0,
			end: 0,
			id: '',
		},
	});

	return (
		<SceneContext value={{ scene: loaderData, state: stateScene, dispatch: dispatchScene }}>
			<EditMediaContext value={{ state: editMediaState, dispatch: dispatchEditMediaState }}>
				<AppLayout scene={scenePlay} />
			</EditMediaContext>
		</SceneContext>
	);
}

function AppLayout({
	scene,
}: {
	scene: {
		events: MapEvent;
		persos: (PersoDef | PersoVideoDef)[];
	};
}) {
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
			<section className="base-layout layout-player">
				{/* <PlayerRunner persos={scene02.persos} eventtimes={scene02.eventtimes} /> */}
				<PlayerRunner persos={scene.persos} eventtimes={scene.events} />
			</section>
			<section className="base-layout layout-infos"></section>
			<section className="base-layout layout-edit">
				<EditMedia />
			</section>
		</main>
	);
}
