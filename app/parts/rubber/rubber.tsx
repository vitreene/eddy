import { useRef } from "react";
import cx from "classnames";

import type { ContentEvent, SceneComp, TextTime } from "@/api/db";
import { INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind } from "@/config/custom-events";
import { SceneLogicContext } from "@/provider/scene-logic";
import {
	getActiveSceneContent,
	getSceneContentCues,
	getSceneContentDurationSec,
	mergeSceneEditorCues
} from "@/scene-runtime/scene-content";
import { isWaveformPositionCueName } from "@/scene-runtime/waveform-position-cues";
import { buildCapsuleBehaviorById } from "@/scene-runtime/visibility/capsule-behavior";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { resolveCueWindows } from "@/scene-runtime/visibility/resolve-cue-windows";

import { RubberProportionalLayout } from "./rubber-proportional-layout";
import { TimelinePointEditor } from "./timeline-point-editor";
import {
	buildEditablePointHandles,
	clampCustomCueNameToIntroOutro,
	makeIntroOutroEventPayload
} from "./timeline-point-editor.model";

const layout = new RubberProportionalLayout();
const RUBBER_ITEM_GAP_PX = 4;

type GuidanceBounds = { startSec: number; endSec: number };
type GuidanceMarkerKind = "item-intro" | "item-outro" | "capsule-intro" | "capsule-outro";
type GuidanceMarker = { position: "start" | "middle" | "end"; kind: GuidanceMarkerKind };
type CapsuleGuidance = {
	selectedBoundsSec: GuidanceBounds | null;
	capsuleBoundsSec: GuidanceBounds | null;
	markersByCueName: Map<string, Array<GuidanceMarker>>;
	cueMidSecByName: Map<string, number>;
};

