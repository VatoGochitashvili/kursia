-- Remove the certificate feature.
--
-- Certificates were issued automatically at 100% course completion and
-- verified on a public page. The product no longer offers them, so the table
-- and the per-course opt-in flag go with the feature rather than lingering as
-- columns nothing reads.
--
-- This drops issued certificates permanently. On this deployment they were
-- demo records only; there is no separate archive.

DROP TABLE IF EXISTS "Certificate";

ALTER TABLE "Course" DROP COLUMN IF EXISTS "hasCertificate";
