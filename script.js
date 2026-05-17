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

    // ─── Register → Tap Payment (Arabic checkout redirect) ───
    const API_BASE = ''; // Same domain
    const signupForm = document.getElementById('signup-form');
    const formMessage = document.getElementById('form-message');

    // Check if user was redirected back with a payment error
    const urlParams = new URLSearchParams(window.location.search);
    const paymentError = urlParams.get('payment_error');
    if (paymentError && formMessage) {
        formMessage.textContent = `❌ ${paymentError}`;
        formMessage.style.color = 'var(--coral)';
        formMessage.style.display = 'block';
        // Clean URL
        history.replaceState(null, '', window.location.pathname + window.location.hash);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'جاري التسجيل...';
            submitBtn.disabled = true;
            formMessage.style.display = 'none';

            const formData = {
                firstName: signupForm.firstName.value.trim(),
                lastName: signupForm.lastName.value.trim(),
                email: signupForm.email.value.trim(),
                phone: signupForm.phone.value.trim(),
            };

            try {
                // Step 1: Register student (forwards to Zapier)
                const regResponse = await fetch(`${API_BASE}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });

                if (!regResponse.ok) {
                    const err = await regResponse.json();
                    throw new Error(err.error || 'Registration failed');
                }

                // Step 2: Create Tap charge → redirect to Arabic payment page
                submitBtn.textContent = 'جاري تجهيز الدفع...';

                const chargeResponse = await fetch(`${API_BASE}/api/create-charge`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });

                const chargeData = await chargeResponse.json();

                if (!chargeResponse.ok || !chargeData.paymentUrl) {
                    throw new Error(chargeData.error || 'Payment setup failed');
                }

                // Redirect to Tap Arabic payment page
                formMessage.textContent = '✅ تم التسجيل! جاري تحويلك للدفع...';
                formMessage.style.color = '#10b981';
                formMessage.style.display = 'block';

                setTimeout(() => {
                    window.location.href = chargeData.paymentUrl;
                }, 1000);

            } catch (err) {
                console.error('Form error:', err);
                formMessage.textContent = `❌ ${err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى.'}`;
                formMessage.style.color = 'var(--coral)';
                formMessage.style.display = 'block';
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    /* ─── COMMENTED OUT: TutorBird iframe step detection (keep for future use) ───
    const step1El = document.getElementById('annotations-step-1');
    const step2El = document.getElementById('annotations-step-2');
    let currentStep = 1;
    let stepChanges = 0;
    function showStep(step) { ... }
    let cooldown = false;
    function onStepChange() { ... }
    // Signal-based iframe detection with blur, MutationObserver, ResizeObserver
    ─── END COMMENTED OUT ─── */
});
