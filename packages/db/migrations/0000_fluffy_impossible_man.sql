CREATE TABLE `phrases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notion_page_id` text NOT NULL,
	`word` text NOT NULL,
	`meaning` text,
	`part_of_speech` text,
	`example` text,
	`example_translation` text,
	`notion_created_at` text,
	`synced_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phrases_notion_page_id_unique` ON `phrases` (`notion_page_id`);--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`synced_at` text NOT NULL
);
