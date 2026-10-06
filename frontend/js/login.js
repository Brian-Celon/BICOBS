/**
 * BICOBS - Auth Panel Slider & Official Philippine PSGC Address API Integration
 * Complies with snake_case naming conventions and responsive rules
 */

document.addEventListener('DOMContentLoaded', () => {
  const back_buttons = document.querySelectorAll('.back_button');

  back_buttons.forEach((back_button) => {
    back_button.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/frontend/pages/index.html';
      }
    });
  });

  const auth_container = document.getElementById('auth_container');
  const ghost_sign_up_btn = document.getElementById('ghost_sign_up_btn');
  const ghost_sign_in_btn = document.getElementById('ghost_sign_in_btn');

  const mobile_switch_to_sign_up = document.getElementById('mobile_switch_to_sign_up');
  const mobile_switch_to_sign_in = document.getElementById('mobile_switch_to_sign_in');

  const sign_in_form = document.getElementById('sign_in_form');
  const sign_up_form = document.getElementById('sign_up_form');


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

  // Auto-switch to Sign Up if requested via URL param (?mode=signup, ?tab=signup) or hash (#signup, #register)
  const initialUrlParams = new URLSearchParams(window.location.search);
  const initialMode = initialUrlParams.get('mode') || initialUrlParams.get('tab') || '';
  if (initialMode.toLowerCase() === 'signup' || initialMode.toLowerCase() === 'register' || window.location.hash === '#signup' || window.location.hash === '#register') {
    switchToSignUp();
  }

  // Password Visibility Toggle Handlers
  document.querySelectorAll('.password_toggle_btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });

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
  // Form Submission Handlers (Production Backend Integration)
  // ==========================================================================

  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');

  function getRedirectUrl() {
    if (!redirectTarget) return '/frontend/pages/Dashboard/dashboard.html';
    if (redirectTarget === 'cart') return '/frontend/pages/Dashboard/mycart.html';
    if (redirectTarget === 'orders') return '/frontend/pages/Dashboard/myorders.html';
    if (redirectTarget === 'shop') return '/frontend/pages/shop.html';
    if (redirectTarget.startsWith('/frontend/')) return redirectTarget;
    return '/frontend/pages/Dashboard/dashboard.html';
  }

  function showAuthAlert(elemId, message, type = 'error') {
    const el = document.getElementById(elemId);
    if (!el) return;
    el.textContent = message;
    el.className = `auth_alert_banner ${type}`;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAuthAlert(elemId) {
    const el = document.getElementById(elemId);
    if (el) el.style.display = 'none';
  }

  // 1. Handle Sign In
  if (sign_in_form) {
    sign_in_form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthAlert('sign_in_alert');

      const email = document.getElementById('sign_in_email')?.value.trim();
      const password = document.getElementById('sign_in_password')?.value;
      const submitBtn = document.getElementById('sign_in_submit_btn');

      if (!email || !password) {
        showAuthAlert('sign_in_alert', 'Please enter your email/username and password.', 'error');
        return;
      }

      const originalText = submitBtn ? submitBtn.textContent : 'SIGN IN';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SIGNING IN...';
      }

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        // If user account is unverified, prompt the OTP modal
        if (response.status === 403 && result.requiresVerification) {
          openOtpModal(result.email, result.devOtp);
          showOtpAlert(result.message || 'Please enter the 6-digit code sent to your email to verify your account.', 'error');
          return;
        }

        if (response.ok && result.status === 'success') {
          // Store authentication token and user profile
          localStorage.setItem('token', result.token);
          localStorage.setItem('bicobs_token', result.token);
          localStorage.setItem('user', JSON.stringify(result.data));
          localStorage.setItem('tb_user_name', result.data.name);
          localStorage.setItem('tb_user_email', result.data.email);
          localStorage.setItem('tb_user_phone', result.data.phone || '');
          localStorage.setItem('tb_user_shipping', result.data.address || '');

          showAuthAlert('sign_in_alert', `Welcome back, ${result.data.name}! Redirecting...`, 'success');
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 600);
        } else {
          showAuthAlert('sign_in_alert', result.message || 'Invalid email/username or password. Please try again.', 'error');
        }
      } catch (err) {
        console.error('Sign in error:', err);
        showAuthAlert('sign_in_alert', 'Server connection error. Please make sure the server is running.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // 2. Handle Sign Up (Account Creation)
  if (sign_up_form) {
    sign_up_form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthAlert('sign_up_alert');

      const username = document.getElementById('sign_up_username')?.value.trim();
      const rawPhone = document.getElementById('sign_up_phone')?.value.trim();
      const email = document.getElementById('sign_up_email')?.value.trim();
      const password = document.getElementById('sign_up_password')?.value || '';
      const confirmPassword = document.getElementById('sign_up_confirm_password')?.value || '';
      const submitBtn = document.getElementById('sign_up_submit_btn');

      const island = sign_up_island_group?.value || '';
      const provinceOption = sign_up_province?.options[sign_up_province.selectedIndex];
      const cityOption = sign_up_city?.options[sign_up_city.selectedIndex];
      const barangayOption = sign_up_barangay?.options[sign_up_barangay.selectedIndex];
      const postalCode = document.getElementById('sign_up_postal_code')?.value.trim();
      const specificAddress = document.getElementById('sign_up_specific_address')?.value.trim();

      const province = provinceOption?.dataset.name || provinceOption?.textContent || '';
      const city = cityOption?.dataset.name || cityOption?.textContent || '';
      const barangay = barangayOption?.dataset.name || barangayOption?.textContent || '';

      if (!username || !email || !password) {
        showAuthAlert('sign_up_alert', 'Please fill in your name, email, and password.', 'error');
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAuthAlert('sign_up_alert', 'Please enter a valid email address (e.g. name@email.com).', 'error');
        return;
      }

      // Phone validation & normalization
      let cleanPhone = (rawPhone || '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('639') && cleanPhone.length === 12) {
        cleanPhone = '0' + cleanPhone.slice(2);
      } else if (cleanPhone.startsWith('9') && cleanPhone.length === 10) {
        cleanPhone = '0' + cleanPhone;
      }
      if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
        showAuthAlert('sign_up_alert', 'Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).', 'error');
        return;
      }

      // Password length check
      if (password.length < 6) {
        showAuthAlert('sign_up_alert', 'Password must be at least 6 characters long.', 'error');
        return;
      }

      // Password matching check
      if (password !== confirmPassword) {
        showAuthAlert('sign_up_alert', 'Passwords do not match. Please ensure both passwords match.', 'error');
        return;
      }

      // Home address check
      if (!specificAddress) {
        showAuthAlert('sign_up_alert', 'Please enter your specific street/house address for delivery details.', 'error');
        return;
      }

      let addressParts = [specificAddress];
      if (barangay && !barangay.includes('Select')) addressParts.push(`Brgy. ${barangay}`);
      if (city && !city.includes('Select')) addressParts.push(city);
      if (province && !province.includes('Select')) addressParts.push(province);
      if (postalCode) addressParts.push(postalCode);
      if (island) addressParts.push(`(${island})`);

      const fullAddress = addressParts.join(', ');

      const originalText = submitBtn ? submitBtn.textContent : 'COMPLETE SIGN UP';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'CREATING ACCOUNT...';
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: username,
            email: email,
            password: password,
            phone: cleanPhone,
            address: fullAddress,
            role: 'customer'
          })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          // If email verification is required (Standard flow)
          if (result.requiresVerification) {
            openOtpModal(result.email, result.devOtp);
            showOtpAlert(result.message || 'We sent a 6-digit verification code to your email.', 'success');
            return;
          }

          // Fallback if direct verification
          localStorage.setItem('token', result.token);
          localStorage.setItem('bicobs_token', result.token);
          localStorage.setItem('user', JSON.stringify(result.data));
          localStorage.setItem('tb_user_name', result.data.name);
          localStorage.setItem('tb_user_email', result.data.email);
          localStorage.setItem('tb_user_phone', result.data.phone || cleanPhone);
          localStorage.setItem('tb_user_shipping', fullAddress);

          showAuthAlert('sign_up_alert', `Welcome to Taurus Bike, ${username}! Your account has been created. Redirecting...`, 'success');
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 700);
        } else {
          showAuthAlert('sign_up_alert', result.message || 'Registration failed. Please check your information.', 'error');
        }
      } catch (err) {
        console.error('Sign up error:', err);
        showAuthAlert('sign_up_alert', 'Server connection error. Please make sure the server is running.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // ==========================================================================
  // 6-Digit Email OTP Verification Modal Controller
  // ==========================================================================
  const otpModal = document.getElementById('email_otp_modal');
  const otpForm = document.getElementById('otp_verification_form');
  const otpInputs = document.querySelectorAll('.otp_digit_input');
  const otpAlert = document.getElementById('otp_modal_alert');
  const otpDevHint = document.getElementById('otp_dev_hint');
  const otpTargetEmailEl = document.getElementById('otp_target_email');
  const btnResendOtp = document.getElementById('btn_resend_otp');
  const resendTimerEl = document.getElementById('resend_timer');
  const timerCountdownEl = document.getElementById('timer_countdown');
  const btnCloseOtpModal = document.getElementById('btn_close_otp_modal');

  let currentVerificationEmail = '';
  let resendCountdown = 60;
  let resendInterval = null;

  function showOtpAlert(message, type = 'error') {
    if (!otpAlert) return;
    otpAlert.textContent = message;
    otpAlert.className = `auth_alert_banner ${type}`;
    otpAlert.style.display = 'block';
  }

  function hideOtpAlert() {
    if (otpAlert) otpAlert.style.display = 'none';
  }

  function startResendTimer() {
    if (resendInterval) clearInterval(resendInterval);
    resendCountdown = 60;
    if (btnResendOtp) {
      btnResendOtp.disabled = true;
      btnResendOtp.style.opacity = '0.5';
      btnResendOtp.style.cursor = 'not-allowed';
    }
    if (resendTimerEl) resendTimerEl.style.display = 'inline';
    if (timerCountdownEl) timerCountdownEl.textContent = resendCountdown;

    resendInterval = setInterval(() => {
      resendCountdown--;
      if (timerCountdownEl) timerCountdownEl.textContent = resendCountdown;
      if (resendCountdown <= 0) {
        clearInterval(resendInterval);
        if (btnResendOtp) {
          btnResendOtp.disabled = false;
          btnResendOtp.style.opacity = '1';
          btnResendOtp.style.cursor = 'pointer';
        }
        if (resendTimerEl) resendTimerEl.style.display = 'none';
      }
    }, 1000);
  }

  function openOtpModal(email, devOtp = null) {
    currentVerificationEmail = email;
    if (otpTargetEmailEl) otpTargetEmailEl.textContent = email;
    hideOtpAlert();

    // Clear digit inputs
    otpInputs.forEach(input => {
      input.value = '';
      input.classList.remove('filled');
    });

    if (otpDevHint) {
      if (devOtp) {
        otpDevHint.innerHTML = `🔑 <strong>Dev Preview:</strong> Code is <span style="font-family: monospace; font-weight: 800; font-size: 16px; letter-spacing: 2px; color: #8b1e1e; margin-left: 4px;">${devOtp}</span> (also logged in server terminal)`;
        otpDevHint.style.display = 'flex';
      } else {
        otpDevHint.style.display = 'none';
      }
    }

    if (otpModal) {
      otpModal.style.display = 'flex';
      setTimeout(() => {
        if (otpInputs[0]) otpInputs[0].focus();
      }, 80);
    }

    startResendTimer();
  }

  function closeOtpModal() {
    if (resendInterval) clearInterval(resendInterval);
    if (otpModal) otpModal.style.display = 'none';
  }

  if (btnCloseOtpModal) {
    btnCloseOtpModal.addEventListener('click', closeOtpModal);
  }

  // Handle digit input jumps, backspace, and paste
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = input.value.replace(/[^0-9]/g, '');
      input.value = val ? val[val.length - 1] : '';
      if (input.value) {
        input.classList.add('filled');
        if (index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      } else {
        input.classList.remove('filled');
      }

      // If all 6 digits entered, auto-focus submit button
      const allFilled = Array.from(otpInputs).every(i => i.value !== '');
      if (allFilled && index === otpInputs.length - 1) {
        document.getElementById('btn_verify_otp')?.focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!input.value && index > 0) {
          otpInputs[index - 1].value = '';
          otpInputs[index - 1].classList.remove('filled');
          otpInputs[index - 1].focus();
        } else {
          input.value = '';
          input.classList.remove('filled');
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        otpInputs[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
      if (!pasteData) return;

      const digits = pasteData.slice(0, 6).split('');
      digits.forEach((digit, dIdx) => {
        if (otpInputs[dIdx]) {
          otpInputs[dIdx].value = digit;
          otpInputs[dIdx].classList.add('filled');
        }
      });

      const nextFocus = Math.min(digits.length, otpInputs.length - 1);
      otpInputs[nextFocus].focus();
    });
  });

  // Handle OTP form submission
  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideOtpAlert();

      const otp = Array.from(otpInputs).map(i => i.value).join('');
      if (otp.length !== 6) {
        showOtpAlert('Please enter the complete 6-digit code.', 'error');
        return;
      }

      const verifyBtn = document.getElementById('btn_verify_otp');
      const origText = verifyBtn ? verifyBtn.innerHTML : 'VERIFY CODE & CONTINUE';
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
      }

      try {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentVerificationEmail,
            otp: otp
          })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          // Store token and profile
          localStorage.setItem('token', result.token);
          localStorage.setItem('bicobs_token', result.token);
          localStorage.setItem('user', JSON.stringify(result.data));
          localStorage.setItem('tb_user_name', result.data.name);
          localStorage.setItem('tb_user_email', result.data.email);
          localStorage.setItem('tb_user_phone', result.data.phone || '');
          localStorage.setItem('tb_user_shipping', result.data.address || '');

          showOtpAlert('Email verified successfully! Welcome to Taurus Bike!', 'success');
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 700);
        } else {
          showOtpAlert(result.message || 'Invalid or expired verification code.', 'error');
          otpInputs.forEach(i => i.classList.remove('filled'));
          if (otpInputs[0]) otpInputs[0].focus();
        }
      } catch (err) {
        console.error('OTP verification error:', err);
        showOtpAlert('Connection error. Please check your network and try again.', 'error');
      } finally {
        if (verifyBtn) {
          verifyBtn.disabled = false;
          verifyBtn.innerHTML = origText;
        }
      }
    });
  }

  // Handle Resend OTP click
  if (btnResendOtp) {
    btnResendOtp.addEventListener('click', async () => {
      if (!currentVerificationEmail) return;

      hideOtpAlert();
      btnResendOtp.disabled = true;

      try {
        const response = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentVerificationEmail })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          showOtpAlert('A new verification code has been dispatched to your email!', 'success');
          startResendTimer();
          if (otpDevHint && result.devOtp) {
            otpDevHint.innerHTML = `🔑 <strong>Dev Preview:</strong> Code is <span style="font-family: monospace; font-weight: 800; font-size: 16px; letter-spacing: 2px; color: #8b1e1e; margin-left: 4px;">${result.devOtp}</span> (also logged in server terminal)`;
            otpDevHint.style.display = 'flex';
          }
        } else {
          showOtpAlert(result.message || 'Could not resend code. Please try again.', 'error');
          btnResendOtp.disabled = false;
        }
      } catch (err) {
        console.error('Resend OTP error:', err);
        showOtpAlert('Connection error while resending code.', 'error');
        btnResendOtp.disabled = false;
      }
    });
  }

  // Auto-open OTP modal if redirected with ?verify=email@example.com
  const autoVerifyEmail = urlParams.get('verify');
  if (autoVerifyEmail) {
    openOtpModal(autoVerifyEmail);
    showOtpAlert('Please enter the 6-digit code sent to your email to verify your account.', 'error');
  }

});

