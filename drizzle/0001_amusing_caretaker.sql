CREATE TABLE `agent_pairing_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_pairing_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `paper_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `paper_options_shop_name_unique` UNIQUE(`shopId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `print_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`deviceName` varchar(160) NOT NULL,
	`selectedPrinter` varchar(255) NOT NULL,
	`agentSecretHash` varchar(128) NOT NULL,
	`status` enum('Online','Offline','Paused') NOT NULL DEFAULT 'Offline',
	`lastHeartbeatAt` timestamp,
	`pairedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `print_agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `print_job_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`status` enum('Submitted','Pending','Approved','Printing','Completed','Failed','Cancelled') NOT NULL,
	`actorType` enum('Customer','Shop','Agent','System') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `print_job_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `print_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`publicStatusToken` varchar(72) NOT NULL,
	`customerReference` varchar(160),
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(768) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`pageCount` int NOT NULL DEFAULT 1,
	`colorMode` enum('Color','Grayscale') NOT NULL,
	`copies` int NOT NULL,
	`paperOptionId` int NOT NULL,
	`paperName` varchar(80) NOT NULL,
	`sides` enum('Single-sided','Double-sided') NOT NULL,
	`priceCents` int NOT NULL,
	`status` enum('Submitted','Pending','Approved','Printing','Completed','Failed','Cancelled') NOT NULL DEFAULT 'Submitted',
	`approvedAt` timestamp,
	`claimedByAgentId` int,
	`claimedAt` timestamp,
	`lastAgentHeartbeatAt` timestamp,
	`startedPrintingAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`failedAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `print_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `print_jobs_public_token_unique` UNIQUE(`publicStatusToken`)
);
--> statement-breakpoint
CREATE TABLE `print_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`paperOptionId` int NOT NULL,
	`colorMode` enum('Color','Grayscale') NOT NULL,
	`sides` enum('Single-sided','Double-sided') NOT NULL,
	`perPageCents` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `print_rates_id` PRIMARY KEY(`id`),
	CONSTRAINT `print_rates_unique_option` UNIQUE(`shopId`,`paperOptionId`,`colorMode`,`sides`)
);
--> statement-breakpoint
CREATE TABLE `shop_staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`userId` int,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`accessRole` enum('Owner','Staff') NOT NULL DEFAULT 'Staff',
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	CONSTRAINT `shop_staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_staff_shop_email_unique` UNIQUE(`shopId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`slug` varchar(96) NOT NULL,
	`name` varchar(160) NOT NULL,
	`logoKey` varchar(512),
	`logoUrl` varchar(768),
	`currency` varchar(3) NOT NULL DEFAULT 'BDT',
	`baseFeeCents` int NOT NULL DEFAULT 0,
	`staleJobTimeoutMinutes` int NOT NULL DEFAULT 15,
	`setupCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shops_id` PRIMARY KEY(`id`),
	CONSTRAINT `shops_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `agent_pairing_codes_shop_idx` ON `agent_pairing_codes` (`shopId`);--> statement-breakpoint
CREATE INDEX `agent_pairing_codes_expiry_idx` ON `agent_pairing_codes` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `paper_options_shop_idx` ON `paper_options` (`shopId`);--> statement-breakpoint
CREATE INDEX `print_agents_shop_idx` ON `print_agents` (`shopId`);--> statement-breakpoint
CREATE INDEX `print_job_events_job_idx` ON `print_job_events` (`jobId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `print_jobs_shop_status_idx` ON `print_jobs` (`shopId`,`status`);--> statement-breakpoint
CREATE INDEX `print_jobs_agent_status_idx` ON `print_jobs` (`claimedByAgentId`,`status`);--> statement-breakpoint
CREATE INDEX `print_jobs_printing_heartbeat_idx` ON `print_jobs` (`status`,`lastAgentHeartbeatAt`);--> statement-breakpoint
CREATE INDEX `print_rates_shop_idx` ON `print_rates` (`shopId`);--> statement-breakpoint
CREATE INDEX `shop_staff_shop_idx` ON `shop_staff` (`shopId`);--> statement-breakpoint
CREATE INDEX `shops_owner_idx` ON `shops` (`ownerId`);