type CssDeclaration = { name: string; value: string };

export function parseRawCssDeclarations(rawCss: string | null | undefined): CssDeclaration[] {
	const source = String(rawCss || "").trim();
	if (!source) return [];
	const declarations: CssDeclaration[] = [];
	for (const chunk of source.split(";")) {
		const line = chunk.trim();
		if (!line) continue;
		const sep = line.indexOf(":");
		if (sep <= 0) continue;
		const name = line.slice(0, sep).trim();
		const value = line.slice(sep + 1).trim();
		if (!name || !value) continue;
		declarations.push({ name, value });
	}
	return declarations;
}

export function cssPropertyNameToJsKey(name: string): string {
	if (!name.includes("-")) return name;
	if (name.startsWith("--")) return name;
	return name.replace(/-([a-z])/g, (_, chr: string) => chr.toUpperCase());
}
