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
}

/* 
 type Capsule = {
    name: string;
    id: number;
    type: string | null;
    grid: string | null;
}
	 */
export interface CapsuleComp extends Capsule {
	itemIds: number[];
}

export interface TextTime {
	id?: number;
	name: string;
	text: string;
	start: number;
	end: number;
	ref?: string;
}

export interface SceneContent {
	id: number;
	contentId: number;
	order: number;
	events: Array<TextTime>;
	// events: string;
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
			events: Array<ContentEvent>;
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

	sceneContents: Array<Omit<SceneContent, "events"> & { events: string }>;

	decor?: DecorDB | null;
	theme?: Theme | null;
}

// SCENE

const adapter = new PrismaBetterSqlite3({
	url: process.env.DATABASE_URL || "file:./prisma/dev.db"
});

export const prisma = new PrismaClient({ adapter });

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

export async function getScene(sceneId: number): Promise<SceneComp> {
	const sceneDB = await prisma.scene.findUnique({
		where: { id: sceneId },
		include: { sceneContents: true, theme: true }
	});

	const scenecontents = [
		...sceneDB!.sceneContents.map((m) => ({
			...m,
			events: JSON.parse(m.events)
		}))
	];

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
								events: true
							}
						}
					}
				}
			}
		})
	)
		.map((sc) => sc.capsule)
		.filter(Boolean) as Array<DbCapsule>;

	const scene = { ...sceneDB!, capsules, scenecontents };

	return flattenScene(scene);
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
		scene.sceneContents.forEach(({ events, ...sceneContent }) => {
			flatScene.sceneContents[sceneContent.id] = { ...sceneContent, events: JSON.parse(events) };
		});
	}

	// Capsules and items
	if (scene.capsules) {
		scene.capsules.forEach(({ items: items, ...capsule }) => {
			const itemIds: number[] = items.map((item) => item.id);

			flatScene.capsules[capsule.id] = { ...capsule, itemIds };

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

				if (events.length > 0) {
					const evs = Object.fromEntries(events.map((e) => [e.action, e]));
					flatScene.events[item.id] = evs;
				}
				if (content) {
					flatScene.contents[content.id] = content;
				}
			});
		});
	}

	return flatScene;
}

// contentS

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
	const newCapsule = await prisma.capsule.create({
		data: {
			name,
			scene: {
				connect: { id: sceneId }
			}
		}
	});
	return newCapsule;
}

export async function updateCapsule(id: number, update: Partial<Omit<Capsule, "id">>) {
	return await prisma.capsule.update({
		where: { id },
		data: update
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
export async function additemToCapsule(data: { order: number; capsuleId: number }) {
	prisma.$transaction(async (tx) => {});
	// return await prisma.item.create({data});
}

//	ref: string  -> transition, details...
//	name: string; -> label time
//	action: string; -> name  intro, outro..

export async function addEventToContent({
	id,
	name,
	action,
	ref,
	duration,
	itemId
}: {
	id: number | undefined;
	name: string;
	action: string;
	ref: string;
	duration?: number;
	itemId: number;
}) {
	const data = {
		name,
		action,
		duration,
		ref,
		item: { connect: { id: itemId } }
	};
	if (id) {
		return prisma.event.update({ where: { id }, data });
	} else {
		return prisma.event.create({ data });
	}
}

export async function removeEventFromcontent(id: number) {
	return await prisma.event.delete({
		where: { id }
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

// export async function getDecorByCapsuleId(capsuleId: number) {
// 	return await prisma.capsule.findUnique({ where: { id: capsuleId } }).decor();
// }

export async function getDecorByItemId(itemId: number) {
	return await prisma.item.findUnique({ where: { id: itemId } }).decor();
}

// THEME

export async function updateTheme(themeId: number, update: Partial<Theme>) {
	const theme = await prisma.theme.findUnique({ where: { id: themeId } });
	const custom = (theme.custom || "") + (update.custom || "");
	const generated = (theme.generated || "") + (update.generated || "");
	return await prisma.theme.update({ where: { id: themeId }, data: { ...update, custom, generated } });
}
