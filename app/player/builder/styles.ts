import { NON_ANIMATABLE_MANAGED_STYLE_KEYS } from "@/config/item-style-defaults";
import { shouldCapsuleUseExplicitArea } from "@/config/capsule-types";
import { DEFAULT_DURATION } from "@/config/constants";

import type { SceneComp } from "@/api/db";
import type { ClassNameAction } from "../types";
import type { ActionStyle } from "./lib";

export type DecorLike = {
	className?: string | null;
	area?: string | null;
	style?: unknown;
};

const STATIC_STYLE_CLASS_KEYS = new Set<string>(NON_ANIMATABLE_MANAGED_STYLE_KEYS.map((key) => String(key)));

/**
 * Build the final style tag content for the player scene.
 */
export function createStyle(snapshot: SceneComp, areas: string[], gridDefinitions: string[]) {
	const staticStyleDefinitions = buildStaticStyleClassDefinitions(snapshot);
	return `${snapshot.theme?.generated || ""} \n ${snapshot.theme?.custom || ""} \n\n ${gridDefinitions.join("\n")}\n${areas.join("\n")}\n${staticStyleDefinitions.join("\n")}`.trim();
}

/**
 * Join classes with trim + empty filtering.
 */
export function joinNodeClassNames(...tokens: Array<string | null | undefined>): string {
	return tokens
		.map((token) => (token || "").trim())
		.filter(Boolean)
		.join(" ");
}

/**
 * Resolve active area class from explicit slot and auto-placement fallback.
 */
export function getEffectiveAreaClassName(
	capsuleType: string | null | undefined,
	explicitArea: string | null | undefined,
	autoArea: string | null | undefined
): string {
	return shouldCapsuleUseExplicitArea(capsuleType)
		? explicitArea || autoArea || ""
		: autoArea || explicitArea || "";
}

/**
 * Extract inline style values (animation-friendly subset) from decor style.
 */
export function getInlineStyle(style: unknown): Record<string, number | string> {
	if (!style || typeof style != "object") return {};
	const source = style as Record<string, unknown>;
	const filtered = Object.fromEntries(
		Object.entries(source).filter(([key, value]) => {
			if (typeof value != "string" && typeof value != "number") return false;
			if (STATIC_STYLE_CLASS_KEYS.has(key)) return false;
			return true;
		})
	) as Record<string, number | string>;

	const normalized: Record<string, number | string> = { ...filtered };

	if (typeof normalized.width == "number" && Number.isFinite(normalized.width))
		normalized.width = `${normalized.width}px`;
	if (typeof normalized.height == "number" && Number.isFinite(normalized.height))
		normalized.height = `${normalized.height}px`;

	const hasOriginX = typeof normalized.originX != "undefined";
	const hasOriginY = typeof normalized.originY != "undefined";
	if (hasOriginX || hasOriginY) {
		const originX = hasOriginX ? normalizeOriginToken(normalized.originX) : "50%";
		const originY = hasOriginY ? normalizeOriginToken(normalized.originY) : "50%";
		normalized.transformOrigin = `${originX} ${originY}`;
		delete normalized.originX;
		delete normalized.originY;
	}

	return normalized;
}

/**
 * Normalize origin tokens from ratio/px/percent to css token.
 */
/**
 * Normalize origin token from ratio/px/plain value into valid CSS origin token.
 */
function normalizeOriginToken(value: string | number): string {
	if (typeof value == "number") {
		if (value >= 0 && value <= 1) return `${value * 100}%`;
		return `${value}px`;
	}
	const trimmed = value.trim();
	if (!trimmed) return "50%";
	const numeric = Number(trimmed);
	if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1) return `${numeric * 100}%`;
	return trimmed;
}

/**
 * Build deterministic generated class name for non-animatable style keys.
 *
 * Naming contract:
 * - prefix: `ed-static-`
 * - suffix: base36 hash of the normalized static style signature
 *
 * Example: `ed-static-josgry`
 * (`josgry` is a hash suffix, not a semantic label)
 */
