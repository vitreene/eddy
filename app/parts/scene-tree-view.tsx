import cx from "classnames";
import { BoxIcon } from "lucide-react";
import type { Media as CapsuleMedia } from "@prisma/client";
import { SceneLogicContext } from "@/provider/scene-logic";
import { TreeView, type TreeDataItem } from "@/components/ui/tree-view";

import { Media } from "./display-media";
import { useState } from "react";

const EMPTY = "–";
const SEP = "__";
export function SceneTreeView() {
	const active = SceneLogicContext.useSelector((state) => state.context.active);
	const capsules = SceneLogicContext.useSelector((state) => state.context.capsules);
	const elements = SceneLogicContext.useSelector((state) => state.context.elements);
	const medias: { [key: number]: CapsuleMedia } = SceneLogicContext.useSelector(
		(state) =>
			elements &&
			Object.fromEntries(Object.values(elements).map((el) => [[el.mediaId], state.context.medias[el.mediaId]]))
	);

	const { send } = SceneLogicContext.useActorRef();

	const [selected, setSelected] = useState<string>("");

	const editCapsule = (capsuleId: number, item: string) => {
		if (active.capsuleId !== capsuleId) {
			send({
				type: "active-set",
				payload: { capsuleId }
			});
			setSelected(item);
		}
	};

	const editElement = (elementId: number, item: string) => {
		send({ type: "active-set", payload: { elementId } });
		setSelected(item);
	};

	const tree: TreeDataItem[] = capsules
		? Object.values(capsules).map((c) => {
				const els = c.elementIds.map((el) => elements[el]);
				const id = `capsule${SEP}${c.id}`;
				return {
					id,
					name: c.type,
					droppable: true,
					draggable: true,
					className: cx("uppercase text-left hover:bg-amber-100", {
						"bg-amber-200 hover:bg-amber-300": id == selected
					}),

					onClick: () => editCapsule(c.id, id),
					children: els
						.sort((a, b) => (a.order > b.order ? 1 : -1))
						.map((el) => {
							const media = medias[el.mediaId];
							let Icon;
							let name: string;
							switch (media?.type) {
								case "img":
									Icon = ({ className: _ }: { className: string }) => (
										<Media size="icon" attr={medias[el.mediaId]} className="mr-2" />
									);
									name = String(el.id);
									break;
								case "text":
									Icon = BoxIcon;
									name = media.content || EMPTY;
									break;
								default:
									Icon = null;
									name = EMPTY;
									break;
							}

							const id = el.id == -1 ? `capsule${SEP}${el.capsuleId}` : `element${SEP}${el.id}`;
							return {
								id,
								name,
								media: medias[el.mediaId],
								className: cx("text-left hover:bg-amber-100", {
									"bg-amber-200 hover:bg-amber-300": id == selected
								}),
								onClick: () => editElement(el.id, id),
								icon: Icon,
								draggable: true
							};
						})
				};
			})
		: [];

	const onDocumentDrag: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void = (source, target) => {
		console.log("onDocumentDrag", source, target);
		const [sourceType, sourceId] = source.id.split(SEP) as ["capsule" | "element", string];
		const [targetType, targetId] = target.id.split(SEP) as ["capsule" | "element", string];

		send({
			type: "tree-move-item",
			payload: {
				sourceId: Number(sourceId),
				targetId: Number(targetId),
				sourceType,
				targetType
			}
		});

		/* 
    si target est un element => get capsule + order -> reorder
    si target est une capsule => get capsule + order = 1 -> reorder
    */
		// remove capsule from element
		// add id element to capsule
	};

	const onSelectChange: (item: TreeDataItem | undefined) => void = (item) => {
		const payload = item
			? "children" in item
				? { capsuleId: Number(item?.id) }
				: { elementId: Number(item?.id) }
			: null;
		console.log("onSelectChange", item, payload);
		if (payload) send({ type: "commit", payload });
	};

	if (!capsules || !Object.keys(capsules).length) return null;

	return (
		<TreeView
			data={tree}
			onDocumentDrag={onDocumentDrag}
			expandAll={true}
			onSelectChange={onSelectChange}
			initialSelectedItemId={"2"}
		/>
	);
}

const initial = [
	{
		id: "1",
		name: "Item 1",
		droppable: true,

		children: [
			{
				id: "2",
				name: "Item 1.1",
				draggable: true,
				droppable: true,
				children: [
					{
						id: "3",
						name: "Item 1.1.1"
					},
					{
						id: "4",
						name: "Item 1.1.2"
					}
				]
			},
			{
				id: "5",
				name: "Item 1.2 (disabled)",
				disabled: true
			}
		]
	},
	{
		id: "6",
		name: "Item 2 (draggable)",
		draggable: true
	}
];

/* TODO
- element -> lien vers edition
- capsule lien vers events

*/
