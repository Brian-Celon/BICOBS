/**
 * BICOBS - Universal Cart & State Management
 * Handles localStorage cart persistence, badge counters, and toast notifications across all pages.
 */

const BICOBS_Cart = (() => {
  const STORAGE_KEY = 'bicobs_cart';

  // Get cart from localStorage
  function getCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading cart from localStorage', e);
      return [];
    }
  }

  // Save cart to localStorage
  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      updateBadgeCount();
      window.dispatchEvent(new CustomEvent('bicobs_cart_updated', { detail: { cart } }));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  }

  // Add product to cart
  function addToCart(product, quantity = 1) {
    if (!product || !product._id && !product.id) return false;
    const productId = product._id || product.id;
    const maxStock = typeof product.stockQuantity === 'number' ? product.stockQuantity : 999;

    if (maxStock <= 0) {
      showToast('Sorry, this product is currently out of stock.', 'error');
      return false;
    }

    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === productId);

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
        name: product.name,
        price: parseFloat(product.price) || 0,
        imageUrl: product.imageUrl || '/frontend/Pictures/placeholder.png',
        category: product.category || '',
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
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex === -1) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const maxStock = cart[itemIndex].stockQuantity || 999;
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
    let cart = getCart();
    const item = cart.find(i => i.id === productId);
    cart = cart.filter(i => i.id !== productId);
    saveCart(cart);
    if (item) {
      showToast(`Removed "${item.name}" from cart.`, 'info');
    }
  }

  // Clear entire cart
  function clearCart() {
    saveCart([]);
  }

  // Calculate total items count
  function getCartCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.quantity || 0), 0);
  }

  // Calculate subtotal
  function getCartSubtotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);
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
        badge.style.display = badge.id === 'cart_badge_counter' ? 'none' : 'inline-flex';
      }
    });

    // Also update header cart link if it has a count container
    const headerCartBtn = document.querySelector('.btn_header[href*="mycart.html"]');
    if (headerCartBtn && !headerCartBtn.querySelector('.cart_count_pill')) {
      const pill = document.createElement('span');
      pill.className = 'cart_count_pill badge_green';
      pill.textContent = count;
      if (count === 0) pill.style.display = 'none';
      headerCartBtn.appendChild(pill);
    } else if (headerCartBtn) {
      const pill = headerCartBtn.querySelector('.cart_count_pill');
      if (pill) {
        pill.textContent = count;
        pill.style.display = count > 0 ? 'inline-block' : 'none';
      }
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
        z-index: 9999;
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
      document.addEventListener('DOMContentLoaded', updateBadgeCount);
    } else {
      updateBadgeCount();
    }
  }

  return {
    getCart,
    saveCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartCount,
    getCartSubtotal,
    updateBadgeCount,
    showToast
  };
})();

// Export for global browser window
if (typeof window !== 'undefined') {
  window.BICOBS_Cart = BICOBS_Cart;
}
