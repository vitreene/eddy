import type { ElementComp } from "@/api/db";
import { Media } from "../capsule-edit/display-media";

export function MediaPanel({ element }: { element: ElementComp }) {
	return <Media attr={element.media} size={"lg"} />;
}
