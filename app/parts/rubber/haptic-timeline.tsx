import { useReducer, useRef, useCallback, useState, useEffect } from "react";
import { animate } from "animejs";
import cx from "classnames";

import { INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind } from "@/config/custom-events";
import { SceneLogicContext } from "@/provider/scene-logic";
import { resolveClosestCuePointFromDelay } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { resolveEventCuePoint } from "@/scene-runtime/visibility/event-cue-name";
import { getActiveSceneContent, getSceneContentCues } from "@/scene-runtime/scene-content";

import type { TextTime, ContentEvent, SceneComp } from "@/api/db";

interface Tap {
	id: string;
	position: number;
	duration: number;
	intensity: number;
}

interface BuilderState {
	taps: Tap[];
	selectedId: string | null;
}

type BuilderAction =
	| { type: "ADD_TAP"; position: number; duration?: number }
	| { type: "SELECT_TAP"; id: string | null }
	| { type: "MOVE_TAP"; id: string; position: number }
	| { type: "SET_DURATION"; id: string; duration: number }
	| { type: "RESIZE_LEFT"; id: string; position: number }
	| { type: "REMOVE_TAP"; id: string }
	| { type: "SET_TAP_INTENSITY"; id: string; intensity: number }
	| { type: "LOAD_TAPS"; taps: Tap[] };

const DEFAULT_DURATION = 50;
let nextId = 100;
const genId = () => String(nextId++);
const snap = (v: number) => Math.round(v / 10) * 10;

function getNeighborBounds(taps: Tap[], id: string): { minPos: number; maxEnd: number } {
	const sorted = [...taps].sort((a, b) => a.position - b.position);
	const idx = sorted.findIndex((t) => t.id === id);
	const prev = idx > 0 ? sorted[idx - 1] : null;
	const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
	return {
		minPos: prev ? prev.position + prev.duration : 0,
		maxEnd: next ? next.position : 1000
	};
}

function canFitTap(taps: Tap[], position: number, duration: number): boolean {
	for (const tap of taps) {
		const tapEnd = tap.position + tap.duration;
		const newEnd = position + duration;
		if (position < tapEnd && newEnd > tap.position) return false;
	}
	return position >= 0 && position + duration <= 1000;
}

function eventsToTaps(cues: TextTime[], events: Record<string, ContentEvent | undefined>): Tap[] {
	const taps: Tap[] = [];
	const introPoint = resolveEventCuePoint(events[INTRO]?.name, events[INTRO]?.position, "start");
	const outroPoint = resolveEventCuePoint(events[OUTRO]?.name, events[OUTRO]?.position, "end");

	for (const event of Object.values(events)) {
		if (!event || deriveEventKind(event.action) !== "custom") continue;

		let position: number;
		if (typeof event.name === "string" && event.name) {
			const point = resolveEventCuePoint(event.name, event.position, "start");
			const cueIdx = point ? cues.findIndex((c) => c.name === point.cueName) : -1;
			if (cueIdx >= 0) position = cueIdx * 100;
			else position = 500;
		} else if (typeof event.delay === "number") {
			const point = resolveClosestCuePointFromDelay({
				cues,
				introName: introPoint?.cueName,
				outroName: outroPoint?.cueName,
				delaySec: event.delay
			});
			const cueIdx = point ? cues.findIndex((c) => c.name === point.name) : -1;
			position = cueIdx >= 0 ? cueIdx * 100 : 500;
		} else {
			position = 500;
		}

		const duration = typeof event.duration === "number" ? event.duration * 10 : DEFAULT_DURATION;
		const intensity = 0.5;

		taps.push({
			id: event.action,
			position: snap(position),
			duration,
			intensity
		});
	}

	return taps;
}

