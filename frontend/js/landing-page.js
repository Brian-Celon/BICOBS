// mobile sidebar drawer navigation controller
document.addEventListener('DOMContentLoaded', () => {
    const mobile_toggle = document.getElementById('mobile_nav_toggle');
    const mobile_close = document.getElementById('mobile_nav_close');
    const main_nav = document.getElementById('main_navigation');
    const nav_overlay = document.getElementById('nav_overlay');
    const nav_links = document.querySelectorAll('.nav_link');

    // open mobile sidebar drawer
    function open_mobile_sidebar() {
        if (main_nav) main_nav.classList.add('open');
        if (nav_overlay) nav_overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    // close mobile sidebar drawer
    function close_mobile_sidebar() {
        if (main_nav) main_nav.classList.remove('open');
        if (nav_overlay) nav_overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (mobile_toggle) {
        mobile_toggle.addEventListener('click', open_mobile_sidebar);
    }

    if (mobile_close) {
        mobile_close.addEventListener('click', close_mobile_sidebar);
    }

    if (nav_overlay) {
        nav_overlay.addEventListener('click', close_mobile_sidebar);
    }

    nav_links.forEach(link => {
        link.addEventListener('click', close_mobile_sidebar);
    });

    // Load Live Featured Products from Database API
    async function loadFeaturedProducts() {
        const grid = document.getElementById('featured_products_grid');
        if (!grid) return;

        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error('Failed to fetch products');
            const data = await res.json();

            let products = [];
            if (data.status === 'success' && Array.isArray(data.data)) {
                products = data.data;
            } else if (Array.isArray(data.products)) {
                products = data.products;
            }

            if (products.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #64748b; padding: 20px;">No featured products available at this moment.</div>';
                return;
            }

            // Pick featured products or top 8 products across categories
            let featured = products.filter(p => p.isFeatured || p.is_featured);
            if (featured.length === 0) {
                featured = products.slice(0, 8);
            } else if (featured.length > 8) {
                featured = featured.slice(0, 8);
            }

            grid.innerHTML = '';
            featured.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product_card';
                const formattedPrice = (p.price || 0).toLocaleString();
                const categoryClean = (p.category || 'Components').replace(/_/g, ' ');

                card.innerHTML = `
                    <div class="product_card_image_box">
                        <img src="${p.imageUrl || '/frontend/Pictures/logo.png'}" alt="${p.name}" class="product_card_image" loading="lazy" onerror="this.onerror=null; this.src='/frontend/Pictures/logo.png';">
                    </div>
                    <span style="font-size: 10.5px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-top: 4px;">${categoryClean}</span>
                    <h4 class="product_title" title="${p.name}" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.name}</h4>
                    <div class="price_row">
                        <span class="price_current">PHP ${formattedPrice}</span>
                    </div>
                    <button type="button" class="btn_cart btn_cart_red btn_add_landing_cart" style="cursor: pointer;">
                        + Add to cart
                    </button>
                `;

                const btn = card.querySelector('.btn_add_landing_cart');
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (window.BICOBS_Cart) {
                            window.BICOBS_Cart.addToCart({
                                id: p._id || p.id,
                                _id: p._id || p.id,
                                name: p.name,
                                price: p.price,
                                imageUrl: p.imageUrl,
                                category: p.category,
                                stockQuantity: p.stockQuantity ?? p.stock_quantity ?? 10
                            });
                        }
                    });
                }

                grid.appendChild(card);
            });
        } catch (err) {
            console.warn('Could not load featured products from DB:', err);
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #64748b; padding: 20px;">Products loading temporarily unavailable. Please browse our full <a href="/frontend/pages/shop.html" style="color: #8b1e28; font-weight: 600;">Shop Catalog</a>.</div>';
        }
    }

    loadFeaturedProducts();
});

