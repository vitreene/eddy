import cx from "classnames";
import { BoxIcon } from "lucide-react";

import { getItemFromCapsule, SceneLogicContext } from "@/provider/scene-logic";
import { TreeView, type TreeDataItem } from "@/components/ui/tree-view";

import { Media } from "./display-media";
import { useState } from "react";
import type { Content } from "@/api/db";

const EMPTY = "–";
const SEP = "__";
export function SceneTreeView() {
	const main = SceneLogicContext.useSelector((state) => state.context.main);
	const capsules = SceneLogicContext.useSelector((state) => {
		if (!state.context.capsules) return null;
		return Object.fromEntries(
			Object.values(state.context.capsules).map((c) => {
				const item = getItemFromCapsule(c.id, state.context);
				return [c.id, { ...c, itemId: item?.id }];
			})
		);
	});
	const items = SceneLogicContext.useSelector((state) => state.context.items);
	const contents: { [key: number]: Content } = SceneLogicContext.useSelector(
		(state) =>
			items &&
			Object.fromEntries(
				Object.values(items).map((el) => [[el.contentId], state.context.contents[el.contentId]])
			)
	);

	const { send } = SceneLogicContext.useActorRef();

	const [selected, setSelected] = useState<string>("");

	if (!main || !capsules || !Object.keys(capsules).length) return null;

	// Fonction récursive pour rendre une capsule et son contenu
	const renderCapsuleNode = (capsuleId: number): TreeDataItem => {
		const c = capsules[capsuleId];
		const id = `capsule${SEP}${c.id}`;
		const els = c.itemIds.map((el) => items[el]);

		return {
			id,
			name: c.name,
			itemId: c.itemId,
			droppable: true,
			draggable: true,
			className: cx("uppercase text-left hover:bg-amber-100", {
				"bg-amber-200 hover:bg-amber-300": id == selected
			}),

			children: els
				.sort((a, b) => (a.order > b.order ? 1 : -1))
				.map((el) => {
					const content = contents[el.contentId];
					const childCapsuleId = content?.capsuleId;

					// Si l'item contient une capsule, le rendre récursivement
					if (childCapsuleId) {
						return renderCapsuleNode(childCapsuleId);
					}

					// Sinon, afficher l'item comme un élément simple
					let Icon;
					let name: string;
					switch (content?.type) {
						case "img":
							Icon = ({ className: _ }: { className: string }) => (
								<Media size="icon" attr={contents[el.contentId]} className="mr-2" />
							);
							name = String(el.id);
							break;
						case "text":
							Icon = BoxIcon;
							name = content.inner || EMPTY;
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
						itemId: el.id,
						content: contents[el.contentId],
						className: cx("text-left hover:bg-amber-100", {
							"bg-amber-200 hover:bg-amber-300": id == selected
						}),

						icon: Icon,
						draggable: true
					};
				})
		};
	};

	const tree: TreeDataItem[] = capsules[main].itemIds
		.map((id) => items[id])
		.sort((a, b) => (a.order > b.order ? 1 : -1))
		.filter((item) => item.contentId && contents[item.contentId].capsuleId)
		.map((item) => capsules[contents[item.contentId].capsuleId!])
		.map((c) => renderCapsuleNode(c.id));

	const onDocumentDrag = (source: TreeDataItem, target: TreeDataItem) => {
		console.log({ source, target });

		send({
			type: "tree-move-item",
			payload: {
				sourceId: Number(source.itemId),
				targetId: Number(target.itemId)
			}
		});
	};

	const onSelectChange: (item: TreeDataItem | undefined) => void = (item) => {
		if (item) {
			setSelected(item.id);
			const payload = { itemId: Number(item.itemId) };
			send({ type: "commit", payload });
			send({ type: "active-set", payload });
		}
	};

	return (
		<TreeView data={tree} onDocumentDrag={onDocumentDrag} expandAll={true} onSelectChange={onSelectChange} />
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
