import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	const value: EditableStyle = {
		...applyStyleDefaults((decor?.style as EditableStyle) ?? {}, content.type),
		area: decor?.area ?? undefined,
		className: decor?.className ?? undefined
	};

	const copyCSS = () => {
		const txt = Object.entries(value)
			.map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`)
			.join("\n");
		navigator.clipboard.writeText(txt);
	};

	return (
		<div className="mt-2">
			<div className="mb-2 flex justify-between border-b pb-2">
				<Button size="sm" variant="outline" onClick={onReset}>
					Reset
				</Button>
				<Button size="sm" variant="outline" onClick={copyCSS}>
					<Copy className="h-4 w-4" />
				</Button>
			</div>

			<Tabs defaultValue="presets" className="w-full">
				<TabsList>
					<TabsTrigger value="presets">Presets</TabsTrigger>
					<TabsTrigger value="layout">Layout</TabsTrigger>
					<TabsTrigger value="advanced">Advanced</TabsTrigger>
				</TabsList>

				<TabsContent value="presets">
					{content.type === "text" ? (
						<StyleEditor
							content={content}
							value={value}
							onChange={onChange}
							textValue={content.inner || ""}
							onTextChange={onTextChange}
							onTextCommit={onTextCommit}
							mode="preset"
							showToolbar={false}
						/>
					) : (
						<div className="rounded border border-stone-200 bg-white p-2 text-xs text-stone-500">
							Aucun preset pour ce type de contenu.
						</div>
					)}
				</TabsContent>

				<TabsContent value="layout">
					<StyleEditor
						content={content}
						value={value}
						onChange={onChange}
						textValue={content.inner || ""}
						onTextChange={onTextChange}
						onTextCommit={onTextCommit}
						mode="layout"
						showToolbar={false}
					/>
				</TabsContent>

				<TabsContent value="advanced">
					<StyleEditor
						content={content}
						value={value}
						onChange={onChange}
						textValue={content.inner || ""}
						onTextChange={onTextChange}
						onTextCommit={onTextCommit}
						mode="advanced"
						showToolbar={false}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
