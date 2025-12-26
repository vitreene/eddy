import cx from "classnames";
import { CircleSmallIcon } from "lucide-react";

import type { ItemComp, ContentEvent } from "@/api/db";

import { INTRO } from "@/lib/constants";
import * as transitions from "@/player/presets/transitions";
import { getElementFromCapsule, SceneLogicContext } from "@/provider/scene-logic";

import { Rubber } from "../rubber";
import { MediaPanel } from "./event-panel";

const defaultTransition = "fondu";

export function EditEvent() {
	const active = SceneLogicContext.useSelector((state) => state.context.active);
	// const element = SceneLogicContext.useSelector((state) => {
	// 	if (active) {
	// 		if (active.elementId) return state.context.elements[active.elementId];
	// 		if (active.capsuleId) {
	// 			const media = Object.values(state.context.medias).find((m) => m.capsuleId == active.capsuleId);
	// 			return media ? Object.values(state.context.elements).find((e) => e.mediaId == media.id) : null;
	// 		}
	// 	}
	// });
	const element = SceneLogicContext.useSelector((state) => {
		if (state.context.active.itemId) return state.context.items[state.context.active.itemId];
		if (state.context.active.capsuleId)
			return getElementFromCapsule(state.context.active.capsuleId, state.context);

		return null;
	});

	if (!element) return null;
	return (
		<section className="flex gap-4">
			<MediaInfos key={element.id} element={element} />
			<Rubber />
		</section>
	);
}

function MediaInfos({ element }: { element: ItemComp }) {
	const events = SceneLogicContext.useSelector((state) => state.context.events[element.id]);
	console.log("MediaInfos", events);

	return (
		<div className="media-infos flex gap-4">
			<MediaPanel id={element.contentId} />
			<div className="w-40">
				<p className="mb-2">Transitions</p>
				{events &&
					Object.values(events).map((event) => <MediaEventTransition key={event.action} event={event} />)}
			</div>
		</div>
	);
}

// action == marker
function MediaEventTransition({ event }: { event: ContentEvent }) {
	const sceneLogic = SceneLogicContext.useActorRef();

	const onChangeAction = (e: React.ChangeEvent<HTMLSelectElement>) => {
		sceneLogic.send({ type: "events-update", payload: { action: event.action, ref: e.currentTarget.value } });
	};

	return (
		<div className="mb-2 text-xs">
			<input name="target" hidden defaultValue={event.name} />
			<div className="flex gap-1">
				<CircleSmallIcon
					className={cx(
						"inline-block",
						event.action === INTRO ? "fill-green-300 stroke-green-500" : "fill-red-300 stroke-red-500"
					)}
				/>
				<SelectAction value={event.ref ?? defaultTransition} onChange={onChangeAction} />
			</div>
		</div>
	);
}

function SelectAction({
	value,
	onChange
}: {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
	return (
		<select name={"ref"} onChange={onChange} defaultValue={value}>
			<option value={""}>––</option>
			{Object.entries(transitions).map(([k, t]) => (
				<option key={k} value={t.name}>
					{t.name}
				</option>
			))}
		</select>
	);
}
