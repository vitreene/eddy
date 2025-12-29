/**
 * Fusionne 2 strings de règles CSS (concaténées) et supprime les doublons.
 * Règle: si un sélecteur apparaît plusieurs fois, la dernière occurrence gagne.
 * (strB écrase strA; et dans une même string, la dernière gagne aussi)
 *
 * IMPORTANT: ici, les "noms de classes" peuvent être sans "." (ex: "ed-a{...}")
 * et/ou avec "." (ex: ".ed-a{...}"). On normalise la clé pour dédupliquer.
 */
export function mergeCssStrings(strA = "", strB = ""): string {
	// clé normalisée -> { rawSelector (dernier vu), body }
	const rules = new Map<string, { sel: string; body: string }>();

	const normKey = (selector: string) => selector.trim().replace(/^\./, "");

	function parse(css: string) {
		const s = (css || "").trim();
		if (!s) return;

		let i = 0;
		const n = s.length;

		while (i < n) {
			const open = s.indexOf("{", i);
			if (open === -1) break;

			const selector = s.slice(i, open).trim();
			if (!selector) {
				i = open + 1;
				continue;
			}

			// trouver le '}' correspondant (supporte accolades imbriquées)
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
			if (j >= n) break; // CSS mal formé

			const body = s.slice(open + 1, j).trim();

			// Si c'est un at-rule bloc (@media, @supports...), on le garde tel quel
			// (clé = selector tel quel)
			if (selector.trim().startsWith("@")) {
				rules.set(selector.trim(), { sel: selector.trim(), body });
			} else {
				rules.set(normKey(selector), { sel: selector.trim(), body });
			}

			i = j + 1;
		}
	}

	// ordre important : A puis B => B écrase A
	parse(strA);
	parse(strB);

	let out = "";
	for (const { sel, body } of rules.values()) {
		out += `${sel}{${body}}`;
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
 * Retrouve la règle CSS complète d'une classe dans une string de règles concaténées.
 * - classToFind: ".ed-grid-w5-h3" ou "ed-grid-w5-h3"
 * - La règle dans cssclasses peut être avec ou sans "."
 * - Si plusieurs occurrences, la dernière gagne
 * - Retourne TOUJOURS avec "." (ex: ".ed-grid-w5-h3{...}")
 * - Retourne undefined si non trouvée
 */
export function findCssClassRule(cssclasses: string, classToFind: string): string | undefined {
	const s = (cssclasses ?? "").trim();
	const wanted = (classToFind ?? "").trim().replace(/^\./, "");
	if (!s || !wanted) return undefined;

	const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	// Matche "ed-xxx{" ou ".ed-xxx{" en s’assurant que ce n’est pas au milieu d’un identifiant
	// (début de string OU caractère non [A-Za-z0-9_-] juste avant)
	const re = new RegExp(`(^|[^A-Za-z0-9_-])\\.?${escaped}\\s*\\{`, "g");

	let lastSelectorStart = -1;
	let m: RegExpExecArray | null;
	while ((m = re.exec(s))) {
		lastSelectorStart = m.index + m[1].length; // début réel du sélecteur (avec ou sans ".")
	}
	if (lastSelectorStart === -1) return undefined;

	const open = s.indexOf("{", lastSelectorStart);
	if (open === -1) return undefined;

	// Trouver la '}' correspondante (supporte accolades imbriquées)
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
	if (end === -1) return undefined;

	const body = s.slice(open + 1, end).trim();
	return `.${wanted}{${body}}`;
}

/* --- Test (ton cas) ---
const gridClassName = ".ed-grid-w5-h3";
const theme =
  ".ed-grid-w5-h2{display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));grid-template-rows:repeat(2, minmax(0, 1fr))}" +
  ".ed-grid-w6-h2{display:grid;grid-template-columns:repeat(6, minmax(0, 1fr));grid-template-rows:repeat(2, minmax(0, 1fr))}" +
  ".ed-grid-w10-h1{display:grid;grid-template-columns:repeat(10, minmax(0, 1fr));grid-template-rows:repeat(1, minmax(0, 1fr))}" +
  ".ed-grid-w4-h2{display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));grid-template-rows:repeat(2, minmax(0, 1fr))}" +
  ".ed-grid-w5-h3{display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));grid-template-rows:repeat(3, minmax(0, 1fr))}";

console.log(findCssClassRule(theme, gridClassName));
// => ".ed-grid-w5-h3{display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));grid-template-rows:repeat(3, minmax(0, 1fr))}"
*/
