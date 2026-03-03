import { SEP } from "@/config/constants";

export type SceneNodeType = "item" | "capsule";

export function buildNodeId(type: SceneNodeType, id: number): string {
	return `${type}${SEP}${id}`;
}
