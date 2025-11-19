import { TreeView, type TreeDataItem } from "@/components/ui/tree-view";
import { SceneLogicContext } from "@/provider/scene-logic";
import { Media } from "./display-media";
import type { Media as CapsuleMedia } from "@prisma/client";
import { BoxIcon } from "lucide-react";

const EMPTY = "–";

export function SceneTreeView() {
	const capsules = SceneLogicContext.useSelector((state) => state.context.capsules);
	const elements = SceneLogicContext.useSelector((state) => state.context.elements);
	const medias: { [key: number]: CapsuleMedia } = SceneLogicContext.useSelector(
		(state) =>
			elements &&
			Object.fromEntries(Object.values(elements).map((el) => [[el.mediaId], state.context.medias[el.mediaId]]))
	);

	const { send } = SceneLogicContext.useActorRef();

	const tree: TreeDataItem[] = capsules
		? Object.values(capsules).map((c) => {
				const els = c.elementIds.map((el) => elements[el]);
				if (els.length == 0) els.push({ id: -1, order: 0, mediaId: 0, eventIds: [], capsuleId: c.id });
				return {
					id: String(c.id),
					name: c.type,
					droppable: true,
					draggable: true,
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
								id: el.id == -1 ? String(el.capsuleId) : String(el.id),
								name,
								media: medias[el.mediaId],

								icon: Icon,
								draggable: true
							};
						})
				};
			})
		: [];

	console.log(tree);

	const onDocumentDrag: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void = (source, target) => {
		console.log(source, target);
		const isSourceCapsule = "children" in source;
		const isTargetCapsule = target.name == EMPTY;
		const sourceType = isSourceCapsule ? "capsule" : "element";
		const targetType = isTargetCapsule ? "capsule" : "element";

		send({
			type: "tree-move",
			payload: {
				sourceId: Number(source.id),
				targetId: Number(target.id),
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
