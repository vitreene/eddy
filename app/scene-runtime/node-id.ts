import { SEP } from "@/config/constants";

export type SceneNodeType = "item" | "capsule";

/**
 * Build stable DOM node ids for scene entities.
 */
export function buildNodeId(type: SceneNodeType, id: number): string {
	return `${type}${SEP}${id}`;
}
