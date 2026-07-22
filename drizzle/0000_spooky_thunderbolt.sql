CREATE TABLE `cocktails` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`english_name` text DEFAULT '' NOT NULL,
	`bar` text DEFAULT 'HOME/BAR 原创' NOT NULL,
	`city` text DEFAULT '深圳' NOT NULL,
	`story` text DEFAULT '由深夜客厅的朋友上传。' NOT NULL,
	`ingredients` text NOT NULL,
	`recipe` text NOT NULL,
	`taste` text DEFAULT '待探索' NOT NULL,
	`strength` text DEFAULT '中等' NOT NULL,
	`minutes` integer DEFAULT 4 NOT NULL,
	`image_key` text,
	`price` integer DEFAULT 58 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`items` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
