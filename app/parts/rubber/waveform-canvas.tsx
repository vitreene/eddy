import cx from "classnames";
import { useEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";

import type { ContentEvent, SceneComp, TextTime } from "@/api/db";
import { INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind } from "@/config/custom-events";
import { patchSceneContentPositionCueOnServer } from "@/provider/scene-logic.api";
import { SceneLogicContext } from "@/provider/scene-logic";
import {
	getActiveSceneContent,
	getSceneContentCues,
	getSceneContentDurationSec,
	mergeSceneEditorCues
} from "@/scene-runtime/scene-content";
import { buildCapsuleBehaviorById } from "@/scene-runtime/visibility/capsule-behavior";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { resolveCueWindows } from "@/scene-runtime/visibility/resolve-cue-windows";
import {
	buildNextWaveformPositionCueName,
	isWaveformPositionCueName
} from "@/scene-runtime/waveform-position-cues";
import { parseContentTimestampWaveform } from "@/waveform/payload";

import { buildEditablePointHandles, makeIntroOutroEventPayload } from "./timeline-point-editor.model";
import { WaveformPointEditor } from "./waveform-point-editor";
import { WaveformPositionLayout } from "./waveform-position-layout";

type GuidanceMarkerKind = "item-intro" | "item-outro" | "capsule-intro" | "capsule-outro";
type GuidanceMarker = { timeSec: number; kind: GuidanceMarkerKind };
type GuidanceBounds = { startSec: number; endSec: number };
type WaveformGuidance = {
	selectedBoundsSec: GuidanceBounds | null;
	capsuleBoundsSec: GuidanceBounds | null;
	markers: Array<GuidanceMarker>;
};

export function WaveformCanvas() {
	const sceneLogic = SceneLogicContext.useActorRef();
	const sceneId = SceneLogicContext.useSelector((state) => state.context.id);
	const sceneContent = SceneLogicContext.useSelector((state) =>
		getActiveSceneContent(state.context as SceneComp)
	);
	const cues = SceneLogicContext.useSelector((state) => {
		const content = getActiveSceneContent(state.context as SceneComp);
		const timestamp = Array.isArray(content?.timestamp) ? content.timestamp : [];
		const events = Array.isArray(content?.events) ? content.events : [];
		return mergeSceneEditorCues(timestamp, events);
	});
	const timelineDurationSec = SceneLogicContext.useSelector((state) => {
		const content = getActiveSceneContent(state.context as SceneComp);
		return getSceneContentDurationSec(content);
	});
	const waveform = SceneLogicContext.useSelector((state) => {
		const content = getActiveSceneContent(state.context as SceneComp);
		if (!content) return null;
		const media = state.context.contents?.[content.contentId];
		return parseContentTimestampWaveform(media?.timestamp);
	});
	const activeProgress = SceneLogicContext.useSelector((state) => state.context.active.progress ?? 0);
	const activeItemId = SceneLogicContext.useSelector((state) => state.context.active.itemId);
	const activeEventAction = SceneLogicContext.useSelector(
		(state) => state.context.active.event as string | null
	);
	const events = SceneLogicContext.useSelector((state) => {
		const itemId = state.context.active.itemId;
		if (!itemId) return null;
		return state.context.events[itemId] || null;
	});
	const guidance = SceneLogicContext.useSelector((state) =>
		resolveWaveformGuidance(state.context as SceneComp, state.context.active.itemId)
	);

	const summary = waveform
		? `${waveform.points} pts • ${waveform.durationSec.toFixed(2)}s • ${Math.round(waveform.sampleRate)}Hz`
		: null;

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const lineRef = useRef<HTMLDivElement>(null);
	const cueTimeOverridesRef = useRef<Map<string, number>>(new Map());
	const backgroundPointerMoveRef = useRef<((event: PointerEvent) => void) | null>(null);
	const backgroundPointerUpRef = useRef<((event: PointerEvent) => void) | null>(null);
	const layout = new WaveformPositionLayout(timelineDurationSec);
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const sceneEventCueNames = (sceneContent?.events || []).map((cue) => cue.name);

	const handles = buildEditablePointHandles({ cues, events, activeEventAction })
		.map((handle) => {
			const cue = cueByName.get(handle.cueName);
			if (!cue) return null;
			return {
				...handle,
				timeSec: getCueTimeAtPosition(cue, handle.position)
			};
		})
		.filter((handle): handle is NonNullable<typeof handle> => Boolean(handle));

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !waveform) return;

		const width = Math.max(1, Math.round(canvas.clientWidth));
		const height = Math.max(1, Math.round(canvas.clientHeight));

		const pixelRatio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
		canvas.width = width * pixelRatio;
		canvas.height = height * pixelRatio;

		const context = canvas.getContext("2d");
		if (!context) return;
		context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		context.clearRect(0, 0, width, height);
		context.fillStyle = "#f5f5f4";
		context.fillRect(0, 0, width, height);
		context.lineWidth = 1;

		const progress = clampProgress(activeProgress);
		const elapsedEdgeX = (progress / 100) * Math.max(0, width - 1);
		const elapsedColor = "#115e59";
		const remainingColor = "#5eead4";

		const points = Math.min(waveform.points, waveform.min.length, waveform.max.length);
		if (!points) return;
		const centerY = height / 2;
		const amplitude = height * 0.45;

		for (let index = 0; index < points; index += 1) {
			const x = Math.round((index / Math.max(1, points - 1)) * (width - 1)) + 0.5;
			context.strokeStyle = x <= elapsedEdgeX + 0.5 ? elapsedColor : remainingColor;
			const min = clampWaveformValue(waveform.min[index]);
			const max = clampWaveformValue(waveform.max[index]);
			const yMin = centerY - max * amplitude;
			const yMax = centerY - min * amplitude;
			context.beginPath();
			context.moveTo(x, yMin);
			context.lineTo(x, yMax);
			context.stroke();
		}
	}, [waveform, activeProgress]);

	useEffect(() => {
		return () => {
			detachPointerListeners(backgroundPointerMoveRef, backgroundPointerUpRef);
		};
	}, []);

	const persistScenePositionCue = async (cueName: string, timeSec: number): Promise<boolean> => {
		const sceneContentPatch = await patchSceneContentPositionCueOnServer({
			sceneId,
			name: cueName,
			timeSec
		});
		if (!sceneContentPatch) return false;
		cueTimeOverridesRef.current.set(cueName, timeSec);
		sceneLogic.send({ type: "scene-content-upsert", payload: sceneContentPatch });
		return true;
	};

	const onCommitPoint = (action: string, timeSec: number) => {
		const persist = async () => {
			const usedNames = new Set(sceneEventCueNames);
			const currentName = events?.[action]?.name ?? null;
			const cueName = resolveOrCreateWaveformCueName(currentName, usedNames);
			const persisted = await persistScenePositionCue(cueName, timeSec);
			if (!persisted) return;

			if (action === INTRO || action === OUTRO) {
				const ordered = buildOrderedIntroOutroTargets({
					action,
					pendingCueName: cueName,
					pendingTimeSec: timeSec,
					events,
					cueByName,
					cueTimeOverrides: cueTimeOverridesRef.current
				});

				if (ordered.intro) {
					const introPayload = makeIntroOutroEventPayload(
						events,
						INTRO,
						ordered.intro.cueName,
						ordered.intro.position
					);
					sceneLogic.send({ type: "events-update", payload: introPayload });
				}

				if (ordered.outro) {
					const outroPayload = makeIntroOutroEventPayload(
						events,
						OUTRO,
						ordered.outro.cueName,
						ordered.outro.position
					);
					sceneLogic.send({ type: "events-update", payload: outroPayload });
				}

				sceneLogic.send({ type: "active-set", payload: { event: action } });
				return;
			}

			if (deriveEventKind(action) !== "custom") return;
			sceneLogic.send({
				type: "custom-event-update",
				payload: {
					action,
					name: cueName,
					position: "start",
					delay: null
				}
			});
			sceneLogic.send({ type: "active-set", payload: { event: action } });
		};

		void persist();
	};

	const onWaveformBackgroundPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!activeItemId) return;
		if ((event.target as HTMLElement | null)?.closest("button")) return;

		const container = lineRef.current;
		if (!container) return;

		event.preventDefault();
		event.stopPropagation();

		detachPointerListeners(backgroundPointerMoveRef, backgroundPointerUpRef);

		const startX = resolveRelativeX(container, event.clientX);
		if (!Number.isFinite(startX)) return;
		const startSec = layout.xToSec(startX, container.clientWidth);
		const dragState = { startX, startSec, moved: false };

		const onMove = (moveEvent: PointerEvent) => {
			if (Math.abs(moveEvent.clientX - event.clientX) > 4) {
				dragState.moved = true;
			}
		};

		const onUp = (upEvent: PointerEvent) => {
			detachPointerListeners(backgroundPointerMoveRef, backgroundPointerUpRef);

			const releaseX = resolveRelativeX(container, upEvent.clientX);
			if (!Number.isFinite(releaseX)) return;
			const releaseSec = layout.xToSec(releaseX, container.clientWidth);

			const hasIntro = handles.some((handle) => handle.action === INTRO);
			const hasOutro = handles.some((handle) => handle.action === OUTRO);

			if (!hasIntro && !hasOutro) {
				if (dragState.moved) {
					void createIntroOutroFromRange({
						startSec: dragState.startSec,
						endSec: releaseSec,
						events,
						sceneEventCueNames,
						sceneLogic: sceneLogic as unknown as SceneLogicSender,
						persistScenePositionCue
					});
					return;
				}

				void createSingleIntro({
					timeSec: releaseSec,
					events,
					sceneEventCueNames,
					sceneLogic: sceneLogic as unknown as SceneLogicSender,
					persistScenePositionCue
				});
				return;
			}

			if (hasIntro && !hasOutro) {
				onCommitPoint(OUTRO, releaseSec);
				return;
			}

			if (!hasIntro && hasOutro) {
				onCommitPoint(INTRO, releaseSec);
			}
		};

		backgroundPointerMoveRef.current = onMove;
		backgroundPointerUpRef.current = onUp;
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};

	const dimLayers = resolveWaveformDimLayers(guidance, layout);

	return (
		<div className="rounded-md border border-stone-200 bg-white p-2">
			<div className="mb-1 flex items-center justify-between text-[10px] text-stone-500">
				<span>Waveform</span>
				<span>{summary || "aucune donnee"}</span>
			</div>
			{waveform ? (
				<div
					ref={lineRef}
					onPointerDown={onWaveformBackgroundPointerDown}
					className="relative h-[72px] w-full overflow-hidden rounded-sm"
				>
					<canvas ref={canvasRef} className="block h-[72px] w-full" />

					{dimLayers.map((layer, index) => (
						<span
							key={`layer-${index}-${layer.variant}`}
							className={cx(
								"pointer-events-none absolute inset-y-0 z-10",
								layer.variant === "outside-selected" && "bg-stone-200/55",
								layer.variant === "outside-capsule" && "bg-stone-100/65"
							)}
							style={{ left: `${layer.leftPct}%`, width: `${layer.widthPct}%` }}
						/>
					))}

					{(guidance?.markers || []).map((marker, index) => (
						<span
							key={`marker-${index}-${marker.kind}-${marker.timeSec}`}
							className={cx(
								"pointer-events-none absolute inset-y-0 z-20 w-[2px] -translate-x-1/2",
								(marker.kind === "item-intro" || marker.kind === "item-outro") && "bg-sky-500/80",
								(marker.kind === "capsule-intro" || marker.kind === "capsule-outro") && "bg-emerald-600"
							)}
							style={{ left: `${layout.secToPercent(marker.timeSec)}%` }}
						/>
					))}

					{activeItemId ? (
						<WaveformPointEditor
							containerRef={lineRef}
							handles={handles}
							durationSec={timelineDurationSec}
							onSelect={(action) => {
								if (activeEventAction === action) return;
								sceneLogic.send({ type: "active-set", payload: { event: action } });
							}}
							onCommit={onCommitPoint}
						/>
					) : null}
				</div>
			) : (
				<div className="flex h-[72px] items-center justify-center text-[11px] text-stone-400">
					Aucun waveform enregistre
				</div>
			)}
		</div>
	);
}

