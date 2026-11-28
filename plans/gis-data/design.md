# GIS data and map layers

Design: Approved
Implementation: Current

## Purpose and scope

The user approved this contract in the conversation and authorized implementation.
Public visitors can select independent overlays on both existing map views.
Authorized users maintain the supported datasets under Settings > Data GIS.

Included are browser conversion, preview, server validation, processed object storage,
seeded dataset records, permissions, public reads, and map layer controls.
Statistics pages, 3D imagery, raw source storage, arbitrary new source types,
framework changes, and dataset creation or deletion are excluded.

## Dataset ownership

One table contains fixed dataset records. A shared application catalog owns names,
accepted source formats, conversion rules, and supplied map layer identities.
The database references dataset codes and stores the active processed asset and
upload metadata. Seeds insert missing records and preserve uploaded data.

| Dataset | Supplied layers |
|---|---|
| bahaya | Bahaya |
| keterpaparan | Penggunaan Lahan, Estimasi Penduduk |
| area-longsor | Area Longsor |
| area-terdampak | Area Terdampak |
| persil-tanah | Persil Tanah |
| jalur-evakuasi | Jalur Evakuasi |
| kerentanan-fisik, fasilitas-kesehatan, fasilitas-umum, fasilitas-pendidikan, rumah | Kerentanan Fisik, Fasilitas Kesehatan, Fasilitas Umum, Fasilitas Pendidikan, Rumah |
| kerentanan-lingkungan, kelas-hutan, kelas-semak | Kerentanan Lingkungan, Kelas Hutan, Kelas Semak |
| rambu-jalur-evakuasi, rambu-peringatan, titik-longsor, jaringan-jalan, masjid, batas-administrasi | Rambu Jalur Evakuasi, Rambu Peringatan, Titik Longsor, Jaringan Jalan, Masjid, Batas Administrasi |

All records start without a file. Settings provides list, detail, and update.
There are no create or delete operations. Existing role permissions govern
view and update access. Public map reads do not require a session.

## Upload workflow

1. Select a supported local source for an existing dataset.
2. Convert geometry to WGS84 in the browser and normalize attributes.
3. Preview the resulting geometry before submission.
4. Submit converted output only. Validate it on the server.
5. Store it in the existing bucket, then update the active dataset reference.

A failed conversion or replacement preserves the existing active file.
Original source files are not uploaded or retained by this workflow.
The stored output retains complete geometry and required attributes.
The browser compresses large upload requests. The API decodes and validates
the data before storage. Public reads can return compressed GeoJSON.
The settings page shows source filename, availability, supplied layers, and update data.

## Source interpretation

The standalone hazard shapefile defines hazard classes.
Keterpaparan uses KELAS for land use and p for estimated population.
Its conflicting hazard classes are not published.
Population values describe estimates allocated to settlement areas, not people points.
Source CRS must be read and transformed explicitly. The supplied GeoPackages use
EPSG:32749 and EPSG:23835. Unsupported files or projections return clear errors.
Unverified affected-land area and percentage attributes must not appear as facts.
Jalur Evakuasi imports both route stages and the temporary and final evacuation
points from four named tables. Its GeoPackage also supplies six independent
datasets. Select the named table for each upload and require the applicable
point, line, or polygon geometry.

Select the named polygon shapefile from the physical or environmental vulnerability
ZIP for each upload. Use KELAS for physical vulnerability. Use SKOR values 1, 2,
and 3 for low, medium, and high environmental vulnerability. Show missing classes
as unavailable. Publish only the normalized class and applicable display name.
The Risiko folder has no source files.

## Map interaction

Add Lapisan inside the existing bottom map filter toolbar.
It opens one flat list of independent layer controls. Any combination is valid.
Unavailable datasets cannot be selected. Closing the control preserves visibility.
Both public map and dashboard use the same map component.
Keep existing pins, EWS controls, toolbar actions, safe areas, and navigation.
Draw markers above polygons and use consistent overlay ordering.
Each visible layer has meaningful styling and legend text.
Jalur Evakuasi shows both route stages and the TES and TEA points together.
Use current Loom controls, app fonts, and light and dark theme tokens.

## Verification

Prove conversion against the supplied source files, including projection alignment
and the selected population field. Verify settings permissions, immutable seeded
identities, empty defaults, and successful replacement without publishing failures.
Use required API, SDK, and web checks. Run focused browser proof for conversion,
preview, persistence, and independent map toggles. Record unavailable prerequisites
and unverified outcomes in delivery notes. Do not add tests for standard CRUD glue.
