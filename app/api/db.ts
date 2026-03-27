import { PrismaClient } from "prisma/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import type {
	Capsule,
	Item,
	Content,
	Scene,
	Event as ContentEvent,
	Theme,
	Decor as DecorDB
} from "prisma/generated/prisma/client";
import type { EditableStyle } from "@/components/style-editor/types";
import { ROOT } from "@/scene-runtime/constants";
import { normalizeTransitionAction } from "@/config/transitions";
import { normalizeSustainEffectRef } from "@/config/event-effects";
import { normalizeEventRefForPersist } from "@/lib/event-ref";
import { SUSTAIN } from "@/config/constants";
import { CAPSULE_TYPES } from "@/config/capsule-types";
import { CAPSULE_GRID_PRESETS, POSITION_FULL_SPAN_CLASS } from "@/config/capsule-presets";
import { resolveCapsuleType } from "@/config/capsule-types";
import { deriveEventKind } from "@/config/custom-events";
import { buildEditorGridClassName } from "@/config/class-prefix";
import {
	buildSceneFallbackEvents,
	getSceneContentDurationSec,
	SCENE_DEFAULT_DURATION_SEC
} from "@/scene-runtime/scene-content";
import { isWaveformDataV1, type WaveformDataV1 } from "@/waveform/payload";

export type { Content, ContentEvent };

export interface Decor extends Omit<DecorDB, "style"> {
	style: Record<string, string | number | undefined> | EditableStyle;
}

export interface ContentComp {
	order: number;
	events: string;
	content: Content;
}

/* 
  type Item = {
    id: number;
    capsuleId: number;
    decorId: number | null;
    order: number;
    contentId: number;
}
	 */
export interface ItemComp extends Item {
	contentId: number;
	eventIds: number[];
	nodeId?: string;
}

/* 
 type Capsule = {
    name: string;
    id: number;
    type: string | null;
    grid: string | null;
}
	 */

export interface CapsuleComp {
	id: number;
	name: string;
	type: string | null;
	grid: string | null;
	profil?: string | null;
	itemIds: number[];
	defaultItemIntroTransition?: string | { action?: string; ref?: string } | null;
	defaultItemSustainTransition?: string | null;
	defaultItemSustainAlternate?: boolean;
	defaultItemOutroTransition?: string | { action?: string; ref?: string } | null;
	itemDurationMode?: "auto" | "fixed";
	itemDurationSec?: number | null;
}

type CapsuleProfil = {
	itemDurationMode?: "auto" | "fixed";
	itemDurationSec?: number | null;
	defaultItemIntroTransition?: string | null;
	defaultItemSustainTransition?: string | null;
	defaultItemSustainAlternate?: boolean;
	defaultItemOutroTransition?: string | null;
};

export interface TextTime {
	id?: number;
	name: string;
	text: string;
	start: number;
	end: number;
	ref?: unknown;
	delay?: number;
	duration?: number;
	position?: "start" | "middle" | "end" | null;
}

export interface SceneContent {
	id: number;
	contentId: number;
	sceneId: number;
	order: number;
	events: Array<TextTime>;
	timestamp?: Array<TextTime>;
	cues?: Array<TextTime>;
	totalDuration?: number;
}

export interface SceneComp {
	id: number;
	title: string;
	main: number | null;
	events: {
		[id: number]: Record<string, ContentEvent>;
	};
	sceneContents: {
		[id: number]: SceneContent;
	};
	capsules: {
		[id: number]: CapsuleComp;
	};
	items: {
		[id: number]: ItemComp;
	};
	contents: {
		[id: number]: Content;
	};
	decors: {
		[id: number]: Decor;
	};

	decor?: Decor;
	theme?: Theme;
}

interface DbCapsule extends Capsule {
	items: Array<
		Item & {
			content: Content;
			events: Array<ContentEvent & { decor?: DecorDB | null }>;
			decor?: DecorDB | null;
		}
	>;
	decor?: DecorDB | null;
}

/* 
type Scene = {
    id: number;
    decorId: number | null;
    capsuleId: number | null;
    themeId: number | null;
    title: string;
}
 */

interface DbSceneComp extends Scene {
	capsules: Array<DbCapsule>;

	sceneContents: Array<{
		id: number;
		contentId: number;
		sceneId: number;
		order: number;
		decorId: number | null;
		events: string;
		content: Content;
	}>;

	decor?: DecorDB | null;
	theme?: Theme | null;
}

const adapter = new PrismaBetterSqlite3({
	url: process.env.DATABASE_URL || "file:./prisma/dev.db"
});

export const prisma = new PrismaClient({ adapter });
const DEFAULT_CAPSULE_GRID = buildEditorGridClassName(1, 1);
export const DEFAULT_MAIN_CAPSULE = {
	name: "__MAIN__",
	grid: `${ROOT} ${CAPSULE_GRID_PRESETS.scene}`,
	type: CAPSULE_TYPES.POSITION
} as const;

async function main() {}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});

// SCENE

