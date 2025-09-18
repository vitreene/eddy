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

export async function loader({ params }: Route.LoaderArgs) {
	const scene: SceneComp = await getScene(1);
	// const scene = await fetch('./api/db/getScene');
	return scene;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	console.log(loaderData);

	return (
		<SceneContext value={loaderData}>
			<AppLayout />
		</SceneContext>
	);
}

function AppLayout() {
	return (
		<main className="app-layout">
			<section className="base-layout layout-menu">Eddy</section>
			<section className="base-layout layout-chutier">Chutier</section>
			<section className="base-layout layout-capsules">Capsules</section>
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
