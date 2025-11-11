import { useContext } from "react";
import { useActor } from "@xstate/react";

import type { ElementComp, MediaEvent, TextTime } from "@/api/db";
import { SceneContext, type ActionEvent } from "@/provider/scene-provider";
import * as transitions from "@/player/presets/transitions";
import { sceneLogic } from "@/provider/scene-logic";

// import { EditMediaContext } from "@/provider/edit-media-provider";

import { Rubber } from "../rubber";
import { MediaPanel } from "./media-panel";

export function EditMedia() {
	const comp = useContext(SceneContext);
	// const mediaActions = useContext(EditMediaContext);

	const capsule = comp?.scene.capsules.find((c) => c.id == comp.state.capsuleId);
	const element = capsule?.elements.find((e) => e.id == comp?.state.elementId);

	if (!element) return null;
	return (
		<section className="flex gap-4">
			<MediaInfos element={element} />
			<Rubber />
		</section>
	);
}

function MediaInfos({ element }: { element: ElementComp }) {
	return (
		<div className="media-infos flex gap-4">
			<MediaPanel element={element} />
			<div className="">
				<p></p>Infos
				{element.events.map((event) => (
					<MediaEventTransition key={event.action} event={event} />
				))}
			</div>
		</div>
	);
}

// action == marker
function MediaEventTransition({ event }: { event: MediaEvent }) {
	const [state, send] = useActor(sceneLogic);

	const onChangeAction = (e: React.ChangeEvent<HTMLSelectElement>) => {
		console.log(e.currentTarget.value);
		send({ type: "UPDATE", target: event.name, ref: e.currentTarget.value });
	};
	return (
		<div className="mb-2 text-xs">
			<input name="target" hidden defaultValue={event.name} />
			<dl className="">
				<dt className="font-light">Repère</dt>
				<dd className="">{event.name ?? "––"}</dd>
				<dt className="mt-2 font-light">Transition</dt>
				<dd className="">
					<SelectAction value={event.ref ?? "--"} onChange={onChangeAction} />
				</dd>
			</dl>
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
