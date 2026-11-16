CREATE TABLE "report_categories" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disaster_reports" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "disaster_reports" ADD CONSTRAINT "disaster_reports_category_id_report_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "report_categories"("id") ON DELETE RESTRICT;