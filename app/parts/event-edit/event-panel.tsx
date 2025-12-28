import { SceneLogicContext } from "@/provider/scene-logic";
import { Media } from "../display-media";

export function ContentPanel({ id }: { id: number }) {
	const content = SceneLogicContext.useSelector((state) => state.context.contents[id]);
	return <Media attr={content} size={"lg"} />;
}
