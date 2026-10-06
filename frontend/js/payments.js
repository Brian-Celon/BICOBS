/**
 * BICOBS - Universal Payment Methods Manager
 * Taurus Bike Shop Ordering and Billing System
 * Manages customer saved payment methods (Cards, GCash, PayMaya),
 * persistence in localStorage, and integration with Checkout.
 */

const BICOBS_Payments = (() => {
    const STORAGE_KEY = 'tb_user_payment_methods';

    function getUserSuffix() {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const u = JSON.parse(userStr);
                const uid = u._id || u.id || u.email;
                if (uid) return String(uid).trim().toLowerCase();
            }
            const email = localStorage.getItem('tb_user_email');
            if (email) return email.trim().toLowerCase();
        } catch (e) {}
        return '';
    }

    function getStorageKey() {
        const suffix = getUserSuffix();
        return suffix ? `${STORAGE_KEY}_${suffix}` : STORAGE_KEY;
    }

    function getMethods() {
        const key = getStorageKey();
        let raw = localStorage.getItem(key);
        // Fallback to global key if user-specific key is empty
        if (!raw && key !== STORAGE_KEY) {
            raw = localStorage.getItem(STORAGE_KEY);
        }
        try {
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function hasMethod() {
        return getMethods().length > 0;
    }

    function persistMethods(methods) {
        const json = JSON.stringify(methods);
        const key = getStorageKey();
        localStorage.setItem(key, json);
        localStorage.setItem(STORAGE_KEY, json); // Synchronize global fallback
        window.dispatchEvent(new CustomEvent('bicobs_payments_changed', { detail: methods }));
    }

    function saveMethod(methodData) {
        const methods = getMethods();
        const id = methodData.id || `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        let isPrimary = Boolean(methodData.isPrimary);
        // If this is the very first method added, automatically make it primary
        if (methods.length === 0) {
            isPrimary = true;
        }

        if (isPrimary) {
            methods.forEach(m => m.isPrimary = false);
        }

        const newMethod = {
            id,
            provider: methodData.provider || 'card', // 'card' | 'gcash' | 'paymaya'
            accountName: (methodData.accountName || '').trim() || 'Account Holder',
            accountNumber: (methodData.accountNumber || '').trim(),
            rawNumber: (methodData.rawNumber || '').trim(),
            expDate: (methodData.expDate || '').trim(),
            cardType: methodData.cardType || 'VISA',
            isPrimary,
            createdAt: new Date().toISOString()
        };

        methods.push(newMethod);
        persistMethods(methods);
        return newMethod;
    }

    function deleteMethod(id) {
        let methods = getMethods();
        const target = methods.find(m => m.id === id);
        const wasPrimary = target ? target.isPrimary : false;

        methods = methods.filter(m => m.id !== id);

        // If the deleted method was primary, make the first remaining method primary
        if (wasPrimary && methods.length > 0) {
            methods[0].isPrimary = true;
        }

        persistMethods(methods);
        return methods;
    }

    function setPrimary(id) {
        const methods = getMethods();
        methods.forEach(m => {
            m.isPrimary = (m.id === id);
        });
        persistMethods(methods);
        return methods;
    }

    function getPrimaryMethod() {
        const methods = getMethods();
        if (methods.length === 0) return null;
        return methods.find(m => m.isPrimary) || methods[0];
    }

    /**
     * Helper to render payment cards inside payments.html
     */
    function renderDashboardCards(containerEl, emptyNoticeEl) {
        if (!containerEl) return;
        const methods = getMethods();
        containerEl.innerHTML = '';

        if (methods.length === 0) {
            if (emptyNoticeEl) emptyNoticeEl.style.display = 'block';
            return;
        }

        if (emptyNoticeEl) emptyNoticeEl.style.display = 'none';

        methods.forEach(method => {
            const card = document.createElement('article');
            let providerClass = 'card_taurus';
            let iconMarkup = '';
            let providerLabel = '';

            if (method.provider === 'gcash') {
                providerClass = 'card_gcash';
                providerLabel = 'GCash Wallet';
                iconMarkup = '<i class="fas fa-wallet" style="font-size: 20px;"></i>';
            } else if (method.provider === 'paymaya') {
                providerClass = 'card_taurus';
                providerLabel = 'PayMaya Wallet';
                iconMarkup = '<i class="fas fa-mobile-alt" style="font-size: 20px; color: #4ade80;"></i>';
            } else {
                providerClass = 'card_taurus';
                providerLabel = `${method.cardType || 'Credit / Debit'} Card`;
                iconMarkup = `<span class="card_visa_badge">${method.cardType || 'VISA'}</span>`;
            }

            card.className = `payment_card_item ${providerClass}`;
            if (method.provider === 'paymaya') {
                card.style.background = 'linear-gradient(135deg, #065f46 0%, #047857 100%)';
            } else if (method.provider === 'gcash') {
                card.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)';
            } else {
                card.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
            }

            card.innerHTML = `
                <div class="card_top_row">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        ${providerLabel}
                    </span>
                    <div>${iconMarkup}</div>
                </div>
                <div>
                    <div class="card_field_label">${method.provider === 'card' ? 'Card Number' : 'Mobile Account'}</div>
                    <div class="card_number_text">${method.accountNumber}</div>
                </div>
                <div class="card_bottom_row" style="align-items: center;">
                    <div>
                        <div class="card_field_label">Account Holder</div>
                        <strong style="font-size: 13px;">${method.accountName}</strong>
                        ${method.expDate ? `<div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Exp: ${method.expDate}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${method.isPrimary 
                            ? '<span class="card_primary_badge" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Primary</span>' 
                            : `<button type="button" class="btn_make_primary" data-id="${method.id}" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Set Primary</button>`
                        }
                        <button type="button" class="btn_delete_card" data-id="${method.id}" aria-label="Remove payment method" style="background: rgba(220,38,38,0.25); border: 1px solid rgba(239,68,68,0.4); color: #fee2e2; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Remove this method">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;

            containerEl.appendChild(card);
        });

        // Attach action handlers for Delete and Set Primary
        containerEl.querySelectorAll('.btn_delete_card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to remove this payment method?')) {
                    deleteMethod(id);
                    renderDashboardCards(containerEl, emptyNoticeEl);
                }
            });
        });

        containerEl.querySelectorAll('.btn_make_primary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                setPrimary(id);
                renderDashboardCards(containerEl, emptyNoticeEl);
            });
        });
    }

    return {
        getMethods,
        hasMethod,
        saveMethod,
        deleteMethod,
        setPrimary,
        getPrimaryMethod,
        renderDashboardCards
    };
})();

// Export globally
window.BICOBS_Payments = BICOBS_Payments;