type SceneLogicSender = {
	send: (event: { type: string; payload: any }) => void;
};

type PersistScenePositionCueFn = (cueName: string, timeSec: number) => Promise<boolean>;

function resolveOrCreateWaveformCueName(
	currentName: string | null | undefined,
	usedNames: Set<string>
): string {
	if (isWaveformPositionCueName(currentName)) {
		usedNames.add(currentName);
		return currentName;
	}
	const name = buildNextWaveformPositionCueName(usedNames);
	usedNames.add(name);
	return name;
}

function buildOrderedIntroOutroTargets(params: {
	action: typeof INTRO | typeof OUTRO;
	pendingCueName: string;
	pendingTimeSec: number;
	events: Record<string, ContentEvent | undefined> | null;
	cueByName: Map<string, TextTime>;
	cueTimeOverrides: Map<string, number>;
}): {
	intro: { cueName: string; position: "start" } | null;
	outro: { cueName: string; position: "start" } | null;
} {
	const { action, pendingCueName, pendingTimeSec, events, cueByName, cueTimeOverrides } = params;
	const introName = events?.[INTRO]?.name ?? null;
	const outroName = events?.[OUTRO]?.name ?? null;

	if (action === INTRO) {
		if (outroName) {
			const outroSec = resolveCueStartSec(outroName, cueByName, cueTimeOverrides);
			if (Number.isFinite(outroSec) && pendingTimeSec > outroSec) {
				return {
					intro: { cueName: outroName, position: "start" },
					outro: { cueName: pendingCueName, position: "start" }
				};
			}
		}

		return {
			intro: { cueName: pendingCueName, position: "start" },
			outro: outroName ? { cueName: outroName, position: "start" } : null
		};
	}

	if (introName) {
		const introSec = resolveCueStartSec(introName, cueByName, cueTimeOverrides);
		if (Number.isFinite(introSec) && pendingTimeSec < introSec) {
			return {
				intro: { cueName: pendingCueName, position: "start" },
				outro: { cueName: introName, position: "start" }
			};
		}
	}

	return {
		intro: introName ? { cueName: introName, position: "start" } : null,
		outro: { cueName: pendingCueName, position: "start" }
	};
}

