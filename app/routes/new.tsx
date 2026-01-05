import type { Route } from "./+types/home";

import { getScenes } from "@/api/db";

import { Menu } from "@/parts/menu";

export function meta() {
	return [{ title: "Eddy" }, { name: "description", content: "l'éditeur de séquences" }];
}

export async function loader() {
	const scenes = await getScenes();
	return { scenes };
}

export default function Home({ loaderData: data }: Route.ComponentProps) {
	return (
		<main className="app-layout">
			<section className="base-layout layout-menu">
				<Menu scenes={data.scenes} />
			</section>
			<section className="base-layout layout-chutier">
				<p className="border-primary-500 border-b-2">Chutier</p>
			</section>
			<section className="base-layout layout-capsules"></section>

			<section className="base-layout layout-player flex flex-col"></section>
			<section className="base-layout layout-infos"></section>
			<section className="base-layout layout-edit"></section>
		</main>
	);
}
