import cx from "classnames";
import { SceneLogicContext } from "@/provider/edit-media-provider";

export function Capsules() {
	const active = SceneLogicContext.useSelector((state) => state.context.active);
	const capsules = SceneLogicContext.useSelector((state) => state.context.capsules);
	const sceneLogic = SceneLogicContext.useActorRef();

	const selectCapsule = (e: React.MouseEvent<HTMLButtonElement>) => {
		sceneLogic.send({
			type: "active.capsule",
			payload: { capsuleId: Number(e.currentTarget.value), notif: true }
		});
	};
	if (!capsules || !Object.keys(capsules).length) return null;

	return (
		<ul className="text-xs">
			{Object.values(capsules).map((c, i) => (
				<li key={c.id}>
					<button
						className={cx(
							"mb-1 px-2 py-1 whitespace-nowrap",
							active.capsuleId == c.id ? "bg-amber-200 hover:bg-amber-300" : "hover:bg-slate-200"
						)}
						value={c.id}
						onClick={selectCapsule}
						disabled={active.capsuleId == c.id}
					>{`Capsule n°${i + 1} : ${c.type}`}</button>
				</li>
			))}
		</ul>
	);
}
