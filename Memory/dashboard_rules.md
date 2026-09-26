# Dashboard Project Rules

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


### Responsive Design & Screen Maximization

**Screen Size Compatibility:** All system pages, dashboards, components, and features must fully utilize the available screen space and be responsive across all screen sizes, including desktop monitors, laptops, tablets, and mobile devices. The layout must adapt dynamically to different screen resolutions and aspect ratios without breaking, overflowing, or hiding essential content.

* Use responsive layouts that adjust automatically based on the available viewport width and height.
* Ensure the system uses the available screen space efficiently without unnecessary fixed-width containers or excessive empty space.
* Support common screen resolutions, including small laptop screens, large desktop monitors, tablets, and mobile devices.
* Prevent horizontal scrolling unless it is intentionally required for specific content, such as data tables.
* Ensure navigation bars, sidebars, cards, forms, tables, and other UI components adapt appropriately to different screen sizes.
* Use CSS media queries, flexible layouts, and responsive sizing where necessary.
* Do not design features exclusively for a single screen resolution or device.
* Preserve usability, readability, and accessibility across supported screen sizes.
* Test every developed feature at different viewport widths before considering it complete.
* Maintain consistency with the existing system design and do not modify unrelated features or layouts without authorization.

**Screen Maximization & Layout Integrity:**

* The system must maximize the available viewport space when appropriate, ensuring that pages utilize the full available width and height without unnecessary empty areas.
* **Do not force the interface to stretch beyond its usable dimensions or use fixed full-screen sizes that cause content to overflow.** The system must maximize the available screen space on large monitors while allowing content to reflow, resize, or stack naturally on smaller screens.
* Avoid excessive use of fixed widths, fixed heights, and rigid positioning that can cause layout breaks on different screen sizes.
* Use responsive CSS units, flexible containers, and appropriate maximum and minimum dimensions to maintain a stable layout.
* Ensure that maximizing the interface does not cause essential content, buttons, forms, navigation, or information to become inaccessible or hidden.
* Every feature must adapt to the available viewport rather than relying on a specific screen resolution.

**Implementation Requirement:** Every AI developer must ensure that their assigned feature is fully responsive and integrates seamlessly with the overall BICOBS system. The feature must not cause layout breaks, overflow issues, or inconsistent sizing when viewed on different devices or screen resolutions. The AI must test the feature at multiple viewport sizes before considering it complete and must not modify unrelated features or layouts without authorization.

### Semantic HTML & Structured Markup

**Semantic Tag Usage:** All AI developers must use appropriate semantic HTML5 elements when developing system pages, components, and features. HTML elements must accurately represent the meaning and purpose of their content instead of relying solely on generic `<div>` and `<span>` elements. The goal is to maintain a well-structured, accessible, readable, and maintainable codebase across the entire TaurOS system.

* Use semantic HTML elements whenever applicable, such as `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, and `<footer>`.
* Use appropriate heading elements (`<h1>` through `<h6>`) to establish a logical content hierarchy. Do not use headings solely for visual styling.
* Use `<button>` for actions and `<a>` for navigation links. Do not use generic `<div>` or `<span>` elements as substitutes for interactive controls.
* Use semantic form elements, including `<form>`, `<label>`, `<input>`, `<select>`, `<textarea>`, and `<button>`, where appropriate.
* Use lists (`<ul>`, `<ol>`, and `<li>`) for groups of related items that represent lists, such as navigation menus or product categories.
* Use `<table>`, `<thead>`, `<tbody>`, `<th>`, and `<td>` appropriately when displaying structured tabular data, such as inventory records, sales reports, and transaction details.
* Use `<section>` and `<article>` only when they represent meaningful content groupings. Do not add semantic elements unnecessarily.
* Maintain proper HTML nesting and ensure that each element is used according to its intended purpose.
* Avoid using generic containers when a suitable semantic HTML element exists.
* Ensure semantic elements do not interfere with the existing design, responsiveness, or functionality of the system.
* Use ARIA attributes only when necessary to supplement native HTML semantics. Do not use ARIA as a replacement for appropriate native HTML elements.
* Maintain consistency in semantic markup across all feature branches and integrate new features without unnecessarily changing unrelated components.

**Implementation Requirement:** Every AI developer must prioritize semantic HTML when creating or modifying frontend features. Before considering a feature complete, the AI must verify that HTML elements accurately represent their content and functionality, interactive components are accessible, and the markup does not introduce unnecessary structural or accessibility issues.

###  Design Consistency & Layout Preservation

**System-Wide Design Consistency:** All AI developers must preserve the established design, layout, styling, and user interface patterns of the TaurOS system when developing or modifying features. Every new feature must integrate seamlessly with the existing design system without introducing unnecessary visual changes, inconsistent layouts, or conflicting UI patterns.

**Navigation & Shared Layout Preservation:**

* The shared layout of the system, including the top navigation bar, sidebar, header, footer, and other established UI elements, must remain consistent across all pages and navigation routes.
* When a user clicks a navigation link, the shared layout and design must remain unchanged. **Only the page content or feature-specific information should change**, unless a documented design requirement explicitly states otherwise.
* The active navigation link must be highlighted consistently across all pages using the established active-state styling, including the same colors, background, text styling, icons, borders, and other visual indicators.
* The active navigation state must accurately reflect the current page or route. Only the relevant navigation item should appear active unless the established design intentionally supports multiple active states.
* Navigation links must maintain consistent spacing, alignment, sizing, hover effects, active effects, and interaction behavior throughout the system.
* Do not create a separate navigation design, header style, sidebar layout, or active-link appearance for an individual feature without authorization.
* Reuse existing shared components, styles, and layout structures whenever they are available instead of creating duplicate implementations.
* New pages and features must follow the existing typography, color palette, spacing, border radius, shadows, icons, button styles, and overall visual hierarchy.
* Do not change the established design of unrelated pages or shared components while developing a specific feature.
* If an existing shared component requires a change, evaluate its impact on all pages that use it and ensure that the change does not unintentionally break design consistency.
* If a new design or layout is explicitly required, it must be discussed and approved before implementation.

**Implementation Requirement:** Every AI developer must inspect and follow the existing TaurOS design before creating or modifying a feature. The AI must preserve shared layout structures and visual patterns, reuse existing components where possible, and verify that navigation between pages maintains a consistent appearance. A feature is not considered complete if it introduces unauthorized design changes, inconsistent navigation states, or unnecessary variations in the system's established interface.
