import { useContext } from "react";
import cx from "classnames";
import { SceneContext } from "~/provider/scene-provider";

export function Capsules() {
	const comp = useContext(SceneContext);
	const selectCapsule = (e: React.MouseEvent<HTMLButtonElement>) => {
		comp?.dispatch({
			type: "edit-capsule",
			capsuleId: Number(e.currentTarget.value),
			mediaId: null
		});
	};
	if (!comp) return null;

	return (
		<ul className="text-xs">
			{comp.scene.capsules.map((c, i) => (
				<li key={c.id}>
					<button
						className={cx(
							"mb-1 px-2 py-1 whitespace-nowrap",
							comp.state.capsuleId == c.id ? "bg-amber-200 hover:bg-amber-300" : "hover:bg-slate-200"
						)}
						value={c.id}
						onClick={selectCapsule}
						disabled={comp.state.capsuleId == c.id}
					>{`Capsule n°${i + 1}`}</button>
				</li>
			))}
		</ul>
	);
}
