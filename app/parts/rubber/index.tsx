import cx from "classnames";
import { useCallback, useRef } from "react";

import type { TextTime } from "@/api/db";
import { INTRO, OUTRO } from "@/lib/constants";
// import { SceneContext } from "@/provider/scene-provider";
import { SceneLogicContext } from "@/provider/scene-logic";

import { SliderRight, SliderLeft } from "./slider-left-right";

const SLIDER_START = "slider-start";
const SLIDER_END = "slider-end";

const EL_ID = 1;

export function Rubber() {
	// const comp = useContext(SceneContext);
	// const [state, send] = useActor(sceneLogic);
	const slider = useRef<string>("");

	const events = SceneLogicContext.useSelector((state) => state.context.events);
	const sceneMedias = SceneLogicContext.useSelector((state) => state.context.sceneMedias);
	const sceneLogic = SceneLogicContext.useActorRef();

	// TODO mieux définir cues
	const cues = sceneMedias[0].events;

	// const selecteds = selectCues(cues, state.context[INTRO]?.name, state.context[OUTRO]?.name);
	const selecteds = selectCues(cues, events[EL_ID][INTRO]?.name, events[EL_ID][OUTRO]?.name);
	const start = selecteds[0];
	const end = selecteds[selecteds.length - 1];

	const enterSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		if (e.target instanceof HTMLButtonElement) {
			slider.current = e.target.id;
		} else if (e.target instanceof HTMLLIElement) {
			slider.current = "";
			if (selecteds.length == 0) {
				sceneLogic.send({ type: "media.UPDATE", target: INTRO, payload: { name: e.target.id } });
			} else {
				// add new custom points
			}
		}
		e.currentTarget.addEventListener("mousemove", moveHandler);
	};
	const exitSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		e.currentTarget.removeEventListener("mousemove", moveHandler);
	};

	const moveHandler = useCallback(
		function (e: MouseEvent) {
			const target = slider.current == SLIDER_START ? INTRO : OUTRO;
			e.target instanceof HTMLLIElement &&
				sceneLogic.send({ type: "media.UPDATE", target, payload: { name: e.target.id } });
		},
		[sceneLogic]
	);

	return (
		<ul
			onMouseDown={enterSelection}
			onMouseUp={exitSelection}
			className="flex flex-1 flex-wrap items-start border border-amber-200"
		>
			{cues &&
				cues.map((cue) => {
					const selected = selecteds.includes(cue.name);
					return (
						<li
							key={cue.name}
							id={cue.name}
							className={cx("px-2 py-1 text-sm select-none", { "bg-amber-200": selected })}
						>
							{cue.name == start && <SliderButtonStart />}
							{cue.text}
							{cue.name == end && <SliderButtonEnd />}
						</li>
					);
				})}
		</ul>
	);
}

function SliderButtonStart() {
	return (
		<span className="relative w-0">
			<button id={SLIDER_START} className="absolute top-0 left-0 -mx-2 -my-1 h-6">
				<SliderLeft className="pointer-events-none fill-green-300 text-green-600" />
			</button>
		</span>
	);
}
function SliderButtonEnd() {
	return (
		<span className="relative w-0">
			<button id={SLIDER_END} className="absolute top-0 right-0 -mx-2 -my-1 h-6">
				<SliderRight className="pointer-events-none fill-orange-300 text-orange-600" />
			</button>
		</span>
	);
}

function selectCues(cues: Array<TextTime> = [], start: string, end: string) {
	let startIndex = cues.findIndex((cue) => cue.name == start);
	let endIndex = cues.findIndex((cue) => cue.name == end);
	if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];
	return cues.slice(startIndex, endIndex + 1).map((cue) => cue.name);
}
