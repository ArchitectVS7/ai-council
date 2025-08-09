CREATE TABLE "debate_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"debate_id" integer NOT NULL,
	"persona_name" text NOT NULL,
	"persona_id" integer NOT NULL,
	"round" integer NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "debate_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"debate_id" integer NOT NULL,
	"summary" text NOT NULL,
	"bullet_points" jsonb DEFAULT '[]'::jsonb,
	"key_insights" text,
	"consensus_points" text,
	"outstanding_questions" text,
	"recommendations" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "debates" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"workflow_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"current_step" integer DEFAULT 0,
	"current_round" integer DEFAULT 1,
	"context" text DEFAULT '',
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"state_flow" jsonb NOT NULL,
	"num_rounds" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"task" text NOT NULL,
	"system_prompt" text,
	"parameters" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "debate_messages" ADD CONSTRAINT "debate_messages_debate_id_debates_id_fk" FOREIGN KEY ("debate_id") REFERENCES "public"."debates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debate_summaries" ADD CONSTRAINT "debate_summaries_debate_id_debates_id_fk" FOREIGN KEY ("debate_id") REFERENCES "public"."debates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debates" ADD CONSTRAINT "debates_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;