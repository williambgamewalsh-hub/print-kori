ALTER TABLE `print_jobs` ADD `archivedAt` timestamp;--> statement-breakpoint
CREATE INDEX `print_jobs_shop_archived_idx` ON `print_jobs` (`shopId`,`archivedAt`);