export function getStaticStyleClassName(style: unknown): string {
	const entries = extractStaticStyleEntries(style);
	if (!entries.length) return "";
	const signature = entries.map(([key, value]) => `${key}:${value}`).join(";");
	return `ed-static-${hashString(signature)}`;
}

/**
 * Compute image element style from generic decor style values.
 */
export function toImageStyle(
	style: unknown,
	fallbackFit: "cover" | "contain"
): Record<string, number | string> {
	if (!style || typeof style != "object") return { objectFit: fallbackFit };

	const source = style as Record<string, unknown>;
	const next: Record<string, number | string> = {};

	let hasObjectFit = false;

	for (const [key, value] of Object.entries(source)) {
		if (typeof value != "string" && typeof value != "number") continue;
		if (key === "backgroundImage") continue;
		if (key === "backgroundSize") {
			const objectFit = mapBackgroundSizeToObjectFit(value);
			if (objectFit) {
				next.objectFit = objectFit;
				hasObjectFit = true;
			}
			continue;
		}
		if (key === "backgroundPosition") {
			next.objectPosition = String(value);
			continue;
		}
		if (key === "backgroundRepeat") continue;
		next[key] = value;
	}

	if (!hasObjectFit) next.objectFit = fallbackFit;

	return next;
}

/**
 * Build effective decor from event decor with fallback and patch merge.
 */
export function getEventDecor(
	snapshot: SceneComp,
	decorId: number | null | undefined,
	fallback: DecorLike
): DecorLike {
	if (!decorId) return fallback;
	const incoming = (snapshot.decors?.[decorId] as DecorLike | undefined) || null;
	if (!incoming) return fallback;
	if (isNeutralDecor(incoming)) return fallback;

	const mergedStyle = {
		...(fallback.style && typeof fallback.style == "object" ? (fallback.style as Record<string, unknown>) : {}),
		...(incoming.style && typeof incoming.style == "object" ? (incoming.style as Record<string, unknown>) : {})
	};

	return {
		...fallback,
		...incoming,
		className: incoming.className ?? fallback.className,
		area: incoming.area ?? fallback.area,
		style: mergedStyle
	};
}

/**
 * Build full dynamic class string for a decor state.
 */
export function buildDynamicClassName(
	capsuleType: string | null | undefined,
	decor: DecorLike,
	autoAreaClassName: string | null | undefined
): string {
	return joinNodeClassNames(
		decor?.className || "",
		getStaticStyleClassName(decor?.style),
		getEffectiveAreaClassName(capsuleType, decor?.area, autoAreaClassName)
	);
}

/**
 * Create add/remove class diff action between two dynamic class sets.
 */
export function buildClassNameDiff(
	previousClassName: string,
	nextClassName: string
): ClassNameAction | undefined {
	const previous = new Set(
		previousClassName
			.split(/\s+/)
			.map((v) => v.trim())
			.filter(Boolean)
	);
	const next = new Set(
		nextClassName
			.split(/\s+/)
			.map((v) => v.trim())
			.filter(Boolean)
	);

	const remove = [...previous].filter((token) => !next.has(token)).join(" ");
	const add = [...next].filter((token) => !previous.has(token)).join(" ");
	if (!remove && !add) return undefined;

	return {
		...(add ? { add } : {}),
		...(remove ? { remove } : {})
	};
}

/**
 * Build property interpolation from previous style state to target style.
 */
export function buildStyleInterpolation(
	fromStyle: Record<string, number | string>,
	toStyle: Record<string, number | string>,
	durationMs: number
): ActionStyle {
	const style: ActionStyle = {};
	const hasTransformLikeChange = ["rotate", "scale", "scaleX", "scaleY", "skewX", "skewY"].some(
		(key) => typeof toStyle[key] != "undefined" || typeof fromStyle[key] != "undefined"
	);
	for (const [key, to] of Object.entries(toStyle)) {
		const from = fromStyle[key];
		if (typeof from == "undefined" || from === to) {
			style[key] = { to, duration: durationMs };
		} else {
			style[key] = { from, to, duration: durationMs };
		}
	}

	if (
		hasTransformLikeChange &&
		typeof toStyle.transformOrigin == "undefined" &&
		typeof fromStyle.transformOrigin == "undefined"
	) {
		style.transformOrigin = { to: "50% 50%", duration: durationMs };
	}
	return style;
}

