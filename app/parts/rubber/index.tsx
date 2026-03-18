import cx from "classnames";
import { useCallback, useRef, useState } from "react";

import { INTRO, OUTRO } from "@/config/constants";
import { DEFAULT_TRANSITION_BY_ACTION } from "@/config/transitions";
import { deriveEventKind } from "@/config/custom-events";
import { SceneLogicContext } from "@/provider/scene-logic";
import { resolveClosestCuePointFromDelay } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { getActiveSceneContent, getSceneContentCues } from "@/scene-runtime/scene-content";

import { SliderRight, SliderLeft } from "./slider-left-right";

import type { TextTime, ContentEvent } from "@/api/db";

const SLIDER_START = "slider-start";
const SLIDER_END = "slider-end";

export function Rubber() {
	const slider = useRef<string>("");
	const abort = useRef(new AbortController());
	const [customDragPreview, setCustomDragPreview] = useState<{
		action: string;
		x: number;
		y: number;
	} | null>(null);

	const events = SceneLogicContext.useSelector((state) => {
		if (state.context.active.itemId) return state.context?.events[state.context.active.itemId] || null;
		return null;
	});
	const activeEventAction = SceneLogicContext.useSelector(
		(state) => state.context.active.event as string | null
	);

	const sceneContents = SceneLogicContext.useSelector((state) => getActiveSceneContent(state.context as any));
	const sceneLogic = SceneLogicContext.useActorRef();

	const cues = getSceneContentCues(sceneContents);
	const activeCustomAction =
		activeEventAction && deriveEventKind(activeEventAction) === "custom" ? activeEventAction : null;

	const selecteds = events ? selectCues(cues, events[INTRO]?.name, events[OUTRO]?.name) : [];
	const customPointActionsByCueName = buildCustomPointActionsByCueName(cues, events);

	const start = selecteds[0];
	const end = selecteds[selecteds.length - 1];
	const introOutroDisabled = Boolean(activeCustomAction || customDragPreview);
	const customBounds = getIntroOutroBounds(cues, events?.[INTRO]?.name, events?.[OUTRO]?.name);

	const enterSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		const customPointButton =
			e.target instanceof HTMLElement
				? (e.target.closest("button[data-custom-point='true']") as HTMLButtonElement | null)
				: null;

		if (customPointButton) {
			const action = customPointButton.dataset.customAction;
			if (!action) return;
			slider.current = `custom:${action}`;
			sceneLogic.send({ type: "active-set", payload: { event: action } });
			const rect = e.currentTarget.getBoundingClientRect();
			const li = customPointButton.closest("li");
			const liRect = li instanceof HTMLLIElement ? li.getBoundingClientRect() : null;
			setCustomDragPreview({
				action,
				x: e.clientX - rect.left,
				y: liRect ? getTextLineY(rect, liRect) : Math.max(2, e.clientY - rect.top - 19)
			});
			e.currentTarget.addEventListener("mousemove", moveHandler, { signal: abort.current.signal });
			return;
		}

		if (e.target instanceof HTMLButtonElement) {
			if (activeCustomAction) return;
			slider.current = e.target.id;
		} else if (e.target instanceof HTMLLIElement) {
			slider.current = "";
			if (activeCustomAction) {
				const position = computeCuePositionFromPointer(e.target, e.clientX);
				const boundedCueName = clampCustomCueNameToIntroOutro(
					cues,
					events?.[INTRO]?.name,
					events?.[OUTRO]?.name,
					e.target.id
				);
				if (!boundedCueName) return;
				sceneLogic.send({
					type: "custom-event-update",
					payload: {
						action: activeCustomAction,
						name: boundedCueName,
						position,
						delay: null
					}
				});
			} else if (selecteds.length == 0) {
				const payload = makeEventPayload(events, INTRO, e.target.id);
				sceneLogic.send({ type: "events-update", payload });
			} else {
				// no-op: intro/outro are already defined
			}
		} else {
			return;
		}
		e.currentTarget.addEventListener("mousemove", moveHandler, { signal: abort.current.signal });
	};
	const exitSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		abort.current.abort();
		abort.current = new AbortController();
		slider.current = "";
		setCustomDragPreview(null);
	};

	const moveHandler = useCallback(
		function (e: MouseEvent) {
			if (e.target instanceof HTMLLIElement) {
				if (slider.current.startsWith("custom:")) {
					const action = slider.current.slice("custom:".length);
					const position = computeCuePositionFromPointer(e.target, e.clientX);
					const boundedCueName = clampCustomCueNameToIntroOutro(
						cues,
						events?.[INTRO]?.name,
						events?.[OUTRO]?.name,
						e.target.id
					);
					if (!boundedCueName) return;
					const list = e.currentTarget as HTMLUListElement | null;
					if (list) {
						const rect = list.getBoundingClientRect();
						const liRect = e.target.getBoundingClientRect();
						setCustomDragPreview({
							action,
							x: e.clientX - rect.left,
							y: getTextLineY(rect, liRect)
						});
					}
					sceneLogic.send({
						type: "custom-event-update",
						payload: { action, name: boundedCueName, position, delay: null }
					});
					return;
				}

				if (activeCustomAction) return;
				const action = slider.current == SLIDER_START ? INTRO : OUTRO;
				const payload = makeEventPayload(events, action, e.target.id);
				sceneLogic.send({ type: "events-update", payload });
				sceneLogic.send({ type: "active-set", payload: { event: action } });
			}
		},
		[events, sceneLogic, activeCustomAction]
	);

	return (
		<div className="flex flex-1 flex-col gap-2">
			<ul
				onMouseDown={enterSelection}
				onMouseUp={exitSelection}
				className="relative flex flex-1 flex-wrap items-start border border-amber-200"
			>
				{customDragPreview ? (
					<span
						className="pointer-events-none absolute z-20 inline-block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-700 bg-blue-500"
						style={{ left: `${customDragPreview.x}px`, top: `${customDragPreview.y}px` }}
					/>
				) : null}
				{cues &&
					cues.map((cue) => {
						const selected = selecteds.includes(cue.name);
						const outsideCustomBounds =
							Boolean(activeCustomAction) && customBounds ? isOutsideBounds(cues, cue.name, customBounds) : false;
						const customActions = customPointActionsByCueName.get(cue.name) || [];
						return (
							<li
								key={cue.name}
								id={cue.name}
								className={cx("px-2 py-1 text-sm select-none", {
									"bg-amber-200": selected,
									"text-slate-400": outsideCustomBounds
								})}
							>
								{customActions.length && !customDragPreview ? (
									<span className="mr-1 inline-flex items-center gap-1 align-middle">
										{customActions.map((action) => {
											const disabled = Boolean(activeCustomAction && activeCustomAction !== action);
											return (
												<button
													type="button"
													key={`${cue.name}-${action}`}
													data-custom-point="true"
													data-custom-action={action}
													disabled={disabled}
													className={cx(
														"inline-block h-2.5 w-2.5 rounded-full",
														disabled ? "bg-slate-300" : "bg-blue-500"
													)}
													title={action}
													onMouseDown={(event) => {
														if (disabled) return;
														event.preventDefault();
													}}
													onClick={(event) => {
														if (disabled) return;
														event.preventDefault();
														event.stopPropagation();
														sceneLogic.send({ type: "active-set", payload: { event: action } });
													}}
												/>
											);
										})}
									</span>
								) : null}
								{cue.name == start && <SliderButtonStart disabled={introOutroDisabled} />}
								{cue.text}
								{cue.name == end && <SliderButtonEnd disabled={introOutroDisabled} />}
							</li>
						);
					})}
			</ul>
		</div>
	);
}

