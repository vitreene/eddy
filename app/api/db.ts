import { PrismaClient } from "@prisma/client";

import type { Capsule, CapsuleElement, Media, Scene, Event as MediaEvent } from "@prisma/client";

export interface SceneDB {
	medias: Array<MediaComp>;
	capsules: Array<CapsuleComp>;
}

export type { Media, Event as MediaEvent } from "@prisma/client";

export interface MediaComp {
	order: number;
	events: string;
	media: Media;
}

export interface ElementComp extends CapsuleElement {
	media: Media;
	events: MediaEvent[];
}

export interface CapsuleComp extends Capsule {
	elements: Array<ElementComp>;
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

export interface SceneMedia extends Omit<Media, "sceneId"> {
	mediaId: number;
	order: number;
	events: Array<TextTime>;
}

export interface SceneComp extends Scene {
	capsules: Array<CapsuleComp>;
	medias: Array<SceneMedia>;
	sources: Array<Media>;
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
			medias: {
				include: { media: true }
			},
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

	const medias = sceneDB!.medias.map((m) => ({
		...m.media,
		id: m.media.id,
		order: m.order,
		mediaId: m.media.id,
		events: JSON.parse(m.events)
	}));
	const capsules = sceneDB?.capsules || [];
	const sources = await getMedias(sceneId);
	return { ...sceneDB!, capsules, medias, sources };
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
