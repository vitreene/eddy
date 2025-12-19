import cx from "classnames";
import { BoxIcon } from "lucide-react";
import type { Media as CapsuleMedia } from "@prisma/client";
import { SceneLogicContext } from "@/provider/scene-logic";
import { TreeView, type TreeDataItem } from "@/components/ui/tree-view";

import { Media } from "./display-media";

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

	const selectCapsule = (capsuleId: number) => {
		if (active.capsuleId !== capsuleId)
			send({
				type: "active.set",
				payload: { capsuleId }
			});
	};

	const editElement = (elementId: number) => {
		send({ type: "active.set", payload: { elementId } });
	};

	const tree: TreeDataItem[] = capsules
		? Object.values(capsules).map((c) => {
				const els = c.elementIds.map((el) => elements[el]);

				return {
					id: `capsule${SEP}${c.id}`,
					name: c.type,
					droppable: true,
					draggable: true,
					className: cx("uppercase text-left hover:bg-amber-100", {
						"bg-amber-200 hover:bg-amber-300": c.id == active.capsuleId
					}),

					onClick: () => selectCapsule(c.id),
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

							return {
								id: el.id == -1 ? `capsule${SEP}${el.capsuleId}` : `element${SEP}${el.id}`,
								name,
								media: medias[el.mediaId],

								onClick: () => editElement(el.id),
								icon: Icon,
								draggable: true
							};
						})
				};
			})
		: [];

	// console.log("TREE", tree);

	const onDocumentDrag: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void = (source, target) => {
		console.log("onDocumentDrag", source, target);
		const [sourceType, sourceId] = source.id.split(SEP) as ["capsule" | "element", string];
		const [targetType, targetId] = target.id.split(SEP) as ["capsule" | "element", string];

		send({
			type: "tree-move",
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
		console.log("onSelectChange", item);
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

/* 
function findCapsuleTarget(data: TreeDataItem[], id: string | number): TreeDataItem | undefined {
	for (let i = 0; i < data.length; i++) {
		const d = data[i];
		if (d.id == id) {
			return d;
		} else if ("children" in d) {
			const d2 = findCapsuleTarget(d.children!, id);
			if (d2) return d;
		}
	}
}


function findTarget(data: TreeDataItem[], id: string | number): TreeDataItem | undefined {
	for (let i = 0; i < data.length; i++) {
		const d = data[i];
		if (d.id == id) {
			return d;
		} else if ("children" in d) {
			const d2 = findTarget(d.children!, id);
			if (d2) return d2;
		}
	}
}

function removeSource(data: TreeDataItem[], id: string | number) {
	for (let i = 0; i < data.length; i++) {
		const d = data[i];
		if (d.id == id) {
			return data.filter((d) => d.id !== id);
		} else if ("children" in d) {
			const d2 = removeSource(d.children!, id);
			if (d2) {
				data[i].children = d2;
				return data;
			}
		}
	}
}

function moveTarget(data: TreeDataItem[], id: string | number, source: TreeDataItem) {
	for (let i = 0; i < data.length; i++) {
		const d = data[i];
		if (d.id == id) {
			data[i].children?.push(source);
			return data;
		} else if ("children" in d) {
			const d2 = moveTarget(d.children!, id, source);
			if (d2) {
				data[i].children = d2;
				return data;
			}
		}
	}
} */
/* 
rendre l'organisation Capsules / elements conforme à cette forme,
dans les deux sens entrées / sortie,
accepter un drop de l'extérieur pour ajouter une image, une ressource 

*/

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