function resolveCueStartSec(
	cueName: string,
	cueByName: Map<string, TextTime>,
	overrides: Map<string, number>
): number {
	const override = overrides.get(cueName);
	if (typeof override === "number" && Number.isFinite(override)) return override;
	const cue = cueByName.get(cueName);
	if (!cue) return Number.NaN;
	const start = Number(cue.start);
	if (!Number.isFinite(start)) return Number.NaN;
	return start;
}

async function createSingleIntro(params: {
	timeSec: number;
	events: Record<string, ContentEvent | undefined> | null;
	sceneEventCueNames: string[];
	sceneLogic: SceneLogicSender;
	persistScenePositionCue: PersistScenePositionCueFn;
}) {
	const { timeSec, events, sceneEventCueNames, sceneLogic, persistScenePositionCue } = params;
	const usedNames = new Set(sceneEventCueNames);
	const introCueName = resolveOrCreateWaveformCueName(events?.[INTRO]?.name ?? null, usedNames);

	const persisted = await persistScenePositionCue(introCueName, timeSec);
	if (!persisted) return;

	const introPayload = makeIntroOutroEventPayload(events, INTRO, introCueName, "start");
	sceneLogic.send({ type: "events-update", payload: introPayload });
	sceneLogic.send({ type: "active-set", payload: { event: INTRO } });
}

