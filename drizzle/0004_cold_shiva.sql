CREATE TABLE `execution_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`feature_id` int,
	`status` enum('started','processing','success','error') NOT NULL,
	`prompt_length` int NOT NULL,
	`chunks_count` int DEFAULT 0,
	`total_stories` int DEFAULT 0,
	`ai_response` text,
	`error_message` text,
	`start_time` timestamp NOT NULL DEFAULT (now()),
	`end_time` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `execution_logs_id` PRIMARY KEY(`id`)
);
