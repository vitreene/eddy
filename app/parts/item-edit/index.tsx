import { useCallback, useMemo } from "react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { applyStyleDefaults, stripDefaultStyleValues } from "@/config/item-style-defaults";
import { deriveEventKind } from "@/config/custom-events";
import { SCENE_ID } from "@/player/constants";

import { CapsuleEdit } from "./capsule-edit";
import { EditTransform } from "./edit-transform";
import { ItemEditPanel } from "./item-edit-panel";
import { mergeDecorChain, resolveDecorBeforeCustomEvent } from "./item-edit.helpers";

import type { Content, Decor, SceneComp } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";
import type { ElementTransform } from "@/components/position-editor/lib.types";

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

			console.log("STYLE", style);

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

	const onTransformCommit = useCallback(
		(
			transform: ElementTransform,
			mode: "move" | "rotate" | "resize-se" | "cell-snap",
			meta: { translateX: number; translateY: number }
		) => {
			const payload: EditableStyle = {
				width: `${transform.width}px`,
				height: `${transform.height}px`,
				rotate: transform.rotate,
				originX: transform.originX,
				originY: transform.originY,
				scaleX: transform.scaleX,
				scaleY: transform.scaleY
			};

			if (mode === "move" || mode === "cell-snap") {
				payload.x = meta.translateX;
				payload.y = meta.translateY;
			}

			onStyleChange(payload);
		},
		[onStyleChange]
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
