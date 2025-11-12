import cx from "classnames";
import { CircleSmallIcon } from "lucide-react";

import type { ElementComp, MediaEvent } from "@/api/db";

import { INTRO } from "@/lib/constants";
import * as transitions from "@/player/presets/transitions";
import { SceneLogicContext } from "@/provider/scene-logic";

import { Rubber } from "../rubber";
import { MediaPanel } from "./media-panel";

export function EditMedia() {
	const active = SceneLogicContext.useSelector((state) => state.context.active);
	const element = SceneLogicContext.useSelector(
		(state) => active && active.elementId && state.context.elements[active.elementId]
	);

	if (!element) return null;
	return (
		<section className="flex gap-4">
			<MediaInfos key={element.id} element={element} />
			<Rubber />
		</section>
	);
}

function MediaInfos({ element }: { element: ElementComp }) {
	const events = SceneLogicContext.useSelector((state) => state.context.events[element.id]);
	return (
		<div className="media-infos flex gap-4">
			<MediaPanel id={element.mediaId} />
			<div>
				<p className="mb-2">Transitions</p>
				{Object.values(events).map((event) => (
					<MediaEventTransition key={event.action} event={event} />
				))}
			</div>
		</div>
	);
}

// action == marker
function MediaEventTransition({ event }: { event: MediaEvent }) {
	const sceneLogic = SceneLogicContext.useActorRef();
	console.log(event);

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
				<SelectAction value={event.ref ?? "--"} onChange={onChangeAction} />
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
