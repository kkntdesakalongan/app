# Kategori Laporan

Design: Approved
Implementation: Current

## 1. Purpose and scope

Add a report category master and let public users select a category when they submit a disaster report.

Include standard administrator list, detail, create, update, and delete pages, navigation, operation permissions, and a database migration. Use the label `Kategori Laporan` under the Master navigation group at `/master/report-categories`.

## 2. Data and access

A category has one business field: required `name`, with whitespace removed from both ends and a maximum length of 255 characters. Standard metadata consists of a generated ID, created time, and updated time. The server owns metadata. Do not add other editable fields or initial category records.

Use the existing administrator permission model for category management. Public users can read category IDs and names for selection. Public access does not permit category changes or expose saved reports.

## 3. Report integration

Store an optional category reference on each report. Existing reports retain no category. New submissions can omit the category. If supplied, the reference must identify an existing category. Prevent deletion of a category that a report uses. A category name change applies wherever that category is shown.

Place the category selector immediately below `Keterangan` and above the image field in the public intake form. Use a shared selection input and the public category source. Label the field `Kategori Laporan`.

Show the category name on administrator report detail and allow administrators to change or clear the category in the existing report edit form. Keep other report behavior under the approved [public disaster report design](../public-disaster-reports/design.md).

## 4. Workflows

1. An authorized administrator opens Kategori Laporan and creates a category with a name.
2. A public user opens the intake form and can select that category below Keterangan.
3. Submission saves the category reference with the report. The success flow stays the same.
4. An authorized administrator can read or change the category on the report.
5. Deletion of a category in use fails and preserves the category and its reports. The administrator must clear or change those report references before deletion.

## 5. Verification

Use normal API, SDK, and web type checks, scoped lint, web build, and source review for standard CRUD and field wiring. Select database proof for public category reads, saved report references, rejection of an unknown category, and protection against deleting a category in use. Apply the migration and authorization seed to the configured development database after checking its target and migration history.
