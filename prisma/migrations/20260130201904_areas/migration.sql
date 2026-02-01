/*
  Warnings:

  - You are about to drop the column `item_id` on the `item_target` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_capsule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "grid" TEXT
);
INSERT INTO "new_capsule" ("grid", "id", "name", "type") SELECT "grid", "id", "name", "type" FROM "capsule";
DROP TABLE "capsule";
ALTER TABLE "new_capsule" RENAME TO "capsule";
CREATE TABLE "new_decor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "style" TEXT,
    "className" TEXT,
    "area" TEXT,
    "item_target_id" INTEGER,
    "based_upon" INTEGER,
    CONSTRAINT "decor_item_target_id_fkey" FOREIGN KEY ("item_target_id") REFERENCES "item_target" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "decor_based_upon_fkey" FOREIGN KEY ("based_upon") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_decor" ("based_upon", "className", "id", "name", "style") SELECT "based_upon", "className", "id", "name", "style" FROM "decor";
DROP TABLE "decor";
ALTER TABLE "new_decor" RENAME TO "decor";
CREATE TABLE "new_item_target" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER,
    "target_id" INTEGER NOT NULL,
    CONSTRAINT "item_target_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_item_target" ("id", "order", "target_id") SELECT "id", "order", "target_id" FROM "item_target";
DROP TABLE "item_target";
ALTER TABLE "new_item_target" RENAME TO "item_target";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
