CREATE DATABASE "area-search";
\c "area-search";
CREATE TABLE IF NOT EXISTS "Routes" ("Id" bigint primary key, "Name" text, "LastModificationDate" timestamp, "Points" text);

INSERT INTO "Routes" ("Id", "Name", "Points") VALUES (1, 'Main', '[]');