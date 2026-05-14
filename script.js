document.addEventListener('DOMContentLoaded', () => {
    // Header scroll effect + Announcement bar hide on scroll down
    const header = document.querySelector('header');
    const announcementBar = document.querySelector('.announcement-bar');
    let lastScrollY = 0;

    // Set header top based on actual announcement bar height
    const updateHeaderTop = () => {
        if (announcementBar && header && !announcementBar.classList.contains('announcement-bar-hidden')) {
            const barHeight = announcementBar.offsetHeight;
            header.style.top = barHeight + 'px';
        }
    };
    updateHeaderTop();
    window.addEventListener('resize', updateHeaderTop);
    
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
                updateHeaderTop();
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

    // Testimonials slider navigation
    const track = document.getElementById('testimonials-track');
    const prevBtn = document.getElementById('testimonial-prev');
    const nextBtn = document.getElementById('testimonial-next');

    if (track && prevBtn && nextBtn) {
        const scrollAmount = () => {
            const card = track.querySelector('.testimonial-card');
            return card ? card.offsetWidth + 24 : 350;
        };

        // RTL: prev (right arrow) scrolls left (forward), next (left arrow) scrolls right (backward)
        prevBtn.addEventListener('click', () => {
            track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        });
    }

    // Lightbox for review images + PDF certificates
    const overlay = document.getElementById('lightbox-overlay');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxPdf = document.getElementById('lightbox-pdf');
    const lightboxClose = document.getElementById('lightbox-close');

    if (overlay && lightboxImg) {
        // Image lightbox (reviews)
        document.querySelectorAll('.testimonial-card-img img').forEach(img => {
            img.addEventListener('click', () => {
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
                lightboxImg.hidden = false;
                if (lightboxPdf) lightboxPdf.hidden = true;
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        // PDF lightbox (teacher certificates)
        document.querySelectorAll('.teacher-cert-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                const pdfUrl = badge.getAttribute('href');
                if (lightboxPdf) {
                    lightboxPdf.src = pdfUrl;
                    lightboxPdf.hidden = false;
                    lightboxImg.hidden = true;
                    overlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        const closeLightbox = () => {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            lightboxImg.src = '';
            lightboxImg.hidden = false;
            if (lightboxPdf) {
                lightboxPdf.src = '';
                lightboxPdf.hidden = true;
            }
        };

        lightboxClose.addEventListener('click', closeLightbox);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLightbox();
        });
    }

    // Table scroll arrows
    const tableEl = document.getElementById('table-responsive');
    const scrollRight = document.getElementById('table-scroll-right');
    const scrollLeft = document.getElementById('table-scroll-left');

    if (tableEl && scrollRight && scrollLeft) {
        scrollRight.addEventListener('click', () => {
            tableEl.scrollBy({ left: 200, behavior: 'smooth' });
        });
        scrollLeft.addEventListener('click', () => {
            tableEl.scrollBy({ left: -200, behavior: 'smooth' });
        });
    }

    // ─── Auto-detect Widget Step Changes ───
    const step1El = document.getElementById('annotations-step-1');
    const step2El = document.getElementById('annotations-step-2');
    let currentStep = 1;
    let stepChanges = 0;

    function showStep(step) {
        if (!step1El || !step2El) return;
        if (step === currentStep) return;
        if (step === 1) {
            step1El.style.display = '';
            step2El.style.display = 'none';
            currentStep = 1;
        } else if (step === 2) {
            step1El.style.display = 'none';
            step2El.style.display = '';
            currentStep = 2;
        }
    }

    let cooldown = false;

    function onStepChange() {
        if (cooldown) return;
        stepChanges++;
        showStep(stepChanges % 2 === 1 ? 2 : 1);
        // Lock out further changes for 3 seconds to prevent bounce-back
        cooldown = true;
        setTimeout(() => {
            cooldown = false;
            takeSnapshot(); // re-snapshot after settling
        }, 3000);
    }

    const widgetContainer = document.querySelector('.widget-container');
    if (widgetContainer && step1El && step2El) {
        let iframe = null;
        let snapshotHeight = 0;
        let snapshotStyle = '';

        function takeSnapshot() {
            if (!iframe) return;
            snapshotHeight = iframe.offsetHeight;
            snapshotStyle = iframe.getAttribute('style') || '';
        }

        function hasChanged() {
            if (!iframe || cooldown) return false;
            const h = iframe.offsetHeight;
            const s = iframe.getAttribute('style') || '';
            return Math.abs(h - snapshotHeight) > 20 || s !== snapshotStyle;
        }

        // Signal 1: Detect clicks inside iframe via window blur
        let blurPoll = null;
        window.addEventListener('blur', () => {
            if (!iframe || cooldown) return;
            if (document.activeElement === iframe) {
                let checks = 0;
                clearInterval(blurPoll);
                blurPoll = setInterval(() => {
                    checks++;
                    if (hasChanged()) {
                        clearInterval(blurPoll);
                        takeSnapshot();
                        onStepChange();
                    }
                    if (checks >= 10) clearInterval(blurPoll);
                }, 500);
            }
        });

        const setupObservers = () => {
            iframe = widgetContainer.querySelector('iframe');
            if (!iframe) { setTimeout(setupObservers, 500); return; }
            takeSnapshot();

            // Signal 2: MutationObserver on iframe attributes
            new MutationObserver((muts) => {
                if (cooldown) return;
                for (const m of muts) {
                    if (m.type === 'attributes' && hasChanged()) {
                        takeSnapshot();
                        onStepChange();
                        break;
                    }
                }
            }).observe(iframe, { attributes: true });

            // Signal 3: ResizeObserver as backup
            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(() => {
                    if (hasChanged()) { takeSnapshot(); onStepChange(); }
                }).observe(iframe);
            }
        };

        // Watch for iframe injection
        new MutationObserver(() => {
            if (!iframe && widgetContainer.querySelector('iframe')) setupObservers();
        }).observe(widgetContainer, { childList: true, subtree: true });

        setTimeout(setupObservers, 1500);
    }
});