function SliderButtonStart({ disabled = false }: { disabled?: boolean }) {
	const sceneLogic = SceneLogicContext.useActorRef();
	const handleClick = () => {
		sceneLogic.send({ type: "active-set", payload: { event: INTRO } });
	};
	return (
		<span className="relative w-0">
			<button
				id={SLIDER_START}
				disabled={disabled}
				className="absolute top-0 left-0 -mx-2 -my-1 h-6"
				onClick={handleClick}
			>
				<SliderLeft
					className={cx(
						"pointer-events-none",
						disabled ? "fill-slate-200 text-slate-400" : "fill-green-300 text-green-600"
					)}
				/>
			</button>
		</span>
	);
}
function SliderButtonEnd({ disabled = false }: { disabled?: boolean }) {
	const sceneLogic = SceneLogicContext.useActorRef();
	const handleClick = () => {
		sceneLogic.send({ type: "active-set", payload: { event: OUTRO } });
	};
	return (
		<span className="relative w-0">
			<button
				id={SLIDER_END}
				disabled={disabled}
				className="absolute top-0 right-0 -mx-2 -my-1 h-6"
				onClick={handleClick}
			>
				<SliderRight
					className={cx(
						"pointer-events-none",
						disabled ? "fill-slate-200 text-slate-400" : "fill-orange-300 text-orange-600"
					)}
				/>
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

export function makeEventPayload(
	events: Record<string, { action?: string; name?: string; ref?: string } | undefined> | null,
	action: string,
	name: string
) {
	const current = events?.[action] || {};
	const defaultRef =
		action === OUTRO ? DEFAULT_TRANSITION_BY_ACTION[OUTRO] : DEFAULT_TRANSITION_BY_ACTION[INTRO];
	return { ...current, action, name, ref: current.ref || defaultRef };
}

function computeCuePositionFromPointer(target: HTMLLIElement, clientX: number): "start" | "middle" | "end" {
	const rect = target.getBoundingClientRect();
	const width = Math.max(rect.width, 1);
	const ratio = (clientX - rect.left) / width;
	if (ratio <= 0.25) return "start";
	if (ratio >= 0.75) return "end";
	return "middle";
}

function getTextLineY(containerRect: DOMRect, cueRect: DOMRect): number {
	return Math.max(2, cueRect.top - containerRect.top + cueRect.height / 2 - 3);
}

function buildCustomPointActionsByCueName(
	cues: Array<TextTime>,
	events: Record<string, ContentEvent | undefined> | null
): Map<string, string[]> {
	const points = new Map<string, string[]>();
	if (!events || !cues.length) return points;

	const introName = events[INTRO]?.name;
	const outroName = events[OUTRO]?.name;
	const introCue = introName ? cues.find((cue) => cue.name == introName) : null;
	const outroCue = outroName ? cues.find((cue) => cue.name == outroName) : null;

	for (const event of Object.values(events)) {
		if (!event || deriveEventKind(event.action) !== "custom") continue;
		const cueName = (() => {
			if (typeof event.name == "string" && event.name) return event.name;
			const point = resolveClosestCuePointFromDelay({
				cues,
				introName: introCue?.name,
				outroName: outroCue?.name,
				delaySec: event.delay
			});
			return point?.name || null;
		})();
		if (!cueName) continue;

		const list = points.get(cueName) || [];
		list.push(event.action);
		points.set(cueName, list);
	}

	return points;
}

function clampCustomCueNameToIntroOutro(
	cues: Array<TextTime>,
	introName: string | undefined,
	outroName: string | undefined,
	targetName: string
): string | null {
	if (!targetName) return null;
	if (!introName || !outroName) return targetName;

	const introIndex = cues.findIndex((cue) => cue.name === introName);
	const outroIndex = cues.findIndex((cue) => cue.name === outroName);
	const targetIndex = cues.findIndex((cue) => cue.name === targetName);
	if (introIndex < 0 || outroIndex < 0 || targetIndex < 0) return targetName;

	const min = Math.min(introIndex, outroIndex);
	const max = Math.max(introIndex, outroIndex);
	if (targetIndex < min) return cues[min]?.name || targetName;
	if (targetIndex > max) return cues[max]?.name || targetName;
	return targetName;
}

function getIntroOutroBounds(
	cues: Array<TextTime>,
	introName: string | undefined,
	outroName: string | undefined
): { min: number; max: number } | null {
	if (!introName || !outroName) return null;
	const introIndex = cues.findIndex((cue) => cue.name === introName);
	const outroIndex = cues.findIndex((cue) => cue.name === outroName);
	if (introIndex < 0 || outroIndex < 0) return null;
	return {
		min: Math.min(introIndex, outroIndex),
		max: Math.max(introIndex, outroIndex)
	};
}

function isOutsideBounds(cues: Array<TextTime>, cueName: string, bounds: { min: number; max: number }) {
	const index = cues.findIndex((cue) => cue.name === cueName);
	if (index < 0) return false;
	return index < bounds.min || index > bounds.max;
}
