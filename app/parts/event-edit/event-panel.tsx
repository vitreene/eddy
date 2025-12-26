import { SceneLogicContext } from "@/provider/scene-logic";
import { Media } from "../display-media";

export function MediaPanel({ id }: { id: number }) {
	const media = SceneLogicContext.useSelector((state) => state.context.contents[id]);
	return <Media attr={media} size={"lg"} />;
}
