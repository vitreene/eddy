import React from "react";

import type { EditableStyle } from "./types";

export const PreviewMini: React.FC<{ value: EditableStyle }> = ({ value }) => (
	<div className="h-full w-full rounded border p-4">
		<div className="" style={value as unknown as React.CSSProperties}>
			<p>Aperçu</p>
		</div>
	</div>
);