async function createIntroOutroFromRange(params: {
	startSec: number;
	endSec: number;
	events: Record<string, ContentEvent | undefined> | null;
	sceneEventCueNames: string[];
	sceneLogic: SceneLogicSender;
	persistScenePositionCue: PersistScenePositionCueFn;
}) {
	const { startSec, endSec, events, sceneEventCueNames, sceneLogic, persistScenePositionCue } = params;
	const introSec = Math.min(startSec, endSec);
	const outroSec = Math.max(startSec, endSec);

	const usedNames = new Set(sceneEventCueNames);
	const introCueName = resolveOrCreateWaveformCueName(events?.[INTRO]?.name ?? null, usedNames);
	let outroCueName = resolveOrCreateWaveformCueName(events?.[OUTRO]?.name ?? null, usedNames);
	if (outroCueName === introCueName) {
		outroCueName = buildNextWaveformPositionCueName(usedNames);
		usedNames.add(outroCueName);
	}

	const introPersisted = await persistScenePositionCue(introCueName, introSec);
	if (!introPersisted) return;
	const outroPersisted = await persistScenePositionCue(outroCueName, outroSec);
	if (!outroPersisted) return;

	const introPayload = makeIntroOutroEventPayload(events, INTRO, introCueName, "start");
	const outroPayload = makeIntroOutroEventPayload(events, OUTRO, outroCueName, "start");
	sceneLogic.send({ type: "events-update", payload: introPayload });
	sceneLogic.send({ type: "events-update", payload: outroPayload });
	sceneLogic.send({ type: "active-set", payload: { event: OUTRO } });
}

