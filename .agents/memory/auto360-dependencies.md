---
name: Auto360 dependency setup
description: Replit package install issues encountered while preparing the imported Auto360New repo.
---

The imported Auto360New repository could not install from its lockfile: Replit's package firewall blocked `proxy-addr@2.0.7` for a critical vulnerability, and subsequent npm update attempts failed because the registry reported the locked `@tailwindcss/oxide-wasm32-wasi@4.1.18` package as missing. Do not bypass Replit's package firewall.

**Why:** Repeated npm install/update attempts fail on the same independent package availability issue, so blindly retrying or bypassing the firewall is unsafe.

**How to apply:** Before running the imported app, check whether the upstream repository has refreshed its lockfile/dependencies or the registry issue has been fixed; keep the clone unchanged until a safe install path is available.
