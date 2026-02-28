PRAGMA foreign_keys=OFF;

CREATE TABLE "new_event" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "action" TEXT NOT NULL,
  "ref" TEXT,
  "duration" REAL,
  "delay" REAL,
  "position" TEXT,
  "item_id" INTEGER,
  "decor_id" INTEGER,
  CONSTRAINT "event_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "event_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_event" ("id", "name", "action", "ref", "duration", "delay", "position", "item_id", "decor_id")
SELECT "id", "name", "action", "ref", "duration", "delay", NULL, "item_id", "decor_id" FROM "event";

DROP TABLE "event";
ALTER TABLE "new_event" RENAME TO "event";

CREATE UNIQUE INDEX "event_item_id_name_key" ON "event"("item_id", "name");
CREATE UNIQUE INDEX "event_decor_id_key" ON "event"("decor_id");
CREATE INDEX "event_item_id_action_idx" ON "event"("item_id", "action");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
