import { shouldPersistEventPayload } from "@/api/content";

function assert(condition: unknown, message: string) {
	if (!condition) throw new Error(message);
}

assert(
	shouldPersistEventPayload("intro", { action: "intro", name: "", ref: "fade-in", duration: null } as any) ===
		true,
	"intro should be persisted even without name"
);

assert(
	shouldPersistEventPayload("outro", {
		action: "outro",
		name: null,
		ref: "fade-out",
		duration: null
	} as any) === true,
	"outro should be persisted even without name"
);

assert(
	shouldPersistEventPayload("custom-1", { action: "custom-1", name: "", delay: undefined } as any) === false,
	"custom event without name or delay should not persist"
);

assert(
	shouldPersistEventPayload("custom-1", { action: "custom-1", name: "Marker", delay: undefined } as any) ===
		true,
	"custom event with name should persist"
);

assert(
	shouldPersistEventPayload("custom-1", { action: "custom-1", name: "", delay: 0.4 } as any) === true,
	"custom event with delay should persist"
);

console.log("content api smoke: all checks passed");
