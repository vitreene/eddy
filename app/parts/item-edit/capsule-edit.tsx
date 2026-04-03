import { Copy } from "lucide-react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { StyleEditor } from "@/components/style-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gridWHClassName, ResizableGridFrame } from "@/components/draw-grid";
import { getTransitionOptions, normalizeTransitionRef } from "@/config/transitions";
import { INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import { applyStyleDefaults } from "@/config/item-style-defaults";
import { CAPSULE_TYPES, getSelectableCapsuleTypeConfigs, resolveCapsuleType } from "@/config/capsule-types";
import { CAPSULE_GRID_PRESETS, SCENE_GRID_HEIGHT, SCENE_GRID_WIDTH } from "@/config/capsule-presets";
import { buildEditorGridClassName } from "@/config/class-prefix";
import { getValuesFromGridName } from "@/lib/utils";
import { SustainEventParams } from "@/parts/event-edit/sustain-event-params";
import { isItemEditTab } from "@/provider/scene-logic.ui-preferences";

import type { CapsuleComp, Content, Decor } from "@/api/db";
import type { GridSize } from "@/components/draw-grid";
import type { EditableStyle } from "@/components/style-editor/types";
import type { ItemEditTab } from "@/provider/types";

type CapsuleEditProps = {
	content: Content;
	decor?: Decor;
	capsule: CapsuleComp;
	onChange: (newStyle: EditableStyle) => void;
	onReset: () => void;
	onTextChange: (value: string) => void;
	onTextCommit: (value: string) => void;
	activeTab: ItemEditTab;
	onTabChange: (value: ItemEditTab) => void;
};

export function CapsuleEdit({
	content,
	decor,
	capsule,
	onChange,
	onReset,
	onTextChange,
	onTextCommit,
	activeTab,
	onTabChange
}: CapsuleEditProps) {
	const { send } = SceneLogicContext.useActorRef();
	const onUpdateCapsule = (payload: Partial<CapsuleComp>) => {
		send({ type: "capsule-update", payload: { id: capsule.id, ...payload } });
	};

	const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		send({ type: "capsule-update", payload: { id: capsule.id, name } });
	};

	const onChangeDefaultTransition = (action: string, ref: string) => {
		send({
			type: "capsule-update",
			payload:
				action == INTRO
					? { id: capsule.id, defaultItemIntroTransition: ref || null }
					: action == OUTRO
						? { id: capsule.id, defaultItemOutroTransition: ref || null }
						: { id: capsule.id, defaultItemSustainTransition: ref || null }
		});
	};

	const onChangeDefaultSustainAlternate = (checked: boolean) => {
		send({
			type: "capsule-update",
			payload: { id: capsule.id, defaultItemSustainAlternate: checked }
		});
	};

	const value: EditableStyle = {
		...applyStyleDefaults((decor?.style as EditableStyle) ?? {}, content.type),
		area: decor?.area ?? undefined,
		className: decor?.className ?? undefined
	};

	const copyCSS = () => {
		const txt = Object.entries(value)
			.map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`)
			.join("\n");
		navigator.clipboard.writeText(txt);
	};

	return (
		<div className="mt-2">
			<div className="mb-2 flex justify-between border-b pb-2">
				<Button size="sm" variant="outline" onClick={onReset}>
					Reset
				</Button>
				<Button size="sm" variant="outline" onClick={copyCSS}>
					<Copy className="h-4 w-4" />
				</Button>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(value) => {
					if (isItemEditTab(value)) onTabChange(value);
				}}
				className="w-full"
			>
				<TabsList>
					<TabsTrigger value="presets">Presets</TabsTrigger>
					<TabsTrigger value="layout">Layout</TabsTrigger>
					<TabsTrigger value="advanced">Advanced</TabsTrigger>
				</TabsList>

				<TabsContent value="presets">
					<form onBlur={onSubmit} className="mb-2 rounded border border-stone-300 p-2">
						<input hidden name="id" defaultValue={capsule?.id} />
						<label className="mr-2 text-xs">Nom</label>
						<input
							key={capsule?.id}
							className="inline-block border border-stone-300 p-1"
							name="name"
							defaultValue={capsule?.name}
						/>
					</form>

					<CapsuleGridTypeSelector capsule={capsule} onUpdate={onUpdateCapsule} />
				</TabsContent>

				<TabsContent value="layout">
					<StyleEditor
						content={content}
						value={value}
						onChange={onChange}
						textValue={content.inner || ""}
						onTextChange={onTextChange}
						onTextCommit={onTextCommit}
						mode="layout"
						showToolbar={false}
					/>
				</TabsContent>

				<TabsContent value="advanced">
					<CapsuleDefaultTransitions
						capsule={capsule}
						onChangeDefaultTransition={onChangeDefaultTransition}
						onChangeDefaultSustainAlternate={onChangeDefaultSustainAlternate}
					/>

					<StyleEditor
						content={content}
						value={value}
						onChange={onChange}
						textValue={content.inner || ""}
						onTextChange={onTextChange}
						onTextCommit={onTextCommit}
						mode="advanced"
						showToolbar={false}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function CapsuleDefaultTransitions({
	capsule,
	onChangeDefaultTransition,
	onChangeDefaultSustainAlternate
}: {
	capsule: CapsuleComp;
	onChangeDefaultTransition: (action: string, ref: string) => void;
	onChangeDefaultSustainAlternate: (checked: boolean) => void;
}) {
	const introRef = normalizeTransitionRef(parseTransitionRef(capsule.defaultItemIntroTransition), INTRO);
	const outroRef = normalizeTransitionRef(parseTransitionRef(capsule.defaultItemOutroTransition), OUTRO);
	const sustainRef = capsule.defaultItemSustainTransition ?? null;
	const sustainAlternate = capsule.defaultItemSustainAlternate === true;

	return (
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
			<div className="mt-2 border-t border-stone-200 pt-2">
				<SustainEventParams
					refValue={sustainRef}
					onRefChange={(ref) => onChangeDefaultTransition(SUSTAIN, ref || "")}
					hasCustomEvents={false}
					showCustomEventHint={false}
					effectLabel="Sustain"
					showAlternateOption
					alternate={sustainAlternate}
					onAlternateChange={onChangeDefaultSustainAlternate}
				/>
			</div>
		</div>
	);
}

function CapsuleGridTypeSelector({
	capsule,
	onUpdate
}: {
	capsule: CapsuleComp;
	onUpdate: (payload: Partial<CapsuleComp>) => void;
}) {
	const selectableTypeConfigs = getSelectableCapsuleTypeConfigs();
	const resolvedCapsuleType = resolveCapsuleType(capsule.type);
	const gridValues = getValuesFromGridName(capsule.grid);
	const lineOrientation = gridValues.h == 1 ? "horizontal" : "vertical";
	const lineCells = Math.max(gridValues.w, gridValues.h, 1);
	const isCarousel = resolvedCapsuleType == CAPSULE_TYPES.CARROUSEL;
	const isLine = resolvedCapsuleType == CAPSULE_TYPES.RANGEE;
	const isList = resolvedCapsuleType == CAPSULE_TYPES.LISTE;
	const isGrid = resolvedCapsuleType == CAPSULE_TYPES.GRILLE;
	const isCard = resolvedCapsuleType == CAPSULE_TYPES.CARD;
	const isPosition = resolvedCapsuleType == CAPSULE_TYPES.POSITION;
	const listOrientation = capsule.grid?.includes("horizontal") ? "horizontal" : "vertical";
	const supportsDurationMode = isCarousel || isLine || isGrid || isList || isPosition;
	const durationMode = (capsule as any).itemDurationMode === "fixed" ? "fixed" : "auto";
	const durationValue =
		typeof (capsule as any).itemDurationSec === "number" && Number.isFinite((capsule as any).itemDurationSec)
			? Number((capsule as any).itemDurationSec)
			: 2;

	const onChangeGrid = (size: GridSize) => {
		const { className } = gridWHClassName(size);
		onUpdate({ grid: className });
	};

	const onChangeCapsuleType = (nextType: string) => {
		if (nextType == CAPSULE_TYPES.CARROUSEL) {
			const { className } = gridWHClassName({ w: 1, h: 1 });
			onUpdate({ type: nextType, grid: className });
			return;
		}
		if (nextType == CAPSULE_TYPES.LISTE) {
			onUpdate({ type: nextType, grid: "liste-vertical" });
			return;
		}
		if (nextType == CAPSULE_TYPES.POSITION) {
			onUpdate({ type: nextType, grid: CAPSULE_GRID_PRESETS.scene });
			return;
		}
		onUpdate({ type: nextType });
	};

	const onChangePositionGrid = (nextCols: number, nextRows: number) => {
		const cols = Math.max(1, Math.floor(nextCols || 1));
		const rows = Math.max(1, Math.floor(nextRows || 1));
		onUpdate({ grid: buildEditorGridClassName(cols, rows) });
	};

	const onChangeLineParams = (orientation: "horizontal" | "vertical", cells: number) => {
		const safeCells = Math.max(1, Math.floor(cells || 1));
		const size = orientation == "horizontal" ? { w: safeCells, h: 1 } : { w: 1, h: safeCells };
		const { className } = gridWHClassName(size);
		onUpdate({ grid: className });
	};

	const onChangeListOrientation = (orientation: "horizontal" | "vertical") => {
		onUpdate({ grid: orientation == "horizontal" ? "liste-horizontal" : "liste-vertical" });
	};

	const onChangeDurationMode = (mode: "auto" | "fixed") => {
		onUpdate({ itemDurationMode: mode });
	};

	const onChangeDurationValue = (value: number) => {
		const duration = Number.isFinite(value) && value > 0 ? Number(value) : null;
		onUpdate({ itemDurationSec: duration });
	};

	return (
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
			{isPosition ? (
				<div className="space-y-2">
					<div className="grid grid-cols-[80px_1fr] items-center gap-2">
						<label>Colonnes</label>
						<input
							type="number"
							min={1}
							max={500}
							value={gridValues.w || SCENE_GRID_WIDTH}
							onChange={(e) =>
								onChangePositionGrid(Number(e.currentTarget.value), gridValues.h || SCENE_GRID_HEIGHT)
							}
						/>
					</div>
					<div className="grid grid-cols-[80px_1fr] items-center gap-2">
						<label>Lignes</label>
						<input
							type="number"
							min={1}
							max={500}
							value={gridValues.h || SCENE_GRID_HEIGHT}
							onChange={(e) => onChangePositionGrid(gridValues.w || SCENE_GRID_WIDTH, Number(e.currentTarget.value))}
						/>
					</div>
					<p className="text-muted-foreground">
						Mode position: move cellule + span. Preset scene par defaut: {SCENE_GRID_WIDTH} x {SCENE_GRID_HEIGHT}.
					</p>
				</div>
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