export async function createScene(title: string) {
	return await prisma.$transaction(async (tx) => {
		const mainCapsule = await tx.capsule.create({
			data: DEFAULT_MAIN_CAPSULE
		});

		const scene = await tx.scene.create({
			data: {
				title,
				capsuleId: mainCapsule.id
			}
		});

		await tx.sceneCapsule.create({
			data: {
				sceneId: scene.id,
				capsuleId: mainCapsule.id
			}
		});

		return scene;
	});
}

export type SceneRef = Pick<Scene, "id" | "title">;
export async function getScenes(): Promise<Array<SceneRef>> {
	return await prisma.scene.findMany({ select: { id: true, title: true } });
}

export async function getScene(sceneId: number): Promise<SceneComp> {
	const sceneDB = await prisma.scene.findUnique({
		where: { id: sceneId },
		include: { sceneContents: { include: { content: true } }, decor: true, theme: true }
	});

	const capsules = (
		await prisma.sceneCapsule.findMany({
			where: { sceneId },
			select: {
				capsule: {
					include: {
						items: {
							include: {
								content: true,
								decor: true,
								events: { include: { decor: true } }
							}
						}
					}
				}
			}
		})
	)
		.map((sc) => sc.capsule)
		.filter(Boolean) as Array<DbCapsule>;

	if (sceneDB?.capsuleId && !capsules.find((capsule) => capsule.id === sceneDB.capsuleId)) {
		const mainCapsule = await prisma.capsule.findUnique({
			where: { id: sceneDB.capsuleId },
			include: {
				items: {
					include: {
						content: true,
						decor: true,
						events: { include: { decor: true } }
					}
				}
			}
		});

		if (mainCapsule) capsules.push(mainCapsule as DbCapsule);
	}

	const scene = { ...sceneDB!, capsules };
	return flattenScene(scene);
}

export async function deleteScene(sceneId: number, options: { keepTexts?: boolean } = {}) {
	const keepTexts = options.keepTexts ?? true;

	return await prisma.$transaction(async (tx) => {
		const scene = await tx.scene.findUnique({
			where: { id: sceneId },
			select: {
				id: true,
				themeId: true,
				decorId: true,
				capsuleId: true,
				sceneContents: {
					select: { id: true, contentId: true, decorId: true }
				},
				sceneCapsules: {
					select: { capsuleId: true }
				}
			}
		});

		if (!scene) throw new Error(`Scene ${sceneId} not found`);

		const capsuleIds = [
			...new Set(
				[...scene.sceneCapsules.map((sceneCapsule) => sceneCapsule.capsuleId), scene.capsuleId].filter(
					(id): id is number => typeof id === "number"
				)
			)
		];

		const items = capsuleIds.length
			? await tx.item.findMany({
					where: { capsuleId: { in: capsuleIds } },
					select: { id: true, contentId: true, decorId: true }
				})
			: [];

		const itemIds = items.map((item) => item.id);
		const retainedContentIds = [
			...new Set([
				...items.map((item) => item.contentId),
				...scene.sceneContents.map((entry) => entry.contentId)
			])
		];
		const textContentCandidateIds = keepTexts
			? []
			: (
					await tx.content.findMany({
						where: { id: { in: retainedContentIds }, type: "text" },
						select: { id: true }
					})
				).map((content) => content.id);

		const events = itemIds.length
			? await tx.event.findMany({
					where: { itemId: { in: itemIds } },
					select: { id: true, decorId: true }
				})
			: [];

		const itemTargets = capsuleIds.length
			? await tx.itemTarget.findMany({
					where: { targetId: { in: capsuleIds } },
					select: { id: true }
				})
			: [];

		const itemTargetIds = itemTargets.map((itemTarget) => itemTarget.id);
		const itemTargetDecorIds = itemTargetIds.length
			? (
					await tx.decor.findMany({
						where: { itemTargetId: { in: itemTargetIds } },
						select: { id: true }
					})
				).map((decor) => decor.id)
			: [];

		const decorIds = [
			...new Set(
				[
					scene.decorId,
					...scene.sceneContents.map((sceneContent) => sceneContent.decorId),
					...items.map((item) => item.decorId),
					...events.map((event) => event.decorId),
					...itemTargetDecorIds
				].filter((id): id is number => typeof id === "number")
			)
		];

		await tx.sceneContent.deleteMany({ where: { sceneId } });

		if (itemIds.length) {
			await tx.event.deleteMany({ where: { itemId: { in: itemIds } } });
			await tx.item.deleteMany({ where: { id: { in: itemIds } } });
		}

		if (itemTargetIds.length) {
			await tx.decor.updateMany({
				where: { itemTargetId: { in: itemTargetIds } },
				data: { itemTargetId: null }
			});
			await tx.itemTarget.deleteMany({ where: { id: { in: itemTargetIds } } });
		}

		await tx.sceneCapsule.deleteMany({ where: { sceneId } });
		await tx.scene.delete({ where: { id: sceneId } });

		if (capsuleIds.length) {
			await tx.content.updateMany({
				where: { capsuleId: { in: capsuleIds } },
				data: { capsuleId: null }
			});
			await tx.capsule.deleteMany({ where: { id: { in: capsuleIds } } });
		}

		if (scene.themeId) {
			await tx.theme.deleteMany({
				where: {
					id: scene.themeId,
					scenes: { none: {} }
				}
			});
		}

		if (decorIds.length) {
			await tx.decor.deleteMany({
				where: {
					id: { in: decorIds },
					scenes: { none: {} },
					sceneContents: { none: {} },
					items: { none: {} },
					events: { none: {} },
					bases: { none: {} }
				}
			});
		}

		const deletedTextContentIds: number[] = [];
		if (textContentCandidateIds.length) {
			for (const contentId of textContentCandidateIds) {
				const [itemRefCount, sceneContentRefCount] = await Promise.all([
					tx.item.count({ where: { contentId } }),
					tx.sceneContent.count({ where: { contentId } })
				]);
				if (!itemRefCount && !sceneContentRefCount) {
					deletedTextContentIds.push(contentId);
				}
			}

			if (deletedTextContentIds.length) {
				await tx.content.deleteMany({ where: { id: { in: deletedTextContentIds } } });
			}
		}

		return {
			sceneId,
			capsuleIds,
			itemIds,
			decorIds,
			eventIds: events.map((event) => event.id),
			retainedContentIds,
			retainedContentCount: retainedContentIds.length,
			deletedTextContentIds,
			deletedTextContentCount: deletedTextContentIds.length
		};
	});
}

