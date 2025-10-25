---
description: Push to GitHub
---
1. From the repository root `Study_Sharper_Complete/`, verify working tree status:
   ```bash
   git status
   ```
2. Run the backend test suite (adjust command if a virtualenv is active):
   ```bash
   cd Study_Sharper_Backend
   pytest
   cd ..
   ```
3. Stage the desired changes:
   ```bash
   git add <files>
   ```
4. Review staged diff to confirm accuracy:
   ```bash
   git diff --cached
   ```
5. Commit with a concise, descriptive message:
   ```bash
   git commit -m "<type>: <summary>"
   ```
6. Push to GitHub (default branch `main` unless otherwise specified):
   ```bash
   git push origin <branch>
   ```
7. Monitor CI/CD (Supabase/Render/Vercel) dashboards and logs for deployment status, resolving any failures before marking the deploy complete.
