import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type BuilderEvent = { name: string };

export type BuilderPerso = {
	type: string;
	initial?: Record<string, unknown>;
	actions?: Record<string, unknown>;
};

export type BuilderExport = {
	persos: BuilderPerso[];
	events: Record<string, BuilderEvent>;
};

export type ShellChapterXmlOptions = {
	pageId?: string;
	defaultTextSize?: number;
	defaultTextColor?: string;
	defaultTextAlign?: "left" | "center" | "right";
	fallbackSequencyMs?: number;
};

export type ShellXmlBundleOptions = ShellChapterXmlOptions & {
	chapterId?: string;
	courseTitle?: string;
	chapterTitle?: string;
	pageTitle?: string;
	language?: string;
};

export type ShellXmlBundle = {
	chapterXml: string;
	summaryXml: string;
	langXml: string;
	files: Record<string, string>;
};

type TimelineCue = {
	name: string;
	startMs: number;
	endMs: number;
	durationSec: number;
};

type ActionStyle = Record<string, unknown>;

type BuilderAction = {
	media?: {
		action?: string;
		offset?: number;
	};
	style?: ActionStyle;
	className?: unknown;
};

export function buildShellChapterXmlFromBuilder(
	data: BuilderExport,
	opts: ShellChapterXmlOptions = {}
): string {
	const pageId = opts.pageId ?? "page1";
	const sequency = buildSingleSceneSequency(data, opts.fallbackSequencyMs ?? 1500);

	const lines: string[] = [];
	lines.push(`<?xml version="1.0" encoding="utf-8" ?>`);
	lines.push("<data>");
	lines.push(`  <page id="${xmlEsc(pageId)}">`);
	lines.push(
		`    <default textSize="${opts.defaultTextSize ?? 25}" textColor="${xmlEsc(opts.defaultTextColor ?? "#000000")}" textAlign="${xmlEsc(opts.defaultTextAlign ?? "left")}" />`
	);
	lines.push(`    <sequency duration="${toSec(sequency.durationSec)}">`);
	for (const soundNode of sequency.soundNodes) lines.push(`      ${soundNode}`);
	for (const mediaNode of sequency.mediaNodes) lines.push(`      ${mediaNode}`);
	lines.push("    </sequency>");

	lines.push("  </page>");
	lines.push("</data>");
	return lines.join("\n");
}

export function buildShellXmlBundleFromBuilder(
	data: BuilderExport,
	opts: ShellXmlBundleOptions = {}
): ShellXmlBundle {
	const chapterId = opts.chapterId ?? "chapter1";
	const pageId = opts.pageId ?? "page1";
	const language = opts.language ?? "fr";

	const textByKey = buildTextDictionary(data);
	const chapterTitleKey = `${chapterId}_title`;
	const pageTitleKey = `${chapterId}_${pageId}_title`;

	textByKey.set("titleApp", opts.courseTitle ?? "Course title");
	textByKey.set("titleAppHtml", opts.courseTitle ?? "Course title");
	textByKey.set(chapterTitleKey, opts.chapterTitle ?? "Chapter 1");
	textByKey.set(pageTitleKey, opts.pageTitle ?? "Page 1");

	const chapterXml = buildShellChapterXmlFromBuilder(data, opts);
	const summaryXml = buildSummaryXml({ chapterId, pageId, chapterTitleKey, pageTitleKey });
	const langXml = buildLangXml(language, textByKey);

	return {
		chapterXml,
		summaryXml,
		langXml,
		files: {
			[`content/xml/${chapterId}.xml`]: chapterXml,
			"content/xml/summary.xml": summaryXml,
			[`content/xml/lang/${language}.xml`]: langXml
		}
	};
}

export async function writeBundleToDisk(bundle: ShellXmlBundle, baseDir: string): Promise<string[]> {
	const writtenPaths = await Promise.all(
		Object.entries(bundle.files).map(async ([relativePath, content]) => {
			const absolutePath = resolve(baseDir, relativePath);
			await mkdir(dirname(absolutePath), { recursive: true });
			await writeFile(absolutePath, content, "utf8");
			return absolutePath;
		})
	);

	return writtenPaths;
}