/**
 * Detect position-relevant style changes.
 */
export function hasPositionStyleDelta(
	fromStyle: Record<string, number | string>,
	toStyle: Record<string, number | string>
): boolean {
	for (const key of ["x", "y", "width", "height"] as const) {
		if (typeof fromStyle[key] == "undefined" && typeof toStyle[key] == "undefined") continue;
		if (fromStyle[key] !== toStyle[key]) return true;
	}
	return false;
}

/**
 * Normalize transition preset style with default duration.
 */
export function getActionStyle(style: ActionStyle) {
	const actionStyle = {} as ActionStyle;
	for (const key in style) actionStyle[key] = { ...style[key], duration: DEFAULT_DURATION };
	return actionStyle;
}

/**
 * Map CSS background-size value to object-fit for img tag projection.
 */
function mapBackgroundSizeToObjectFit(value: string | number): string | null {
	if (typeof value == "number") return null;
	const normalized = value.trim().toLowerCase();
	if (normalized === "cover") return "cover";
	if (normalized === "contain") return "contain";
	return null;
}

/**
 * Extract entries that must be materialized as generated static classes.
 */
function extractStaticStyleEntries(style: unknown): Array<[string, string | number]> {
	if (!style || typeof style != "object") return [];
	const source = style as Record<string, unknown>;
	return Object.entries(source)
		.filter(
			([key, value]) =>
				STATIC_STYLE_CLASS_KEYS.has(key) && (typeof value == "string" || typeof value == "number")
		)
		.sort(([a], [b]) => (a < b ? -1 : 1)) as Array<[string, string | number]>;
}

/**
 * Build all generated static class definitions referenced by scene decors.
 */
function buildStaticStyleClassDefinitions(snapshot: SceneComp): string[] {
	const definitions = new Set<string>();
	const allDecors = [
		snapshot.decor as DecorLike | undefined,
		...Object.values(snapshot.decors || {}).map((decor) => decor as DecorLike)
	].filter(Boolean) as DecorLike[];

	for (const decor of allDecors) {
		const className = getStaticStyleClassName(decor.style);
		if (!className) continue;
		const declarations = buildStaticStyleDeclarations(decor.style);
		if (!declarations.length) continue;
		definitions.add(`.${className}{${declarations.join(";")}}`);
	}

	return [...definitions];
}

/**
 * Convert extracted static style entries to CSS declarations.
 */
function buildStaticStyleDeclarations(style: unknown): string[] {
	const entries = extractStaticStyleEntries(style);
	const declarations: string[] = [];

	for (const [key, value] of entries) {
		if (key === "backgroundPosition") {
			declarations.push(`background-position:${value}`);
			declarations.push(`object-position:${value}`);
			continue;
		}
		declarations.push(`${toKebabCase(key)}:${value}`);
	}

	return declarations;
}

/**
 * Convert camelCase style key to kebab-case CSS property.
 */
function toKebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Compute deterministic short hash used in generated class names.
 */
function hashString(value: string): string {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
	return Math.abs(hash).toString(36);
}

/**
 * Detect if decor carries no effective class, area or style payload.
 */
function isNeutralDecor(decor: DecorLike): boolean {
	const hasClass = typeof decor.className == "string" && decor.className.trim().length > 0;
	const hasArea = typeof decor.area == "string" && decor.area.trim().length > 0;
	const hasStyle = Boolean(
		decor.style && typeof decor.style == "object" && Object.keys(decor.style as Record<string, unknown>).length
	);
	return !hasClass && !hasArea && !hasStyle;
}
