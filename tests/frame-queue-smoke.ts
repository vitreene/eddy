import assert from "node:assert/strict";

import { createFrameQueue } from "../app/player/queue/frame-queue";

type Case = { name: string; run: () => Promise<void> | void };

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const cases: Case[] = [
	{
		name: "dedup keeps last job by key",
		run: async () => {
			const writes: string[] = [];
			const queue = createFrameQueue<{ v: string }, void>({
				requestFrame: (cb) => setTimeout(() => cb(Date.now()), 1) as unknown as number,
				cancelFrame: (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
			});

			queue.enqueue({
				key: "k",
				readBeforeWrite: () => ({ v: "a" }),
				applyWrite: ({ v }) => {
					writes.push(v);
				}
			});
			queue.enqueue({
				key: "k",
				readBeforeWrite: () => ({ v: "b" }),
				applyWrite: ({ v }) => {
					writes.push(v);
				}
			});
			await wait(10);

			assert.deepEqual(writes, ["b"]);
			queue.dispose();
		}
	},
	{
		name: "flush runs ordered phases",
		run: async () => {
			const order: string[] = [];
			const queue = createFrameQueue<{ id: string }, { id: string }>({
				requestFrame: (cb) => setTimeout(() => cb(Date.now()), 50) as unknown as number,
				cancelFrame: (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
			});

			queue.enqueue({
				key: "b",
				priority: 10,
				readBeforeWrite: () => {
					order.push("read-b");
					return { id: "b" };
				},
				applyWrite: () => {
					order.push("write-b");
				},
				readAfterWrite: ({ id }) => {
					order.push(`after-${id}`);
					return { id };
				},
				commit: ({ id }) => {
					order.push(`commit-${id}`);
				}
			});

			queue.enqueue({
				key: "a",
				priority: 0,
				readBeforeWrite: () => {
					order.push("read-a");
					return { id: "a" };
				},
				applyWrite: () => {
					order.push("write-a");
				},
				readAfterWrite: ({ id }) => {
					order.push(`after-${id}`);
					return { id };
				},
				commit: ({ id }) => {
					order.push(`commit-${id}`);
				}
			});

			await queue.flush();
			assert.deepEqual(order, [
				"read-a",
				"read-b",
				"write-a",
				"write-b",
				"after-a",
				"after-b",
				"commit-a",
				"commit-b"
			]);
			queue.dispose();
		}
	},
	{
		name: "errors are isolated per job",
		run: async () => {
			const committed: string[] = [];
			const queue = createFrameQueue<{ id: string }, void>({
				requestFrame: (cb) => setTimeout(() => cb(Date.now()), 50) as unknown as number,
				cancelFrame: (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
			});

			queue.enqueue({
				key: "bad",
				readBeforeWrite: () => ({ id: "bad" }),
				applyWrite: () => {
					throw new Error("boom");
				},
				commit: ({ id }) => {
					committed.push(id);
				}
			});

			queue.enqueue({
				key: "ok",
				readBeforeWrite: () => ({ id: "ok" }),
				applyWrite: () => {},
				commit: ({ id }) => {
					committed.push(id);
				}
			});

			await queue.flush();
			assert.deepEqual(committed, ["ok"]);
			queue.dispose();
		}
	}
];

for (const testCase of cases) {
	await testCase.run();
	console.log(`OK: ${testCase.name}`);
}

console.log("frame queue smoke: all checks passed");
