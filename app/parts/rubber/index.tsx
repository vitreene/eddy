import cx from "classnames";
import { useActor } from "@xstate/react";
import { useCallback, useContext, useRef, useState } from "react";

import type { TextTime } from "@/api/db";
import { SceneContext } from "@/provider/scene-provider";
import { editMediaLogic } from "@/provider/edit-media-provider";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const INTRO = "intro";
const OUTRO = "outro";

export function Rubber() {
	const comp = useContext(SceneContext);
	const [state, send] = useActor(editMediaLogic);
	const slider = useRef<string>("");
	const ref = useRef<HTMLUListElement>(null);
	// TODO mieux définir cues
	const cues = comp?.scene.medias[0].events;

	const selecteds = selectCues(cues, state.context[INTRO]?.id, state.context[OUTRO]?.id);

	const enterSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		if (e.target instanceof HTMLButtonElement) {
			console.log("UPDATE", e.target);
			slider.current = e.target.id;
		} else if (e.target instanceof HTMLLIElement) {
			console.log("START", e.target.id);

			send({ type: "ADD", target: INTRO, payload: { id: e.target.id } });
		}
		e.currentTarget.addEventListener("mousemove", moveHandler);
	};
	const exitSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		e.currentTarget.removeEventListener("mousemove", moveHandler);
	};
	// tenter un alert en ref;
	// verfier si slider.current est mis correctment à jour,
	// comment permuter start et ebd quand le curseur se croise ?

	const moveHandler = useCallback(
		function (e: MouseEvent) {
			if (e.target instanceof HTMLLIElement) {
				console.log("MOVE TO", e.target.id);
				send({ type: "ADD", target: OUTRO, payload: { id: e.target.id } });
			} else {
				console.log("SLIDER", slider.current);
			}
		},
		[send]
	);

	return (
		<ul
			ref={ref}
			onMouseDown={enterSelection}
			onMouseUp={exitSelection}
			className="flex flex-1 flex-wrap items-start border border-amber-200"
		>
			{cues &&
				cues.map((event) => {
					const selected = selecteds.includes(event.id);

					return (
						<li
							key={event.id}
							id={event.id}
							className={cx("px-2 py-1 text-sm select-none", { "bg-amber-500": selected })}
						>
							{event.id == state.context[INTRO]?.id && <SliderStart position="start" />}
							{event.text}
							{event.id == state.context[OUTRO]?.id && <SliderStart position="end" />}
						</li>
					);
				})}
		</ul>
	);
}

function SliderStart({ position }: { position: "start" | "end" }) {
	return (
		<span className="relative w-0">
			{position == "start" ? (
				<button id="slider-start" className="absolute top-0 left-0 -mx-2 -my-1 bg-red-500">
					<PanelLeftClose className="pointer-events-none h-6 text-green-600 [&_rect]:fill-stone-300" />
				</button>
			) : (
				<button id="slider-end" className="absolute top-0 right-0 -mx-2 -my-1 bg-red-500">
					<PanelLeftOpen className="pointer-events-none h-6 text-red-600 [&_rect]:fill-stone-300" />
				</button>
			)}
		</span>
	);
}

function selectCues(cues: Array<TextTime> = [], start: string, end: string) {
	let startIndex = cues.findIndex((cue) => cue.id == start);
	let endIndex = cues.findIndex((cue) => cue.id == end);
	if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];
	return cues.slice(startIndex, endIndex + 1).map((cue) => cue.id);
}
