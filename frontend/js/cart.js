/**
 * BICOBS - Universal Cart & State Management
 * Handles localStorage cart persistence, badge counters, and toast notifications across all pages.
 */

const BICOBS_Cart = (() => {
  const GUEST_STORAGE_KEY = 'bicobs_cart_guest';
  const LEGACY_STORAGE_KEY = 'bicobs_cart';

  // Helper to get active user identifier if logged in
  function getCurrentUserIdentifier() {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');
      if (!token) return null;

      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u) {
          const id = u.id || u._id || u.email;
          if (id) return String(id);
        }
      }
      const email = localStorage.getItem('tb_user_email');
      if (email) return String(email);
    } catch (e) {}
    return null;
  }

  let isSyncing = false;

  // Active storage key: user-specific key when logged in, guest key when logged out
  function getActiveStorageKey() {
    const userIdentifier = getCurrentUserIdentifier();
    if (userIdentifier) {
      return `bicobs_cart_user_${userIdentifier}`;
    }
    return GUEST_STORAGE_KEY;
  }

  // Sync guest cart into user account cart upon login
  function syncCartOnAuth() {
    if (isSyncing) return;
    isSyncing = true;

    try {
      const userIdentifier = getCurrentUserIdentifier();
      if (!userIdentifier) return;

      const userKey = `bicobs_cart_user_${userIdentifier}`;
      const guestData = localStorage.getItem(GUEST_STORAGE_KEY);
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);

      let guestItems = [];
      try {
        if (guestData) guestItems = JSON.parse(guestData);
        else if (legacyData) guestItems = JSON.parse(legacyData);
      } catch (e) {}

      // Always clear guest & legacy keys so they never trigger again
      localStorage.removeItem(GUEST_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);

      if (Array.isArray(guestItems) && guestItems.length > 0) {
        let userCart = [];
        try {
          const existingUserData = localStorage.getItem(userKey);
          if (existingUserData) userCart = JSON.parse(existingUserData);
        } catch (e) {}

        guestItems.forEach(guestItem => {
          const gId = String(guestItem.id || guestItem._id);
          const existingIdx = userCart.findIndex(i => String(i.id || i._id) === gId);
          if (existingIdx > -1) {
            const maxStock = typeof guestItem.stockQuantity === 'number' ? guestItem.stockQuantity : 99;
            userCart[existingIdx].quantity = Math.min(maxStock, (userCart[existingIdx].quantity || 1) + (guestItem.quantity || 1));
          } else {
            userCart.push(guestItem);
          }
        });

        localStorage.setItem(userKey, JSON.stringify(userCart));
      }

      updateBadgeCount();
      window.dispatchEvent(new CustomEvent('bicobs_cart_updated', { detail: { cart: getCart() } }));
    } finally {
      isSyncing = false;
    }
  }

  // Handle logout: clear guest session so signed-in cart does not stay on screen
  function handleLogout() {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    updateBadgeCount();
    window.dispatchEvent(new CustomEvent('bicobs_cart_updated', { detail: { cart: [] } }));
  }

  // Get cart from active storage key and normalize item structure
  function getCart() {
    try {
      const userIdentifier = getCurrentUserIdentifier();
      const activeKey = getActiveStorageKey();

      // One-time legacy migration for guest
      if (!userIdentifier && localStorage.getItem(LEGACY_STORAGE_KEY) && !localStorage.getItem(GUEST_STORAGE_KEY)) {
        localStorage.setItem(GUEST_STORAGE_KEY, localStorage.getItem(LEGACY_STORAGE_KEY));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }

      const data = localStorage.getItem(activeKey);
      const parsed = data ? JSON.parse(data) : [];
      if (Array.isArray(parsed)) {
        return parsed
          .filter(item => item && (item.id || item._id) && item.name)
          .map(item => ({
            id: String(item.id || item._id),
            _id: String(item._id || item.id),
            name: item.name,
            price: parseFloat(item.price) || 0,
            imageUrl: item.imageUrl || item.image || '/frontend/Pictures/placeholder.png',
            category: item.category || 'Components',
            stockQuantity: typeof item.stockQuantity === 'number' ? item.stockQuantity : 99,
            quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
          }));
      }
      return [];
    } catch (e) {
      console.error('Error reading cart from localStorage', e);
      return [];
    }
  }

  // Save cart to active storage key
  function saveCart(cart) {
    try {
      const normalized = cart.map(item => ({
        id: String(item.id || item._id),
        _id: String(item._id || item.id),
        name: item.name,
        price: parseFloat(item.price) || 0,
        imageUrl: item.imageUrl || item.image || '/frontend/Pictures/placeholder.png',
        category: item.category || 'Components',
        stockQuantity: typeof item.stockQuantity === 'number' ? item.stockQuantity : 99,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
      }));

      const activeKey = getActiveStorageKey();
      localStorage.setItem(activeKey, JSON.stringify(normalized));
      updateBadgeCount();
      window.dispatchEvent(new CustomEvent('bicobs_cart_updated', { detail: { cart: normalized } }));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  }

  // Add product to cart
  function addToCart(product, quantity = 1) {
    if (!product || (!product._id && !product.id)) return false;
    const productId = String(product._id || product.id);
    const maxStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 99;

    if (maxStock <= 0) {
      showToast('Sorry, this product is currently out of stock.', 'error');
      return false;
    }

    const cart = getCart();
    const existingIndex = cart.findIndex(item => String(item.id || item._id) === productId);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + quantity > maxStock) {
        showToast(`Cannot add more. Only ${maxStock} in stock.`, 'warning');
        return false;
      }
      cart[existingIndex].quantity += quantity;
    } else {
      if (quantity > maxStock) {
        showToast(`Cannot add more than available stock (${maxStock}).`, 'warning');
        return false;
      }
      cart.push({
        id: productId,
        _id: productId,
        name: product.name,
        price: parseFloat(product.price) || 0,
        imageUrl: product.imageUrl || product.image || '/frontend/Pictures/placeholder.png',
        category: product.category || 'Components',
        stockQuantity: maxStock,
        quantity: quantity
      });
    }

    saveCart(cart);
    showToast(`Added "${product.name}" to cart!`, 'success');
    return true;
  }

  // Update quantity for a specific product
  function updateQuantity(productId, newQty) {
    const pId = String(productId);
    const cart = getCart();
    const itemIndex = cart.findIndex(item => String(item.id || item._id) === pId);

    if (itemIndex === -1) return;

    if (newQty <= 0) {
      removeFromCart(pId);
      return;
    }

    const maxStock = cart[itemIndex].stockQuantity || 99;
    if (newQty > maxStock) {
      showToast(`Maximum stock limit reached (${maxStock})`, 'warning');
      cart[itemIndex].quantity = maxStock;
    } else {
      cart[itemIndex].quantity = newQty;
    }

    saveCart(cart);
  }

  // Remove product from cart
  function removeFromCart(productId) {
    const pId = String(productId);
    let cart = getCart();
    const item = cart.find(i => String(i.id || i._id) === pId);
    cart = cart.filter(i => String(i.id || i._id) !== pId);
    saveCart(cart);
    if (item) {
      showToast(`Removed "${item.name}" from cart.`, 'info');
    }
  }

  // Remove multiple products from cart
  function removeItemsFromCart(productIds) {
    if (!Array.isArray(productIds) || productIds.length === 0) return;
    const idSet = new Set(productIds.map(String));
    let cart = getCart();
    cart = cart.filter(i => !idSet.has(String(i.id || i._id)));
    saveCart(cart);
  }

  // Clear entire cart
  function clearCart() {
    saveCart([]);
  }

  // Calculate total items count
  function getCartCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (parseInt(item.quantity, 10) || 0), 0);
  }

  // Calculate subtotal
  function getCartSubtotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + ((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0)), 0);
  }

  // Update badge in navigation and headers
  function updateBadgeCount() {
    const count = getCartCount();
    const badges = document.querySelectorAll('#cart_badge_counter, .badge_green, .btn_header .badge, [data-cart-badge]');
    badges.forEach(badge => {
      badge.textContent = count;
      if (count > 0) {
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = badge.id === 'cart_badge_counter' ? 'none' : 'none';
      }
    });

    // Also update header cart link if it has a count container
    const headerCartBtns = document.querySelectorAll('.btn_header[href*="cart.html"], .header_actions_group a[href*="cart.html"], .btn_header[href*="mycart.html"], .header_actions_group a[href*="mycart.html"]');
    headerCartBtns.forEach(btn => {
      let pill = btn.querySelector('.cart_count_pill');
      if (!pill) {
        pill = document.createElement('span');
        pill.className = 'cart_count_pill badge_green';
        pill.style.marginLeft = '4px';
        btn.appendChild(pill);
      }
      pill.textContent = count;
      pill.style.display = count > 0 ? 'inline-block' : 'none';
    });

    // Also update dashboard overview stat card
    const overviewCartCount = document.getElementById('overview_cart_count');
    if (overviewCartCount) {
      overviewCartCount.textContent = count;
    }
  }

  // Toast notification UI
  function showToast(message, type = 'success') {
    let toast = document.getElementById('bicobs_global_toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bicobs_global_toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #1e293b;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 25px rgba(0,0,0,0.25);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    let bg = '#1e293b';
    let icon = '✓';
    if (type === 'error') {
      bg = '#dc2626';
      icon = '✕';
    } else if (type === 'warning') {
      bg = '#d97706';
      icon = '⚠';
    } else if (type === 'info') {
      bg = '#2563eb';
      icon = 'ℹ';
    } else {
      bg = '#16a34a';
      icon = '✓';
    }

    toast.style.backgroundColor = bg;
    toast.innerHTML = `<span style="font-weight: bold;">${icon}</span> <span>${message}</span>`;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 3000);
  }

  // Auto initialize on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        updateBadgeCount();
        const userIdentifier = getCurrentUserIdentifier();
        if (userIdentifier && (localStorage.getItem(GUEST_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY))) {
          syncCartOnAuth();
        }
      });
    } else {
      updateBadgeCount();
      const userIdentifier = getCurrentUserIdentifier();
      if (userIdentifier && (localStorage.getItem(GUEST_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY))) {
        syncCartOnAuth();
      }
    }

    // Listen for auth state changes
    window.addEventListener('bicobs_auth_changed', (e) => {
      if (e && e.detail) {
        syncCartOnAuth();
      } else {
        handleLogout();
      }
    });

    // Listen for cross-tab or storage changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'token' || e.key === 'bicobs_token' || e.key === 'user') {
        const userIdentifier = getCurrentUserIdentifier();
        if (userIdentifier) {
          syncCartOnAuth();
        } else {
          handleLogout();
        }
      }
    });
  }

  return {
    getCart,
    saveCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    removeItemsFromCart,
    clearCart,
    getCartCount,
    getCartSubtotal,
    updateBadgeCount,
    showToast,
    syncCartOnAuth,
    handleLogout
  };
})();

// Export for global browser window
if (typeof window !== 'undefined') {
  window.BICOBS_Cart = BICOBS_Cart;
}
