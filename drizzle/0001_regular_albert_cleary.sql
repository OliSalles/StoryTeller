CREATE TABLE `acceptance_criteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_story_id` int NOT NULL,
	`criterion` text NOT NULL,
	`order_index` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `acceptance_criteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`original_prompt` text NOT NULL,
	`status` enum('draft','exported','archived') NOT NULL DEFAULT 'draft',
	`jira_issue_key` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `features_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jira_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`jira_url` varchar(512) NOT NULL,
	`email` varchar(320) NOT NULL,
	`api_token` text NOT NULL,
	`default_project` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jira_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `llm_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`provider` varchar(64) NOT NULL DEFAULT 'openai',
	`model` varchar(128) NOT NULL DEFAULT 'gpt-4',
	`api_key` text,
	`temperature` varchar(10) DEFAULT '0.7',
	`max_tokens` int DEFAULT 2000,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llm_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feature_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`story_points` int,
	`jira_issue_key` varchar(64),
	`order_index` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_stories_id` PRIMARY KEY(`id`)
);
