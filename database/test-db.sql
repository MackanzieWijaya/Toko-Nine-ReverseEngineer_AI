-- Dedicated disposable database for backend integration tests.
CREATE DATABASE toko_buah_test;
\connect toko_buah_test
\i /docker-entrypoint-initdb.d/001-schema.sql
