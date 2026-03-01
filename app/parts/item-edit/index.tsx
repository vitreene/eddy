import { useCallback } from "react";

import { getValuesFromGridName } from "@/lib/utils";
import { SceneLogicContext } from "@/provider/scene-logic";
import { StyleEditor } from "@/components/style-editor";
import { gridWHClassName, ResizableGridFrame } from "@/components/draw-grid";
import { getTransitionOptions, normalizeTransitionRef } from "@/config/transitions";
import { INTRO, OUTRO } from "@/config/constants";
import { applyStyleDefaults, stripDefaultStyleValues } from "@/config/item-style-defaults";
import { CAPSULE_TYPES, getSelectableCapsuleTypeConfigs, resolveCapsuleType } from "@/config/capsule-types";
import { deriveEventKind } from "@/config/custom-events";
import { getCueTimeAtPosition } from "@/player/visibility/custom-event-cue-mapping";

import type { CapsuleComp, Content, ContentEvent, Decor, SceneComp, TextTime } from "@/api/db";
import type { GridSize } from "@/components/draw-grid";
import type { EditableStyle } from "@/components/style-editor/types";

export function EditItem() {
	const { send } = SceneLogicContext.useActorRef();

	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);
	console.log("EDIT", item);

	const content: Content = SceneLogicContext.useSelector((state) => state.context.contents[item?.contentId]);

	const decorState = SceneLogicContext.useSelector((state) => {
		if (!item) return { decor: undefined as Decor | undefined, editDecor: undefined as Decor | undefined };

		const itemDecor = item.decorId ? state.context.decors[item.decorId] : undefined;
		const activeEventAction = state.context.active.event;
		const activeEvent = activeEventAction ? state.context.events[item.id]?.[activeEventAction] : null;

		if (!activeEvent || deriveEventKind(activeEvent.action) !== "custom" || !activeEvent.decorId) {
			return { decor: itemDecor, editDecor: itemDecor };
		}

		const eventDecor = state.context.decors[activeEvent.decorId];
		if (!eventDecor) return { decor: itemDecor, editDecor: undefined };

		const baseBeforeEvent = resolveDecorBeforeCustomEvent(
			state.context,
			item.id,
			activeEvent.action,
			itemDecor
		);
		return { decor: mergeDecorChain(baseBeforeEvent, eventDecor), editDecor: eventDecor };
	});

	const decor = decorState.decor;
	const editDecor = decorState.editDecor;
	const activeCustomEventAction = SceneLogicContext.useSelector((state) => {
		if (!item) return null;
		const action = state.context.active.event;
		if (!action) return null;
		const ev = state.context.events[item.id]?.[action];
		if (!ev) return null;
		return deriveEventKind(ev.action) === "custom" ? action : null;
	});

	const capsule = SceneLogicContext.useSelector((state) => {
		if (content?.type == "capsule" && content.capsuleId) return state.context.capsules[content.capsuleId];
		return undefined;
	});

	const onStyleChange = useCallback(
		(payload: EditableStyle) => {
			const targetDecor = activeCustomEventAction ? editDecor : decor;
			if (!targetDecor) return;

			const payloadStyleOnly = { ...payload };
			const hasArea = typeof payloadStyleOnly.area !== "undefined";
			const hasClassName = typeof payloadStyleOnly.className !== "undefined";
			if (hasArea) delete payloadStyleOnly.area;
			if (hasClassName) delete payloadStyleOnly.className;

			const baseStyle = applyStyleDefaults((targetDecor.style as EditableStyle) ?? {}, content?.type);
			const style = stripDefaultStyleValues({ ...baseStyle, ...payloadStyleOnly }, content?.type);
			const area = hasArea ? payload.area : targetDecor.area;
			const className = hasClassName ? payload.className : targetDecor.className;

			send({
				type: "item-update",
				payload: {
					decor: {
						...targetDecor,
						className: className ?? null,
						area: area ?? null,
						style
					} as Decor
				}
			});
		},
		[send, decor, editDecor, content?.type, activeCustomEventAction]
	);

	const onResetStyle = useCallback(() => {
		if (!editDecor) return;
		send({
			type: "item-update",
			payload: {
				decor: {
					...editDecor,
					className: null,
					area: null,
					style: {}
				} as Decor
			}
		});
	}, [send, editDecor]);

	const onTextChange = useCallback(
		(inner: string) => {
			if (!content || content.type !== "text") return;
			send({ type: "content-update", payload: { id: content.id, inner } });
		},
		[send, content]
	);

	const onTextCommit = useCallback(
		(inner: string) => {
			if (!content || content.type !== "text") return;
			fetch(`/api/content/${content.id}`, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ inner })
			});
		},
		[content]
	);

	if (!item) return null;

	return capsule ? (
		<CapsuleEdit
			content={content}
			decor={decor}
			capsule={capsule}
			onChange={onStyleChange}
			onReset={onResetStyle}
			onTextChange={onTextChange}
			onTextCommit={onTextCommit}
		/>
	) : (
		<ContentEdit
			content={content}
			decor={decor}
			onChange={onStyleChange}
			onReset={onResetStyle}
			onTextChange={onTextChange}
			onTextCommit={onTextCommit}
		/>
	);
}

