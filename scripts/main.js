document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Exit intent popup handling
    let hasShownPopup = false;
    document.addEventListener('mouseleave', (e) => {
        if (e.clientY < 0 && !hasShownPopup) {
            showExitIntent();
            hasShownPopup = true;
        }
    });
});

function showExitIntent() {
    // A simple log for now, can be expanded to a real popup in Phase 4
    console.log("Exit intent triggered. Show 10% discount popup.");
}
