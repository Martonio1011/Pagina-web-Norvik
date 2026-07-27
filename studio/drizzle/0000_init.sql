CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`severity` text DEFAULT 'WARNING' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`data` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`resolved_at` integer,
	`dedupe_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_dedupe_idx` ON `alerts` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `alerts_status_idx` ON `alerts` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `alerts_type_idx` ON `alerts` (`type`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`trendsi_product_id` text NOT NULL,
	`section_key` text,
	`score` integer,
	`score_breakdown` text,
	`excluded` integer DEFAULT false NOT NULL,
	`excluded_reason` text,
	`landed_cost_cents` integer,
	`suggested_retail_cents` integer,
	`gross_margin_cents` integer,
	`gross_margin_pct` real,
	`net_margin_cents` integer,
	`net_margin_pct` real,
	`status` text DEFAULT 'NEW' NOT NULL,
	`already_in_store` integer DEFAULT false NOT NULL,
	`discovered_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`source_search` text,
	FOREIGN KEY (`trendsi_product_id`) REFERENCES `trendsi_products`(`product_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidates_trendsi_idx` ON `candidates` (`trendsi_product_id`);--> statement-breakpoint
CREATE INDEX `candidates_status_idx` ON `candidates` (`status`);--> statement-breakpoint
CREATE INDEX `candidates_section_idx` ON `candidates` (`section_key`);--> statement-breakpoint
CREATE INDEX `candidates_score_idx` ON `candidates` (`score`);--> statement-breakpoint
CREATE TABLE `competitor_products` (
	`id` text PRIMARY KEY NOT NULL,
	`store_key` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`image_url` text,
	`price_cents` integer,
	`listing` text NOT NULL,
	`section_key` text,
	`seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`store_key`) REFERENCES `competitor_stores`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competitor_products_unique_idx` ON `competitor_products` (`store_key`,`external_id`,`listing`);--> statement-breakpoint
CREATE INDEX `competitor_products_store_idx` ON `competitor_products` (`store_key`,`seen_at`);--> statement-breakpoint
CREATE TABLE `competitor_stores` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`status` text DEFAULT 'UNTESTED' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_checked_at` integer,
	`last_error` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `decisions_candidate_idx` ON `decisions` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `ingest_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`stage` text NOT NULL,
	`target` text,
	`message` text NOT NULL,
	`detail` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `ingest_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ingest_errors_run_idx` ON `ingest_errors` (`run_id`);--> statement-breakpoint
CREATE TABLE `ingest_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	`duration_ms` integer,
	`items_seen` integer DEFAULT 0 NOT NULL,
	`items_new` integer DEFAULT 0 NOT NULL,
	`items_updated` integer DEFAULT 0 NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`cache_hits` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`params` text,
	`notes` text,
	`dry_run` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ingest_runs_source_idx` ON `ingest_runs` (`source`,`started_at`);--> statement-breakpoint
CREATE TABLE `product_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`shopify_product_id` text NOT NULL,
	`trendsi_product_id` text NOT NULL,
	`method` text NOT NULL,
	`confidence` real NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	`evidence` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`shopify_product_id`) REFERENCES `shopify_products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`trendsi_product_id`) REFERENCES `trendsi_products`(`product_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_matches_pair_idx` ON `product_matches` (`shopify_product_id`,`trendsi_product_id`);--> statement-breakpoint
CREATE INDEX `product_matches_trendsi_idx` ON `product_matches` (`trendsi_product_id`);--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`section_key` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`schedule` text DEFAULT 'MANUAL' NOT NULL,
	`last_run_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_searches_section_idx` ON `saved_searches` (`section_key`);--> statement-breakpoint
CREATE TABLE `search_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`saved_search_id` text NOT NULL,
	`term` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_results` integer,
	FOREIGN KEY (`saved_search_id`) REFERENCES `saved_searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `search_terms_search_idx` ON `search_terms` (`saved_search_id`);--> statement-breakpoint
CREATE TABLE `shopify_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`handle` text NOT NULL,
	`products_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shopify_product_collections` (
	`product_id` text NOT NULL,
	`collection_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `collection_id`),
	FOREIGN KEY (`product_id`) REFERENCES `shopify_products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `shopify_collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shopify_product_collections_collection_idx` ON `shopify_product_collections` (`collection_id`);--> statement-breakpoint
CREATE TABLE `shopify_products` (
	`id` text PRIMARY KEY NOT NULL,
	`legacy_id` text NOT NULL,
	`title` text NOT NULL,
	`handle` text NOT NULL,
	`status` text NOT NULL,
	`vendor` text DEFAULT '' NOT NULL,
	`product_type` text DEFAULT '' NOT NULL,
	`description_html` text,
	`featured_image` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`total_inventory` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`synced_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shopify_products_vendor_idx` ON `shopify_products` (`vendor`);--> statement-breakpoint
CREATE INDEX `shopify_products_status_idx` ON `shopify_products` (`status`);--> statement-breakpoint
CREATE TABLE `shopify_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`variant_sku` text,
	`quantity` integer NOT NULL,
	`revenue_cents` integer NOT NULL,
	`ordered_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shopify_sales_product_idx` ON `shopify_sales` (`product_id`);--> statement-breakpoint
CREATE INDEX `shopify_sales_date_idx` ON `shopify_sales` (`ordered_at`);--> statement-breakpoint
CREATE TABLE `shopify_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`sku` text,
	`title` text NOT NULL,
	`price_cents` integer NOT NULL,
	`compare_at_cents` integer,
	`inventory_quantity` integer DEFAULT 0 NOT NULL,
	`options` text DEFAULT '[]' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `shopify_products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shopify_variants_product_idx` ON `shopify_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `shopify_variants_sku_idx` ON `shopify_variants` (`sku`);--> statement-breakpoint
CREATE TABLE `trendsi_cost_points` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`sku_id` text NOT NULL,
	`dropship_cents` integer NOT NULL,
	`stock` integer NOT NULL,
	`observed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `trendsi_products`(`product_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trendsi_cost_points_product_idx` ON `trendsi_cost_points` (`product_id`,`observed_at`);--> statement-breakpoint
CREATE INDEX `trendsi_cost_points_sku_idx` ON `trendsi_cost_points` (`sku_id`,`observed_at`);--> statement-breakpoint
CREATE TABLE `trendsi_products` (
	`product_id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`brand` text,
	`description` text,
	`msrp_cents` integer,
	`ship_from` text DEFAULT 'UNKNOWN' NOT NULL,
	`shipping_days` text,
	`images` text DEFAULT '[]' NOT NULL,
	`categories` text DEFAULT '[]' NOT NULL,
	`detail_url` text NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trendsi_products_last_seen_idx` ON `trendsi_products` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `trendsi_variants` (
	`sku_id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`color` text,
	`size` text,
	`dropship_cents` integer NOT NULL,
	`wholesale_cents` integer,
	`stock` integer DEFAULT 0 NOT NULL,
	`image_url` text,
	FOREIGN KEY (`product_id`) REFERENCES `trendsi_products`(`product_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trendsi_variants_product_idx` ON `trendsi_variants` (`product_id`);