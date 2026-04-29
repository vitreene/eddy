import { SceneLogicContext } from "@/provider/scene-logic";
import { SCENE_GRID_HEIGHT, SCENE_GRID_WIDTH } from "@/config/capsule-presets";
import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";
import { buildEditorGridClassName } from "@/config/class-prefix";
import { getValuesFromGridName } from "@/lib/utils";
import { ZoneBuilder } from "@/components/slot-editor/zone-builder";
import { normalizePositionZones } from "@/components/slot-editor/zone-builder.service";
import {
	mergeZonesFromOrientationEdit,
	projectZonesForOrientation,
	type PositionZoneStored
} from "@/lib/position-zones";
import {
	DEFAULT_EDITOR_PREVIEW_ORIENTATION,
	type OrientationMode
} from "@/config/orientation";
import {
	extractEditorGridClassName,
	normalizeOrientationGridRecord,
	resolveSceneGridForOrientation
} from "@/lib/orientation-grid";
import type { Content } from "@/api/db";
import {
	getActiveSceneContent,
	getSceneContentDurationSec,
	SCENE_DEFAULT_DURATION_SEC
} from "@/scene-runtime/scene-content";

interface SceneEditProps {
	allContents?: Content[];
}

type ScenePatch = {
	title?: string;
	contentId?: number | null;
	totalDuration?: number | null;
	mainGrid?: string;
	mainCardZones?: PositionZoneStored[];
};

function getSafeDurationSec(value: unknown): number {
	if (typeof value != "number" || !Number.isFinite(value) || value <= 0) return SCENE_DEFAULT_DURATION_SEC;
	return Number(value.toFixed(3));
}

function getSounds(allContents: Content[], runtimeContents: Content[]): Content[] {
	const merged = new Map<number, Content>();
	for (const content of allContents) merged.set(content.id, content);
	for (const content of runtimeContents) merged.set(content.id, content);
	return [...merged.values()].filter((content) => content.type === "sound");
}

