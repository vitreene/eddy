import { TreeView, type TreeDataItem } from "@/components/ui/tree-view";

export function SceneTreeView() {
	const onDocumentDrag: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void = (source, target) => {
		console.log(source, target);
	};
	return <TreeView data={data} onDocumentDrag={onDocumentDrag} />;
}

const data: TreeDataItem[] = [
	{
		id: "1",
		name: "Item 1",
		children: [
			{
				id: "2",
				name: "Item 1.1",
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
