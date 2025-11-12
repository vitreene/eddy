import { SceneLogicContext } from "@/provider/scene-logic";
import { Media } from "../capsule-edit/display-media";

export function MediaPanel({ id }: { id: number }) {
	const media = SceneLogicContext.useSelector((state) => state.context.medias[id]);
	return <Media attr={media} size={"lg"} />;
}