export function flattenScene(scene: DbSceneComp): SceneComp {
	const flatScene: SceneComp = {
		id: scene.id,
		title: scene.title,
		main: scene.capsuleId,
		events: {},
		sceneContents: {},
		capsules: {},
		items: {},
		contents: {},
		decors: {},
		decor: scene.decor ? { ...scene.decor, style: JSON.parse(scene.decor.style ?? "{}") } : undefined,
		theme: scene.theme ?? undefined
	};

	// Scene contents
	if (scene.sceneContents) {
		scene.sceneContents.forEach(({ content, ...sceneContent }) => {
			const fallbackEvents = safeParseSceneCues(sceneContent.events);
			const whisperTimestamp = parseContentTimestampWords(content.timestamp);
			const cues = whisperTimestamp;
			const totalDuration = getSceneContentDurationSec({
				timestamp: whisperTimestamp,
				events: fallbackEvents,
				cues
			});
			flatScene.sceneContents[sceneContent.id] = {
				...sceneContent,
				events: fallbackEvents,
				timestamp: whisperTimestamp,
				cues,
				totalDuration
			};
			flatScene.contents[content.id] = content;
		});
	}

	// Capsules and items
	if (scene.capsules) {
		scene.capsules.forEach(({ items: items, ...capsule }) => {
			const capsuleProfil = parseCapsuleProfil(capsule.profil);
			const itemIds: number[] = items.map((item) => item.id);

			flatScene.capsules[capsule.id] = {
				...capsule,
				defaultItemIntroTransition: parseCapsuleTransition(capsuleProfil.defaultItemIntroTransition ?? null),
				defaultItemSustainTransition: parseCapsuleSustain(capsuleProfil.defaultItemSustainTransition ?? null),
				defaultItemSustainAlternate: capsuleProfil.defaultItemSustainAlternate === true,
				defaultItemOutroTransition: parseCapsuleTransition(capsuleProfil.defaultItemOutroTransition ?? null),
				itemDurationMode: capsuleProfil.itemDurationMode === "fixed" ? "fixed" : "auto",
				itemDurationSec:
					typeof capsuleProfil.itemDurationSec == "number" && Number.isFinite(capsuleProfil.itemDurationSec)
						? capsuleProfil.itemDurationSec
						: null,
				itemIds
			};

			// Store decor in flat structure

			items.forEach(({ content, events, decor, ...item }) => {
				flatScene.items[item.id] = {
					...item,
					contentId: content.id,
					eventIds: events.map((event) => event.id)
				};

				// Store decor in flat structure
				if (decor) {
					const { style, ...d } = decor;
					flatScene.decors[decor.id] = { ...d, style: JSON.parse(style ?? "{}") };
				}

				events.forEach((event) => {
					if (!event?.decor) return;
					const { style, ...eventDecor } = event.decor;
					flatScene.decors[event.decor.id] = {
						...eventDecor,
						style: JSON.parse(style ?? "{}")
					};
				});

				const evs = Object.fromEntries(events.map((e) => [e.action, e]));
				flatScene.events[item.id] = evs;
				if (content) {
					flatScene.contents[content.id] = content;
				}
			});
		});
	}

	return flatScene;
}

// contentS

export async function createContent(
	update: { type: string; name: string } & Partial<Pick<Content, "path" | "inner" | "lang">>
) {
	return await prisma.content.create({ data: update });
}

export async function updateContent(
	id: number,
	update: Partial<Pick<Content, "inner" | "name" | "path" | "lang">>
) {
	return await prisma.content.update({
		where: { id },
		data: update
	});
}

export async function getAllContents() {
	return await prisma.content.findMany({
		where: { type: { not: "capsule" } },
		orderBy: { id: "desc" }
	});
}

