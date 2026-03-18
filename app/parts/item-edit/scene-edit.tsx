import { useEffect, useMemo, useState } from "react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { SCENE_GRID_HEIGHT, SCENE_GRID_WIDTH } from "@/config/capsule-presets";
import { buildEditorGridClassName } from "@/config/class-prefix";
import { getValuesFromGridName } from "@/lib/utils";
import {
	getActiveSceneContent,
	getSceneContentDurationSec,
	SCENE_DEFAULT_DURATION_SEC
} from "@/scene-runtime/scene-content";

export function SceneEdit() {
	const { send } = SceneLogicContext.useActorRef();
	const sceneId = SceneLogicContext.useSelector((state) => state.context.id);
	const sceneTitle = SceneLogicContext.useSelector((state) => state.context.title);
	const mainCapsuleId = SceneLogicContext.useSelector((state) => state.context.main);
	const mainCapsule = SceneLogicContext.useSelector((state) =>
		mainCapsuleId ? state.context.capsules[mainCapsuleId] : null
	);
	const sceneContent = SceneLogicContext.useSelector((state) => getActiveSceneContent(state.context as any));
	const sounds = SceneLogicContext.useSelector((state) =>
		Object.values(state.context.contents || {}).filter((content) => content.type === "sound")
	);

	const [titleDraft, setTitleDraft] = useState(sceneTitle || "");
	const [durationDraft, setDurationDraft] = useState(String(getSceneContentDurationSec(sceneContent)));

	useEffect(() => {
		setTitleDraft(sceneTitle || "");
	}, [sceneTitle]);

	useEffect(() => {
		setDurationDraft(String(getSceneContentDurationSec(sceneContent)));
	}, [sceneContent]);

	const linkedSoundId = sceneContent?.contentId ? String(sceneContent.contentId) : "";
	const gridValues = useMemo(() => getValuesFromGridName(mainCapsule?.grid), [mainCapsule?.grid]);

	const persistScenePatch = async (patch: {
		title?: string;
		contentId?: number | null;
		totalDuration?: number | null;
		mainGrid?: string;
	}) => {
		if (!sceneId) return;
		const response = await fetch(`/api/scene/${sceneId}`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify(patch)
		});
		if (!response.ok) return;

		const payload = (await response.json()) as {
			scene?: { title?: string };
			sceneContent?: any | null;
			mainCapsule?: { id: number; grid: string | null } | null;
		};

		if (payload.scene?.title) {
			send({ type: "scene-update", payload: { title: payload.scene.title } });
			setTitleDraft(payload.scene.title);
		}

		if (payload.sceneContent) {
			send({ type: "scene-content-upsert", payload: payload.sceneContent });
			setDurationDraft(String(payload.sceneContent.totalDuration ?? SCENE_DEFAULT_DURATION_SEC));
		} else if (Object.prototype.hasOwnProperty.call(patch, "contentId") && patch.contentId === null) {
			send({ type: "scene-content-remove", payload: { sceneId } });
			setDurationDraft(String(SCENE_DEFAULT_DURATION_SEC));
		}

		if (payload.mainCapsule) {
			send({ type: "capsule-update", payload: { id: payload.mainCapsule.id, grid: payload.mainCapsule.grid } });
		}
	};

	if (!sceneId || !mainCapsule) return null;

	const onCommitTitle = () => {
		const nextTitle = titleDraft.trim() || "Scene";
		if (nextTitle === sceneTitle) return;
		void persistScenePatch({ title: nextTitle });
	};

	const onCommitDuration = () => {
		const value = Number(durationDraft);
		const safeDuration =
			Number.isFinite(value) && value > 0 ? Number(value.toFixed(3)) : SCENE_DEFAULT_DURATION_SEC;
		void persistScenePatch({
			totalDuration: safeDuration,
			contentId: sceneContent?.contentId ?? null
		});
	};

	const onChangeAudio = (nextValue: string) => {
		const nextContentId = nextValue ? Number(nextValue) : null;
		const value = Number(durationDraft);
		const safeDuration =
			Number.isFinite(value) && value > 0 ? Number(value.toFixed(3)) : SCENE_DEFAULT_DURATION_SEC;
		void persistScenePatch({ contentId: nextContentId, totalDuration: safeDuration });
	};

	const onChangeMainGrid = (nextCols: number, nextRows: number) => {
		const cols = Math.max(1, Math.floor(nextCols || 1));
		const rows = Math.max(1, Math.floor(nextRows || 1));
		void persistScenePatch({ mainGrid: `root-scene ${buildEditorGridClassName(cols, rows)}` });
	};

	return (
		<div className="space-y-3 rounded border border-stone-300 p-3 text-xs">
			<p className="text-sm font-medium">Scene</p>

			<div className="grid grid-cols-[90px_1fr] items-center gap-2">
				<label>Titre</label>
				<input
					className="border border-stone-300 p-1"
					value={titleDraft}
					onChange={(event) => setTitleDraft(event.currentTarget.value)}
					onBlur={onCommitTitle}
				/>
			</div>

			<div className="grid grid-cols-[90px_1fr] items-center gap-2">
				<label>Duree (s)</label>
				<input
					type="number"
					min={0.1}
					step={0.1}
					className="border border-stone-300 p-1"
					value={durationDraft}
					onChange={(event) => setDurationDraft(event.currentTarget.value)}
					onBlur={onCommitDuration}
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
			</div>
		</div>
	);
}
