import type { SceneRef } from "@/api/db";
import { Fichier } from "./fichier";
import { NewScene } from "./new-scene";

interface MenuProps {
	scenes: Array<SceneRef>;
}
export function Menu(props: MenuProps) {
	return (
		<nav className="flex items-baseline gap-2 text-sm">
			<h1 className="mr-4 text-base font-black">Eddy</h1>

			<Fichier scenes={props.scenes} />

			<NewScene />
		</nav>
	);
}
