import assert from "node:assert/strict";

import { gridClassNameToCssDefinition } from "../app/lib/utils";

const css = gridClassNameToCssDefinition("ed-grid-w3-h2") || "";
assert.equal(css.includes("isolation:isolate"), true, "grid class definition should enforce isolation");

console.log("grid definition isolation smoke: all checks passed");