function ContentEdit({
	content,
	decor,
	onChange,
	onReset,
	onTextChange,
	onTextCommit
}: {
	content: Content;
	decor?: Decor;
	onChange: (newStyle: EditableStyle) => void;
	onReset: () => void;
	onTextChange: (value: string) => void;
	onTextCommit: (value: string) => void;
}) {
	return (
		<StyleEditor
			content={content}
			value={{
				...applyStyleDefaults((decor?.style as EditableStyle) ?? {}, content.type),
				area: decor?.area ?? undefined,
				className: decor?.className ?? undefined
			}}
			onChange={onChange}
			onReset={onReset}
			textValue={content.inner || ""}
			onTextChange={onTextChange}
			onTextCommit={onTextCommit}
		/>
	);
}

function CapsuleEdit({
	content,
	decor,
	capsule,
	onChange,
	onReset,
	onTextChange,
	onTextCommit
}: {
	content: Content;
	decor?: Decor;
	capsule: CapsuleComp;
	onChange: (newStyle: EditableStyle) => void;
	onReset: () => void;
	onTextChange: (value: string) => void;
	onTextCommit: (value: string) => void;
}) {
	const { send } = SceneLogicContext.useActorRef();
	const selectableTypeConfigs = getSelectableCapsuleTypeConfigs();
	const resolvedCapsuleType = resolveCapsuleType(capsule.type);

	const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		send({ type: "capsule-update", payload: { id: capsule.id, name } });
	};

	const onChangeGrid = (size: GridSize) => {
		const { className } = gridWHClassName(size);

		send({
			type: "capsule-update",
			payload: { id: capsule.id, grid: className }
		});
	};

	const onChangeCapsuleType = (nextType: string) => {
		if (nextType == CAPSULE_TYPES.CARROUSEL) {
			const { className } = gridWHClassName({ w: 1, h: 1 });
			send({ type: "capsule-update", payload: { id: capsule.id, type: nextType, grid: className } });
			return;
		}

		if (nextType == CAPSULE_TYPES.LISTE) {
			send({ type: "capsule-update", payload: { id: capsule.id, type: nextType, grid: "liste-vertical" } });
			return;
		}

		send({ type: "capsule-update", payload: { id: capsule.id, type: nextType } });
	};

	const onChangeLineParams = (orientation: "horizontal" | "vertical", cells: number) => {
		const safeCells = Math.max(1, Math.floor(cells || 1));
		const size = orientation == "horizontal" ? { w: safeCells, h: 1 } : { w: 1, h: safeCells };
		const { className } = gridWHClassName(size);
		send({ type: "capsule-update", payload: { id: capsule.id, grid: className } });
	};

	const onChangeDurationMode = (mode: "auto" | "fixed") => {
		send({ type: "capsule-update", payload: { id: capsule.id, itemDurationMode: mode } });
	};

	const onChangeDurationValue = (value: number) => {
		const duration = Number.isFinite(value) && value > 0 ? Number(value) : null;
		send({ type: "capsule-update", payload: { id: capsule.id, itemDurationSec: duration } });
	};

	const onChangeListOrientation = (orientation: "horizontal" | "vertical") => {
		send({
			type: "capsule-update",
			payload: { id: capsule.id, grid: orientation == "horizontal" ? "liste-horizontal" : "liste-vertical" }
		});
	};

	const onChangeDefaultTransition = (action: string, ref: string) => {
		send({
			type: "capsule-update",
			payload:
				action == INTRO
					? { id: capsule.id, defaultItemIntroTransition: ref || null }
					: { id: capsule.id, defaultItemOutroTransition: ref || null }
		});
	};

	const introRef = normalizeTransitionRef(parseTransitionRef(capsule.defaultItemIntroTransition), INTRO);
	const outroRef = normalizeTransitionRef(parseTransitionRef(capsule.defaultItemOutroTransition), OUTRO);

	const gridValues = getValuesFromGridName(capsule.grid);
	// Important derived variable:
	// line params are inferred from current grid so UI stays source-of-truth with persisted capsule.grid.
	const lineOrientation = gridValues.h == 1 ? "horizontal" : "vertical";
	const lineCells = Math.max(gridValues.w, gridValues.h, 1);
	const isCarousel = resolvedCapsuleType == CAPSULE_TYPES.CARROUSEL;
	const isLine = resolvedCapsuleType == CAPSULE_TYPES.RANGEE;
	const isList = resolvedCapsuleType == CAPSULE_TYPES.LISTE;
	const isGrid = resolvedCapsuleType == CAPSULE_TYPES.GRILLE;
	const isCard = resolvedCapsuleType == CAPSULE_TYPES.CARD;
	const listOrientation = capsule.grid?.includes("horizontal") ? "horizontal" : "vertical";
	const supportsDurationMode = isCarousel || isLine || isGrid || isList;
	const durationMode = (capsule as any).itemDurationMode === "fixed" ? "fixed" : "auto";
	const durationValue =
		typeof (capsule as any).itemDurationSec === "number" && Number.isFinite((capsule as any).itemDurationSec)
			? Number((capsule as any).itemDurationSec)
			: 2;
	return (
		<>
			<form onBlur={onSubmit} className="mb-2">
				<input hidden name="id" defaultValue={capsule?.id} />
				<label className="mr-2 text-xs">Nom</label>
				<input
					key={capsule?.id}
					className="inline-block border border-stone-300 p-1"
					name="name"
					defaultValue={capsule?.name}
				/>
			</form>

			<div className="mt-3 mb-2 border border-stone-300 p-2 text-xs">
				<div className="mb-2 grid grid-cols-[80px_1fr] items-center gap-2">
					<label>Type</label>
					<select
						value={resolvedCapsuleType == CAPSULE_TYPES.LEGACY ? CAPSULE_TYPES.CARROUSEL : resolvedCapsuleType}
						onChange={(e) => onChangeCapsuleType(e.currentTarget.value)}
					>
						{selectableTypeConfigs.map((cfg) => (
							<option key={cfg.type} value={cfg.type}>
								{cfg.label}
							</option>
						))}
					</select>
				</div>

				{isCarousel ? (
					<div className="space-y-1">
						<p>Grille forcee: 1 x 1</p>
					</div>
				) : null}

				{isLine ? (
					<div className="space-y-2">
						<div className="grid grid-cols-[80px_1fr] items-center gap-2">
							<label>Orientation</label>
							<select
								value={lineOrientation}
								onChange={(e) => onChangeLineParams(e.currentTarget.value as "horizontal" | "vertical", lineCells)}
							>
								<option value="horizontal">Horizontale</option>
								<option value="vertical">Verticale</option>
							</select>
						</div>
						<div className="grid grid-cols-[80px_1fr] items-center gap-2">
							<label>Cellules</label>
							<input
								type="number"
								min={1}
								max={24}
								value={lineCells}
								onChange={(e) => onChangeLineParams(lineOrientation, Number(e.currentTarget.value))}
							/>
						</div>
					</div>
				) : null}

				{isList ? (
					<div className="space-y-2">
						<div className="grid grid-cols-[80px_1fr] items-center gap-2">
							<label>Orientation</label>
							<select
								value={listOrientation}
								onChange={(e) => onChangeListOrientation(e.currentTarget.value as "horizontal" | "vertical")}
							>
								<option value="horizontal">Horizontale</option>
								<option value="vertical">Verticale</option>
							</select>
						</div>
						<p className="text-muted-foreground">
							Les items s'enchainent sans contrainte. Classes generees: liste-r1, liste-r2, ...
						</p>
					</div>
				) : null}

				{isGrid ? (
					<ResizableGridFrame key={capsule.id} w={gridValues.w} h={gridValues.h} onChange={onChangeGrid} />
				) : null}

				{isCard ? (
					<p className="text-muted-foreground">
						Card: configuration de base activee. Le composant visuel des areas sera ajoute dans une etape dediee.
					</p>
				) : null}

				{supportsDurationMode ? (
					<div className="mt-2 space-y-2 border-t border-stone-200 pt-2">
						<div className="grid grid-cols-[80px_1fr] items-center gap-2">
							<label>Duree</label>
							<select
								value={durationMode}
								onChange={(e) => onChangeDurationMode(e.currentTarget.value as "auto" | "fixed")}
							>
								<option value="auto">Duree auto</option>
								<option value="fixed">Duree</option>
							</select>
						</div>
						{durationMode === "fixed" ? (
							<div className="grid grid-cols-[80px_1fr] items-center gap-2">
								<label>Valeur</label>
								<input
									type="number"
									min={0.1}
									step={0.1}
									value={durationValue}
									onChange={(e) => onChangeDurationValue(Number(e.currentTarget.value))}
								/>
							</div>
						) : null}
					</div>
				) : null}
			</div>

			<div className="mt-3 mb-2 border border-stone-300 p-2 text-xs">
				<p className="mb-2 font-medium">Transitions par defaut des items</p>
				<div className="mb-2 grid grid-cols-[80px_1fr] items-center gap-2">
					<label>Entree</label>
					<select value={introRef} onChange={(e) => onChangeDefaultTransition(INTRO, e.currentTarget.value)}>
						<option value="">-- fallback global --</option>
						{getTransitionOptions(INTRO).map(({ key, name }) => (
							<option key={key} value={key}>
								{name}
							</option>
						))}
					</select>
				</div>
				<div className="grid grid-cols-[80px_1fr] items-center gap-2">
					<label>Sortie</label>
					<select value={outroRef} onChange={(e) => onChangeDefaultTransition(OUTRO, e.currentTarget.value)}>
						<option value="">-- fallback global --</option>
						{getTransitionOptions(OUTRO).map(({ key, name }) => (
							<option key={key} value={key}>
								{name}
							</option>
						))}
					</select>
				</div>
			</div>

			<StyleEditor
				content={content}
				value={{
					...applyStyleDefaults((decor?.style as EditableStyle) ?? {}, content.type),
					area: decor?.area ?? undefined,
					className: decor?.className ?? undefined
				}}
				onChange={onChange}
				onReset={onReset}
				textValue={content.inner || ""}
				onTextChange={onTextChange}
				onTextCommit={onTextCommit}
			/>
		</>
	);
}