export async function upsertSceneContentCues(input: {
	sceneId: number;
	contentId: number;
	cues: TextTime[];
	totalDuration?: number;
}) {
	const normalizedTimestamp = normalizeSceneContentCues(input.cues);

	return await prisma.$transaction(async (tx) => {
		const content = await tx.content.findUnique({
			where: { id: input.contentId },
			select: { timestamp: true, type: true }
		});
		if (!content) throw new Error(`Content ${input.contentId} not found`);
		if (!supportsTimestampPayload(content.type)) {
			throw new Error(`Content ${input.contentId} type ${content.type} does not support timestamp payload`);
		}
		await tx.content.update({
			where: { id: input.contentId },
			data: {
				timestamp: mergeContentTimestampWords(content?.timestamp, normalizedTimestamp)
			}
		});

		const scene = await tx.scene.findUnique({ where: { id: input.sceneId }, select: { title: true } });
		const normalizedDuration = normalizeSceneDurationSec(input.totalDuration);
		const fallbackEvents =
			normalizedTimestamp.length > 0
				? []
				: buildSceneFallbackEvents(scene?.title || "Scene", normalizedDuration);
		const eventsPayload =
			normalizedTimestamp.length > 0 ? JSON.stringify(normalizedTimestamp) : JSON.stringify(fallbackEvents);

		const existing = await tx.sceneContent.findFirst({
			where: { sceneId: input.sceneId },
			orderBy: [{ order: "asc" }, { id: "asc" }]
		});

		if (existing) {
			return tx.sceneContent.update({
				where: { id: existing.id },
				data: {
					contentId: input.contentId,
					events: eventsPayload
				}
			});
		}

		const maxOrder = await tx.sceneContent.findFirst({
			where: { sceneId: input.sceneId },
			orderBy: { order: "desc" },
			select: { order: true }
		});

		return tx.sceneContent.create({
			data: {
				sceneId: input.sceneId,
				contentId: input.contentId,
				order: (maxOrder?.order || 0) + 1000,
				events: eventsPayload
			}
		});
	});
}

export async function upsertContentWaveform(input: { contentId: number; waveform: WaveformDataV1 }) {
	return await prisma.$transaction(async (tx) => {
		const content = await tx.content.findUnique({
			where: { id: input.contentId },
			select: { id: true, timestamp: true, type: true }
		});
		if (!content) throw new Error(`Content ${input.contentId} not found`);
		if (!supportsTimestampPayload(content.type)) {
			throw new Error(`Content ${input.contentId} type ${content.type} does not support timestamp payload`);
		}

		return tx.content.update({
			where: { id: input.contentId },
			data: {
				timestamp: mergeContentTimestampWaveform(content.timestamp, input.waveform)
			}
		});
	});
}

export async function updateSceneTitle(sceneId: number, title: string) {
	return await prisma.scene.update({
		where: { id: sceneId },
		data: { title }
	});
}

export async function upsertSceneAudioSettings(input: {
	sceneId: number;
	contentId: number | null;
	totalDuration?: number | null;
}) {
	return await prisma.$transaction(async (tx) => {
		const normalizedDuration = normalizeSceneDurationSec(input.totalDuration);
		const scene = await tx.scene.findUnique({ where: { id: input.sceneId }, select: { title: true } });
		const linkedContent = input.contentId
			? await tx.content.findUnique({ where: { id: input.contentId }, select: { timestamp: true, type: true } })
			: null;
		const linkedTimestamp =
			linkedContent && supportsTimestampPayload(linkedContent.type)
				? parseContentTimestampWords(linkedContent.timestamp)
				: [];
		const existing = await tx.sceneContent.findFirst({
			where: { sceneId: input.sceneId },
			orderBy: [{ order: "asc" }, { id: "asc" }]
		});

		if (!input.contentId) {
			if (existing) await tx.sceneContent.delete({ where: { id: existing.id } });
			return null;
		}

		const fallbackEvents = buildSceneFallbackEvents(scene?.title || "Scene", normalizedDuration);

		if (existing) {
			return tx.sceneContent.update({
				where: { id: existing.id },
				data: {
					contentId: input.contentId,
					events: linkedTimestamp.length > 0 ? JSON.stringify(linkedTimestamp) : JSON.stringify(fallbackEvents)
				}
			});
		}

		const maxOrder = await tx.sceneContent.findFirst({
			where: { sceneId: input.sceneId },
			orderBy: { order: "desc" },
			select: { order: true }
		});

		return tx.sceneContent.create({
			data: {
				sceneId: input.sceneId,
				contentId: input.contentId,
				order: (maxOrder?.order || 0) + 1000,
				events: linkedTimestamp.length > 0 ? JSON.stringify(linkedTimestamp) : JSON.stringify(fallbackEvents)
			}
		});
	});
}

export async function getcontents(sceneId: number) {
	/* 
	- prendre toutes les capsules e la scene
- chercher les items
- chercher lescontents 

	*/
	const capsule = await prisma.capsule.findFirst({
		where: { scene: { id: sceneId } },
		select: {
			items: {
				select: {
					content: {
						select: {
							items: {
								include: {
									content: true
								}
							}
						}
					}
				}
			}
		}
	});
	const contents = capsule?.items.flatMap((el) => el.content.items.map((i) => i.content)) ?? [];
	return contents;
}

