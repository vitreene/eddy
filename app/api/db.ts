import { PrismaClient } from "prisma/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import type {
	Capsule,
	CapsuleElement,
	Media,
	Scene,
	Event as MediaEvent,
	Theme
} from "prisma/generated/prisma/client";
import type { Decor } from "@prisma/client";

export type { Media, Event as MediaEvent } from "prisma/generated/prisma/client";

export interface MediaComp {
	order: number;
	events: string;
	media: Media;
}

/* 
 type CapsuleElement = {
    id: number;
    capsuleId: number;
    order: number;
    mediaId: number;
}
	 */
export interface ElementComp extends CapsuleElement {
	mediaId: number;
	eventIds: number[];
}

/* 
type Capsule = {
    id: number;
    type: string;
    sceneId: number;
}
	 */
export interface CapsuleComp extends Capsule {
	elementIds: number[];
}

export interface TextTime {
	id?: number;
	name: string;
	text: string;
	start: number;
	end: number;
	ref?: string;
}

// export interface SceneMedia {
//     id: number;
//     order: number;
//     mediaId: number;
//     events: any;
//     path: string | null;
//     content: string | null;
//     type: string;
//     lang: string | null;
// }

export interface SceneMedia {
	id: number;
	mediaId: number;
	order: number;
	events: Array<TextTime>;
}

export interface SceneComp {
	id: number;
	title: string;
	events: {
		[id: number]: Record<string, MediaEvent>;
	};
	sceneMedias: {
		[id: number]: SceneMedia;
	};
	capsules: {
		[id: number]: CapsuleComp;
	};
	elements: {
		[id: number]: ElementComp;
	};
	medias: {
		[id: number]: Media;
	};
	decors: {
		capsules: {
			[id: number]: Decor;
		};
		elements: {
			[id: number]: Decor;
		};
	};
	decor?: Decor;
	theme?: Theme;
}

interface DbCapsule extends Capsule {
	elements: Array<
		CapsuleElement & {
			media: Media;
			events: Array<MediaEvent>;
			decor?: Decor | null;
		}
	>;
	decor?: Decor | null;
}
interface DbSceneComp extends Scene {
	capsules: Array<DbCapsule>;
	sceneMedias: Array<SceneMedia>;
	medias: Array<Media>;
	decor?: Decor | null;
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
		include: {
			medias: true,
			capsules: {
				include: {
					elements: {
						include: {
							media: true,
							events: true,
							decor: true
						}
					},
					decor: true
				}
			},
			decor: true,
			theme: true
		}
	});

	const sceneMedias = [
		...sceneDB!.medias.map((m) => ({
			...m,
			events: JSON.parse(m.events)
		}))
	];
	const capsules = sceneDB?.capsules || [];
	const medias = await getMedias(sceneId);
	const scene = { ...sceneDB!, capsules, sceneMedias, medias };

	return flattenScene(scene);
}

export function flattenScene(scene: DbSceneComp): SceneComp {
	const flatScene: SceneComp = {
		id: scene.id,
		title: scene.title,
		events: {},
		sceneMedias: {},
		capsules: {},
		elements: {},
		medias: {},
		decors: {
			capsules: {},
			elements: {}
		},
		decor: scene.decor ?? undefined,
		theme: scene.theme ?? undefined
	};

	// Scene medias
	if (scene.sceneMedias) {
		scene.sceneMedias.forEach((sceneMedia) => {
			flatScene.sceneMedias[sceneMedia.id] = sceneMedia;
		});
	}

	// Medias
	if (scene.medias) {
		scene.medias.forEach((media) => {
			flatScene.medias[media.id] = media;
		});
	}

	// Capsules and elements
	if (scene.capsules) {
		scene.capsules.forEach(({ elements, decor, ...capsule }) => {
			const elementIds: number[] = elements.map((element) => element.id);

			flatScene.capsules[capsule.id] = {
				...capsule,
				elementIds
			};

			// Store decor in flat structure
			if (decor) {
				const { style, ...d } = decor;
				flatScene.decors.capsules[capsule.id] = { ...d, style: JSON.parse(style) };
			}

			elements.forEach(({ media, events, decor, ...element }) => {
				flatScene.elements[element.id] = {
					...element,
					mediaId: media.id,
					eventIds: events.map((event) => event.id)
				};

				// Store decor in flat structure
				if (decor) {
					const { style, ...d } = decor;
					flatScene.decors.elements[element.id] = { ...d, style: JSON.parse(style) };
				}

				if (events.length > 0) {
					const evs = Object.fromEntries(events.map((e) => [e.action, e]));
					flatScene.events[element.id] = evs;
				}
			});
		});
	}

	return flatScene;
}

// MEDIAS

export async function getMedias(sceneId: number) {
	return await prisma.media.findMany({
		where: {
			capsuleElement: {
				every: {
					capsule: {
						sceneId
					}
				}
			}
		}
	});
}
// CAPSULE
export async function getCapsules(sceneId: number) {
	return await prisma.capsule.findMany({ where: { sceneId } });
}
export async function getCapsule(capsuleId: number) {
	return await prisma.capsule.findUnique({ where: { id: capsuleId } });
}

export async function createCapsule({ sceneId, type }: { sceneId: number; type: string }) {
	const newCapsule = await prisma.capsule.create({
		data: {
			type,
			scene: {
				connect: { id: sceneId }
			}
		}
	});
	return newCapsule;
}

export function updateCapsule({ id, ...update }: Partial<Capsule>) {
	return prisma.capsule.update({
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
		const elements = await tx.capsuleElement.findMany({
			where: { capsuleId: id },
			select: { id: true },
			orderBy: { order: "asc" }
		});
		return Promise.all(
			elements.flatMap(({ id: elementId }, index) =>
				tx.capsuleElement.updateManyAndReturn({
					where: { id: elementId },
					data: { order: index * STEP + STEP },
					select: { id: true, order: true }
				})
			)
		);
	});
}

// ELEMENTS

export async function updateElement({ id, ...update }: Partial<CapsuleElement>) {
	return await prisma.capsuleElement.update({
		where: { id },
		data: update
	});
}
export async function addElementToCapsule(data: { order: number; capsuleId: number }) {
	prisma.$transaction(async (tx) => {});
	// return await prisma.capsuleElement.create({data});
}

//	ref: string  -> transition, details...
//	name: string; -> label time
//	action: string; -> name  intro, outro..

export async function addEventToMedia({
	id,
	name,
	action,
	ref,
	duration,
	elementId
}: {
	id: number | undefined;
	name: string;
	action: string;
	ref: string;
	duration?: number;
	elementId: number;
}) {
	const data = {
		name,
		action,
		duration,
		ref,
		element: { connect: { id: elementId } }
	};
	if (id) {
		return prisma.event.update({ where: { id }, data });
	} else {
		return prisma.event.create({ data });
	}
}

export async function removeEventFromMedia(id: number) {
	return await prisma.event.delete({
		where: { id }
	});
}

// DECOR
export async function createDecor(data: Partial<Decor>) {
	return await prisma.decor.create({ data });
}

export async function updateDecor({ id, ...update }: Partial<Decor>) {
	return await prisma.decor.update({
		where: { id: id as number },
		data: update
	});
}

export async function getDecorById(id: number) {
	return await prisma.decor.findUnique({ where: { id } });
}

export async function getDecorByCapsuleId(capsuleId: number) {
	return await prisma.capsule.findUnique({ where: { id: capsuleId } }).decor();
}
