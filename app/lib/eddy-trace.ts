export type EddyTraceChannel = "selection" | "flip" | "timeline";

export type EddyTraceConfig = {
	enabled?: boolean;
	channels?: EddyTraceChannel[];
	itemIds?: number[];
	nodeIds?: string[];
	console?: boolean;
	maxEntries?: number;
	disableLastEndCoords?: boolean;
	clearLastEndCoordsOnSeek?: boolean;
};

type EddyTraceApi = {
	start: (patch?: Partial<EddyTraceConfig>) => EddyTraceConfig;
	stop: () => EddyTraceConfig;
	set: (patch: Partial<EddyTraceConfig>) => EddyTraceConfig;
	get: () => EddyTraceConfig;
	clear: () => void;
	dump: () => EddyTraceEntry[];
};

export type EddyTraceScope = {
	itemId?: number | null;
	nodeId?: string | null;
};

export type EddyTraceEntry = {
	ts: number;
	channel: EddyTraceChannel;
	event: string;
	scope?: EddyTraceScope;
	payload: Record<string, unknown>;
};

const DEFAULT_MAX_ENTRIES = 2000;
const TRACE_STORAGE_KEY = "eddy.trace.config";

type TraceHost = {
	__EDDY_TRACE_CONFIG__?: EddyTraceConfig;
	__EDDY_TRACE_BUFFER__?: EddyTraceEntry[];
	__EDDY_TRACE__?: EddyTraceApi;
};

function getTraceHost(): TraceHost {
	return globalThis as TraceHost;
}

function isBrowser(): boolean {
	return typeof window !== "undefined" && typeof document !== "undefined";
}

function mergeConfig(base: EddyTraceConfig, patch: Partial<EddyTraceConfig>): EddyTraceConfig {
	return { ...base, ...patch };
}

function persistConfig(config: EddyTraceConfig): void {
	if (!isBrowser()) return;
	try {
		window.localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(config));
	} catch {
		// ignore storage errors
	}
}

function restoreConfigFromStorage(host: TraceHost): void {
	if (!isBrowser()) return;
	if (host.__EDDY_TRACE_CONFIG__) return;
	try {
		const raw = window.localStorage.getItem(TRACE_STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw) as EddyTraceConfig;
		if (parsed && typeof parsed === "object") {
			host.__EDDY_TRACE_CONFIG__ = parsed;
		}
	} catch {
		// ignore parse errors
	}
}

function installGlobalTraceApi(host: TraceHost): void {
	if (!isBrowser()) return;
	if (host.__EDDY_TRACE__) return;

	host.__EDDY_TRACE__ = {
		start: (patch) => {
			const next = mergeConfig(getEddyTraceConfig(), { enabled: true, ...(patch || {}) });
			host.__EDDY_TRACE_CONFIG__ = next;
			persistConfig(next);
			return next;
		},
		stop: () => {
			const next = mergeConfig(getEddyTraceConfig(), { enabled: false });
			host.__EDDY_TRACE_CONFIG__ = next;
			persistConfig(next);
			return next;
		},
		set: (patch) => {
			const next = mergeConfig(getEddyTraceConfig(), patch);
			host.__EDDY_TRACE_CONFIG__ = next;
			persistConfig(next);
			return next;
		},
		get: () => getEddyTraceConfig(),
		clear: () => {
			host.__EDDY_TRACE_BUFFER__ = [];
		},
		dump: () => [...(host.__EDDY_TRACE_BUFFER__ || [])]
	};
}

function isEnabled(config: EddyTraceConfig): boolean {
	if (config.enabled === true) return true;
	if (!isBrowser()) return false;
	try {
		const params = new URLSearchParams(window.location.search);
		return params.get("eddyTrace") === "1";
	} catch {
		return false;
	}
}

function ensureTraceReady(): TraceHost {
	const host = getTraceHost();
	restoreConfigFromStorage(host);
	installGlobalTraceApi(host);
	return host;
}

export function getEddyTraceConfig(): EddyTraceConfig {
	return ensureTraceReady().__EDDY_TRACE_CONFIG__ || {};
}

export function shouldUseLastEndCoords(): boolean {
	return getEddyTraceConfig().disableLastEndCoords !== true;
}

export function shouldClearLastEndCoordsOnSeek(): boolean {
	return getEddyTraceConfig().clearLastEndCoordsOnSeek !== false;
}

export function traceEddy(
	channel: EddyTraceChannel,
	event: string,
	payload: Record<string, unknown>,
	scope?: EddyTraceScope
): void {
	const host = ensureTraceReady();
	const config = getEddyTraceConfig();
	if (!isEnabled(config)) return;
	if (Array.isArray(config.channels) && config.channels.length && !config.channels.includes(channel)) return;

	if (scope && Array.isArray(config.itemIds) && config.itemIds.length) {
		if (typeof scope.itemId === "number" && !config.itemIds.includes(scope.itemId)) return;
	}

	if (scope && Array.isArray(config.nodeIds) && config.nodeIds.length) {
		if (typeof scope.nodeId === "string" && !config.nodeIds.includes(scope.nodeId)) return;
	}

	const entry: EddyTraceEntry = {
		ts: Date.now(),
		channel,
		event,
		scope,
		payload
	};

	if (!Array.isArray(host.__EDDY_TRACE_BUFFER__)) host.__EDDY_TRACE_BUFFER__ = [];
	host.__EDDY_TRACE_BUFFER__.push(entry);

	const maxEntries =
		typeof config.maxEntries === "number" && Number.isFinite(config.maxEntries) && config.maxEntries > 0
			? Math.floor(config.maxEntries)
			: DEFAULT_MAX_ENTRIES;
	if (host.__EDDY_TRACE_BUFFER__.length > maxEntries) {
		host.__EDDY_TRACE_BUFFER__.splice(0, host.__EDDY_TRACE_BUFFER__.length - maxEntries);
	}

	if (config.console !== false) {
		console.log(`[eddy-trace:${channel}] ${event}`, { scope, ...payload });
	}
}

ensureTraceReady();
