/*
  Warnings:

  - The primary key for the `event` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `event` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "duration" INTEGER,
    "element_id" INTEGER,
    "capsule_id" INTEGER,
    CONSTRAINT "event_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "capsule_element" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_event" ("action", "duration", "element_id", "name", "ref") SELECT "action", "duration", "element_id", "name", "ref" FROM "event";
DROP TABLE "event";
ALTER TABLE "new_event" RENAME TO "event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
