import cx from "classnames";
import { CircleSmallIcon } from "lucide-react";

import type { ItemComp, ContentEvent } from "@/api/db";

import { INTRO, OUTRO } from "@/config/constants";
import { getTransitionOptions, normalizeTransitionRef } from "@/config/transitions";
import { SceneLogicContext } from "@/provider/scene-logic";

import { Rubber } from "../rubber";
import { ContentPanel } from "./event-panel";

const actionOrder = [INTRO, OUTRO];

export function EditEvent() {
	const item = SceneLogicContext.useSelector((state) => {
		if (state.context.active.itemId) return state.context.items[state.context.active.itemId];
		return null;
	});

	if (!item) return null;
	return (
		<section className="flex gap-4">
			<ContentInfos key={item.id} item={item} />
			<Rubber />
		</section>
	);
}

function ContentInfos({ item }: { item: ItemComp }) {
	const events = SceneLogicContext.useSelector((state) => state.context.events[item.id]);
	// console.log("MediaInfos", events);

	return (
		<div className="media-infos flex gap-4">
			<ContentPanel id={item.contentId} />
			<div className="w-40">
				<p className="mb-2">Transitions</p>
				{actionOrder.map((action) => {
					const event = (events?.[action] ?? { action, ref: "" }) as Partial<ContentEvent> & {
						action: string;
					};
					return <MediaEventTransition key={action} event={event} />;
				})}
			</div>
		</div>
	);
}

// action == marker
function MediaEventTransition({ event }: { event: Partial<ContentEvent> & { action: string } }) {
	const sceneLogic = SceneLogicContext.useActorRef();

	const onChangeAction = (e: React.ChangeEvent<HTMLSelectElement>) => {
		sceneLogic.send({ type: "events-update", payload: { action: event.action, ref: e.currentTarget.value } });
	};

	return (
		<div className="mb-2 text-xs">
			<input name="target" hidden defaultValue={event.name || ""} />
			<div className="flex gap-1">
				<CircleSmallIcon
					className={cx(
						"inline-block",
						event.action === INTRO ? "fill-green-300 stroke-green-500" : "fill-red-300 stroke-red-500"
					)}
				/>
				<SelectAction
					action={event.action}
					value={event.ref ? normalizeTransitionRef(event.ref, event.action) : ""}
					onChange={onChangeAction}
				/>
			</div>
		</div>
	);
}

function SelectAction({
	action,
	value,
	onChange
}: {
	action: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
	return (
		<select name={"ref"} onChange={onChange} value={value}>
			<option value="">--</option>
			{getTransitionOptions(action).map(({ key, name }) => (
				<option key={key} value={key}>
					{name}
				</option>
			))}
		</select>
	);
}
