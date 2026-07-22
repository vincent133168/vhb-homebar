ALTER TABLE `cocktails` ADD `category` text DEFAULT 'homebar' NOT NULL;--> statement-breakpoint
ALTER TABLE `cocktails` ADD `rank` integer;--> statement-breakpoint
ALTER TABLE `cocktails` ADD `source_url` text;