function normalizeSceneContentCues(cues: TextTime[]): TextTime[] {
	const seen = new Set<string>();
	return (Array.isArray(cues) ? cues : [])
		.map((cue, index) => {
			const nameCandidate = typeof cue?.name == "string" ? cue.name.trim() : "";
			const name = nameCandidate || `whisper-${String(index + 1).padStart(4, "0")}`;
			const text = typeof cue?.text == "string" ? cue.text.trim() : "";
			const start = normalizeCueSec(cue?.start);
			const endCandidate = normalizeCueSec(cue?.end);
			const end = endCandidate >= start ? endCandidate : start;
			const uniqueName = dedupeCueName(name, seen);

			return {
				name: uniqueName,
				text,
				start,
				end
			};
		})
		.filter((cue) => cue.text.length > 0)
		.sort((a, b) => a.start - b.start);
}

function normalizeSceneDurationSec(value: unknown): number {
	if (typeof value != "number" || !Number.isFinite(value) || value <= 0) return SCENE_DEFAULT_DURATION_SEC;
	return Number(value.toFixed(3));
}

export function parseContentTimestampWords(raw: string | null | undefined): TextTime[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed != "object") return [];
		const words = (parsed as { words?: unknown }).words;
		if (!Array.isArray(words)) return [];
		return normalizeSceneContentCues(words as TextTime[]);
	} catch {
		return [];
	}
}

export function parseContentTimestampWaveform(raw: string | null | undefined): WaveformDataV1 | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed != "object" || Array.isArray(parsed)) return null;
		const waveform = (parsed as { waveform?: unknown }).waveform;
		if (!isWaveformDataV1(waveform)) return null;
		return waveform;
	} catch {
		return null;
	}
}

function mergeContentTimestampWords(raw: string | null | undefined, words: TextTime[]): string {
	let current: Record<string, unknown> = {};
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed == "object" && !Array.isArray(parsed)) {
				current = parsed as Record<string, unknown>;
			}
		} catch {
			current = {};
		}
	}

	return JSON.stringify({ ...current, words });
}

function mergeContentTimestampWaveform(raw: string | null | undefined, waveform: WaveformDataV1): string {
	let current: Record<string, unknown> = {};
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed == "object" && !Array.isArray(parsed)) {
				current = parsed as Record<string, unknown>;
			}
		} catch {
			current = {};
		}
	}

	return JSON.stringify({ ...current, waveform });
}

function supportsTimestampPayload(type: string | null | undefined): boolean {
	return type === "sound" || type === "video";
}

function safeParseSceneCues(raw: string | null | undefined): TextTime[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return normalizeSceneContentCues(parsed as TextTime[]);
	} catch {
		return [];
	}
}

function normalizeCueSec(value: unknown): number {
	if (typeof value != "number" || !Number.isFinite(value) || value < 0) return 0;
	return Number(value.toFixed(3));
}

function dedupeCueName(base: string, seen: Set<string>): string {
	if (!seen.has(base)) {
		seen.add(base);
		return base;
	}

	let suffix = 2;
	let next = `${base}-${suffix}`;
	while (seen.has(next)) {
		suffix += 1;
		next = `${base}-${suffix}`;
	}
	seen.add(next);
	return next;
}

// CAPSULE
export async function getCapsules(sceneId: number) {
	const capsule = await prisma.capsule.findFirst({
		where: { scene: { id: sceneId } },
		select: {
			items: {
				select: {
					content: {
						include: {
							capsule: true
						}
					}
				}
			}
		}
	});
	const capsules = capsule?.items.map((el) => el.content.capsule);
	return capsules;
}
export async function getCapsule(capsuleId: number) {
	return await prisma.capsule.findUnique({ where: { id: capsuleId } });
}

export async function createCapsule({ sceneId, name }: { sceneId: number; name: string }) {
	return await prisma.$transaction(async (tx) => {
		const capsule = await tx.capsule.create({
			data: {
				name,
				grid: DEFAULT_CAPSULE_GRID,
				profil: serializeCapsuleProfil(defaultCapsuleProfil())
			}
		});

		await tx.sceneCapsule.create({
			data: {
				sceneId,
				capsuleId: capsule.id
			}
		});

		return capsule;
	});
}

export async function updateCapsule(id: number, update: Partial<Omit<Capsule, "id">>) {
	return await prisma.capsule.update({
		where: { id },
		data: update as any
	});
}

export async function deleteCapsule(id: number) {
	return await prisma.capsule.delete({ where: { id } });
}

const STEP = 1000;

export async function reorderCapsule(id: number) {
	return await prisma.$transaction(async (tx) => {
		const items = await tx.item.findMany({
			where: { capsuleId: id },
			select: { id: true },
			orderBy: { order: "asc" }
		});
		return Promise.all(
			items.flatMap(({ id: itemId }, index) =>
				tx.item.updateManyAndReturn({
					where: { id: itemId },
					data: { order: index * STEP + STEP },
					select: { id: true, order: true }
				})
			)
		);
	});
}

// ITEMS

export async function updateItem({ id, ...update }: Partial<Item>) {
	return await prisma.item.update({
		where: { id },
		data: update
	});
}

type CreateTextItemInput = {
	capsuleId: number;
	afterItemId?: number;
	name: string;
	inner: string;
};

type CreateCapsuleItemInput = {
	sceneId: number;
	destinationCapsuleId: number;
	afterItemId?: number;
	capsuleName: string;
	grid: string;
};

