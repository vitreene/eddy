import type { SceneRef } from "@/api/db";
import { DeleteScene } from "./delete-scene";
import { Fichier } from "./fichier";
import { NewScene } from "./new-scene";

interface MenuProps {
	scenes: Array<SceneRef>;
	sceneId?: number;
}
export function Menu(props: MenuProps) {
	return (
		<nav className="flex items-center gap-2 text-sm">
			<h1 className="mr-4 text-base font-black">Eddy</h1>

			<Fichier scenes={props.scenes} />

			<NewScene />

			{props.sceneId ? (
				<div className="ml-auto">
					<DeleteScene sceneId={props.sceneId} />
				</div>
			) : null}
		</nav>
	);
}
