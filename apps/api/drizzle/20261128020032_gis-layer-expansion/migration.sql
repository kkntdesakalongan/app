INSERT INTO "gis_data" ("code") VALUES
  ('kerentanan-fisik'),
  ('fasilitas-kesehatan'),
  ('fasilitas-umum'),
  ('fasilitas-pendidikan'),
  ('rumah'),
  ('kerentanan-lingkungan'),
  ('kelas-hutan'),
  ('kelas-semak'),
  ('rambu-jalur-evakuasi'),
  ('rambu-peringatan'),
  ('titik-longsor'),
  ('jaringan-jalan'),
  ('masjid'),
  ('batas-administrasi')
ON CONFLICT ("code") DO NOTHING;
