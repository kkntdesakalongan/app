ALTER TABLE "disaster_reports" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "disaster_reports" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "disaster_reports" ADD CONSTRAINT "disaster_reports_location_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL));