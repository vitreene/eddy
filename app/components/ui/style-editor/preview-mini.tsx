import React from "react";

import type { EditableStyle } from "./types";

export const PreviewMini: React.FC<{ value: EditableStyle }> = ({ value }) => (
	<div className="h-full w-full rounded border p-4" style={value as React.CSSProperties}>
		<p>Aperçu du style.</p>
		<p>Modifiez les contrôles à gauche.</p>
	</div>
);
