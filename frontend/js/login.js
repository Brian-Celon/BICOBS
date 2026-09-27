/**
 * BICOBS - Auth Panel Slider & Official Philippine PSGC Address API Integration
 * Complies with snake_case naming conventions and responsive rules
 */

document.addEventListener('DOMContentLoaded', () => {
  const auth_container = document.getElementById('auth_container');
  const ghost_sign_up_btn = document.getElementById('ghost_sign_up_btn');
  const ghost_sign_in_btn = document.getElementById('ghost_sign_in_btn');

  const mobile_switch_to_sign_up = document.getElementById('mobile_switch_to_sign_up');
  const mobile_switch_to_sign_in = document.getElementById('mobile_switch_to_sign_in');

  const sign_in_form = document.getElementById('sign_in_form');
  const sign_up_form = document.getElementById('sign_up_form');

  const google_sign_in_btn = document.getElementById('google_sign_in_btn');
  const google_sign_up_btn = document.getElementById('google_sign_up_btn');

  // Address Dropdown Elements
  const sign_up_island_group = document.getElementById('sign_up_island_group');
  const sign_up_province = document.getElementById('sign_up_province');
  const sign_up_city = document.getElementById('sign_up_city');
  const sign_up_barangay = document.getElementById('sign_up_barangay');
  const sign_up_postal_code = document.getElementById('sign_up_postal_code');

  // Activate Sign Up panel (Slides overlay to left, reveals Sign Up form)
  function switchToSignUp() {
    if (auth_container) {
      auth_container.classList.add('right_panel_active');
    }
  }

  // Activate Sign In panel (Slides overlay to right, reveals Sign In form)
  function switchToSignIn() {
    if (auth_container) {
      auth_container.classList.remove('right_panel_active');
    }
  }

  // Desktop ghost button triggers
  if (ghost_sign_up_btn) {
    ghost_sign_up_btn.addEventListener('click', switchToSignUp);
  }

  if (ghost_sign_in_btn) {
    ghost_sign_in_btn.addEventListener('click', switchToSignIn);
  }

  // Mobile inline switch triggers
  if (mobile_switch_to_sign_up) {
    mobile_switch_to_sign_up.addEventListener('click', switchToSignUp);
  }

  if (mobile_switch_to_sign_in) {
    mobile_switch_to_sign_in.addEventListener('click', switchToSignIn);
  }

  // Google OAuth button handlers
  if (google_sign_in_btn) {
    google_sign_in_btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Google Sign In clicked');
    });
  }

  if (google_sign_up_btn) {
    google_sign_up_btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Google Sign Up clicked');
    });
  }

  // ==========================================================================
  // Philippine Standard Geographic Code (PSGC) Complete Address API Integration
  // Covers all Provinces, Cities/Municipalities, and Barangays in Luzon, Visayas, Mindanao
  // ==========================================================================

  const api_base_url = 'https://psgc.gitlab.io/api';

  // In-memory cache to ensure instant loading once fetched
  const cache_provinces = {};
  const cache_cities = {};
  const cache_barangays = {};

  // Standard ZIP / Postal Code map for common delivery locations
  const postal_code_lookup = {
    Marilao: '3019',
    Meycauayan: '3020',
    Bocaue: '3018',
    'Santa Maria': '3022',
    'San Jose del Monte': '3023',
    Malolos: '3000',
    Guiguinto: '3015',
    Balagtas: '3016',
    Plaridel: '3004',
    Baliuag: '3006',
    Calumpit: '3003',
    Hagonoy: '3002',
    Pulilan: '3005',
    Manila: '1000',
    'Quezon City': '1100',
    Taguig: '1630',
    Makati: '1200',
    Pasig: '1600',
    Caloocan: '1400',
    Mandaluyong: '1550',
    Pasay: '1300',
    Parañaque: '1700',
    LasPiñas: '1740',
    Muntinlupa: '1770',
    Valenzuela: '1440',
    Malabon: '1470',
    Navotas: '1485',
    'San Juan': '1500',
    Pateros: '1620',
    'San Fernando': '2000',
    Angeles: '2009',
    Bacoor: '4102',
    Imus: '4103',
    Dasmariñas: '4114',
    'Santa Rosa': '4026',
    Calamba: '4027',
    'Cebu City': '6000',
    Mandaue: '6014',
    'Lapu-Lapu': '6015',
    'Iloilo City': '5000',
    Bacolod: '6100',
    'Davao City': '8000',
    'Cagayan de Oro': '9000',
    'General Santos': '9500',
    Zamboanga: '7000'
  };

  // Offline Fallback Dataset (in case user has no internet access)
  const offline_fallback_data = {
    Luzon: {
      provinces: [
        { code: '031400000', name: 'Bulacan' },
        { code: '130000000', name: 'Metro Manila (NCR)' },
        { code: '035400000', name: 'Pampanga' },
        { code: '042100000', name: 'Cavite' },
        { code: '043400000', name: 'Laguna' },
        { code: '041000000', name: 'Batangas' },
        { code: '045800000', name: 'Rizal' }
      ]
    },
    Visayas: {
      provinces: [
        { code: '072200000', name: 'Cebu' },
        { code: '063000000', name: 'Iloilo' },
        { code: '071200000', name: 'Bohol' },
        { code: '064500000', name: 'Negros Occidental' }
      ]
    },
    Mindanao: {
      provinces: [
        { code: '112400000', name: 'Davao del Sur' },
        { code: '104300000', name: 'Misamis Oriental' },
        { code: '126300000', name: 'South Cotabato' },
        { code: '097300000', name: 'Zamboanga del Sur' }
      ]
    }
  };

  // Helper to render select options
  function renderSelectOptions(selectElem, items, placeholder) {
    selectElem.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.code;
      opt.dataset.name = item.name;
      opt.textContent = item.name;
      selectElem.appendChild(opt);
    });
    selectElem.disabled = false;
  }

  // 1. Island Group Selected -> Fetch All Provinces
  if (sign_up_island_group && sign_up_province) {
    sign_up_island_group.addEventListener('change', async () => {
      const island = sign_up_island_group.value.toLowerCase();
      const islandTitle = sign_up_island_group.value;

      sign_up_province.innerHTML = '<option value="" disabled selected>Loading provinces...</option>';
      sign_up_province.disabled = true;
      sign_up_city.innerHTML = '<option value="" disabled selected>Select Province First</option>';
      sign_up_city.disabled = true;
      sign_up_barangay.innerHTML = '<option value="" disabled selected>Select City First</option>';
      sign_up_barangay.disabled = true;
      if (sign_up_postal_code) sign_up_postal_code.value = '';

      if (cache_provinces[island]) {
        renderSelectOptions(sign_up_province, cache_provinces[island], 'Select Province');
        return;
      }

      try {
        const response = await fetch(`${api_base_url}/island-groups/${island}/provinces/`);
        if (!response.ok) throw new Error('Network error');
        let provinces = await response.json();

        // For Luzon, include Metro Manila (NCR) which is categorized as a region in PSGC
        if (island === 'luzon') {
          provinces.push({
            code: '130000000',
            name: 'Metro Manila (NCR)'
          });
        }

        // Sort alphabetically
        provinces.sort((a, b) => a.name.localeCompare(b.name));
        cache_provinces[island] = provinces;
        renderSelectOptions(sign_up_province, provinces, 'Select Province');
      } catch (err) {
        console.warn('Using offline fallback for provinces:', err);
        const fallback = offline_fallback_data[islandTitle]?.provinces || [];
        renderSelectOptions(sign_up_province, fallback, 'Select Province');
      }
    });
  }

  // 2. Province Selected -> Fetch All Cities / Municipalities
  if (sign_up_province && sign_up_city) {
    sign_up_province.addEventListener('change', async () => {
      const province_code = sign_up_province.value;

      sign_up_city.innerHTML = '<option value="" disabled selected>Loading cities / municipalities...</option>';
      sign_up_city.disabled = true;
      sign_up_barangay.innerHTML = '<option value="" disabled selected>Select City First</option>';
      sign_up_barangay.disabled = true;
      if (sign_up_postal_code) sign_up_postal_code.value = '';

      if (cache_cities[province_code]) {
        renderSelectOptions(sign_up_city, cache_cities[province_code], 'Select City / Municipality');
        return;
      }

      try {
        // Metro Manila uses region endpoint in PSGC
        const url = province_code === '130000000'
          ? `${api_base_url}/regions/130000000/cities-municipalities/`
          : `${api_base_url}/provinces/${province_code}/cities-municipalities/`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        const cities = await response.json();

        cities.sort((a, b) => a.name.localeCompare(b.name));
        cache_cities[province_code] = cities;
        renderSelectOptions(sign_up_city, cities, 'Select City / Municipality');
      } catch (err) {
        console.warn('Failed to fetch cities from API:', err);
        sign_up_city.innerHTML = '<option value="" disabled selected>Select City / Municipality</option><option value="default_city" data-name="City Center">City Center</option>';
        sign_up_city.disabled = false;
      }
    });
  }

  // 3. City Selected -> Fetch All Barangays & Autofill Postal Code
  if (sign_up_city && sign_up_barangay) {
    sign_up_city.addEventListener('change', async () => {
      const city_code = sign_up_city.value;
      const selectedOption = sign_up_city.options[sign_up_city.selectedIndex];
      const city_name = selectedOption?.dataset.name || selectedOption?.textContent || '';

      // Autofill or hint postal code if matched
      if (sign_up_postal_code) {
        for (const [key, zip] of Object.entries(postal_code_lookup)) {
          if (city_name.toLowerCase().includes(key.toLowerCase())) {
            sign_up_postal_code.value = zip;
            break;
          }
        }
      }

      sign_up_barangay.innerHTML = '<option value="" disabled selected>Loading barangays...</option>';
      sign_up_barangay.disabled = true;

      if (cache_barangays[city_code]) {
        renderSelectOptions(sign_up_barangay, cache_barangays[city_code], 'Select Barangay');
        return;
      }

      try {
        const response = await fetch(`${api_base_url}/cities-municipalities/${city_code}/barangays/`);
        if (!response.ok) throw new Error('Network error');
        const barangays = await response.json();

        barangays.sort((a, b) => a.name.localeCompare(b.name));
        cache_barangays[city_code] = barangays;
        renderSelectOptions(sign_up_barangay, barangays, 'Select Barangay');
      } catch (err) {
        console.warn('Failed to fetch barangays from API:', err);
        sign_up_barangay.innerHTML = '<option value="" disabled selected>Select Barangay</option><option value="default_brgy" data-name="Poblacion">Poblacion</option>';
        sign_up_barangay.disabled = false;
      }
    });
  }

  // ==========================================================================
  // Form Submission Handlers
  // ==========================================================================

  if (sign_in_form) {
    sign_in_form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('sign_in_email').value;
      const password = document.getElementById('sign_in_password').value;
      console.log('Sign in submitted for:', email);
      // Backend integration hook
    });
  }

  if (sign_up_form) {
    sign_up_form.addEventListener('submit', (e) => {
      e.preventDefault();

      const provinceOption = sign_up_province?.options[sign_up_province.selectedIndex];
      const cityOption = sign_up_city?.options[sign_up_city.selectedIndex];
      const barangayOption = sign_up_barangay?.options[sign_up_barangay.selectedIndex];

      const user_payload = {
        username: document.getElementById('sign_up_username')?.value,
        phone: document.getElementById('sign_up_phone')?.value,
        email: document.getElementById('sign_up_email')?.value,
        password: document.getElementById('sign_up_password')?.value,
        island_group: sign_up_island_group?.value,
        province: provinceOption?.dataset.name || provinceOption?.textContent || '',
        city: cityOption?.dataset.name || cityOption?.textContent || '',
        barangay: barangayOption?.dataset.name || barangayOption?.textContent || '',
        postal_code: sign_up_postal_code?.value,
        specific_address: document.getElementById('sign_up_specific_address')?.value
      };

      console.log('Detailed sign-up submitted with payload:', user_payload);
      alert(`Account created successfully for ${user_payload.username}!\n\nDelivery Address:\n${user_payload.specific_address}\nBrgy. ${user_payload.barangay}, ${user_payload.city}, ${user_payload.province}\nPostal Code: ${user_payload.postal_code}\nIsland Group: ${user_payload.island_group}`);
      // Backend registration endpoint hook
    });
  }
});