export function SceneEdit({ allContents = [] }: SceneEditProps) {
	const { send } = SceneLogicContext.useActorRef();
	const sceneId = SceneLogicContext.useSelector((state) => state.context.id);
	const sceneTitle = SceneLogicContext.useSelector((state) => state.context.title);
	const mainCapsuleId = SceneLogicContext.useSelector((state) => state.context.main);
	const mainCapsule = SceneLogicContext.useSelector((state) =>
		mainCapsuleId ? state.context.capsules[mainCapsuleId] : null
	);
	const sceneContent = SceneLogicContext.useSelector((state) => getActiveSceneContent(state.context as any));
	const runtimeContents = SceneLogicContext.useSelector((state) =>
		Object.values(state.context.contents || {})
	);
	const previewOrientation = SceneLogicContext.useSelector(
		(state) => (state.context.active.previewOrientation as OrientationMode) || DEFAULT_EDITOR_PREVIEW_ORIENTATION
	);

	if (!sceneId || !mainCapsule) return null;

	const sounds = getSounds(allContents, runtimeContents);
	const linkedSoundId = sceneContent?.contentId ? String(sceneContent.contentId) : "";
	const sceneDurationSec = getSafeDurationSec(getSceneContentDurationSec(sceneContent));
	const orientationGrid = normalizeOrientationGridRecord(
		(mainCapsule as { orientationGrid?: unknown }).orientationGrid
	);
	const effectiveMainGrid =
		resolveSceneGridForOrientation({
			baseGrid: mainCapsule.grid,
			orientationGrid,
			orientation: previewOrientation,
			defaultOrientation: DEFAULT_EDITOR_PREVIEW_ORIENTATION
		}) || mainCapsule.grid;
	const gridValues = getValuesFromGridName(effectiveMainGrid || "");
	const normalizedMainZones = normalizePositionZones((mainCapsule as { cardZones?: unknown }).cardZones);
	const projectedMainZones = projectZonesForOrientation(normalizedMainZones, previewOrientation);

	const onCommitTitle = (titleInput: string) => {
		const nextTitle = titleInput.trim() || "Scene";
		if (nextTitle === sceneTitle) return;
		send({ type: "scene-patch-requested", payload: { sceneId, patch: { title: nextTitle } } });
	};

	const onCommitDuration = (durationInput: string) => {
		const safeDuration = getSafeDurationSec(Number(durationInput));
		send({
			type: "scene-patch-requested",
			payload: {
				sceneId,
				patch: { totalDuration: safeDuration, contentId: sceneContent?.contentId ?? null }
			}
		});
	};

	const onChangeAudio = (nextValue: string) => {
		const nextContentId = nextValue ? Number(nextValue) : null;
		send({
			type: "scene-patch-requested",
			payload: {
				sceneId,
				patch: { contentId: nextContentId, totalDuration: sceneDurationSec }
			}
		});
	};

	const onChangeMainGrid = (nextCols: number, nextRows: number) => {
		const cols = Math.max(1, Math.floor(nextCols || 1));
		const rows = Math.max(1, Math.floor(nextRows || 1));
		const nextGridClass = buildEditorGridClassName(cols, rows);
		const nextOrientationGrid = {
			portrait: orientationGrid.portrait || null,
			landscape: orientationGrid.landscape || null,
			[previewOrientation]: nextGridClass
		};
		const defaultGridClass =
			extractEditorGridClassName(
				resolveSceneGridForOrientation({
					baseGrid: mainCapsule.grid,
					orientationGrid: nextOrientationGrid,
					orientation: DEFAULT_EDITOR_PREVIEW_ORIENTATION,
					defaultOrientation: DEFAULT_EDITOR_PREVIEW_ORIENTATION
				})
			) || nextGridClass;
		const nextMainGrid = `root-scene ${defaultGridClass}`;
		send({
			type: "scene-patch-requested",
			payload: {
				sceneId,
				patch: {
					mainGrid: nextMainGrid,
					mainOrientationGrid: nextOrientationGrid
				}
			}
		});
	};

	const onChangeMainZones = (zones: PositionZoneStored[]) => {
		const mergedZones = mergeZonesFromOrientationEdit({
			baseZones: normalizedMainZones,
			editedZones: zones,
			orientation: previewOrientation,
			defaultOrientation: DEFAULT_EDITOR_PREVIEW_ORIENTATION
		});
		send({
			type: "scene-patch-requested",
			payload: {
				sceneId,
				patch: { mainCardZones: mergedZones }
			}
		});
	};

	return (
		<div className="space-y-3 rounded border border-stone-300 p-3 text-xs">
			<p className="text-sm font-medium">Scene</p>

			<div className="grid grid-cols-[90px_1fr] items-center gap-2">
				<label>Titre</label>
				<input
					key={`scene-title-${sceneTitle || ""}`}
					className="border border-stone-300 p-1"
					defaultValue={sceneTitle || ""}
					onBlur={(event) => onCommitTitle(event.currentTarget.value)}
				/>
			</div>

			<div className="grid grid-cols-[90px_1fr] items-center gap-2">
				<label>Durée</label>
				<input
					key={`scene-duration-${sceneDurationSec}`}
					type="number"
					min={0.1}
					step={0.1}
					className="border border-stone-300 p-1"
					defaultValue={sceneDurationSec}
					onBlur={(event) => onCommitDuration(event.currentTarget.value)}
				/>
			</div>

			<div className="grid grid-cols-[90px_1fr] items-center gap-2">
				<label>Audio</label>
				<select
					className="border border-stone-300 p-1"
					value={linkedSoundId}
					onChange={(event) => onChangeAudio(event.currentTarget.value)}
				>
					<option value="">Aucun son</option>
					{sounds.map((sound) => (
						<option key={sound.id} value={sound.id}>
							{sound.name || `Son ${sound.id}`}
						</option>
					))}
				</select>
			</div>

			<div className="space-y-2 border-t border-stone-200 pt-2">
				<p className="font-medium">Grille de base (__MAIN__)</p>
				<div className="grid grid-cols-[90px_1fr] items-center gap-2">
					<label>Colonnes</label>
					<input
						type="number"
						min={1}
						max={500}
						className="border border-stone-300 p-1"
						value={gridValues.w || SCENE_GRID_WIDTH}
						onChange={(event) =>
							onChangeMainGrid(Number(event.currentTarget.value), gridValues.h || SCENE_GRID_HEIGHT)
						}
					/>
				</div>
				<div className="grid grid-cols-[90px_1fr] items-center gap-2">
					<label>Lignes</label>
					<input
						type="number"
						min={1}
						max={500}
						className="border border-stone-300 p-1"
						value={gridValues.h || SCENE_GRID_HEIGHT}
						onChange={(event) =>
							onChangeMainGrid(gridValues.w || SCENE_GRID_WIDTH, Number(event.currentTarget.value))
						}
					/>
				</div>
				{resolveCapsuleType(mainCapsule.type) === CAPSULE_TYPES.POSITION ? (
					<div className="pt-1">
					<ZoneBuilder
						targetCapsuleId={mainCapsule.id}
						buttonLabel="Mode zones (__MAIN__)"
						gridClassName={effectiveMainGrid}
						zones={projectedMainZones}
						onZonesChange={onChangeMainZones}
					/>
					</div>
				) : null}
			</div>
		</div>
	);
}
