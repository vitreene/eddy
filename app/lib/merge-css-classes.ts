/**
 * Fusionne 2 strings de règles CSS (concaténées) et supprime les doublons.
 * Règle: si un sélecteur apparaît plusieurs fois, la dernière occurrence gagne.
 * (strB écrase strA; et dans une même string, la dernière gagne aussi)
 */
export function mergeCssStrings(strA = "", strB = "") {
	const rules = new Map(); // selector -> body

	// Parse une string CSS en (selector, body) en balayant les accolades.
	function parse(css: string) {
		const s = (css || "").trim();
		if (!s) return;

		let i = 0;
		const n = s.length;

		while (i < n) {
			// trouver le prochain '{'
			const open = s.indexOf("{", i);
			if (open === -1) break;

			const selector = s.slice(i, open).trim();
			if (!selector) {
				i = open + 1;
				continue;
			}

			// trouver le '}' correspondant (supporte des accolades imbriquées, ex: @media)
			let depth = 0;
			let j = open;
			for (; j < n; j++) {
				const ch = s[j];
				if (ch === "{") depth++;
				else if (ch === "}") {
					depth--;
					if (depth === 0) break;
				}
			}
			if (j >= n) break; // CSS mal formé (pas de fermeture)

			const body = s.slice(open + 1, j).trim();

			// Si c'est un at-rule bloc (@media, @supports...), on le garde tel quel
			// en tant que "selector" unique. À l'intérieur, ça n'écrase pas les règles externes.
			// (Tu peux l'améliorer en parsant récursivement si tu veux.)
			rules.set(selector, body);

			i = j + 1;
		}
	}

	// ordre important : A puis B, B écrase A
	parse(strA);
	parse(strB);

	// reconstruit
	let out = "";
	for (const [selector, body] of rules) {
		out += `${selector}{${body}}`;
	}
	return out;
}

export function concatStrings(strA: string | undefined, strB: string | undefined): string | undefined {
	if (!strA && !strB) return undefined;
	if (!strA) return strB;
	if (!strB) return strA;
	const classes = new Set(...strA.split(" "), ...strB.split(" "));

	return [...classes].join(" ");
}

/**
 * Retourne le bloc CSS complet d'une classe dans une string de règles concaténées.
 * - classToFind peut être ".ma-classe" OU "ma-classe"
 * - Retourne null si non trouvé
 */
export function findCssClassRule(classToFind: string, cssclasses: string): string | null {
	const needle = classToFind.trim().startsWith(".") ? classToFind.trim().slice(1) : classToFind.trim();

	const s = (cssclasses || "").trim();
	if (!s || !needle) return null;

	// Cherche ".<classe>{" (en échappant les caractères spéciaux)
	const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const re = new RegExp(`\\.${escaped}\\s*\\{`, "g");

	let m: RegExpExecArray | null = null;
	let last: RegExpExecArray | null = null;
	while ((m = re.exec(s))) last = m; // "la dernière gagne" si doublons

	if (!last) return null;

	const start = last.index + 1; // sans le "." au début (comme dans ton exemple)
	const open = s.indexOf("{", last.index);
	if (open === -1) return null;

	// Trouver la '}' correspondante (supporte accolades imbriquées, ex @supports dans le body)
	let depth = 0;
	let end = -1;
	for (let i = open; i < s.length; i++) {
		const ch = s[i];
		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	if (end === -1) return null;

	return s.slice(start, end + 1).trim();
}
