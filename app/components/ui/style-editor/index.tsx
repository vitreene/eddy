import { useState } from "react";

import { CompactStyleEditor } from "./compact-style-editor";

import type { EditableStyle } from "./types";

export const StyleEditor = () => {
	const [style, setStyle] = useState<EditableStyle>({
		fontFamily: "Inter",
		fontSize: "16px",
		color: "#222222"
	});

	return (
		<div className="h-full w-full p-4">
			<CompactStyleEditor value={style} onChange={setStyle} />
		</div>
	);
};
