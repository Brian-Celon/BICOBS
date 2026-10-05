---
trigger: always_on
description: Prohibits running git push without explicit user consent
---

# Git Push Constraint

1. **No Unconsented Push**:
   - Never execute `git push` or publish commits to any remote repository without explicit, affirmative consent or direct command from the user in their request.
   - Performing local git actions like `git status`, `git diff`, `git add`, and `git commit` is permitted for local checkpoints, but pushing to `origin` or any remote is strictly forbidden until the user specifies "push" or grants permission.
