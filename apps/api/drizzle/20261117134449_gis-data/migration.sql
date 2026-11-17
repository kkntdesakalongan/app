CREATE TABLE "gis_data" (
	"code" text PRIMARY KEY,
	"asset_key" text,
	"filename" text,
	"feature_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
