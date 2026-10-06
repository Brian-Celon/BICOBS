// mobile sidebar drawer navigation controller and landing page interactivity
document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------
    // 1. Mobile Sidebar Navigation
    // --------------------------------------------------------------------------
    const mobile_toggle = document.getElementById('mobile_nav_toggle');
    const mobile_close = document.getElementById('mobile_nav_close');
    const main_nav = document.getElementById('main_navigation');
    const nav_overlay = document.getElementById('nav_overlay');
    const nav_links = document.querySelectorAll('.nav_link');

    function open_mobile_sidebar() {
        if (main_nav) main_nav.classList.add('open');
        if (nav_overlay) nav_overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close_mobile_sidebar() {
        if (main_nav) main_nav.classList.remove('open');
        if (nav_overlay) nav_overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (mobile_toggle) mobile_toggle.addEventListener('click', open_mobile_sidebar);
    if (mobile_close) mobile_close.addEventListener('click', close_mobile_sidebar);
    if (nav_overlay) nav_overlay.addEventListener('click', close_mobile_sidebar);

    nav_links.forEach(link => {
        link.addEventListener('click', close_mobile_sidebar);
    });

    // --------------------------------------------------------------------------
    // 2. Catalog Category Filtering Tabs
    // --------------------------------------------------------------------------
    const filterTabs = document.querySelectorAll('#catalog_filter_tabs .catalog_tab');

    function applyFilter(category) {
        const cards = document.querySelectorAll('#featured_products_grid .catalog_product_card');
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category') || '';
            if (category === 'all' || cardCat.toLowerCase().includes(category.toLowerCase())) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const targetCategory = tab.getAttribute('data-category') || 'all';
            applyFilter(targetCategory);
        });
    });

    // --------------------------------------------------------------------------
    // 3. Add to Cart Interactivity for Catalog Cards
    // --------------------------------------------------------------------------
    function attachCartListeners(container = document) {
        const cartButtons = container.querySelectorAll('.btn_add_catalog_cart');
        cartButtons.forEach(btn => {
            // Prevent duplicate listeners
            if (btn.dataset.cartBound) return;
            btn.dataset.cartBound = 'true';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id') || 'item_' + Date.now();
                const name = btn.getAttribute('data-name') || 'Bicycle Product';
                const price = parseFloat(btn.getAttribute('data-price')) || 0;
                const imageUrl = btn.getAttribute('data-img') || '/frontend/Pictures/placeholder.png';
                const category = btn.getAttribute('data-cat') || 'Components';

                if (window.BICOBS_Cart && typeof window.BICOBS_Cart.addToCart === 'function') {
                    window.BICOBS_Cart.addToCart({
                        id,
                        _id: id,
                        name,
                        price,
                        imageUrl,
                        category,
                        stockQuantity: 15
                    });
                }

                // Instant visual feedback
                const origHtml = btn.innerHTML;
                btn.classList.add('added');
                btn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Added!</span>
                `;

                setTimeout(() => {
                    btn.classList.remove('added');
                    btn.innerHTML = origHtml;
                }, 1400);
            });
        });
    }

    // Attach listeners to initial static cards
    attachCartListeners();

    // --------------------------------------------------------------------------
    // 4. Load Live Featured Products from Database API (Progressive Enhancement)
    // --------------------------------------------------------------------------
    async function loadFeaturedProducts() {
        const grid = document.getElementById('featured_products_grid');
        if (!grid) return;

        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error('API unavailable');
            const data = await res.json();

            let products = [];
            if (data.status === 'success' && Array.isArray(data.data)) {
                products = data.data;
            } else if (Array.isArray(data.products)) {
                products = data.products;
            }

            if (!products || products.length === 0) {
                // Keep initial static products intact
                return;
            }

            // Filter featured products or top items
            let featured = products.filter(p => p.isFeatured || p.is_featured);
            if (featured.length === 0) {
                featured = products.slice(0, 6);
            } else if (featured.length > 6) {
                featured = featured.slice(0, 6);
            }

            // Map categories to filter slugs
            const mapCategorySlug = (cat = '') => {
                const lower = cat.toLowerCase();
                if (lower.includes('bike') || lower.includes('frame')) return 'bikes';
                if (lower.includes('rim') || lower.includes('tire') || lower.includes('wheel')) return 'rims';
                if (lower.includes('shoe') || lower.includes('pedal')) return 'shoes';
                return 'bikes';
            };

            const badges = [
                { class: 'badge_hot', text: 'HOT' },
                { class: 'badge_popular', text: 'POPULAR' },
                { class: 'badge_bestseller', text: 'BEST SELLER' }
            ];

            // Render updated cards matching redesign structure
            grid.innerHTML = '';
            featured.forEach((p, idx) => {
                const badge = badges[idx % badges.length];
                const catSlug = mapCategorySlug(p.category);
                const categoryClean = (p.category || 'Components').replace(/_/g, ' ').toUpperCase();
                const formattedPrice = (p.price || 0).toLocaleString();
                const desc = p.description || 'Precision engineered bicycle component tailored for maximum durability and speed.';
                const ratingCount = Math.floor(20 + (idx * 9) % 35);

                const card = document.createElement('div');
                card.className = 'catalog_product_card';
                card.setAttribute('data-category', catSlug);
                card.setAttribute('data-id', p._id || p.id);

                card.innerHTML = `
                    <span class="product_status_badge ${badge.class}">${badge.text}</span>
                    <div class="product_thumb_box">
                        <img src="${p.imageUrl || '/frontend/Pictures/logo.png'}" alt="${p.name}" class="product_thumb_img" loading="lazy" onerror="this.onerror=null; this.src='/frontend/Pictures/logo.png';">
                    </div>
                    <div class="product_info_box">
                        <span class="product_cat_label">${categoryClean}</span>
                        <h4 class="product_item_title" title="${p.name}">${p.name}</h4>
                        <p class="product_item_desc">${desc}</p>
                        <div class="product_meta_row">
                            <span class="product_item_price">₱${formattedPrice}</span>
                            <div class="product_rating_box">
                                <span class="rating_stars">★★★★★</span>
                                <span class="rating_count">(${ratingCount})</span>
                            </div>
                        </div>
                        <button type="button" class="btn_add_catalog_cart" data-id="${p._id || p.id}" data-name="${p.name}" data-price="${p.price}" data-img="${p.imageUrl || '/frontend/Pictures/logo.png'}" data-cat="${p.category || 'Components'}">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="9" cy="21" r="1"/>
                                <circle cx="20" cy="21" r="1"/>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                            </svg>
                            <span>Add to Cart</span>
                        </button>
                    </div>
                `;

                grid.appendChild(card);
            });

            // Re-bind click handlers to newly created dynamic cards
            attachCartListeners(grid);

            // Re-apply any currently active filter tab
            const activeTab = document.querySelector('#catalog_filter_tabs .catalog_tab.active');
            if (activeTab) {
                applyFilter(activeTab.getAttribute('data-category') || 'all');
            }
        } catch (err) {
            // Quiet fallback: keep static markup intact so page always displays properly
            console.info('Using static featured products showcase:', err.message);
        }
    }

    loadFeaturedProducts();
});
