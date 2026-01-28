import { useState } from "react";
import { GridAreaRadioSelector } from ".";

export function SlotEditor() {
	const [area, setArea] = useState("cell-r1-c4");

	console.log(area);

	return <GridAreaRadioSelector cols={4} rows={3} value={area} onChange={setArea} />;
}