export function Rubber() {
	const timelineRef = useRef<HTMLUListElement>(null);
	const sceneLogic = SceneLogicContext.useActorRef();
	const activeItemId = SceneLogicContext.useSelector((state) => state.context.active.itemId);
	const events = SceneLogicContext.useSelector((state) => {
		const itemId = state.context.active.itemId;
		if (!itemId) return null;
		return state.context.events[itemId] || null;
	});
	const activeEventAction = SceneLogicContext.useSelector(
		(state) => state.context.active.event as string | null
	);

	const cues = SceneLogicContext.useSelector((state) => {
		const sceneContent = getActiveSceneContent(state.context as any);
		const words = getSceneContentCues(sceneContent);
		const waveformPositionCues = (sceneContent?.events || []).filter((cue) =>
			isWaveformPositionCueName(cue?.name)
		);
		return mergeSceneEditorCues(words, waveformPositionCues).filter((cue) => isRenderableCue(cue));
	});
	const timelineDurationSec = SceneLogicContext.useSelector((state) => {
		const sceneContent = getActiveSceneContent(state.context as any);
		return getSceneContentDurationSec(sceneContent);
	});
	const activeProgress = SceneLogicContext.useSelector((state) => state.context.active.progress ?? 0);

	const segments = layout.build(cues, activeProgress, timelineDurationSec);
	const displaySegments = segments.map((segment, index) => {
		const isWaveformPositionCue = isWaveformPositionCueName(segment.name);
		const previousSegment = index > 0 ? segments[index - 1] : null;
		const nextSegment = index < segments.length - 1 ? segments[index + 1] : null;
		const hasPreviousWaveformPositionCue = Boolean(
			isWaveformPositionCue && previousSegment && isWaveformPositionCueName(previousSegment.name)
		);
		const hasNextWaveformPositionCue = Boolean(
			isWaveformPositionCue && nextSegment && isWaveformPositionCueName(nextSegment.name)
		);
		return {
			...segment,
			isWaveformPositionCue,
			hasPreviousWaveformPositionCue,
			hasNextWaveformPositionCue
		};
	});
	const snapPoints = layout.getSnapPoints(cues);
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const handles = buildEditablePointHandles({ cues, events, activeEventAction });
	const capsuleGuidance = SceneLogicContext.useSelector((state) =>
		resolveCapsuleGuidance(state.context as SceneComp, state.context.active.itemId)
	);

	const onCommitPoint = (action: string, point: { cueName: string; position: "start" | "middle" | "end" }) => {
		if (!point.cueName) return;

		if (action === INTRO || action === OUTRO) {
			const ordered = buildOrderedIntroOutroTargets({
				action,
				pendingPoint: point,
				events,
				cueByName
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
		const boundedCueName = clampCustomCueNameToIntroOutro(
			cues,
			events?.[INTRO]?.name,
			events?.[OUTRO]?.name,
			point.cueName
		);
		if (!boundedCueName) return;

		sceneLogic.send({
			type: "custom-event-update",
			payload: {
				action,
				name: boundedCueName,
				position: point.position,
				delay: null
			}
		});
		sceneLogic.send({ type: "active-set", payload: { event: action } });
	};

	return (
		<div className="flex flex-1 flex-col gap-1">
			<div className="text-[10px] text-stone-500">Rubber proportional test - echelle 1/100s = 2.4px</div>
			<div className="relative">
				<ul
					ref={timelineRef}
					className="relative flex flex-1 flex-wrap items-start gap-1 rounded border border-amber-200 bg-amber-50/30 p-1 text-[10px]"
				>
					{displaySegments.length ? (
						displaySegments.map((segment) => (
							// wf position cues are rendered as markers, not words
							<li
								key={segment.key}
								data-rubber-cue={segment.name}
								title={`${segment.name} - ${segment.durationSec.toFixed(2)}s`}
								className={resolveSegmentClassName(
									segment.isActive,
									resolveCueDimVariant(segment.name, capsuleGuidance),
									segment.isWaveformPositionCue,
									segment.hasPreviousWaveformPositionCue,
									segment.hasNextWaveformPositionCue
								)}
								style={{
									width: segment.isWaveformPositionCue ? "6px" : `${segment.widthPx}px`,
									minHeight: segment.isWaveformPositionCue ? "20px" : undefined,
									marginLeft: segment.hasPreviousWaveformPositionCue ? `${-RUBBER_ITEM_GAP_PX}px` : undefined
								}}
							>
								{(capsuleGuidance?.markersByCueName.get(segment.name) || []).map((marker, index) => (
									<span
										key={`${segment.key}-marker-${index}-${marker.kind}-${marker.position}`}
										className={resolveMarkerClassName(marker.kind)}
										style={{ left: resolveMarkerLeft(marker.position) }}
									/>
								))}
								{segment.isWaveformPositionCue ? null : segment.text}
							</li>
						))
					) : (
						<li className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-500">
							Aucun cue disponible
						</li>
					)}
				</ul>
				{activeItemId ? (
					<TimelinePointEditor
						containerRef={timelineRef}
						handles={handles}
						snapPoints={snapPoints}
						onSelect={(action) => {
							sceneLogic.send({ type: "active-set", payload: { event: action } });
						}}
						onCommit={onCommitPoint}
					/>
				) : null}
			</div>
		</div>
	);
}

function isRenderableCue(cue: TextTime): boolean {
	if (!cue?.name) return false;
	const start = Number(cue.start);
	if (!Number.isFinite(start)) return false;
	if (isWaveformPositionCueName(cue.name)) return true;
	const end = Number(cue.end);
	const safeEnd = Number.isFinite(end) ? end : start;
	if (safeEnd <= start) return false;
	return true;
}

function buildOrderedIntroOutroTargets(params: {
	action: typeof INTRO | typeof OUTRO;
	pendingPoint: { cueName: string; position: "start" | "middle" | "end" };
	events: Record<string, ContentEvent | undefined> | null;
	cueByName: Map<string, TextTime>;
}): {
	intro: { cueName: string; position: "start" | "middle" | "end" } | null;
	outro: { cueName: string; position: "start" | "middle" | "end" } | null;
} {
	const { action, pendingPoint, events, cueByName } = params;
	const introEvent = events?.[INTRO];
	const outroEvent = events?.[OUTRO];
	const introPoint = introEvent?.name
		? {
				cueName: introEvent.name,
				position: normalizePositionForAction(introEvent.position, INTRO)
			}
		: null;
	const outroPoint = outroEvent?.name
		? {
				cueName: outroEvent.name,
				position: normalizePositionForAction(outroEvent.position, OUTRO)
			}
		: null;

	const pendingSec = resolvePointTimeSec(pendingPoint, cueByName);

	if (action === INTRO) {
		if (outroPoint && Number.isFinite(pendingSec)) {
			const outroSec = resolvePointTimeSec(outroPoint, cueByName);
			if (Number.isFinite(outroSec) && pendingSec > outroSec) {
				return {
					intro: outroPoint,
					outro: pendingPoint
				};
			}
		}

		return {
			intro: pendingPoint,
			outro: outroPoint
		};
	}

	if (introPoint && Number.isFinite(pendingSec)) {
		const introSec = resolvePointTimeSec(introPoint, cueByName);
		if (Number.isFinite(introSec) && pendingSec < introSec) {
			return {
				intro: pendingPoint,
				outro: introPoint
			};
		}
	}

	return {
		intro: introPoint,
		outro: pendingPoint
	};
}

function resolvePointTimeSec(
	point: { cueName: string; position: "start" | "middle" | "end" } | null,
	cueByName: Map<string, TextTime>
): number {
	if (!point?.cueName) return Number.NaN;
	const cue = cueByName.get(point.cueName);
	if (!cue) return Number.NaN;
	return getCueTimeAtPosition(cue, point.position);
}

function resolveCapsuleGuidance(
	snapshot: SceneComp,
	activeItemId: number | null | undefined
): CapsuleGuidance | null {
	if (!activeItemId) return null;
	const activeItem = snapshot.items?.[activeItemId];
	if (!activeItem) return null;

	const capsule = snapshot.capsules?.[activeItem.capsuleId];
	if (!capsule?.itemIds?.length) return null;

	const sceneContent = getActiveSceneContent(snapshot);
	const cues = getSceneContentCues(sceneContent);
	if (!cues.length) return null;

	const behaviorByCapsuleId = buildCapsuleBehaviorById(snapshot);
	const resolved = resolveCueWindows(snapshot, {
		generateMissingEvents: true,
		behaviorByCapsuleId
	});

	const cueMidSecByName = new Map<string, number>();
	for (const cue of cues) {
		const mid = Number(cue.start) + (Number(cue.end) - Number(cue.start)) / 2;
		cueMidSecByName.set(cue.name, Number.isFinite(mid) ? mid : Number(cue.start) || 0);
	}

	type ItemRange = { itemId: number; introSec: number; outroSec: number; startSec: number; endSec: number };
	const ranges: Array<ItemRange> = [];
	const markersByCueName = new Map<string, Array<GuidanceMarker>>();

	for (const itemId of capsule.itemIds) {
		const eventMap = resolved.resolvedEvents[itemId] || snapshot.events?.[itemId] || null;
		if (!eventMap) continue;

		const introSec = resolveEventAnchorSec(eventMap[INTRO], INTRO, resolved.cueByName);
		const outroSec = resolveEventAnchorSec(eventMap[OUTRO], OUTRO, resolved.cueByName);
		if (!Number.isFinite(introSec) || !Number.isFinite(outroSec)) continue;

		const startSec = Math.min(introSec, outroSec);
		const endSec = Math.max(introSec, outroSec);
		ranges.push({ itemId, introSec, outroSec, startSec, endSec });

		if (itemId === activeItemId) continue;
		const introPoint = resolveNearestVisibleCuePoint(cues, introSec, "start");
		const outroPoint = resolveNearestVisibleCuePoint(cues, outroSec, "end");
		if (introPoint) addGuidanceMarker(markersByCueName, introPoint.cueName, introPoint.position, "item-intro");
		if (outroPoint) addGuidanceMarker(markersByCueName, outroPoint.cueName, outroPoint.position, "item-outro");
	}

	if (!ranges.length) {
		return {
			selectedBoundsSec: null,
			capsuleBoundsSec: null,
			markersByCueName,
			cueMidSecByName
		};
	}

	const selected = ranges.find((entry) => entry.itemId === activeItemId) || null;
	const capsuleBoundsSec = {
		startSec: Math.min(...ranges.map((entry) => entry.startSec)),
		endSec: Math.max(...ranges.map((entry) => entry.endSec))
	};

	const capsuleIntroPoint = resolveNearestVisibleCuePoint(cues, capsuleBoundsSec.startSec, "start");
	const capsuleOutroPoint = resolveNearestVisibleCuePoint(cues, capsuleBoundsSec.endSec, "end");
	if (capsuleIntroPoint) {
		addGuidanceMarker(markersByCueName, capsuleIntroPoint.cueName, capsuleIntroPoint.position, "capsule-intro");
	}
	if (capsuleOutroPoint) {
		addGuidanceMarker(markersByCueName, capsuleOutroPoint.cueName, capsuleOutroPoint.position, "capsule-outro");
	}

	return {
		selectedBoundsSec: selected ? { startSec: selected.startSec, endSec: selected.endSec } : null,
		capsuleBoundsSec,
		markersByCueName,
		cueMidSecByName
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

function resolveNearestVisibleCuePoint(
	cues: Array<TextTime>,
	targetSec: number,
	preferredPosition: "start" | "middle" | "end"
): { cueName: string; position: "start" | "middle" | "end" } | null {
	if (!Number.isFinite(targetSec) || !cues.length) return null;

	let best: { cueName: string; position: "start" | "middle" | "end"; score: number } | null = null;
	for (const cue of cues) {
		for (const position of ["start", "middle", "end"] as const) {
			const time = getCueTimeAtPosition(cue, position);
			if (!Number.isFinite(time)) continue;
			const positionPenalty = position === preferredPosition ? 0 : 0.0001;
			const score = Math.abs(time - targetSec) + positionPenalty;
			if (!best || score < best.score) {
				best = { cueName: cue.name, position, score };
			}
		}
	}

	if (!best) return null;
	return { cueName: best.cueName, position: best.position };
}

function addGuidanceMarker(
	markersByCueName: Map<string, Array<GuidanceMarker>>,
	cueName: string,
	position: "start" | "middle" | "end",
	kind: GuidanceMarkerKind
) {
	const list = markersByCueName.get(cueName) || [];
	if (list.some((entry) => entry.kind === kind && entry.position === position)) return;
	list.push({ kind, position });
	markersByCueName.set(cueName, list);
}

function resolveCueDimVariant(
	cueName: string,
	guidance: CapsuleGuidance | null
): "default" | "outside-selected" | "outside-capsule" {
	if (!guidance) return "default";
	const cueMidSec = guidance.cueMidSecByName.get(cueName);
	if (!Number.isFinite(cueMidSec)) return "default";

	if (
		guidance.capsuleBoundsSec &&
		(cueMidSec < guidance.capsuleBoundsSec.startSec || cueMidSec > guidance.capsuleBoundsSec.endSec)
	) {
		return "outside-capsule";
	}

	if (
		guidance.selectedBoundsSec &&
		(cueMidSec < guidance.selectedBoundsSec.startSec || cueMidSec > guidance.selectedBoundsSec.endSec)
	) {
		return "outside-selected";
	}

	return "default";
}

function resolveSegmentClassName(
	isActive: boolean,
	variant: "default" | "outside-selected" | "outside-capsule",
	isWaveformPositionCue: boolean,
	hasPreviousWaveformPositionCue: boolean,
	hasNextWaveformPositionCue: boolean
): string {
	if (isWaveformPositionCue) {
		return cx(
			"pointer-events-none relative self-center h-5 rounded border px-0 py-0 leading-none select-none",
			hasPreviousWaveformPositionCue && "rounded-l-none border-l-0",
			hasNextWaveformPositionCue && "rounded-r-none border-r-0",
			variant === "outside-capsule" && "border-emerald-300/50 bg-emerald-100/35",
			variant === "outside-selected" && "border-emerald-400/60 bg-emerald-100/55",
			variant === "default" &&
				(isActive ? "border-emerald-700 bg-emerald-400" : "border-emerald-500 bg-emerald-300")
		);
	}

	return cx(
		"relative truncate rounded px-1 py-0.5 text-center leading-4 select-none",
		variant === "outside-capsule" && "border border-stone-300 bg-stone-100 text-stone-400",
		variant === "outside-selected" && "border border-stone-400 bg-stone-200 text-stone-500",
		variant === "default" &&
			(isActive
				? "border border-amber-500 bg-amber-300 text-amber-950"
				: "border border-amber-300 bg-amber-100 text-amber-900")
	);
}

function resolveMarkerClassName(kind: GuidanceMarkerKind): string {
	return cx(
		"pointer-events-none absolute top-0 z-10 inline-block h-2 w-[2px] -translate-x-1/2 -translate-y-[3px] rounded-sm",
		(kind === "item-intro" || kind === "item-outro") && "bg-sky-500/80",
		(kind === "capsule-intro" || kind === "capsule-outro") && "bg-emerald-600"
	);
}

function resolveMarkerLeft(position: "start" | "middle" | "end"): string {
	if (position === "start") return "0%";
	if (position === "end") return "100%";
	return "50%";
}
