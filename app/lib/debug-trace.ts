type TraceConfig = {
	enabled?: boolean;
	scopes?: string[];
	itemIds?: Array<number | string>;
	maxLogs?: number;
};

type TraceOptions = {
	scope: string;
	itemId?: number | string | null;
	onceKey?: string;
	payload?: unknown;
};

function getTraceConfig(): TraceConfig {
	const raw = (globalThis as any).__EDDY_TRACE__;
	if (!raw || typeof raw !== "object") return {};
	return raw as TraceConfig;
}

function getTraceOnceSet(): Set<string> {
	const globalAny = globalThis as any;
	if (!(globalAny.__EDDY_TRACE_ONCE__ instanceof Set)) {
		globalAny.__EDDY_TRACE_ONCE__ = new Set<string>();
	}
	return globalAny.__EDDY_TRACE_ONCE__ as Set<string>;
}

function getTraceCounter(): { count: number } {
	const globalAny = globalThis as any;
	if (!globalAny.__EDDY_TRACE_COUNTER__ || typeof globalAny.__EDDY_TRACE_COUNTER__ !== "object") {
		globalAny.__EDDY_TRACE_COUNTER__ = { count: 0 };
	}
	return globalAny.__EDDY_TRACE_COUNTER__ as { count: number };
}

function normalizeTraceItemId(value: number | string | null | undefined): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return null;
	const match = value.match(/(\d+)$/);
	if (!match) return null;
	const parsed = Number(match[1]);
	return Number.isFinite(parsed) ? parsed : null;
}

export function shouldTrace(scope: string, itemId?: number | string | null): boolean {
	const config = getTraceConfig();
	if (config.enabled !== true) return false;

	if (Array.isArray(config.scopes) && config.scopes.length > 0) {
		if (!config.scopes.includes(scope)) return false;
	}

	if (Array.isArray(config.itemIds) && config.itemIds.length > 0) {
		const normalizedItemId = normalizeTraceItemId(itemId ?? null);
		if (normalizedItemId === null) return false;
		const allowed = config.itemIds
			.map((entry) => normalizeTraceItemId(entry))
			.filter((entry): entry is number => entry !== null);
		if (!allowed.includes(normalizedItemId)) return false;
	}

	return true;
}

export function traceLog(options: TraceOptions): void {
	const { scope, itemId, onceKey, payload } = options;
	if (!shouldTrace(scope, itemId)) return;

	const config = getTraceConfig();
	const counter = getTraceCounter();
	const maxLogs =
		typeof config.maxLogs === "number" && Number.isFinite(config.maxLogs) && config.maxLogs > 0
			? Math.round(config.maxLogs)
			: 200;
	if (counter.count >= maxLogs) return;

	if (onceKey) {
		const onceSet = getTraceOnceSet();
		if (onceSet.has(onceKey)) return;
		onceSet.add(onceKey);
	}

	counter.count += 1;
	console.log(`[trace:${scope}]`, payload ?? {});
}