function resolveRelativeX(container: HTMLDivElement | null, clientX: number): number {
	if (!container) return Number.NaN;
	const rect = container.getBoundingClientRect();
	if (!Number.isFinite(rect.width) || rect.width <= 0) return Number.NaN;
	const x = clientX - rect.left;
	if (!Number.isFinite(x)) return Number.NaN;
	if (x < 0) return 0;
	if (x > rect.width) return rect.width;
	return x;
}

function detachPointerListeners(
	pointerMoveRef: MutableRefObject<((event: PointerEvent) => void) | null>,
	pointerUpRef: MutableRefObject<((event: PointerEvent) => void) | null>
) {
	if (pointerMoveRef.current) {
		window.removeEventListener("pointermove", pointerMoveRef.current);
		pointerMoveRef.current = null;
	}
	if (pointerUpRef.current) {
		window.removeEventListener("pointerup", pointerUpRef.current);
		pointerUpRef.current = null;
	}
}

function resolveWaveformGuidance(
	snapshot: SceneComp,
	activeItemId: number | null | undefined
): WaveformGuidance | null {
	if (!activeItemId) return null;
	const activeItem = snapshot.items?.[activeItemId];
	if (!activeItem) return null;

	const capsule = snapshot.capsules?.[activeItem.capsuleId];
	if (!capsule?.itemIds?.length) return null;

	const behaviorByCapsuleId = buildCapsuleBehaviorById(snapshot);
	const resolved = resolveCueWindows(snapshot, {
		generateMissingEvents: true,
		behaviorByCapsuleId
	});

	type ItemRange = { itemId: number; startSec: number; endSec: number; introSec: number; outroSec: number };
	const ranges: Array<ItemRange> = [];
	const markers: Array<GuidanceMarker> = [];

	for (const itemId of capsule.itemIds) {
		const eventMap = resolved.resolvedEvents[itemId] || snapshot.events?.[itemId] || null;
		if (!eventMap) continue;

		const introSec = resolveEventAnchorSec(eventMap[INTRO], INTRO, resolved.cueByName);
		const outroSec = resolveEventAnchorSec(eventMap[OUTRO], OUTRO, resolved.cueByName);
		if (!Number.isFinite(introSec) || !Number.isFinite(outroSec)) continue;

		const startSec = Math.min(introSec, outroSec);
		const endSec = Math.max(introSec, outroSec);
		ranges.push({ itemId, startSec, endSec, introSec, outroSec });

		if (itemId === activeItemId) continue;
		markers.push({ kind: "item-intro", timeSec: introSec });
		markers.push({ kind: "item-outro", timeSec: outroSec });
	}

	if (!ranges.length) {
		return {
			selectedBoundsSec: null,
			capsuleBoundsSec: null,
			markers
		};
	}

	const selected = ranges.find((entry) => entry.itemId === activeItemId) || null;
	const capsuleBoundsSec = {
		startSec: Math.min(...ranges.map((entry) => entry.startSec)),
		endSec: Math.max(...ranges.map((entry) => entry.endSec))
	};

	markers.push({ kind: "capsule-intro", timeSec: capsuleBoundsSec.startSec });
	markers.push({ kind: "capsule-outro", timeSec: capsuleBoundsSec.endSec });

	return {
		selectedBoundsSec: selected ? { startSec: selected.startSec, endSec: selected.endSec } : null,
		capsuleBoundsSec,
		markers
	};
}

