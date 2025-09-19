import type { Route } from './+types/home';
import { Welcome } from '../welcome/welcome';
import { PlayerRunner } from '~/player';
import { SceneContext } from '~/provider/scene-provider';
import { getScene, type SceneComp, type SceneDB } from '~/api/db';

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'New React Router App' },
		{ name: 'description', content: 'Welcome to React Router!' },
	];
}
import * as scene02 from '../demos/scenes/scene-02';
import { Capsules } from '~/parts/capsules';
import { useReducer } from 'react';

export async function loader({ params }: Route.LoaderArgs) {
	const scene: SceneComp = await getScene(1);
	return scene;
}

export interface State {
	capsule: number | null;
}

export interface Actions extends State {
	type: 'edit-capsule';
}

function reducer(state: State, action: Actions) {
	switch (action.type) {
		case 'edit-capsule':
			return {
				...state,
				capsule: action.capsule,
			};

		default:
			throw Error('Unknown action: ' + action.type);
	}
}
export default function Home({ loaderData }: Route.ComponentProps) {
	console.log(loaderData);

	const [state, dispatch] = useReducer(reducer, { capsule: null });
	return (
		<SceneContext value={{ scene: loaderData, state, dispatch }}>
			<AppLayout />
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
			<section className="base-layout layout-capsule-edit">
				Edit capsule
			</section>
			<section className="base-layout layout-player">
				<PlayerRunner persos={scene02.persos} eventtimes={scene02.eventtimes} />
			</section>
			<section className="base-layout layout-infos"></section>
			<section className="base-layout layout-edit">Edit content</section>
		</main>
	);
}
