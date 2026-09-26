Front-end work that won’t require backend changes later
- Prevent HTML injection by rendering user-entered text safely in payment cards and support tickets.
- Fix the password form UI: remove the prefilled password, add show/hide controls, and check that the new password and confirmation match. Leave actual password changes to the backend.
- Build the products page with responsive product cards, images, details, filters, and sorting, using placeholder data that can later be replaced with API data.
- Add client-side search, filters, and sorting for currently displayed products, orders, and other page content.
- Make “Add to Cart” buttons work in the UI and show cart count and totals. Keep the cart logic independent of the current sample data.
- Improve empty, loading, and error states for products, cart, orders, payments, and support pages.
- Fix placeholder links and buttons with appropriate navigation or clear disabled states.
- Improve modal accessibility: keyboard focus, Escape handling, focus return, and clear labels.
- Make all pages and modals responsive across phone, tablet, laptop, and large desktop widths; avoid unwanted horizontal overflow.
- Improve form usability: validation messages, input types, labels, and clear success/error feedback.
- Review visual consistency and accessibility: heading hierarchy, contrast, keyboard focus styles, and descriptive button labels.
- Verify static asset paths and provide graceful fallbacks for missing images.
Use mock data and keep page rendering separate from data access so backend integration can replace the data source without requiring a UI rewrite.