function resolveEventAnchorSec(
	event: ContentEvent | undefined,
	action: string,
	cueByName: Map<string, TextTime>
): number {
	if (!event?.name) return Number.NaN;
	const cue = cueByName.get(event.name);
	if (!cue) return Number.NaN;
	const position = normalizePositionForAction(event.position, action);
	return getCueTimeAtPosition(cue, position);
}

function normalizePositionForAction(position: unknown, action: string): "start" | "middle" | "end" {
	if (position === "start" || position === "middle" || position === "end") return position;
	if (action === OUTRO) return "end";
	return "start";
}

function resolveWaveformDimLayers(
	guidance: WaveformGuidance | null,
	layout: WaveformPositionLayout
): Array<{ leftPct: number; widthPct: number; variant: "outside-selected" | "outside-capsule" }> {
	if (!guidance?.capsuleBoundsSec) return [];

	const layers: Array<{ leftPct: number; widthPct: number; variant: "outside-selected" | "outside-capsule" }> =
		[];
	const capsuleStartPct = layout.secToPercent(guidance.capsuleBoundsSec.startSec);
	const capsuleEndPct = layout.secToPercent(guidance.capsuleBoundsSec.endSec);

	if (capsuleStartPct > 0) {
		layers.push({ leftPct: 0, widthPct: capsuleStartPct, variant: "outside-capsule" });
	}
	if (capsuleEndPct < 100) {
		layers.push({ leftPct: capsuleEndPct, widthPct: 100 - capsuleEndPct, variant: "outside-capsule" });
	}

	if (!guidance.selectedBoundsSec) return layers;

	const selectedStartPct = layout.secToPercent(guidance.selectedBoundsSec.startSec);
	const selectedEndPct = layout.secToPercent(guidance.selectedBoundsSec.endSec);
	const insideCapsuleSelectedStartPct = Math.max(selectedStartPct, capsuleStartPct);
	const insideCapsuleSelectedEndPct = Math.min(selectedEndPct, capsuleEndPct);

	if (insideCapsuleSelectedStartPct > capsuleStartPct) {
		layers.push({
			leftPct: capsuleStartPct,
			widthPct: insideCapsuleSelectedStartPct - capsuleStartPct,
			variant: "outside-selected"
		});
	}

	if (insideCapsuleSelectedEndPct < capsuleEndPct) {
		layers.push({
			leftPct: insideCapsuleSelectedEndPct,
			widthPct: capsuleEndPct - insideCapsuleSelectedEndPct,
			variant: "outside-selected"
		});
	}

	return layers;
}

function clampWaveformValue(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < -1) return -1;
	if (value > 1) return 1;
	return value;
}

function clampProgress(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < 0) return 0;
	if (value > 100) return 100;
	return value;
}