function parseTransitionRef(value: CapsuleComp["defaultItemIntroTransition"]): string {
	if (!value) return "";
	if (typeof value == "string") {
		const raw = value.trim();
		if (!raw) return "";
		if (raw.startsWith("{")) {
			try {
				const parsed = JSON.parse(raw) as { ref?: unknown };
				if (typeof parsed.ref == "string") return parsed.ref;
			} catch {
				return raw;
			}
		}
		return raw;
	}
	if (typeof value == "object" && typeof value.ref == "string") return value.ref;
	return "";
}

function resolveDecorBeforeCustomEvent(
	context: SceneComp,
	itemId: number,
	currentAction: string,
	itemDecor: Decor | undefined
): Decor | undefined {
	const events = context.events[itemId] || {};
	const orderedCustomEvents = getOrderedCustomEvents(context, events);
	const currentIndex = orderedCustomEvents.findIndex((entry) => entry.event.action === currentAction);
	if (currentIndex < 0) return itemDecor;

	let resolved = itemDecor;
	for (const entry of orderedCustomEvents.slice(0, currentIndex)) {
		if (!entry.event.decorId) continue;
		const eventDecor = context.decors[entry.event.decorId];
		if (!eventDecor) continue;
		resolved = mergeDecorChain(resolved, eventDecor);
	}

	return resolved;
}

