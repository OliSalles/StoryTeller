CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_story_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text,
	`estimated_hours` int,
	`jira_issue_key` varchar(64),
	`azure_devops_work_item_id` int,
	`order_index` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