type CreateItemFromContentInput = {
	contentId: number;
	capsuleId: number;
	afterItemId?: number;
};

export async function createTextItemInCapsule(input: CreateTextItemInput) {
	return await prisma.$transaction(async (tx) => {
		const order = await getInsertionOrder(tx, input.capsuleId, input.afterItemId);
		const decor = await tx.decor.create({ data: await getInitialDecorForCapsule(tx, input.capsuleId) });
		const content = await tx.content.create({
			data: {
				type: "text",
				name: input.name,
				inner: input.inner
			}
		});
		const item = await tx.item.create({
			data: {
				order,
				capsuleId: input.capsuleId,
				contentId: content.id,
				decorId: decor.id
			}
		});
		return { item, content, decor };
	});
}

export async function createCapsuleItem(input: CreateCapsuleItemInput) {
	return await prisma.$transaction(async (tx) => {
		const capsule = await tx.capsule.create({
			data: {
				name: input.capsuleName,
				grid: input.grid,
				type: CAPSULE_TYPES.CARROUSEL,
				profil: serializeCapsuleProfil(defaultCapsuleProfil())
			}
		});

		await tx.sceneCapsule.create({
			data: {
				sceneId: input.sceneId,
				capsuleId: capsule.id
			}
		});

		const content = await tx.content.create({
			data: {
				type: "capsule",
				name: capsule.name,
				capsuleId: capsule.id
			}
		});

		const decor = await tx.decor.create({
			data: await getInitialDecorForCapsule(tx, input.destinationCapsuleId)
		});

		const order = await getInsertionOrder(tx, input.destinationCapsuleId, input.afterItemId);
		const item = await tx.item.create({
			data: {
				order,
				capsuleId: input.destinationCapsuleId,
				contentId: content.id,
				decorId: decor.id
			}
		});

		return { item, content, capsule, decor };
	});
}

export async function createItemFromExistingContent(input: CreateItemFromContentInput) {
	return await prisma.$transaction(async (tx) => {
		const order = await getInsertionOrder(tx, input.capsuleId, input.afterItemId);
		const decor = await tx.decor.create({ data: await getInitialDecorForCapsule(tx, input.capsuleId) });
		const item = await tx.item.create({
			data: {
				order,
				capsuleId: input.capsuleId,
				contentId: input.contentId,
				decorId: decor.id
			}
		});
		const content = await tx.content.findUnique({ where: { id: input.contentId } });
		return { item, content, decor };
	});
}

export async function deleteItemOnly(itemId: number) {
	return await prisma.$transaction(async (tx) => {
		const eventDecorIds = (
			await tx.event.findMany({
				where: { itemId },
				select: { decorId: true }
			})
		)
			.map((event) => event.decorId)
			.filter((id): id is number => typeof id === "number");

		await tx.event.deleteMany({ where: { itemId } });
		const deleted = await tx.item.delete({ where: { id: itemId } });

		const decorIds = [
			...new Set([...(deleted.decorId ? [deleted.decorId] : []), ...eventDecorIds].filter(Boolean))
		];
		if (decorIds.length) {
			await tx.decor.deleteMany({
				where: {
					id: { in: decorIds },
					scenes: { none: {} },
					sceneContents: { none: {} },
					items: { none: {} },
					events: { none: {} },
					bases: { none: {} }
				}
			});
		}

		const remaining = await tx.item.findMany({
			where: { capsuleId: deleted.capsuleId },
			select: { id: true },
			orderBy: { order: "asc" }
		});

		await Promise.all(
			remaining.map(({ id }, index) =>
				tx.item.update({
					where: { id },
					data: { order: index * STEP + STEP }
				})
			)
		);

		return deleted;
	});
}

export async function deleteCapsuleBranch(input: { itemId: number; capsuleId: number }) {
	return await prisma.$transaction(async (tx) => {
		const capsuleIdsToDelete = await collectCapsuleIds(tx, input.capsuleId);

		const descendantItems = await tx.item.findMany({
			where: { capsuleId: { in: capsuleIdsToDelete } },
			select: { id: true, contentId: true, decorId: true }
		});

		const parentItem = await tx.item.findUnique({
			where: { id: input.itemId },
			select: { id: true, contentId: true, decorId: true }
		});

		const itemIds = [
			...new Set([...descendantItems.map((item) => item.id), ...(parentItem ? [parentItem.id] : [])])
		];
		const contentIds = [
			...new Set([
				...descendantItems.map((item) => item.contentId),
				...(parentItem ? [parentItem.contentId] : [])
			])
		];
		const decorIds = [
			...new Set(
				[...descendantItems.map((item) => item.decorId), parentItem?.decorId].filter(
					(id): id is number => typeof id === "number"
				)
			)
		];

		const eventDecorIds = (
			await tx.event.findMany({
				where: { itemId: { in: itemIds } },
				select: { decorId: true }
			})
		)
			.map((event) => event.decorId)
			.filter((id): id is number => typeof id === "number");

		await tx.event.deleteMany({ where: { itemId: { in: itemIds } } });
		await tx.item.deleteMany({ where: { id: { in: itemIds } } });

		const deletableContents = await tx.content.findMany({
			where: {
				id: { in: contentIds },
				type: { in: ["text", "capsule"] }
			},
			select: { id: true }
		});

		const contentIdsToDelete = deletableContents.map((content) => content.id);
		if (contentIdsToDelete.length) {
			await tx.content.deleteMany({ where: { id: { in: contentIdsToDelete } } });
		}

		const allDecorIds = [...new Set([...decorIds, ...eventDecorIds])];
		if (allDecorIds.length) {
			await tx.decor.deleteMany({
				where: {
					id: { in: allDecorIds },
					scenes: { none: {} },
					sceneContents: { none: {} },
					items: { none: {} },
					events: { none: {} },
					bases: { none: {} }
				}
			});
		}

		await tx.sceneCapsule.deleteMany({
			where: { capsuleId: { in: capsuleIdsToDelete } }
		});

		await tx.capsule.deleteMany({ where: { id: { in: capsuleIdsToDelete } } });

		return {
			capsuleIds: capsuleIdsToDelete,
			itemIds,
			contentIds: contentIdsToDelete,
			decorIds: allDecorIds,
			eventItemIds: itemIds
		};
	});
}

