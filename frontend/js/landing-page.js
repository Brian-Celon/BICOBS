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
});