function renderMediaNode(
	perso: BuilderPerso,
	index: number,
	eventMsByName: Map<string, number>,
	sceneStartMs: number
): { soundNode?: string; mediaNode?: string; maxEndMs: number } | null {
	const initial = perso.initial || {};
	const id = String(initial.id ?? `item-${index + 1}`);
	const src = typeof initial.src == "string" ? initial.src : "";
	const initialClassName = typeof initial.className == "string" ? initial.className.trim() : "";
	const initialStyle = toRecord(initial.style);
	const sourceIsMp3 = isMp3Source(src);

	const actions = toActionEntries(perso.actions);
	const tweens = actions
		.map(([actionName, rawAction]) =>
			buildTweenFromAction(rawAction, {
				eventMsByName,
				actionName,
				sceneStartMs,
				itemId: id
			})
		)
		.filter((value): value is { tweenXml: string; endMs: number } => Boolean(value));

	let maxEndMs = sceneStartMs;
	for (const tween of tweens) {
		if (tween.endMs > maxEndMs) maxEndMs = tween.endMs;
	}

	if (sourceIsMp3) {
		if (!src) return null;
		return {
			soundNode: `<sound>${xmlEsc(src)}</sound>`,
			maxEndMs
		};
	}

	const tag = mapTag(perso.type);
	if (!tag || !src) return null;

	const attrs: Record<string, string | number> = { id, src };
	if (initialClassName) attrs.cssClass = initialClassName;
	applyInitialStyleToAttributes(initialStyle, attrs);

	const cssStyle = buildCssStyleString(initialStyle);
	if (cssStyle) attrs.cssStyle = cssStyle;

	if (tweens.length === 0) {
		return {
			mediaNode: `<${tag}${attrsToXml(attrs)} />`,
			maxEndMs
		};
	}

	const tweenLines = tweens.map((entry) => `        ${entry.tweenXml}`).join("\n");
	return {
		mediaNode: `<${tag}${attrsToXml(attrs)}>\n${tweenLines}\n      </${tag}>`,
		maxEndMs
	};
}

function buildSingleSceneSequency(
	data: BuilderExport,
	fallbackSequencyMs: number
): { durationSec: number; soundNodes: string[]; mediaNodes: string[] } {
	const cues = Object.entries(data.events || {})
		.map(([ms, event]) => ({ ms: Number(ms), name: event?.name ?? String(ms) }))
		.filter((entry) => Number.isFinite(entry.ms))
		.sort((a, b) => a.ms - b.ms);

	if (cues.length === 0) throw new Error("Aucun event dans data.events");

	const sceneStartMs = cues[0].ms;
	const eventMsByName = new Map<string, number>(cues.map((cue) => [cue.name, cue.ms]));

	const soundNodes: string[] = [];
	const mediaNodes: string[] = [];
	const usedItemIds = new Set<string>();
	let maxEndMs = sceneStartMs;

	for (let i = 0; i < data.persos.length; i += 1) {
		const perso = data.persos[i];
		const initial = toRecord(perso.initial);
		const id = String(initial.id ?? `item-${i + 1}`);
		if (usedItemIds.has(id)) continue;

		const node = renderMediaNode(perso, i, eventMsByName, sceneStartMs);
		if (!node) continue;

		usedItemIds.add(id);
		if (node.soundNode) soundNodes.push(node.soundNode);
		if (node.mediaNode) mediaNodes.push(node.mediaNode);
		if (node.maxEndMs > maxEndMs) maxEndMs = node.maxEndMs;
	}

	if (maxEndMs <= sceneStartMs) {
		maxEndMs = sceneStartMs + fallbackSequencyMs;
	}

	return {
		durationSec: Math.max(0.1, (maxEndMs - sceneStartMs) / 1000),
		soundNodes,
		mediaNodes
	};
}

function mapTag(type: string): string | null {
	switch (type) {
		case "IMG":
			return "img";
		case "VIDEO":
			return "video";
		case "LOTTIE":
			return "lottie";
		case "TEXT":
			return "txt";
		case "SNAPFLA":
			return "snapFLA";
		default:
			return null;
	}
}

function pickTo(value: unknown): string | number | null {
	if (typeof value == "string" || typeof value == "number") return value;
	if (!value || typeof value != "object") return null;
	const record = value as Record<string, unknown>;
	if (typeof record.to == "string" || typeof record.to == "number") return record.to;
	return null;
}

function buildTweenFromAction(
	rawAction: unknown,
	context: {
		eventMsByName: Map<string, number>;
		actionName: string;
		sceneStartMs: number;
		itemId: string;
	}
): { tweenXml: string; endMs: number } | null {
	if (!rawAction || typeof rawAction != "object") return null;
	const action = rawAction as BuilderAction;
	const style = toRecord(action.style);
	const out: Record<string, string | number> = {};
	const rootDurationMs =
		typeof style.duration == "number" && Number.isFinite(style.duration) && style.duration > 0
			? style.duration
			: 500;
	let maxDurationMs = rootDurationMs;

	for (const [key, raw] of Object.entries(style)) {
		if (key === "duration") continue;
		if (!raw || typeof raw != "object") continue;
		const value = raw as Record<string, unknown>;
		if (typeof value.to == "string" || typeof value.to == "number") {
			out[key === "opacity" ? "alpha" : key] = value.to;
		}
		if (
			typeof value.duration == "number" &&
			Number.isFinite(value.duration) &&
			value.duration > maxDurationMs
		) {
			maxDurationMs = value.duration;
		}
	}

	const onStart = buildClassNameOnStart(action.className, context.itemId);
	if (onStart) out.onStart = onStart;

	if (Object.keys(out).length === 0) return null;

	const eventMs = resolveActionStartMs(context.actionName, context.eventMsByName, context.sceneStartMs);
	const delayMs = Math.max(0, eventMs - context.sceneStartMs);
	if (delayMs > 0) out.delay = Number((delayMs / 1000).toFixed(3));

	out.time = Number((maxDurationMs / 1000).toFixed(3));
	return {
		tweenXml: `<tween${attrsToXml(out)} />`,
		endMs: eventMs + maxDurationMs
	};
}

