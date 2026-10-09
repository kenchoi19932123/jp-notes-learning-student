# JP Notes Learning Site

This repository contains the static site and encrypted lesson data only. Lesson data is encrypted with AES-256-GCM; the decryption passphrase is never stored here. The published page is public, and the passphrase must be shared separately.

To update the site, rebuild the encrypted package from the private JP Notes project and replace these published files. Do not upload the unencrypted `site_data.json` or original notes.
