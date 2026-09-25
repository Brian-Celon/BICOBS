/* dashboard interactivity script */

/* listen for DOM content load */
document.addEventListener("DOMContentLoaded", () => {
    /* initialize dashboard functionalities */
    setup_sidebar_links();
});

/* setup sidebar link clicks */
function setup_sidebar_links() {
    /* select all nav items */
    const nav_items = document.querySelectorAll('.nav_item');
    
    /* attach click event listener */
    nav_items.forEach(item => {
        item.addEventListener('click', (e) => {
            /* prevent default for dead links */
            if (item.getAttribute('href') === '#') {
                e.preventDefault();
                /* remove active class from all */
                nav_items.forEach(nav => nav.classList.remove('active'));
                /* set active class to clicked item */
                item.classList.add('active');
            }
        });
    });
}
