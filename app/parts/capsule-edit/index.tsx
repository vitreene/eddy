import { useFetcher } from "react-router";

import { Media } from "./display-media";
import { SceneLogicContext } from "@/provider/scene-logic";

export function EditCapsule() {
	const sceneLogic = SceneLogicContext.useActorRef();
	const capsule = SceneLogicContext.useSelector((state) =>
		state.context.active.capsuleId ? state.context.capsules[state.context.active.capsuleId] : null
	);

	const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const type = formData.get("type");
		sceneLogic.send({ type: "capsule.update", payload: { type } });
	};
	return (
		<section className="edit flex w-full flex-col gap-4">
			<h2>EDIT</h2>
			<header className="border border-slate-300 p-4">
				{capsule && <p className="text-sm">{`Capsule n°${capsule?.id}`}</p>}

				<form onSubmit={onSubmit}>
					<input hidden name="id" defaultValue={capsule?.id} />
					<label>
						Type&nbsp;:
						<input
							key={capsule?.id}
							className="inline-block border border-stone-300 p-1"
							name="type"
							defaultValue={capsule?.type}
						/>
					</label>
					<button type="submit">Valider</button>
				</form>
			</header>
			<article className="flex-1 border border-slate-300 p-4">
				{capsule && <CapsuleContent capsuleId={capsule.id} />}
			</article>
		</section>
	);
}

function CapsuleContent({ capsuleId }: { capsuleId: number }) {
	const sceneLogic = SceneLogicContext.useActorRef();
	const active = SceneLogicContext.useSelector((state) => state.context.active);
	const elements = SceneLogicContext.useSelector((state) =>
		Object.values(state.context.elements).filter((element) => element.capsuleId == capsuleId)
	);

	const mediaIds = elements.map((element) => element.mediaId);

	const medias = Object.fromEntries(
		SceneLogicContext.useSelector((state) =>
			Object.values(state.context.medias)
				.filter((media) => mediaIds.includes(media.id))
				.map((media) => [media.id, media])
		)
	);

	// const editMedia = (id: number) => {
	// 	sceneLogic.send({ type: "edit-media", mediaId: id });
	// 	const element = elements.find((e) => e.id == id);

	// 	if (element) {
	// 		/* const cues = comp?.scene.sceneMedias[0].events;
	// 		const payload: typeof mediaActions.state = {};
	// 		for (const { name, ref, action } of element.events) {
	// 			const textTime = cues.find((c) => c.name == name);
	// 			payload[action] = { ...textTime!, ref };
	// 		}
	// 		mediaActions.dispatch({ type: "set", payload }); */
	// 	}
	// };

	const editElement = (e: React.MouseEvent<HTMLUListElement>) => {
		e.preventDefault();
		const target = e.target as HTMLElement;
		const id = Number(target.dataset?.id);
		sceneLogic.send({ type: "active.set", payload: { elementId: id } });
		// id && editMedia(id);
		// const lastMediaId = comp.state.elementId;

		// const isChanged = compareEvents(comp, mediaActions.state);
		// console.log("editElement", { lastMediaId, isChanged, mediaActions: mediaActions.state });

		// a déplacer dans la machine

		// if (lastMediaId && isChanged)
		// 	fetcher.submit(mediaActions.state as {}, {
		// 		method: "post",
		// 		encType: "application/json",
		// 		action: `api/media/${lastMediaId}`
		// 	});
	};

	return (
		<ul className="flex gap-4" onClick={editElement}>
			{elements
				.sort((a, b) => a.order - b.order)
				.map((el) => (
					<li key={el.id} id={`element-${el.id}`} data-id={el.id} className="bg-white">
						<Media
							attr={medias[el.mediaId]}
							size="sm"
							selected={active.elementId == el.id}
							className="pointer-events-none"
						/>
					</li>
				))}
		</ul>
	);
}

/* 
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
 */
