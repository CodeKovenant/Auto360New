---
name: Auto360 admin import duplicates
description: User's standing rule for duplicate checks on admin uploads in Auto360.
---

Before every admin data upload, check the submitted rows against existing database records. Ask for confirmation when duplicates are found, but never insert rows that already exist; import only the new rows if the admin confirms.

**Why:** the user explicitly clarified that admin uploads must check existing data first and must not add records that are already present.

**How to apply:** Keep this safeguard on every admin import path in Auto360, with duplicate checks enforced on the server before writes and repeated at the time of import.