function tapsToEvents(
	taps: Tap[],
	existingEvents: Record<string, ContentEvent | undefined>
): Record<string, Partial<ContentEvent>> {
	const result: Record<string, Partial<ContentEvent>> = {};

	for (const tap of taps) {
		const existing = existingEvents[tap.id];
		if (!existing) continue;

		const cuePosition = Math.round(tap.position / 100);
		result[tap.id] = {
			...existing,
			delay: cuePosition * 0.1,
			duration: tap.duration / 10
		};
	}

	return result;
}

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
	switch (action.type) {
		case "ADD_TAP": {
			const snapped = snap(Math.max(0, Math.min(1000 - DEFAULT_DURATION, action.position)));
			if (!canFitTap(state.taps, snapped, action.duration ?? DEFAULT_DURATION)) return state;
			const newTap: Tap = {
				id: genId(),
				position: snapped,
				duration: action.duration ?? DEFAULT_DURATION,
				intensity: 0.5
			};
			return { ...state, taps: [...state.taps, newTap], selectedId: newTap.id };
		}

		case "SELECT_TAP":
			return { ...state, selectedId: action.id };

		case "MOVE_TAP": {
			const tap = state.taps.find((t) => t.id === action.id);
			if (!tap) return state;
			const bounds = getNeighborBounds(state.taps, action.id);
			const clamped = snap(Math.max(bounds.minPos, Math.min(bounds.maxEnd - tap.duration, action.position)));
			return {
				...state,
				taps: state.taps.map((t) => (t.id === action.id ? { ...t, position: clamped } : t))
			};
		}

		case "SET_DURATION": {
			const tap = state.taps.find((t) => t.id === action.id);
			if (!tap) return state;
			const bounds = getNeighborBounds(state.taps, action.id);
			const maxDur = bounds.maxEnd - tap.position;
			const dur = Math.max(10, Math.min(maxDur, action.duration));
			return {
				...state,
				taps: state.taps.map((t) => (t.id === action.id ? { ...t, duration: dur } : t))
			};
		}

		case "RESIZE_LEFT": {
			const tap = state.taps.find((t) => t.id === action.id);
			if (!tap) return state;
			const bounds = getNeighborBounds(state.taps, action.id);
			const newPos = snap(Math.max(bounds.minPos, Math.min(tap.position + tap.duration - 10, action.position)));
			const newDur = tap.position + tap.duration - newPos;
			return {
				...state,
				taps: state.taps.map((t) => (t.id === action.id ? { ...t, position: newPos, duration: newDur } : t))
			};
		}

		case "REMOVE_TAP":
			return {
				...state,
				taps: state.taps.filter((t) => t.id !== action.id),
				selectedId: state.selectedId === action.id ? null : state.selectedId
			};

		case "SET_TAP_INTENSITY":
			return {
				...state,
				taps: state.taps.map((t) =>
					t.id === action.id ? { ...t, intensity: Math.max(0, Math.min(1, action.intensity)) } : t
				)
			};

		case "LOAD_TAPS":
			return { taps: action.taps, selectedId: null };

		default:
			return state;
	}
}

const GRIDLINES = Array.from({ length: 19 }, (_, i) => (i + 1) * 50);
const LABELS = Array.from({ length: 11 }, (_, i) => i * 100);
const DELETE_THRESHOLD = 20;