function getOrderedCustomEvents(
	context: SceneComp,
	events: Record<string, ContentEvent | undefined>
): Array<{ event: ContentEvent; timeSec: number }> {
	const sceneContent =
		Object.values(context.sceneContents).find((sceneContent) => sceneContent.sceneId == context.id) ||
		Object.values(context.sceneContents)[0];
	const cues = sceneContent?.events || [];
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const introCue = events[INTRO]?.name ? cueByName.get(events[INTRO]!.name || "") : null;
	const outroCue = events[OUTRO]?.name ? cueByName.get(events[OUTRO]!.name || "") : null;

	const withTimes = Object.values(events)
		.filter((event): event is ContentEvent => Boolean(event) && deriveEventKind(event!.action) === "custom")
		.map((event) => ({
			event,
			timeSec: resolveCustomEventTimeSec(event, cueByName, introCue || null, outroCue || null)
		}))
		.filter((entry): entry is { event: ContentEvent; timeSec: number } => Number.isFinite(entry.timeSec));

	return withTimes.toSorted((a, b) => {
		if (a.timeSec !== b.timeSec) return a.timeSec - b.timeSec;
		return a.event.action.localeCompare(b.event.action);
	});
}

function resolveCustomEventTimeSec(
	event: ContentEvent,
	cueByName: Map<string, TextTime>,
	introCue: TextTime | null,
	outroCue: TextTime | null
): number {
	if (event.name) {
		const cue = cueByName.get(event.name);
		if (!cue) return Number.NaN;
		const position = (event.position === "start" || event.position === "end" ? event.position : "middle") as
			| "start"
			| "middle"
			| "end";
		return getCueTimeAtPosition(cue, position);
	}

	if (typeof event.delay == "number" && Number.isFinite(event.delay) && event.delay >= 0 && introCue) {
		const introStart = Number(introCue.start);
		if (!Number.isFinite(introStart)) return Number.NaN;
		const outroEnd = outroCue ? Number(outroCue.end) : Number.POSITIVE_INFINITY;
		const target = introStart + event.delay;
		if (Number.isFinite(outroEnd)) return Math.min(Math.max(target, introStart), outroEnd);
		return target;
	}

	return Number.NaN;
}

function mergeDecorChain(base: Decor | undefined, override: Decor | undefined): Decor | undefined {
	if (!base) return override;
	if (!override) return base;

	return {
		...base,
		...override,
		area: override.area ?? base.area,
		className: override.className ?? base.className,
		style: {
			...((base.style as EditableStyle) || {}),
			...((override.style as EditableStyle) || {})
		}
	};
}
