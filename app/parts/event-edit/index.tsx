import cx from "classnames";
import { CircleSmallIcon, Plus, Trash2 } from "lucide-react";

import type { ItemComp, ContentEvent } from "@/api/db";

import { INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import { getTransitionOptions } from "@/config/transitions";
import { deriveEventKind, parseCustomEventMoveOptions } from "@/config/custom-events";
import {
	parseEventMediaFromRef,
	readEventTransition,
	replaceEventRefPreservingMedia,
	writeEventMedia,
	writeEventTransition,
	type EventMediaParams
} from "@/lib/event-ref";
import { SceneLogicContext } from "@/provider/scene-logic";
import { Button } from "@/components/ui/button";
import { getActiveSceneContent, getSceneContentCues } from "@/scene-runtime/scene-content";

import { Rubber } from "../rubber/rubber";
import { MediaEventParams } from "./media-event-params";
import { SustainEventParams } from "./sustain-event-params";
import { WaveformCanvas } from "../rubber/waveform-canvas";

const actionOrder = [INTRO, SUSTAIN, OUTRO];
const MEDIA_CONTENT_TYPES = new Set(["sound", "video", "lottie", "audio"]);
const TIMELINE_VIEW_RUBBER = "rubber";
const TIMELINE_VIEW_WAVEFORM = "waveform";

type TimelineViewMode = typeof TIMELINE_VIEW_RUBBER | typeof TIMELINE_VIEW_WAVEFORM;

function resolveEventLabel(
	cues: Array<{ name: string; text: string }>,
	cueName: string | null | undefined
): string {
	if (!cueName) return "(sans repere)";
	const cue = cues.find((entry) => entry.name === cueName);
	if (!cue) return cueName;
	return cue.text || cue.name;
}

export function EditEvent() {
	const item = SceneLogicContext.useSelector((state) => {
		const itemId = state.context.active.itemId;
		if (!itemId) return null;
		return state.context.items[itemId] ?? null;
	});
	const itemContentType = SceneLogicContext.useSelector((state) => {
		const itemId = state.context.active.itemId;
		if (!itemId) return null;
		const activeItem = state.context.items[itemId];
		if (!activeItem) return null;
		return state.context.contents[activeItem.contentId]?.type ?? null;
	});
	const events = SceneLogicContext.useSelector((state) => {
		const itemId = state.context.active.itemId;
		if (!itemId) return null;
		return state.context.events[itemId] || null;
	});
	const activeEventAction = SceneLogicContext.useSelector(
		(state) => state.context.active.event as string | null
	);
	const activeEvent = activeEventAction
		? events?.[activeEventAction] || buildDefaultTransitionEvent(activeEventAction)
		: null;
	const cues = SceneLogicContext.useSelector((state) => {
		const sceneContent = getActiveSceneContent(state.context as any);
		return getSceneContentCues(sceneContent);
	});
	const timelineView = SceneLogicContext.useSelector((state) =>
		readTimelineView(state.context.active.timelineView)
	);

	return (
		<section className="flex gap-4">
			<ContentInfos key={item?.id ?? "empty"} item={item} />
			<div className="flex flex-1 flex-col gap-2">
				<EventParams
					hasActiveItem={Boolean(item)}
					event={activeEvent}
					events={events}
					cues={cues}
					showMediaParams={isMediaContentType(itemContentType)}
				/>
				{timelineView === TIMELINE_VIEW_WAVEFORM ? <WaveformCanvas /> : <Rubber />}
			</div>
		</section>
	);
}

function isMediaContentType(type: string | null | undefined): boolean {
	if (!type) return false;
	return MEDIA_CONTENT_TYPES.has(type);
}

function buildDefaultTransitionEvent(action: string): ContentEvent | null {
	const kind = deriveEventKind(action);
	if (kind !== "intro" && kind !== "sustain" && kind !== "outro") return null;
	return {
		id: undefined,
		action,
		name: null,
		ref: kind === "sustain" ? null : "",
		duration: null,
		delay: null,
		position: null,
		itemId: 0,
		decorId: null
	} as ContentEvent;
}

function EventParams({
	hasActiveItem,
	event,
	events,
	cues,
	showMediaParams
}: {
	hasActiveItem: boolean;
	event: ContentEvent | null;
	events: Record<string, ContentEvent | undefined> | null;
	cues: Array<{ name: string; text: string }>;
	showMediaParams: boolean;
}) {
	const { send } = SceneLogicContext.useActorRef();
	const kind = event ? deriveEventKind(event.action) : null;

	if (!hasActiveItem) {
		return <div className="flex min-h-11 justify-start gap-4 rounded border p-2 text-xs" />;
	}

	if (!event)
		return (
			<div className="flex justify-end gap-4 rounded border p-2 text-xs">
				<ClearEvents />
			</div>
		);

	const delay = typeof event.delay === "number" ? Number(event.delay) : "";
	const duration = typeof event.duration === "number" ? Number(event.duration) : "";
	const eventLabel = resolveEventLabel(cues, event.name);
	const moveOptions = kind === "custom" ? parseCustomEventMoveOptions(event.ref) : null;
	const mediaParams = resolveMediaParams(event.ref);
	const hasCustomEvents = Boolean(
		events &&
		Object.values(events).some((entry) => Boolean(entry) && deriveEventKind(entry!.action) === "custom")
	);

	const onUpdateCustom = (payload: {
		name?: string | null;
		delay?: number | null;
		duration?: number | null;
		position?: "start" | "middle" | "end" | null;
		autoMove?: boolean;
		clearTransforms?: boolean;
	}) => {
		send({ type: "custom-event-update", payload: { action: event.action, ...payload } });
	};

	const onChangeTransition = (ref: string) => {
		send({
			type: "events-update",
			payload: { action: event.action, ref: writeEventTransition(event.ref, ref, event.action) }
		});
	};

	const onChangeSustainRef = (ref: string | null) => {
		send({
			type: "events-update",
			payload: { action: event.action, ref: replaceEventRefPreservingMedia(event.ref, ref) }
		});
	};

	const onChangeMedia = (media: EventMediaParams) => {
		send({
			type: "events-update",
			payload: { action: event.action, ref: writeEventMedia(event.ref, media) }
		});
	};

	return (
		<div className="flex justify-start gap-4 rounded border p-2 text-xs">
			{showMediaParams ? <MediaEventParams value={mediaParams} onChange={onChangeMedia} /> : null}
			{kind === "custom" ? (
				<>
					<div className="flex min-w-40 items-center gap-2 rounded border border-stone-300 px-2">
						<span className="text-[10px] text-stone-500 uppercase">Label</span>
						<span className="truncate">{eventLabel}</span>
					</div>

					<div className="flex items-center gap-2">
						<label>Délai</label>
						<input
							type="number"
							step={0.1}
							min={0}
							value={delay}
							className="w-10"
							onChange={(e) => {
								const value = Number(e.currentTarget.value);
								onUpdateCustom({
									delay: Number.isFinite(value) && value >= 0 ? value : null,
									name: null
								});
							}}
						/>
					</div>

					<div className="flex items-center gap-2">
						<label>Durée</label>
						<input
							type="number"
							step={0.1}
							min={0.1}
							value={duration}
							className="w-10"
							onChange={(e) => {
								const value = Number(e.currentTarget.value);
								onUpdateCustom({ duration: Number.isFinite(value) && value > 0 ? value : null });
							}}
						/>
					</div>

					<div className="flex items-center gap-4">
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={Boolean(moveOptions?.autoMove)}
								onChange={(e) => onUpdateCustom({ autoMove: e.currentTarget.checked })}
							/>
							<span>Auto-move</span>
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								disabled={!moveOptions?.autoMove}
								checked={Boolean(moveOptions?.clearTransforms)}
								onChange={(e) => onUpdateCustom({ clearTransforms: e.currentTarget.checked })}
							/>
							<span>Effacer transformations</span>
						</label>
					</div>
				</>
			) : kind === "sustain" ? (
				<SustainEventParams
					refValue={event.ref}
					onRefChange={onChangeSustainRef}
					hasCustomEvents={hasCustomEvents}
				/>
			) : (
				<div className="flex items-center gap-2">
					<label>{event.action === INTRO ? "Transition entrée" : "Transition sortie"}</label>
					<select
						name="ref"
						onChange={(e) => onChangeTransition(e.currentTarget.value)}
						value={resolveTransitionRefValue(event.ref, event.action)}
					>
						<option value="">--</option>
						{getTransitionOptions(event.action).map(({ key, name }) => (
							<option key={key} value={key}>
								{name}
							</option>
						))}
					</select>
				</div>
			)}
			<ClearEvents />
		</div>
	);
}

function resolveMediaParams(ref: unknown): EventMediaParams {
	return parseEventMediaFromRef(ref) || { action: "play", offset: 0, changeAt: 0 };
}

function resolveTransitionRefValue(ref: unknown, action: string): string {
	return readEventTransition(ref, action);
}

function ClearEvents() {
	const { send } = SceneLogicContext.useActorRef();

	const events = SceneLogicContext.useSelector((state) => {
		if (state.context.active.itemId) return state.context?.events[state.context.active.itemId] || null;
		return null;
	});
	const hasClearableEvents = Boolean(events && Object.values(events).some((event) => Boolean(event?.name)));
	const clearAllEvents = () => {
		if (!hasClearableEvents) return;
		if (!events) return;

		const actions = Object.keys(events);
		for (const action of actions) {
			const payload = { ...events[action], action, name: "" };
			send({ type: "events-update", payload });
		}
	};
	return (
		<button
			type="button"
			onClick={clearAllEvents}
			disabled={!hasClearableEvents}
			className="ml-auto inline-flex h-7 items-center gap-1 rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
		>
			<Trash2 className="h-3.5 w-3.5" />
		</button>
	);
}
function ContentInfos({ item }: { item: ItemComp | null }) {
	const itemId = item?.id ?? null;
	const events = SceneLogicContext.useSelector((state) => {
		if (!itemId) return null;
		return state.context.events[itemId] || null;
	});
	const activeEvent = SceneLogicContext.useSelector((state) => state.context.active.event as string | null);
	const timelineView = SceneLogicContext.useSelector((state) =>
		readTimelineView(state.context.active.timelineView)
	);
	const cues = SceneLogicContext.useSelector((state) => {
		const sceneContent = getActiveSceneContent(state.context as any);
		return getSceneContentCues(sceneContent);
	});
	const sceneLogic = SceneLogicContext.useActorRef();

	const orderedEvents = [
		...actionOrder.map(
			(action) => events?.[action] ?? buildDefaultTransitionEvent(action) ?? { action, ref: "" }
		),
		...Object.values(events || {})
			.filter((event) => !actionOrder.includes(event.action))
			.toSorted((a, b) => {
				const aName = (a.name || a.action || "").toString();
				const bName = (b.name || b.action || "").toString();
				return aName.localeCompare(bName);
			})
	] as Array<Partial<ContentEvent> & { action: string }>;

	const onCreateCustomEvent = () => {
		if (!item) return;
		sceneLogic.send({ type: "custom-event-create", payload: {} });
	};
	const setTimelineView = (value: TimelineViewMode) => {
		sceneLogic.send({ type: "ui.active.updated", payload: { timelineView: value } });
	};

	return (
		<div className="media-infos w-64">
			<div className="mb-2 space-y-2">
				<div className="flex items-center justify-between">
					<p className="text-sm">Events</p>
					<Button
						type="button"
						size="icon-sm"
						variant="outline"
						disabled={!item}
						onClick={onCreateCustomEvent}
						aria-label="Ajouter un event personnalisé"
					>
						<Plus className="h-3.5 w-3.5" />
					</Button>
				</div>
				<div className="inline-flex rounded border border-stone-300 bg-white p-0.5 text-[11px]">
					<button
						type="button"
						onClick={() => setTimelineView(TIMELINE_VIEW_RUBBER)}
						aria-pressed={timelineView === TIMELINE_VIEW_RUBBER}
						className={cx(
							"rounded px-2 py-1",
							timelineView === TIMELINE_VIEW_RUBBER
								? "bg-amber-100 text-amber-900"
								: "text-stone-600 hover:bg-stone-100"
						)}
					>
						Rubber
					</button>
					<button
						type="button"
						onClick={() => setTimelineView(TIMELINE_VIEW_WAVEFORM)}
						aria-pressed={timelineView === TIMELINE_VIEW_WAVEFORM}
						className={cx(
							"rounded px-2 py-1",
							timelineView === TIMELINE_VIEW_WAVEFORM
								? "bg-teal-100 text-teal-900"
								: "text-stone-600 hover:bg-stone-100"
						)}
					>
						Waveform
					</button>
				</div>
			</div>
			{item ? (
				<div className="rounded border p-1">
					{orderedEvents.map((event) => (
						<MediaEventTransition key={event.action} event={event} activeEvent={activeEvent} cues={cues} />
					))}
				</div>
			) : null}
		</div>
	);
}

function readTimelineView(value: unknown): TimelineViewMode {
	if (value === TIMELINE_VIEW_WAVEFORM) return TIMELINE_VIEW_WAVEFORM;
	return TIMELINE_VIEW_RUBBER;
}

// action == marker
function MediaEventTransition({
	event,
	activeEvent,
	cues
}: {
	event: Partial<ContentEvent> & { action: string };
	activeEvent: string | null;
	cues: Array<{ name: string; text: string }>;
}) {
	const sceneLogic = SceneLogicContext.useActorRef();
	const isCustom = deriveEventKind(event.action) === "custom";
	const isActive = activeEvent === event.action;

	const toggleEvent = () => {
		sceneLogic.send({ type: "selection.event.requested", payload: { event: isActive ? null : event.action } });
	};

	const deleteEvent = () => {
		if (!isCustom) return;
		sceneLogic.send({ type: "custom-event-delete", payload: { action: event.action } });
	};

	const kind = deriveEventKind(event.action);
	const label = kind === "custom" ? resolveEventLabel(cues, event.name) : event.action;

	return (
		<div
			className={cx(
				"group flex h-7 items-center gap-1 rounded px-1 text-xs",
				isActive && "bg-blue-200 ring-1 ring-blue-400"
			)}
		>
			<button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left" onClick={toggleEvent}>
				<CircleSmallIcon
					className={cx(
						"inline-block",
						event.action === INTRO
							? "fill-green-300 stroke-green-500"
							: event.action === SUSTAIN
								? "fill-amber-200 stroke-amber-500"
								: event.action === OUTRO
									? "fill-red-300 stroke-red-500"
									: "fill-blue-300 stroke-blue-600"
					)}
				/>
				<span className="truncate">{label}</span>
			</button>

			{isCustom && isActive ? (
				<Button
					type="button"
					size="icon-sm"
					variant="ghost"
					onClick={deleteEvent}
					aria-label="Supprimer l'event personnalisé"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</Button>
			) : null}
		</div>
	);
}
