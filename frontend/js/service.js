/**
 * BICOBS - Taurus Bike Shop Service & Maintenance Portal
 * JavaScript Interactivity File: service.js
 * Red & White Taurus Theme • Walk-In Catalog & Diagnostic Troubleshooter
 * Strictly follows snake_case conventions for IDs and classes
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // State & Data
  // =========================================================================
  const state = {
    all_services: [
      { id: 'tune_card_assemble', name: 'Bike Assemble (Complete Build)', price_php: 650, category: 'assembly' },
      { id: 'tune_card_overhaul', name: 'Complete Bike Overhaul', price_php: 450, category: 'assembly' },
      { id: 'tune_card_alignment', name: 'Bike Alignment (Wheel & Hanger)', price_php: 100, category: 'alignment' },
      { id: 'sc_chain_install', name: 'Chain Replacement & Sizing', price_php: 50, category: 'drivetrain' },
      { id: 'sc_derailleur_tune', name: 'Derailleur Indexing & Adjustment (Drivetrain)', price_php: 50, category: 'drivetrain' },
      { id: 'sc_brake_bleed', name: 'Hydraulic Brake Bleed (Per Brake)', price_php: 100, category: 'brakes' },
      { id: 'sc_pad_replace', name: 'Brake Pad Replacement & Rotor Clean', price_php: 80, category: 'brakes' },
      { id: 'sc_tube_replace', name: 'Inner Tube Replacement / Flat Fix (Wheels & Tires)', price_php: 50, category: 'wheels' },
      { id: 'sc_tubeless_setup', name: 'Tubeless Tire Setup (Per Wheel)', price_php: 250, category: 'wheels' }
    ],
    diagnostics_db: {
      drivetrain: {
        title: 'Recommended: Derailleur Indexing & Gear Tune',
        desc: 'Skipping or noisy chains are typically caused by cable stretch or derailleur misalignment. Our mechanics will check the hanger, tune cable tension, and index shifting.',
        price_php: 50,
        element_id: 'sc_derailleur_tune'
      },
      brakes: {
        title: 'Recommended: Hydraulic Brake Bleed or Pad Resurfacing',
        desc: 'Spongy levers occur when micro air bubbles enter hydraulic lines. Squealing is caused by contaminated pads or glazed rotors. We will bleed lines and resurface pads.',
        price_php: 100,
        element_id: 'sc_brake_bleed'
      },
      wheels: {
        title: 'Recommended: Inner Tube Replacement & Tire Inspection',
        desc: 'We will inspect the tire tread for embedded glass or thorns, replace the inner tube, check rim tape, and inflate to optimal PSI for your weight.',
        price_php: 50,
        element_id: 'sc_tube_replace'
      },
      truing: {
        title: 'Recommended: Bike Alignment (Wheel Truing & Hanger Straightening)',
        desc: 'A rubbing or wobbling rim weakens spoke tension balance. Our technicians true lateral and radial runout on a stand and straighten your derailleur hanger.',
        price_php: 100,
        element_id: 'tune_card_alignment'
      },
      overhaul: {
        title: 'Recommended: Complete Overhaul (Full Degrease & Bearing Repack)',
        desc: 'Creaks under heavy pedaling load usually stem from dry bottom bracket threads or dirty headset cups. Our Overhaul includes full ultrasonic drivetrain bath and marine grease repacking.',
        price_php: 450,
        element_id: 'tune_card_overhaul'
      },
      assemble: {
        title: 'Recommended: Bike Assemble (Complete Build & Setup)',
        desc: 'Just bought a boxed bike or frame? We will assemble every component, install bearings, route cables, center brakes, and perform a 15-point safety inspection.',
        price_php: 650,
        element_id: 'tune_card_assemble'
      }
    }
  };

  // =========================================================================
  // DOM Elements
  // =========================================================================
  const mobile_nav_toggle = document.getElementById('mobile_nav_toggle');
  const main_navigation = document.getElementById('main_navigation');
  const mobile_nav_close = document.getElementById('mobile_nav_close');
  const nav_overlay = document.getElementById('nav_overlay');

  // Search
  const hero_service_search = document.getElementById('hero_service_search');
  const hero_search_clear_btn = document.getElementById('hero_search_clear_btn');
  const search_live_suggestions = document.getElementById('search_live_suggestions');

  // Diagnostics
  const symptom_cards = document.querySelectorAll('.symptom_card');
  const diagnostic_result_box = document.getElementById('diagnostic_result_box');
  const diag_close = document.getElementById('diag_close');
  const diag_rec_title = document.getElementById('diag_rec_title');
  const diag_rec_desc = document.getElementById('diag_rec_desc');
  const diag_price_est = document.getElementById('diag_price_est');

  // Category Filters
  const filter_tabs = document.querySelectorAll('.filter_tab');
  const service_cards = document.querySelectorAll('.service_card');

  // Accordions
  const details_expand_btns = document.querySelectorAll('.details_expand_btn');

  // =========================================================================
  // Expandable Checklist Drawers (Bike Tunes)
  // =========================================================================
  details_expand_btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target_id = btn.getAttribute('data-target');
      const drawer = document.getElementById(target_id);
      if (drawer) {
        const is_open = drawer.classList.contains('open');
        drawer.classList.toggle('open');
        btn.querySelector('span').textContent = is_open ? 'View Full Checklist' : 'Hide Checklist';
        btn.querySelector('i').className = is_open ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
      }
    });
  });

  // =========================================================================
  // Category Filtering
  // =========================================================================
  filter_tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filter_tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const cat = tab.getAttribute('data-category');
      service_cards.forEach(card => {
        if (cat === 'all' || card.getAttribute('data-category') === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // =========================================================================
  // Diagnostic Wizard (Symptom Solver)
  // =========================================================================
  symptom_cards.forEach(card => {
    card.addEventListener('click', () => {
      symptom_cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const service_key = card.getAttribute('data-service');
      const diag_data = state.diagnostics_db[service_key];

      if (diag_data) {
        diag_rec_title.textContent = diag_data.title;
        diag_rec_desc.textContent = diag_data.desc;
        diag_price_est.textContent = `Walk-In Labor: ₱${diag_data.price_php.toLocaleString()}`;
        diagnostic_result_box.classList.add('visible');

        if (window.innerWidth < 768) {
          diagnostic_result_box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  });

  if (diag_close) {
    diag_close.addEventListener('click', () => {
      diagnostic_result_box.classList.remove('visible');
      symptom_cards.forEach(c => c.classList.remove('active'));
    });
  }

  // =========================================================================
  // Live Search & Autocomplete
  // =========================================================================
  if (hero_service_search && search_live_suggestions) {
    hero_service_search.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();

      if (query.length > 0) {
        hero_search_clear_btn.style.display = 'block';
        const matches = state.all_services.filter(s => s.name.toLowerCase().includes(query));

        if (matches.length > 0) {
          search_live_suggestions.innerHTML = matches.map(m => `
            <div class="suggestion_item" data-id="${m.id}" data-name="${m.name}" data-price="${m.price_php}">
              <span class="suggestion_name"><i class="fa-solid fa-wrench" style="color: #8B1E1E; margin-right: 6px;"></i> ${m.name}</span>
              <span class="suggestion_price">₱${m.price_php}</span>
            </div>
          `).join('');
          search_live_suggestions.style.display = 'block';

          // Suggestion click scrolls to card
          search_live_suggestions.querySelectorAll('.suggestion_item').forEach(item => {
            item.addEventListener('click', () => {
              const target_id = item.getAttribute('data-id');
              const target_el = document.getElementById(target_id);
              search_live_suggestions.style.display = 'none';
              hero_service_search.value = '';
              hero_search_clear_btn.style.display = 'none';

              if (target_el) {
                target_el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target_el.style.borderColor = '#8B1E1E';
                target_el.style.boxShadow = '0 0 0 3px rgba(139, 30, 30, 0.35)';
                setTimeout(() => {
                  target_el.style.boxShadow = '';
                }, 2000);
              }
            });
          });

        } else {
          search_live_suggestions.innerHTML = `
            <div class="suggestion_item" style="color: #64748b; font-style: italic;">
              No exact match found. Walk-ins are always accommodated!
            </div>
          `;
          search_live_suggestions.style.display = 'block';
        }
      } else {
        search_live_suggestions.style.display = 'none';
        hero_search_clear_btn.style.display = 'none';
      }
    });

    hero_search_clear_btn.addEventListener('click', () => {
      hero_service_search.value = '';
      search_live_suggestions.style.display = 'none';
      hero_search_clear_btn.style.display = 'none';
      hero_service_search.focus();
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!hero_service_search.contains(e.target) && !search_live_suggestions.contains(e.target)) {
        search_live_suggestions.style.display = 'none';
      }
    });
  }

  // =========================================================================
  // Mobile Nav Drawer Toggle (Matching Landing Page)
  // =========================================================================
  function open_mobile_nav() {
    if (main_navigation) main_navigation.classList.add('open');
    if (nav_overlay) nav_overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close_mobile_nav() {
    if (main_navigation) main_navigation.classList.remove('open');
    if (nav_overlay) nav_overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (mobile_nav_toggle) mobile_nav_toggle.addEventListener('click', open_mobile_nav);
  if (mobile_nav_close) mobile_nav_close.addEventListener('click', close_mobile_nav);
  if (nav_overlay) nav_overlay.addEventListener('click', close_mobile_nav);

  document.querySelectorAll('.nav_link').forEach(link => {
    link.addEventListener('click', close_mobile_nav);
  });

  // Escape key closes search suggestions
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (search_live_suggestions) search_live_suggestions.style.display = 'none';
    }
  });

});
