import assert from "node:assert/strict";

import { resolveEventDecorIdForPersist } from "../app/api/db";

assert.equal(
	resolveEventDecorIdForPersist({ incomingDecorId: null, currentDecorId: 173 }),
	null,
	"explicit decorId null should clear existing event decor link"
);

assert.equal(
	resolveEventDecorIdForPersist({ incomingDecorId: undefined, currentDecorId: 173 }),
	173,
	"omitted decorId should preserve current event decor link"
);

assert.equal(
	resolveEventDecorIdForPersist({ incomingDecorId: 42, currentDecorId: 173 }),
	42,
	"numeric decorId should override current event decor link"
);

assert.equal(
	resolveEventDecorIdForPersist({ incomingDecorId: undefined, currentDecorId: null }),
	null,
	"omitted decorId with no current link should stay null"
);

console.log("event persist decor null smoke: all checks passed");
