import cx from "classnames";
import { useCallback, useRef } from "react";
import { Trash2 } from "lucide-react";

import { INTRO, OUTRO } from "@/lib/constants";
import { DEFAULT_TRANSITION_BY_ACTION } from "@/player/presets/transitions";
import { SceneLogicContext } from "@/provider/scene-logic";

import { SliderRight, SliderLeft } from "./slider-left-right";

import type { TextTime } from "@/api/db";

const SLIDER_START = "slider-start";
const SLIDER_END = "slider-end";

export function Rubber() {
	const slider = useRef<string>("");
	const abort = useRef(new AbortController());

	const events = SceneLogicContext.useSelector((state) => {
		if (state.context.active.itemId) return state.context?.events[state.context.active.itemId] || null;
		return null;
	});

	const sceneContents = SceneLogicContext.useSelector((state) =>
		Object.values(state.context.sceneContents).find((sc) => sc.sceneId == state.context.id)
	);
	const sceneLogic = SceneLogicContext.useActorRef();

	// TODO mieux définir cues
	const cues = sceneContents?.events || [];

	const selecteds = events ? selectCues(cues, events[INTRO]?.name, events[OUTRO]?.name) : [];
	const hasClearableEvents = Boolean(events && Object.values(events).some((event) => Boolean(event?.name)));
	const start = selecteds[0];
	const end = selecteds[selecteds.length - 1];

	const enterSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		if (e.target instanceof HTMLButtonElement) {
			slider.current = e.target.id;
		} else if (e.target instanceof HTMLLIElement) {
			slider.current = "";
			if (selecteds.length == 0) {
				const payload = makeEventPayload(events, INTRO, e.target.id);
				sceneLogic.send({ type: "events-update", payload });
			} else {
				// add new custom points
			}
		}
		e.currentTarget.addEventListener("mousemove", moveHandler, { signal: abort.current.signal });
	};
	const exitSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		abort.current.abort();
		abort.current = new AbortController();
	};

	const moveHandler = useCallback(
		function (e: MouseEvent) {
			if (e.target instanceof HTMLLIElement) {
				const action = slider.current == SLIDER_START ? INTRO : OUTRO;
				const payload = makeEventPayload(events, action, e.target.id);
				sceneLogic.send({ type: "events-update", payload });
			}
		},
		[events, sceneLogic]
	);

	const clearAllEvents = () => {
		if (!hasClearableEvents) return;
		if (!events) return;

		const actions = Object.keys(events);
		for (const action of actions) {
			const payload = makeEventPayload(events, action, "");
			sceneLogic.send({ type: "events-update", payload });
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-2">
			<div className="flex justify-end">
				<button
					type="button"
					onClick={clearAllEvents}
					disabled={!hasClearableEvents}
					className="inline-flex items-center gap-1 rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>

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
		</div>
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

function makeEventPayload(
	events: Record<string, { action?: string; name?: string; ref?: string } | undefined> | null,
	action: string,
	name: string
) {
	const current = events?.[action] || {};
	const defaultRef =
		action === OUTRO ? DEFAULT_TRANSITION_BY_ACTION[OUTRO] : DEFAULT_TRANSITION_BY_ACTION[INTRO];
	return { ...current, action, name, ref: current.ref || defaultRef };
}
