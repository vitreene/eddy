import type { TextTime } from "@/api/db";
import { EditMediaContext } from "@/provider/edit-media-provider";
import cx from "classnames";
import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { SceneContext } from "~/provider/scene-provider";

export function Rubber() {
	const comp = useContext(SceneContext);
	const mediaActions = useContext(EditMediaContext)!;
	const ref = useRef<HTMLUListElement>(null);
	// TODO mieux définir cues
	const cues = comp?.scene.medias[0].events;
	const activeAction = comp?.state.activeAction;

	const [start, setStart] = useState<string>("");
	const [end, setEnd] = useState<string>("");

	const selecteds = selectCues(cues, start, end);

	const enterSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		if (e.target instanceof HTMLLIElement) {
			console.log("START", e.target.id);
			setStart(e.target.id);
			e.currentTarget.addEventListener("mousemove", moveHandler);
		}
	};
	const exitSelection = (e: React.MouseEvent<HTMLUListElement>) => {
		e.currentTarget.removeEventListener("mousemove", moveHandler);
	};

	const moveHandler = useCallback(function (e: MouseEvent) {
		if (e.target instanceof HTMLLIElement) {
			console.log("MOVE TO", e.target.id);
			setEnd(e.target.id);
		}
	}, []);

	return (
		<ul
			ref={ref}
			onMouseDown={enterSelection}
			onMouseUp={exitSelection}
			className="flex flex-1 flex-wrap items-start border border-amber-200"
		>
			{cues &&
				cues.map((event) => {
					const selected = selecteds.includes(event.id);
					return (
						<li
							key={event.id}
							id={event.id}
							className={cx("px-2 py-1 text-sm select-none", { "bg-amber-500": selected })}
						>
							{event.text}
						</li>
					);
				})}
		</ul>
	);
}

function selectCues(cues: Array<TextTime> = [], start: string, end: string) {
	let startIndex = cues.findIndex((cue) => cue.id == start);
	let endIndex = cues.findIndex((cue) => cue.id == end);
	if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];
	return cues.slice(startIndex, endIndex + 1).map((cue) => cue.id);
}
