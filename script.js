document.addEventListener('DOMContentLoaded', () => {
    // Header scroll effect + Announcement bar hide on scroll down
    const header = document.querySelector('header');
    const announcementBar = document.querySelector('.announcement-bar');
    let lastScrollY = 0;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide announcement bar on scroll down, show on scroll up
        if (announcementBar) {
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                announcementBar.classList.add('announcement-bar-hidden');
                header.style.top = '0';
            } else {
                announcementBar.classList.remove('announcement-bar-hidden');
                header.style.top = '';
            }
        }
        
        lastScrollY = currentScrollY;
    });

    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            // Change icon
            if (navLinks.classList.contains('active')) {
                mobileBtn.innerHTML = '✕';
            } else {
                mobileBtn.innerHTML = '☰';
            }
        });

        // Close menu when clicking a link
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileBtn.innerHTML = '☰';
            });
        });
    }

    // Set active link based on current page
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-links a');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (currentPath.endsWith(href) && href !== '#') {
            item.classList.add('active');
        } else if (currentPath.endsWith('/') && href === 'index.html') {
            item.classList.add('active');
        }
    });

    // Announcement bar text rotation
    const announcementTexts = document.querySelectorAll('.announcement-text');
    if (announcementTexts.length > 1) {
        let currentIndex = 0;
        setInterval(() => {
            announcementTexts[currentIndex].classList.remove('announcement-text-active');
            currentIndex = (currentIndex + 1) % announcementTexts.length;
            announcementTexts[currentIndex].classList.add('announcement-text-active');
        }, 3000);
    }
});