function resolveActionStartMs(
	actionName: string,
	eventMsByName: Map<string, number>,
	sceneStartMs: number
): number {
	const fromEventName = eventMsByName.get(actionName);
	if (typeof fromEventName == "number") return fromEventName;
	const asNumber = Number(actionName);
	if (Number.isFinite(asNumber)) return asNumber;
	return sceneStartMs;
}

function applyInitialStyleToAttributes(
	style: Record<string, unknown>,
	attrs: Record<string, string | number>
): void {
	const x = pickTo(style.x);
	const y = pickTo(style.y);
	const alpha = pickTo(style.opacity);
	const width = pickTo(style.width);
	const height = pickTo(style.height);
	const scale = pickTo(style.scale);

	if (x !== null) attrs.x = x;
	if (y !== null) attrs.y = y;
	if (alpha !== null) attrs.alpha = alpha;
	if (width !== null) attrs.width = width;
	if (height !== null) attrs.height = height;
	if (scale !== null) attrs.scale = scale;
}

function buildCssStyleString(style: Record<string, unknown>): string {
	const ignoredKeys = new Set(["x", "y", "width", "height", "opacity", "scale"]);
	const declarations: string[] = [];

	for (const [key, value] of Object.entries(style)) {
		if (ignoredKeys.has(key)) continue;
		if (typeof value != "string" && typeof value != "number") continue;
		declarations.push(`${toKebabCase(key)}:${String(value)}`);
	}

	return declarations.join(";");
}

function buildClassNameOnStart(classNameAction: unknown, itemId: string): string | null {
	if (!classNameAction || typeof classNameAction != "object") return null;
	const action = classNameAction as Record<string, unknown>;
	const add = typeof action.add == "string" ? action.add.trim() : "";
	const remove = typeof action.remove == "string" ? action.remove.trim() : "";
	const calls: string[] = [];

	if (add) {
		for (const token of add.split(/\s+/).filter(Boolean)) {
			calls.push(`addCssClassItem('${itemId},${token}')`);
		}
	}

	if (remove) {
		for (const token of remove.split(/\s+/).filter(Boolean)) {
			calls.push(`removeCssClassItem('${itemId},${token}')`);
		}
	}

	return calls.length ? calls.join(";") : null;
}

function toRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value != "object") return {};
	return value as Record<string, unknown>;
}

function toActionEntries(actions: unknown): Array<[string, unknown]> {
	if (!actions || typeof actions != "object") return [];
	return Object.entries(actions as Record<string, unknown>).filter(([, value]) => Boolean(value));
}

function isMp3Source(src: string): boolean {
	if (!src) return false;
	const clean = src.split("?")[0].split("#")[0].toLowerCase();
	return clean.endsWith(".mp3");
}

function toKebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function buildTextDictionary(data: BuilderExport): Map<string, string> {
	const map = new Map<string, string>();

	for (let i = 0; i < data.persos.length; i += 1) {
		const perso = data.persos[i];
		if (perso.type !== "TEXT") continue;
		const initial = (perso.initial || {}) as Record<string, unknown>;
		const raw = initial.content;
		if (typeof raw != "string" || !raw.trim()) continue;
		const key = `text_${String(initial.id ?? i + 1)}`;
		map.set(key, raw);
	}

	return map;
}

function buildSummaryXml(input: {
	chapterId: string;
	pageId: string;
	chapterTitleKey: string;
	pageTitleKey: string;
}): string {
	return [
		`<?xml version="1.0" encoding="utf-8" ?>`,
		`<menu id="content" title="">`,
		`  <chap id="${xmlEsc(input.chapterId)}" title="${xmlEsc(input.chapterTitleKey)}">`,
		`    <page id="${xmlEsc(input.pageId)}" title="${xmlEsc(input.pageTitleKey)}" />`,
		`  </chap>`,
		`</menu>`
	].join("\n");
}

function buildLangXml(language: string, texts: Map<string, string>): string {
	const sorted = [...texts.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
	const lines: string[] = [];
	lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
	lines.push(`<lang localisation="${xmlEsc(language)}">`);
	for (const [key, value] of sorted) {
		lines.push(`  <tr key="${xmlEsc(key)}"><![CDATA[${safeCdata(value)}]]></tr>`);
	}
	lines.push(`</lang>`);
	return lines.join("\n");
}

function attrsToXml(attrs: Record<string, string | number>): string {
	const pairs = Object.entries(attrs)
		.filter(([, value]) => value !== "" && value != null)
		.map(([key, value]) => `${key}="${xmlEsc(String(value))}"`);
	return pairs.length ? ` ${pairs.join(" ")}` : "";
}

function toSec(value: number): string {
	return Number(value.toFixed(3)).toString();
}

function safeCdata(value: string): string {
	return value.replace(/]]>/g, "]]]]><![CDATA[>");
}

function xmlEsc(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
