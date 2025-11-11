import { PrismaClient } from "@prisma/client";

import type { Capsule, CapsuleElement, Media, Scene, Event as MediaEvent } from "@prisma/client";

export type { Media, Event as MediaEvent } from "@prisma/client";

export interface MediaComp {
	order: number;
	events: string;
	media: Media;
}

export interface ElementComp extends CapsuleElement {
	mediaId: number;
	eventIds: number[];
}

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
		[key: number]: Record<string, MediaEvent>;
	};
	sceneMedias: {
		[key: number]: SceneMedia;
	};
	capsules: {
		[key: number]: CapsuleComp;
	};
	elements: {
		[key: number]: ElementComp;
	};
	medias: {
		[key: number]: Media;
	};
}

interface DbCapsule extends Capsule {
	elements: Array<
		CapsuleElement & {
			media: Media;
			events: Array<MediaEvent>;
		}
	>;
}
interface DbSceneComp extends Scene {
	capsules: Array<DbCapsule>;
	sceneMedias: Array<SceneMedia>;
	medias: Array<Media>;
}
// SCENE

const prisma = new PrismaClient();

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
							events: true
						}
					}
				}
			}
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
		medias: {}
	};

	// Scene medias
	if (scene.sceneMedias) {
		scene.sceneMedias.forEach((sceneMedia) => {
			flatScene.sceneMedias[sceneMedia.id] = sceneMedia;
		});
	}

	// Sources
	if (scene.medias) {
		scene.medias.forEach((media) => {
			flatScene.medias[media.id] = media;
		});
	}

	// Capsules and elements
	if (scene.capsules) {
		scene.capsules.forEach(({ elements, ...capsule }) => {
			const elementIds: number[] = elements.map((element) => element.id);

			flatScene.capsules[capsule.id] = {
				...capsule,
				elementIds
			};

			elements.forEach(({ media, events, ...element }) => {
				flatScene.elements[element.id] = {
					...element,
					mediaId: media.id,
					eventIds: events.map((event) => event.id)
				};

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

export async function updateCapsule({ id, ...update }: Partial<Capsule>) {
	return await prisma.capsule.update({
		where: { id },
		data: update
	});
}

export async function deleteCapsule(id: number) {
	return await prisma.capsule.delete({ where: { id } });
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
