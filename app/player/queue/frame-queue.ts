type MaybePromise<T> = T | Promise<T>;

type FrameRequest = (cb: FrameRequestCallback) => number;
type FrameCancel = (id: number) => void;

export type QueuePhaseHooks<TContext, TAfterWrite> = {
	readBeforeWrite?: () => MaybePromise<TContext>;
	applyWrite?: (context: TContext) => MaybePromise<void>;
	readAfterWrite?: (context: TContext) => MaybePromise<TAfterWrite>;
	commit?: (context: TContext, afterWrite: TAfterWrite) => MaybePromise<void>;
	cancel?: (reason: "dedup" | "clear" | "dispose") => void;
};

export type QueueJob<TContext = void, TAfterWrite = void> = QueuePhaseHooks<TContext, TAfterWrite> & {
	key: string | number;
	priority?: number;
};

export type FrameQueueController<TContext = void, TAfterWrite = void> = {
	enqueue: (job: QueueJob<TContext, TAfterWrite>) => void;
	flush: () => Promise<void>;
	clear: () => void;
	dispose: () => void;
	readonly size: number;
};

export function createFrameQueue<TContext = void, TAfterWrite = void>(options?: {
	requestFrame?: FrameRequest;
	cancelFrame?: FrameCancel;
	onError?: (error: unknown, jobKey: string | number, phase: string) => void;
}): FrameQueueController<TContext, TAfterWrite> {
	const requestFrame = options?.requestFrame || defaultRequestFrame;
	const cancelFrame = options?.cancelFrame || defaultCancelFrame;
	const onError = options?.onError || (() => {});

	type Entry = {
		job: QueueJob<TContext, TAfterWrite>;
		order: number;
	};

	let rafId: number | null = null;
	let order = 0;
	let disposed = false;
	const entries = new Map<string | number, Entry>();

	const schedule = () => {
		if (disposed || rafId !== null || entries.size === 0) return;
		rafId = requestFrame(() => {
			rafId = null;
			void flush();
		});
	};

	const enqueue = (job: QueueJob<TContext, TAfterWrite>) => {
		if (disposed) return;
		const existing = entries.get(job.key);
		if (existing?.job.cancel) existing.job.cancel("dedup");
		entries.set(job.key, { job, order: order++ });
		schedule();
	};

	const flush = async () => {
		if (disposed || entries.size === 0) return;

		const batch = [...entries.values()]
			.sort((a, b) => {
				const pa = a.job.priority ?? 0;
				const pb = b.job.priority ?? 0;
				if (pa !== pb) return pa - pb;
				return a.order - b.order;
			})
			.map((entry) => entry.job);

		entries.clear();

		const contexts = new Map<QueueJob<TContext, TAfterWrite>, TContext>();
		for (const job of batch) {
			try {
				const context = job.readBeforeWrite ? await job.readBeforeWrite() : (undefined as TContext);
				contexts.set(job, context);
			} catch (error) {
				onError(error, job.key, "readBeforeWrite");
			}
		}

		for (const job of batch) {
			if (!contexts.has(job)) continue;
			try {
				if (job.applyWrite) await job.applyWrite(contexts.get(job)!);
			} catch (error) {
				onError(error, job.key, "applyWrite");
				contexts.delete(job);
			}
		}

		const afterWrites = new Map<QueueJob<TContext, TAfterWrite>, TAfterWrite>();
		for (const job of batch) {
			if (!contexts.has(job)) continue;
			try {
				const afterWrite = job.readAfterWrite
					? await job.readAfterWrite(contexts.get(job)!)
					: (undefined as TAfterWrite);
				afterWrites.set(job, afterWrite);
			} catch (error) {
				onError(error, job.key, "readAfterWrite");
			}
		}

		for (const job of batch) {
			if (!contexts.has(job) || !afterWrites.has(job)) continue;
			try {
				if (job.commit) await job.commit(contexts.get(job)!, afterWrites.get(job)!);
			} catch (error) {
				onError(error, job.key, "commit");
			}
		}

		schedule();
	};

	const clear = () => {
		for (const entry of entries.values()) {
			entry.job.cancel?.("clear");
		}
		entries.clear();
	};

	const dispose = () => {
		if (disposed) return;
		disposed = true;
		if (rafId !== null) {
			cancelFrame(rafId);
			rafId = null;
		}
		for (const entry of entries.values()) {
			entry.job.cancel?.("dispose");
		}
		entries.clear();
	};

	return {
		enqueue,
		flush,
		clear,
		dispose,
		get size() {
			return entries.size;
		}
	};
}

function defaultRequestFrame(callback: FrameRequestCallback): number {
	if (typeof requestAnimationFrame === "function") return requestAnimationFrame(callback);
	return setTimeout(() => callback(Date.now()), 16) as unknown as number;
}

function defaultCancelFrame(id: number): void {
	if (typeof cancelAnimationFrame === "function") {
		cancelAnimationFrame(id);
		return;
	}
	clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
}
