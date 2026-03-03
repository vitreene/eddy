import { StyleEditor } from "@/components/style-editor";
import { applyStyleDefaults } from "@/config/item-style-defaults";

import type { Content, Decor } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";

type ItemEditPanelProps = {
	content: Content;
	decor?: Decor;
	onChange: (newStyle: EditableStyle) => void;
	onReset: () => void;
	onTextChange: (value: string) => void;
	onTextCommit: (value: string) => void;
};

export function ItemEditPanel({
	content,
	decor,
	onChange,
	onReset,
	onTextChange,
	onTextCommit
}: ItemEditPanelProps) {
	return (
		<StyleEditor
			content={content}
			value={{
				...applyStyleDefaults((decor?.style as EditableStyle) ?? {}, content.type),
				area: decor?.area ?? undefined,
				className: decor?.className ?? undefined
			}}
			onChange={onChange}
			onReset={onReset}
			textValue={content.inner || ""}
			onTextChange={onTextChange}
			onTextCommit={onTextCommit}
		/>
	);
}
