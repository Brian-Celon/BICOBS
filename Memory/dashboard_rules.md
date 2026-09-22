# Dashboard Project Rules and Conversations

## Protect existing code
Do not delete, overwrite, or rewrite existing code unless explicitly authorized by the user or required for the assigned feature.

## Respect feature branch boundaries
Only work within the assigned feature branch and do not modify another member's feature without permission.

## Inspect before modifying
Read the existing file structure, relevant code, and dependencies before making changes. Do not assume a file is empty or that a feature has not already been implemented.

## Validate every change
Test the affected functionality and check for errors before presenting the work as complete.

## Ask before making high-impact changes
Request approval before changing shared architecture, database schemas, authentication, dependencies, or files outside the assigned feature.

## Read the project instructions first
Before writing or modifying code, the AI must review:
- The shared project rules.
- The member's feature-specific rules.
- The relevant existing source files.
- The API and database requirements that affect the feature.

The AI must follow the shared project rules unless the project owner explicitly changes them.

## Do not assume missing information
When a requirement is unclear, the AI should:
- Ask a clarifying question if the ambiguity could affect the architecture or behavior.
- Identify assumptions when proceeding with a low-risk change.
- Avoid inventing database fields, API endpoints, business rules, or user permissions.

*Example:* "The inventory table's exact schema has not been confirmed. I can propose a structure, but I will not implement it as the official schema until it is approved."

## Explain before making major changes
Before making a substantial change, the AI should briefly describe:
- What it plans to change.
- Which files will be affected.
- Why the change is needed.
- Whether other features may be affected.
- What testing will be performed.

For small, isolated edits, a long explanation is not necessary. The key is to avoid surprising changes.

## Preserve working functionality
Do not fix one feature by breaking another feature. When modifying shared components, API routes, database models, or CSS:
- Check existing dependencies.
- Avoid unnecessary rewrites.
- Preserve backward compatibility where practical.
- Test the functionality that may be affected.
- Notify the user if a breaking change is unavoidable.

## Naming conventions
All HTML IDs, classes, and other attributes must use **snake_case**.

*Example:*
```html
<div id="inventory_container" class="product_card">
  <h2 class="product_title">Product Name</h2>
</div>