async function collectCapsuleIds(tx: any, rootCapsuleId: number): Promise<number[]> {
	const visited = new Set<number>();
	const queue = [rootCapsuleId];

	while (queue.length) {
		const capsuleId = queue.shift();
		if (!capsuleId || visited.has(capsuleId)) continue;
		visited.add(capsuleId);

		const items = await tx.item.findMany({
			where: { capsuleId },
			select: { contentId: true }
		});
		const contentIds = items.map((item: { contentId: number }) => item.contentId);
		if (!contentIds.length) continue;

		const childCapsules = await tx.content.findMany({
			where: {
				id: { in: contentIds },
				type: "capsule",
				capsuleId: { not: null }
			},
			select: { capsuleId: true }
		});

		for (const child of childCapsules) {
			if (child.capsuleId && !visited.has(child.capsuleId)) queue.push(child.capsuleId);
		}
	}

	return [...visited];
}

async function getInsertionOrder(tx: any, capsuleId: number, afterItemId?: number): Promise<number> {
	const items = (await tx.item.findMany({
		where: { capsuleId },
		select: { id: true, order: true },
		orderBy: { order: "asc" }
	})) as Array<{ id: number; order: number }>;

	if (!items.length) return STEP;

	if (!afterItemId) {
		return items[items.length - 1].order + STEP;
	}

	const index = items.findIndex((item: { id: number; order: number }) => item.id === afterItemId);
	if (index === -1) {
		return items[items.length - 1].order + STEP;
	}

	const current = items[index];
	const next = items[index + 1];
	if (!next) return current.order + STEP;
	return Math.floor(current.order + (next.order - current.order) / 2);
}

async function getInitialDecorForCapsule(tx: any, capsuleId: number): Promise<Partial<DecorDB>> {
	const capsule = await tx.capsule.findUnique({ where: { id: capsuleId }, select: { type: true } });
	if (resolveCapsuleType(capsule?.type) !== CAPSULE_TYPES.POSITION) return {};
	return {
		area: "cell-r1-c1",
		className: POSITION_FULL_SPAN_CLASS
	};
}

/* export async function additemToCapsule(data: { order: number; capsuleId: number }) {
	prisma.$transaction(async (tx) => {});
	// return await prisma.item.create({data});
} */

//	ref: JSON value  -> transition, details...
//	name: string; -> label time
//	action: string; -> name  intro, outro..

export async function addEventToContent({
	id,
	name,
	action,
	ref,
	duration,
	delay,
	position,
	decorId,
	itemId
}: {
	id?: number;
	name?: string | null;
	action: string;
	ref?: unknown;
	duration?: number;
	delay?: number;
	position?: string | null;
	decorId?: number | null;
	itemId: number;
}) {
	const eventKind = deriveEventKind(action);
	const transitionAction = normalizeTransitionAction(action);
	const normalizedAction =
		eventKind === "custom" ? action.trim() : action === SUSTAIN ? SUSTAIN : transitionAction;
	const normalizedName = typeof name == "string" && name.trim().length ? name.trim() : null;
	const normalizedRef = normalizeEventRefForPersist({
		raw: ref,
		kind: eventKind,
		action: transitionAction,
		normalizeSustainRef: (value) => normalizeSustainEffectRef(value)
	});

	const normalizedDuration =
		typeof duration == "number" && Number.isFinite(duration) && duration > 0 ? duration : null;
	const normalizedDelay = typeof delay == "number" && Number.isFinite(delay) && delay >= 0 ? delay : null;
	const normalizedPosition =
		position === "start" || position === "middle" || position === "end" ? position : null;

	return await prisma.$transaction(async (tx) => {
		const targetById = id
			? await tx.event.findUnique({ where: { id }, select: { id: true, decorId: true } })
			: null;

		const existingByNaturalKey = !id
			? await tx.event.findFirst({
					where: { itemId, action: normalizedAction },
					select: { id: true, decorId: true }
				})
			: null;

		const currentDecorId = targetById?.decorId ?? existingByNaturalKey?.decorId ?? null;
		let resolvedDecorId: number | null = null;
		if (typeof decorId == "number" && Number.isFinite(decorId)) {
			resolvedDecorId = decorId;
		} else if (typeof currentDecorId == "number") {
			resolvedDecorId = currentDecorId;
		}

		const data = {
			name: normalizedName,
			action: normalizedAction,
			duration: normalizedDuration,
			delay: normalizedDelay,
			position: normalizedPosition,
			ref: normalizedRef as any,
			decorId: resolvedDecorId,
			itemId
		};

		if (targetById) {
			return tx.event.update({ where: { id: targetById.id }, data: data as any });
		}

		if (existingByNaturalKey) {
			return tx.event.update({ where: { id: existingByNaturalKey.id }, data: data as any });
		}

		return tx.event.create({ data: data as any });
	});
}

