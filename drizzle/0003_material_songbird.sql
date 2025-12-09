CREATE TABLE `azure_devops_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`organization` varchar(256) NOT NULL,
	`project` varchar(256) NOT NULL,
	`pat` text NOT NULL,
	`default_area` varchar(256),
	`default_iteration` varchar(256),
	`default_state` varchar(128),
	`default_board` varchar(256),
	`default_column` varchar(128),
	`default_swimlane` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `azure_devops_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `features` ADD `export_target` enum('jira','azure_devops');--> statement-breakpoint
ALTER TABLE `features` ADD `azure_devops_work_item_id` int;--> statement-breakpoint
ALTER TABLE `user_stories` ADD `azure_devops_work_item_id` int;