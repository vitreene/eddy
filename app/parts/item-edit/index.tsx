import { useCallback, useMemo } from "react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { applyStyleDefaults, getDefaultStyleForContentType } from "@/config/item-style-defaults";
import { deriveEventKind } from "@/config/custom-events";
import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";
import { SCENE_ID } from "@/player/constants";

import { CapsuleEdit } from "./capsule-edit";
import { EditTransform } from "./edit-transform";
import { ItemEditPanel } from "./item-edit-panel";
import { applyLiveStyleOnNode } from "./live-node-style";
import { mergeDecorChain, resolveDecorBeforeCustomEvent } from "./item-edit.helpers";

import type { Content, Decor, SceneComp } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";
import type { ElementTransform } from "@/components/position-editor/lib.types";

function sameStyleValue(a: unknown, b: unknown): boolean {
	return Object.is(a, b);
}

function roundToInt(value: number): number {
	const rounded = Math.round(value);
	return Object.is(rounded, -0) ? 0 : rounded;
}

function roundToTwoDecimals(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeTransformPrecision(payload: EditableStyle): EditableStyle {
	const normalized: EditableStyle = { ...payload };
	const intKeys: Array<keyof EditableStyle> = ["x", "y", "rotate"];
	const twoDecimalKeys: Array<keyof EditableStyle> = ["originX", "originY", "scaleX", "scaleY"];

	for (const key of intKeys) {
		const value = normalized[key];
		if (typeof value == "number" && Number.isFinite(value)) {
			normalized[key] = roundToInt(value) as any;
		}
	}

	for (const key of twoDecimalKeys) {
		const value = normalized[key];
		if (typeof value == "number" && Number.isFinite(value)) {
			normalized[key] = roundToTwoDecimals(value) as any;
		}
	}

	return normalized;
}

function getNeutralTransformValue(key: string): number | null {
	if (key === "x" || key === "y" || key === "rotate") return 0;
	if (key === "scaleX" || key === "scaleY") return 1;
	return null;
}

function applyClassTokenPatch(
	node: HTMLElement | null,
	previousValue: string | null,
	nextValue: string | null
) {
	if (!node) return;
	const previousTokens = (previousValue || "")
		.split(" ")
		.map((token) => token.trim())
		.filter(Boolean);
	const nextTokens = (nextValue || "")
		.split(" ")
		.map((token) => token.trim())
		.filter(Boolean);
	if (previousTokens.length) node.classList.remove(...previousTokens);
	if (nextTokens.length) node.classList.add(...nextTokens);
}

export function EditItem() {
	const { send } = SceneLogicContext.useActorRef();

	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);
	console.log("EDIT", item);

	const content: Content = SceneLogicContext.useSelector((state) => state.context.contents[item?.contentId]);
	const decors = SceneLogicContext.useSelector((state) => state.context.decors);
	const eventsByItem = SceneLogicContext.useSelector((state) => state.context.events);
	const sceneContents = SceneLogicContext.useSelector((state) => state.context.sceneContents);
	const sceneId = SceneLogicContext.useSelector((state) => state.context.id);

	const itemDecor = item?.decorId ? decors[item.decorId] : undefined;
	const activeNode = SceneLogicContext.useSelector((state) => state.context.active.node as HTMLElement | null);
	const activeCustomEventAction = SceneLogicContext.useSelector((state) => {
		if (!item) return null;
		const action = state.context.active.event;
		if (!action) return null;
		const ev = state.context.events[item.id]?.[action];
		if (!ev) return null;
		return deriveEventKind(ev.action) === "custom" ? action : null;
	});
	const activeCustomEvent = activeCustomEventAction
		? eventsByItem[item?.id || 0]?.[activeCustomEventAction]
		: null;

	const { decor, editDecor } = useMemo(() => {
		if (!item) return { decor: undefined as Decor | undefined, editDecor: undefined as Decor | undefined };
		if (
			!activeCustomEvent ||
			deriveEventKind(activeCustomEvent.action) !== "custom" ||
			!activeCustomEvent.decorId
		) {
			return { decor: itemDecor, editDecor: itemDecor };
		}

		const eventDecor = decors[activeCustomEvent.decorId];
		if (!eventDecor) return { decor: itemDecor, editDecor: undefined };

		const baseBeforeEvent = resolveDecorBeforeCustomEvent(
			{ id: sceneId, events: eventsByItem, decors, sceneContents } as SceneComp,
			item.id,
			activeCustomEvent.action,
			itemDecor
		);

		return { decor: mergeDecorChain(baseBeforeEvent, eventDecor), editDecor: eventDecor };
	}, [item, itemDecor, activeCustomEvent, decors, eventsByItem, sceneContents, sceneId]);

	const capsule = SceneLogicContext.useSelector((state) => {
		if (content?.type == "capsule" && content.capsuleId) return state.context.capsules[content.capsuleId];
		return undefined;
	});
	const parentCapsule = SceneLogicContext.useSelector((state) =>
		item ? state.context.capsules[item.capsuleId] : undefined
	);

	const onStyleChange = useCallback(
		(payload: EditableStyle) => {
			const normalizedPayload = normalizeTransformPrecision(payload);
			const targetDecor = activeCustomEventAction ? editDecor : decor;
			if (!targetDecor) return;
			const effectiveCurrentStyle = ((decor?.style as EditableStyle) ?? {}) as Record<string, unknown>;

			const payloadStyleOnly = { ...normalizedPayload };
			const hasArea = typeof payloadStyleOnly.area !== "undefined";
			const hasClassName = typeof payloadStyleOnly.className !== "undefined";
			if (hasArea) delete payloadStyleOnly.area;
			if (hasClassName) delete payloadStyleOnly.className;

			const currentPersistedStyle = ((targetDecor.style as EditableStyle) ?? {}) as Record<string, unknown>;
			const currentUiStyle = applyStyleDefaults(effectiveCurrentStyle as EditableStyle, content?.type);
			const defaults = getDefaultStyleForContentType(content?.type) as Record<string, unknown>;
			const stylePatch: EditableStyle = {};
			const liveStylePatch: EditableStyle = {};

			for (const key of Object.keys(payloadStyleOnly)) {
				const incomingValue = (payloadStyleOnly as Record<string, unknown>)[key];
				const baselineValue = (currentUiStyle as Record<string, unknown>)[key];
				if (sameStyleValue(incomingValue, baselineValue)) continue;

				const defaultValue = defaults[key];
				const neutralTransformValue = getNeutralTransformValue(key);
				const shouldDropAsDefault =
					sameStyleValue(incomingValue, defaultValue) ||
					(typeof neutralTransformValue == "number" && sameStyleValue(incomingValue, neutralTransformValue));
				const nextValue = shouldDropAsDefault ? null : incomingValue;
				const previousValue = currentPersistedStyle[key];
				if (sameStyleValue(nextValue, previousValue)) continue;
				(stylePatch as Record<string, unknown>)[key] = nextValue;
				(liveStylePatch as Record<string, unknown>)[key] = incomingValue;
			}

			const nextArea = hasArea ? (normalizedPayload.area ?? null) : (targetDecor.area ?? null);
			const nextClassName = hasClassName
				? (normalizedPayload.className ?? null)
				: (targetDecor.className ?? null);
			const areaChanged = hasArea && !sameStyleValue(nextArea, targetDecor.area ?? null);
			const classNameChanged = hasClassName && !sameStyleValue(nextClassName, targetDecor.className ?? null);
			if (!Object.keys(stylePatch).length && !areaChanged && !classNameChanged) return;

			applyLiveStyleOnNode(activeNode, liveStylePatch, {
				currentStyle: effectiveCurrentStyle as EditableStyle
			});
			if (classNameChanged) {
				applyClassTokenPatch(activeNode, targetDecor.className ?? null, nextClassName);
			}
			if (areaChanged) {
				applyClassTokenPatch(activeNode, targetDecor.area ?? null, nextArea);
			}

			send({
				type: "item-update",
				payload: {
					decor: {
						id: targetDecor.id,
						...(classNameChanged ? { className: nextClassName } : {}),
						...(areaChanged ? { area: nextArea } : {}),
						style: stylePatch
					} as Decor
				}
			});
		},
		[send, decor, editDecor, content?.type, activeCustomEventAction, activeNode]
	);

	const onResetStyle = useCallback(() => {
		if (!editDecor) return;
		if (activeNode) {
			activeNode.removeAttribute("style");
		}
		send({
			type: "item-update",
			payload: {
				decor: {
					id: editDecor.id,
					className: null,
					area: null,
					style: null
				} as Decor
			}
		});
	}, [send, editDecor, activeNode]);

	const onTextChange = useCallback(
		(inner: string) => {
			if (!content || content.type !== "text") return;
			if (activeNode) activeNode.textContent = inner;
			send({ type: "content-update", payload: { id: content.id, inner } });
		},
		[send, content, activeNode]
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

	const onTransformCommit = useCallback(
		(
			transform: ElementTransform,
			mode: "move" | "rotate" | "resize-se" | "cell-snap" | "origin",
			meta: {
				translateX: number;
				translateY: number;
				cell?: { row: number; col: number };
				reorderIndex?: number;
			}
		) => {
			const targetDecor = activeCustomEventAction ? editDecor : decor;
			if (!targetDecor) return;

			if (mode === "cell-snap") {
				const capsuleType = resolveCapsuleType(parentCapsule?.type);

				if (capsuleType === CAPSULE_TYPES.LISTE && item) {
					if (targetDecor.area) {
						applyClassTokenPatch(activeNode, targetDecor.area ?? null, null);
						send({
							type: "item-update",
							payload: {
								decor: {
									id: targetDecor.id,
									area: null
								} as Decor
							}
						});
					}

					if (typeof meta.reorderIndex === "number") {
						send({
							type: "tree-move-item",
							payload: {
								sourceId: item.id,
								targetCapsuleId: item.capsuleId,
								insertionIndex: meta.reorderIndex
							}
						});
					}
					return;
				}

				if (meta.cell) {
					const nextArea = `cell-r${meta.cell.row}-c${meta.cell.col}`;
					applyClassTokenPatch(activeNode, targetDecor.area ?? null, nextArea);
					send({
						type: "item-update",
						payload: {
							decor: {
								id: targetDecor.id,
								area: nextArea
							} as Decor
						}
					});
				}
				return;
			}

			const currentStyle = ((targetDecor.style as EditableStyle) ?? {}) as Record<string, unknown>;
			const effectiveCurrentStyle = ((decor?.style as EditableStyle) ?? {}) as Record<string, unknown>;

			const candidate = normalizeTransformPrecision({
				x: meta.translateX,
				y: meta.translateY,
				rotate: transform.rotate,
				originX: transform.originX,
				originY: transform.originY,
				scaleX: transform.scaleX,
				scaleY: transform.scaleY
			});

			const payload: EditableStyle = {};
			for (const [key, value] of Object.entries(candidate)) {
				if (sameStyleValue(effectiveCurrentStyle[key], value)) continue;
				(payload as Record<string, unknown>)[key] = value;
			}
			if (!Object.keys(payload).length) return;

			onStyleChange(payload);
		},
		[onStyleChange, activeCustomEventAction, editDecor, decor, parentCapsule?.type, item, send]
	);

	if (!item) return null;

	return (
		<>
			<EditTransform onCommit={onTransformCommit} />
			{capsule ? (
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
				<ItemEditPanel
					content={content}
					decor={decor}
					onChange={onStyleChange}
					onReset={onResetStyle}
					onTextChange={onTextChange}
					onTextCommit={onTextCommit}
				/>
			)}
		</>
	);
}
