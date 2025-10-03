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

export function meta({}: Route.MetaArgs) {
	return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }];
}
export async function loader({ params }: Route.LoaderArgs) {
	const scene: SceneComp = await getScene(1);
	return scene;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	// console.log(loaderData);

	const [stateScene, dispatchScene] = useReducer(sceneReducer, {
		capsuleId: null,
		elementId: null,
		activeCue: null,
	});

	const [editMediaState, dispatchEditMediaState] = useReducer(editMediaReducer, {
		intro: {
			ref: '',
			name: '',
		},
	});

	console.log(editMediaState);

	return (
		<SceneContext value={{ scene: loaderData, state: stateScene, dispatch: dispatchScene }}>
			<EditMediaContext value={{ state: editMediaState, dispatch: dispatchEditMediaState }}>
				<AppLayout />
			</EditMediaContext>
		</SceneContext>
	);
}

function AppLayout() {
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
				<PlayerRunner persos={scene02.persos} eventtimes={scene02.eventtimes} />
			</section>
			<section className="base-layout layout-infos"></section>
			<section className="base-layout layout-edit">
				<EditMedia />
			</section>
		</main>
	);
}
