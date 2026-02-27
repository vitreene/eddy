import { useCallback } from "react";

import { getValuesFromGridName } from "@/lib/utils";
import { SceneLogicContext } from "@/provider/scene-logic";
import { StyleEditor } from "@/components/style-editor";
import { gridWHClassName, ResizableGridFrame } from "@/components/draw-grid";
import { getTransitionOptions, normalizeTransitionRef } from "@/config/transitions";
import { INTRO, OUTRO } from "@/config/constants";
import { applyStyleDefaults, stripDefaultStyleValues } from "@/config/item-style-defaults";

import type { CapsuleComp, Decor, Content } from "@/api/db";
import type { GridSize } from "@/components/draw-grid";
import type { EditableStyle } from "@/components/style-editor/types";

export function EditItem() {
	const { send } = SceneLogicContext.useActorRef();

	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);

	const content: Content = SceneLogicContext.useSelector((state) => state.context.contents[item?.contentId]);

	const decor = SceneLogicContext.useSelector((state) => {
		if (!item?.decorId) return undefined;
		return state.context.decors[item.decorId];
	});

	const capsule = SceneLogicContext.useSelector((state) => {
		if (content?.type == "capsule" && content.capsuleId) return state.context.capsules[content.capsuleId];
		return undefined;
	});

	const onStyleChange = useCallback(
		(payload: EditableStyle) => {
			const baseStyle = applyStyleDefaults((decor?.style as EditableStyle) ?? {}, content?.type);
			const mergedStyle = { ...baseStyle, ...payload };
			const style = stripDefaultStyleValues(mergedStyle, content?.type);
			const area = Object.prototype.hasOwnProperty.call(payload, "area") ? payload.area : decor?.area;
			const className = Object.prototype.hasOwnProperty.call(payload, "className")
				? payload.className
				: decor?.className;

			send({
				type: "item-update",
				payload: {
					decor: {
						...decor,
						className: className ?? null,
						area: area ?? null,
						style
					} as Decor
				}
			});
		},
		[send, decor, content?.type]
	);

	const onResetStyle = useCallback(() => {
		send({
			type: "item-update",
			payload: {
				decor: {
					...decor,
					className: null,
					area: null,
					style: {}
				} as Decor
			}
		});
	}, [send, decor]);

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
			value={applyStyleDefaults((decor?.style as EditableStyle) ?? {}, content.type)}
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

			<ResizableGridFrame key={capsule.id} w={gridValues.w} h={gridValues.h} onChange={onChangeGrid} />

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
				value={applyStyleDefaults((decor?.style as EditableStyle) ?? {}, content.type)}
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
