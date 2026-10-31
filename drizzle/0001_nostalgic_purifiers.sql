CREATE TABLE "sprint_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sprint_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"estimate_points" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_comments" DROP CONSTRAINT "issue_comments_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_assignee_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_reporter_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "rank" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "parent_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "original_estimate_minutes" integer;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "remaining_estimate_minutes" integer;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "compact_density" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sprint_snapshots" ADD CONSTRAINT "sprint_snapshots_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sprint_snapshots_sprint_id_idx" ON "sprint_snapshots" USING btree ("sprint_id");--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_events" ADD CONSTRAINT "issue_events_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_workspace_id_created_at_idx" ON "activity_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "issue_comments_issue_id_created_at_idx" ON "issue_comments" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "issue_events_issue_id_created_at_idx" ON "issue_events" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "issue_events_project_id_created_at_idx" ON "issue_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_id_number_idx" ON "issues" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "issues_workspace_id_updated_at_idx" ON "issues" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_id_read_at_idx" ON "notifications" USING btree ("recipient_id","read_at");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sprints_one_active_per_project_idx" ON "sprints" USING btree ("project_id") WHERE state = 'active';--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_id_email_idx" ON "workspace_invitations" USING btree ("workspace_id","email_normalized");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");