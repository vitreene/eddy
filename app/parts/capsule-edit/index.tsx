import { useContext } from "react";
import { useFetcher } from "react-router";

import type { ElementComp, SceneComp, TextTime } from "~/api/db";
import { SceneContext, type SceneState } from "~/provider/scene-provider";

import { Media } from "./display-media";
import { EditMediaContext } from "@/provider/edit-media-provider";

export function EditCapsule() {
	const fetcher = useFetcher();

	const comp = useContext(SceneContext);
	const capsule = comp?.scene.capsules.find((c) => c.id == comp?.state.capsuleId);

	// console.log('EditCapsule', capsule);

	return (
		<section className="edit flex w-full flex-col gap-4">
			<h2>EDIT</h2>
			<header className="border border-slate-300 p-4">
				{capsule && <p>{`Capsule n°${capsule?.id} : ${capsule?.type}`}</p>}

				<fetcher.Form method="post" action={`api/capsule/${capsule?.id}`}>
					<input hidden name="id" defaultValue={capsule?.id} />
					<input name="type" defaultValue={capsule?.type} />
					<button type="submit">Valider</button>
				</fetcher.Form>
			</header>
			<article className="flex-1 border border-slate-300 p-4">
				{capsule && <CapsuleContent elements={capsule.elements} />}
			</article>
		</section>
	);
}

function CapsuleContent({ elements }: { elements: Array<ElementComp> }) {
	const fetcher = useFetcher();
	const comp = useContext(SceneContext)!;
	const mediaActions = useContext(EditMediaContext)!;

	const editMedia = (id: number) => {
		comp.dispatch({ type: "edit-media", mediaId: id });
		const element = elements.find((e) => e.id == id);

		if (element) {
			const cues = comp?.scene.medias[0].events;
			const payload: typeof mediaActions.state = {};
			for (const { name, ref, action } of element.events) {
				const textTime = cues.find((c) => c.name == name);
				payload[action] = { ...textTime!, ref };
			}
			mediaActions.dispatch({ type: "set", payload });
		}
	};

	const editElement = (e: React.MouseEvent<HTMLUListElement>) => {
		e.preventDefault();
		const target = e.target as HTMLElement;
		const id = Number(target.dataset?.id);
		id && editMedia(id);

		const lastMediaId = comp.state.elementId;

		const isChanged = compareEvents(comp, mediaActions.state);
		console.log("editElement", { lastMediaId, isChanged, mediaActions: mediaActions.state });

		if (lastMediaId && isChanged)
			fetcher.submit(mediaActions.state as {}, {
				method: "post",
				encType: "application/json",
				action: `api/media/${lastMediaId}`
			});
	};

	return (
		<ul className="flex gap-4" onClick={editElement}>
			{elements
				.sort((a, b) => a.order - b.order)
				.map((el) => (
					<li key={el.id} id={`element-${el.id}`} data-id={el.id} className="bg-white">
						<Media
							attr={el.media}
							size="sm"
							selected={comp.state.elementId == el.id}
							className="pointer-events-none"
						/>
					</li>
				))}
		</ul>
	);
}

function compareEvents(
	comp: {
		scene: SceneComp;
		state: SceneState;
	},
	mediaActions: {
		[action: string]: TextTime;
	}
) {
	const capsule = comp.scene.capsules.find((c) => c.id == comp.state.capsuleId);
	const element = capsule?.elements.find((e) => e.id == comp.state.elementId);

	if (!element?.events) return false;

	for (const act in mediaActions) {
		const action = mediaActions[act];
		const sourceAction = element.events.find((e) => e.action == act);

		if (!sourceAction) continue;

		if (action.name != sourceAction.name || action.ref != sourceAction.ref) return true;
	}
	return false;
}