export function HapticTimeline() {
	const [state, dispatch] = useReducer(reducer, { taps: [], selectedId: null });
	const sceneLogic = SceneLogicContext.useActorRef();
	const timelineRef = useRef<HTMLDivElement>(null);
	const tapRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const events = SceneLogicContext.useSelector((s) => {
		if (s.context.active.itemId) return s.context.events[s.context.active.itemId] || null;
		return null;
	});

	const sceneContents = SceneLogicContext.useSelector((s): any => getActiveSceneContent(s.context as any));

	const activeEventAction = SceneLogicContext.useSelector((s) => s.context.active.event as string | null);

	const cues = getSceneContentCues(sceneContents);
	const activeCustomAction =
		activeEventAction && deriveEventKind(activeEventAction) === "custom" ? activeEventAction : null;

	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const pendingDeleteIdRef = useRef<string | null>(null);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [playing, setPlaying] = useState(false);
	const [playCount, setPlayCount] = useState(0);
	const prevTapsRef = useRef<Tap[]>([]);

	useEffect(() => {
		if (events && cues.length) {
			const taps = eventsToTaps(cues, events);
			dispatch({ type: "LOAD_TAPS", taps });
		}
	}, [events, cues]);

	useEffect(() => {
		const prevIds = new Set(prevTapsRef.current.map((t) => t.id));
		const newTaps = state.taps.filter((t) => !prevIds.has(t.id));

		for (const tap of newTaps) {
			const el = tapRefs.current.get(tap.id);
			if (el) {
				el.style.opacity = "0";
				el.style.transform = "scale(0.8)";
				animate(el, {
					opacity: [0, 1],
					scale: [0.8, 1],
					duration: 200,
					easing: "easeOutExpo"
				});
			}
		}

		prevTapsRef.current = state.taps;
	}, [state.taps]);

	const selecteds = state.taps.map((t) => t.id);
	const customBounds = getIntroOutroBounds(cues, events?.[INTRO]?.name, events?.[OUTRO]?.name);

	const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target !== e.currentTarget) return;
		const rect = timelineRef.current?.getBoundingClientRect();
		if (!rect) return;
		const position = ((e.clientX - rect.left) / rect.width) * 1000;
		dispatch({ type: "ADD_TAP", position });
	}, []);

	const handleDragStart = useCallback(
		(e: React.PointerEvent, tapId: string) => {
			e.preventDefault();
			e.stopPropagation();
			dispatch({ type: "SELECT_TAP", id: tapId });

			const container = timelineRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();

			const tap = state.taps.find((t) => t.id === tapId);
			const cursorMs = ((e.clientX - rect.left) / rect.width) * 1000;
			const offsetMs = tap ? cursorMs - tap.position : 0;
			let currentPosition = tap?.position ?? 0;

			const initialTapScreenX = rect.left + ((tap?.position ?? 0) / 1000) * rect.width;
			const initialTapScreenY = rect.top + rect.height / 2;
			const grabOffsetX = e.clientX - initialTapScreenX;
			const grabOffsetY = e.clientY - initialTapScreenY;

			const onMove = (me: PointerEvent) => {
				const distLeft = rect.left - me.clientX;
				const distRight = me.clientX - rect.right;
				const distTop = rect.top - me.clientY;
				const distBottom = me.clientY - rect.bottom;
				const maxDist = Math.max(distLeft, distRight, distTop, distBottom);

				if (maxDist > DELETE_THRESHOLD) {
					setPendingDeleteId(tapId);
					pendingDeleteIdRef.current = tapId;
					const tapHomeX = rect.left + (currentPosition / 1000) * rect.width;
					const tapHomeY = rect.top + rect.height / 2;
					setDragOffset({
						x: me.clientX - grabOffsetX - tapHomeX,
						y: me.clientY - grabOffsetY - tapHomeY
					});
				} else {
					setPendingDeleteId(null);
					pendingDeleteIdRef.current = null;
					setDragOffset({ x: 0, y: 0 });
					const position = ((me.clientX - rect.left) / rect.width) * 1000 - offsetMs;
					dispatch({ type: "MOVE_TAP", id: tapId, position });
					currentPosition = snap(Math.max(0, Math.min(1000, position)));
				}
			};

			const onUp = () => {
				if (pendingDeleteIdRef.current === tapId) {
					dispatch({ type: "REMOVE_TAP", id: tapId });
				}
				setPendingDeleteId(null);
				pendingDeleteIdRef.current = null;
				setDragOffset({ x: 0, y: 0 });
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
			};

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
		},
		[state.taps]
	);

	const handleResizeStart = useCallback(
		(e: React.PointerEvent, tapId: string) => {
			e.preventDefault();
			e.stopPropagation();
			dispatch({ type: "SELECT_TAP", id: tapId });

			const container = timelineRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();

			const onMove = (me: PointerEvent) => {
				const tap = state.taps.find((t) => t.id === tapId);
				if (!tap) return;
				const msAtCursor = ((me.clientX - rect.left) / rect.width) * 1000;
				const newDuration = snap(Math.max(10, msAtCursor - tap.position));
				dispatch({ type: "SET_DURATION", id: tapId, duration: newDuration });
			};

			const onUp = () => {
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
			};

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
		},
		[state.taps]
	);

	const handleResizeLeftStart = useCallback((e: React.PointerEvent, tapId: string) => {
		e.preventDefault();
		e.stopPropagation();
		dispatch({ type: "SELECT_TAP", id: tapId });

		const container = timelineRef.current;
		if (!container) return;
		const rect = container.getBoundingClientRect();

		const onMove = (me: PointerEvent) => {
			const msAtCursor = ((me.clientX - rect.left) / rect.width) * 1000;
			dispatch({ type: "RESIZE_LEFT", id: tapId, position: msAtCursor });
		};

		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	}, []);

	const handleIntensityDragStart = useCallback(
		(e: React.PointerEvent, tapId: string, edge: "top" | "bottom") => {
			e.preventDefault();
			e.stopPropagation();
			dispatch({ type: "SELECT_TAP", id: tapId });

			const container = timelineRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();

			const onMove = (me: PointerEvent) => {
				const distFromEdge =
					edge === "top" ? (me.clientY - rect.top) / rect.height : (rect.bottom - me.clientY) / rect.height;
				const intensity = Math.round(Math.max(0, Math.min(1, 1 - distFromEdge * 2)) * 100) / 100;
				dispatch({ type: "SET_TAP_INTENSITY", id: tapId, intensity });
			};

			const onUp = () => {
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
			};

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
		},
		[]
	);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement) return;
			if ((e.key === "Delete" || e.key === "Backspace") && state.selectedId) {
				e.preventDefault();
				dispatch({ type: "REMOVE_TAP", id: state.selectedId });
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [state.selectedId]);

	return (
		<div className="relative flex flex-1 flex-col gap-2">
			<div
				className="relative flex flex-1 items-start border border-amber-200"
				ref={timelineRef}
				onClick={handleTimelineClick}
			>
				{GRIDLINES.map((ms) => (
					<div
						key={ms}
						className="absolute top-0 bottom-0 border-l border-slate-200"
						style={{ left: `${(ms / 1000) * 100}%` }}
					/>
				))}

				{state.taps.map((tap) => {
					const isDeleting = pendingDeleteId === tap.id;
					const isSelected = tap.id === state.selectedId;
					const inset = `calc(${1 - tap.intensity} * (50% - 10px))`;

					return (
						<div
							key={tap.id}
							ref={(el) => {
								if (el) tapRefs.current.set(tap.id, el);
								else tapRefs.current.delete(tap.id);
							}}
							style={{
								position: "absolute",
								left: `${(tap.position / 1000) * 100}%`,
								width: `${(tap.duration / 1000) * 100}%`,
								minWidth: 16,
								top: 0,
								bottom: 0,
								transform: isDeleting ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
								zIndex: isDeleting ? 9999 : undefined,
								pointerEvents: "none"
							}}
						>
							<div style={{ position: "absolute", inset: 0 }}>
								<div
									className={cx(
										"absolute inset-0 cursor-move rounded border",
										isSelected ? "border-blue-500 bg-blue-50" : "border-blue-300 bg-blue-100",
										isDeleting && "animate-pulse"
									)}
									style={{ left: 0, right: 0, top: inset, bottom: inset, pointerEvents: "auto" }}
									onPointerDown={(e) => handleDragStart(e, tap.id)}
								>
									<div
										className="absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize bg-blue-300 hover:bg-blue-500"
										onPointerDown={(e) => handleResizeLeftStart(e, tap.id)}
									/>
									<div
										className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize bg-blue-300 hover:bg-blue-500"
										onPointerDown={(e) => handleResizeStart(e, tap.id)}
									/>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex justify-between text-xs text-slate-500">
				{LABELS.map((ms) => (
					<span
						key={ms}
						style={{ position: "absolute", left: `${(ms / 1000) * 100}%`, transform: "translateX(-50%)" }}
					>
						{ms}
					</span>
				))}
			</div>
		</div>
	);
}

function getIntroOutroBounds(
	cues: TextTime[],
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