export async function removeEventFromcontent(id: number) {
	return await prisma.event.delete({
		where: { id }
	});
}

export async function removeCustomEventFromContent(id: number) {
	const event = await prisma.event.findUnique({
		where: { id },
		select: { id: true, action: true, decorId: true }
	});
	if (!event) return null;
	if (deriveEventKind(event.action) !== "custom") {
		throw new Error("Cannot delete standard events");
	}

	return await prisma.$transaction(async (tx) => {
		const deleted = await tx.event.delete({ where: { id: event.id } });
		if (typeof event.decorId == "number") {
			await tx.decor.deleteMany({ where: { id: event.decorId } });
		}
		return deleted;
	});
}

// DECOR
export async function createDecor({ style, ...d }: Partial<Decor>) {
	const data = { ...d, style: JSON.stringify(style) };
	return await prisma.decor.create({ data });
}

export async function updateDecor({ id, style, ...d }: Partial<Decor>) {
	const data = { ...d, style: JSON.stringify(style) };

	return await prisma.decor.update({
		where: { id: id as number },
		data
	});
}

export async function getDecorById(id: number) {
	return await prisma.decor.findUnique({ where: { id } });
}

export async function getDecorByItemId(itemId: number) {
	return await prisma.item.findUnique({ where: { id: itemId } }).decor();
}

export async function getItemContentType(itemId: number): Promise<string | null> {
	const item = await prisma.item.findUnique({
		where: { id: itemId },
		select: { content: { select: { type: true } } }
	});
	return item?.content?.type ?? null;
}

export async function getItemCapsuleType(itemId: number): Promise<string | null> {
	const item = await prisma.item.findUnique({
		where: { id: itemId },
		select: { capsule: { select: { type: true } } }
	});
	return item?.capsule?.type ?? null;
}

export async function clearCapsuleItemAreas(capsuleId: number) {
	return await prisma.$transaction(async (tx) => {
		const items = await tx.item.findMany({
			where: { capsuleId },
			select: { decorId: true }
		});

		const decorIds = items.map((item) => item.decorId).filter((id): id is number => typeof id === "number");

		if (!decorIds.length) return { updated: 0 };

		const result = await tx.decor.updateMany({
			where: { id: { in: decorIds } },
			data: { area: null }
		});

		return { updated: result.count };
	});
}

// THEME

export async function updateTheme(themeId: number, update: Partial<Theme>) {
	const theme = await prisma.theme.findUnique({ where: { id: themeId } });
	const custom = (theme.custom || "") + (update.custom || "");
	const generated = (theme.generated || "") + (update.generated || "");
	return await prisma.theme.update({ where: { id: themeId }, data: { ...update, custom, generated } });
}

function parseCapsuleProfil(value: string | null | undefined): CapsuleProfil {
	if (!value) return {};
	try {
		const parsed = JSON.parse(value) as CapsuleProfil;
		if (!parsed || typeof parsed != "object") return {};
		return parsed;
	} catch {
		return {};
	}
}

function defaultCapsuleProfil(): CapsuleProfil {
	return {
		itemDurationMode: "auto",
		itemDurationSec: null,
		defaultItemIntroTransition: JSON.stringify({ action: "intro", ref: "fade" }),
		defaultItemSustainTransition: null,
		defaultItemSustainAlternate: false,
		defaultItemOutroTransition: JSON.stringify({ action: "outro", ref: "fade" })
	};
}

function serializeCapsuleProfil(profil: CapsuleProfil): string {
	return JSON.stringify(profil);
}

function parseCapsuleTransition(
	value: string | null | undefined
): string | { action?: string; ref?: string } | null {
	// Read-side compatibility:
	// - plain strings are still accepted
	// - canonical JSON { action, ref } is parsed into object form
	if (!value) return null;
	const raw = value.trim();
	if (!raw) return null;

	if (raw.startsWith("{")) {
		try {
			const parsed = JSON.parse(raw) as { action?: unknown; ref?: unknown };
			if (typeof parsed == "object" && parsed && typeof parsed.ref == "string") {
				return {
					...(typeof parsed.action == "string" ? { action: parsed.action } : {}),
					ref: parsed.ref
				};
			}
		} catch {
			return raw;
		}
	}

	return raw;
}

function parseCapsuleSustain(value: string | null | undefined): string | null {
	if (!value) return null;
	const raw = value.trim();
	if (!raw) return null;
	return raw;
}
