// JOB KHOJ - Main Vanilla JavaScript Application Controller
// High performance, zero dependencies, accessible, mobile-responsive

import { Icons } from './icons.ts';
import { supabase } from './supabase.ts';
import {
  JobKhojDataStore,
  JobItem,
  ExamItem,
  ResultItem,
  AdmitCardItem,
  BlogItem,
  AdSlot,
  SiteSettings
} from './data.ts';

class JobKhojApp {
  private currentRoute: string = '';
  private searchDebounceTimer: number | null = null;
  private currentAdminTab: string = 'overview';

  constructor() {
    this.init();
  }

 private async init(): Promise<void> {
  await JobKhojDataStore.loadAdSlots();
    JobKhojDataStore.expireJobs();
    this.applySiteSEO();
    document.addEventListener('click', (e) => { const target = e.target as HTMLElement; if (target?.closest('.ad-slot-container a')) JobKhojDataStore.incrementStat('applyClicks', 'Advertisement link clicked'); });
    // Record page view in aggregate analytics
    JobKhojDataStore.incrementStat('totalPageViews');

    // Setup hash router and browser popstate
    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('popstate', () => this.handleRouting());

    // Check for direct /admin path in browser
    if (window.location.pathname === '/admin' || window.location.pathname.endsWith('/admin')) {
      window.location.hash = '#admin';
    }

    // Initial render
    this.handleRouting();
  }

  // Router handler
  public handleRouting(): void {
    let hash = window.location.hash.slice(1);
    if (!hash || hash === '/') {
      hash = 'home';
    }

    this.currentRoute = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Check if route is admin
    if (hash === 'admin' || hash.startsWith('admin/')) {
      if (!JobKhojDataStore.isAdminLoggedIn()) {
        this.renderAdminLogin();
      } else {
        const sub = hash.split('/')[1] || 'overview';
        this.currentAdminTab = sub;
        this.renderAdminDashboard();
      }
      return;
    }

    // Otherwise render public site layout
    this.renderPublicLayout();

    // Render inner content view based on route
    if (hash === 'home') {
      this.renderHomeView();
    } else if (hash === 'jobs') {
      this.renderJobsView();
    } else if (hash.startsWith('category-')) {
      const catKey = hash.replace('category-', '');
      this.renderCategoryView(catKey);
    } else if (hash.startsWith('job/')) {
      const idOrSlug = hash.replace('job/', '');
      this.renderJobDetailView(idOrSlug);
    } else if (hash === 'exams') {
      this.renderExamsView();
    } else if (hash === 'results') {
      this.renderResultsView();
    } else if (hash === 'admit-cards') {
      this.renderAdmitCardsView();
    } else if (hash === 'blog') {
      this.renderBlogView();
    } else if (hash.startsWith('article/')) {
      const slugOrId = hash.replace('article/', '');
      this.renderArticleDetailView(slugOrId);
    } else if (hash.startsWith('search')) {
      const query = new URLSearchParams(window.location.hash.split('?')[1] || '').get('q') || '';
      this.renderSearchResultsView(query);
    } else {
      this.renderNotFoundView();
    }
  }

  private applySiteSEO(): void {
    const f = JobKhojDataStore.getFeatures();
    document.title = f.seoSiteTitle;
    const setMeta = (name: string, content: string) => { let el = document.querySelector(`meta[name=\"${name}\"]`) as HTMLMetaElement | null; if (!el) { el=document.createElement('meta'); el.name=name; document.head.appendChild(el); } el.content=content; };
    setMeta('description', f.seoSiteDescription); setMeta('keywords', f.seoKeywords);
    if (f.seoCanonicalUrl) { let link=document.querySelector('link[rel=\"canonical\"]') as HTMLLinkElement|null; if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);} link.href=f.seoCanonicalUrl; }
  }

  private renderNotFoundView(): void {
    this.renderPublicLayout(); const main=document.getElementById('app-main-content'); if(!main)return; main.innerHTML=`<section class=\"container\" style=\"padding:80px 20px;text-align:center;\"><h1 style=\"font-size:64px;color:var(--navy);margin:0;\">404</h1><h2>Page Not Found</h2><p style=\"color:#64748B;\">The page you requested could not be found.</p><a class=\"btn-admin-action-primary\" href=\"#home\">GO HOME</a></section>`;
  }

  // Toast Notification Helper
  public showToast(message: string, isSuccess = true): void {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${isSuccess ? 'toast-success' : ''}`;
    toast.innerHTML = `<span>${isSuccess ? Icons.check : Icons.x}</span><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Advertisement HTML Renderer
  private renderAdSlot(slotId: string, customClass = ''): string {
    const ads = JobKhojDataStore.getAdSlots();
    const ad = ads.find(a => a.id === slotId);
    if (!ad || !ad.enabled || !ad.htmlContent.trim()) {
      return '';
    }

    return `<div class="ad-slot-container ${customClass}" id="ad-container-${this.escapeHtml(slotId)}">
      ${ad.htmlContent}
    </div>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // PUBLIC LAYOUT (HEADER, DRAWER, FOOTER)
  // =========================================================================
  private renderPublicLayout(): void {
    const root = document.getElementById('root');
    if (!root) return;

    const settings = JobKhojDataStore.getSettings();
    const activeRoute = this.currentRoute.split('?')[0];

    // Clean public structure
    root.innerHTML = `
      <!-- Header Ad Slot 1 -->
      <div class="container">
        ${this.renderAdSlot('slot-1')}
      </div>

      ${JobKhojDataStore.getFeatures().announcementEnabled ? `<div class="site-announcement" style="background:#0B63CE;color:#fff;padding:9px 14px;text-align:center;font-size:13px;font-weight:800;"><a href="${JobKhojDataStore.getFeatures().announcementUrl}" style="color:#fff;text-decoration:none;">📢 ${this.escapeHtml(JobKhojDataStore.getFeatures().announcementText)}</a></div>` : ''}

      <!-- Public Header -->
      <header class="site-header" id="site-header">
        <div class="container header-container">
          <!-- Logo -->
          <a href="#home" class="brand-logo" id="header-brand-logo">
            <div class="logo-icon-box" aria-hidden="true"><svg viewBox="0 0 48 48" width="38" height="38" role="img"><circle cx="24" cy="24" r="21" fill="#fff" stroke="#0B63CE" stroke-width="3"/><circle cx="24" cy="24" r="14" fill="#0B63CE" opacity=".10"/><rect x="16" y="15" width="16" height="13" rx="2.5" fill="#FF3B3B"/><path d="M18 28h12l3 6H15l3-6Z" fill="#0B63CE"/><path d="M19 18l5 4 5-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <div class="logo-text-group">
              <div class="logo-title">
                <span class="logo-job">JOB</span>
                <span class="logo-khoj">KHOJ</span>
              </div>
              <span class="logo-tagline">${settings.siteTagline || 'FIND YOUR NEXT OPPORTUNITY'}</span>
            </div>
          </a>

          <!-- Desktop Navigation -->
          <nav class="nav-desktop" id="nav-desktop">
            <a href="#home" class="nav-link ${activeRoute === 'home' ? 'active' : ''}">Home</a>
            <a href="#jobs" class="nav-link ${activeRoute === 'jobs' ? 'active' : ''}">Latest Jobs</a>
            <a href="#category-govt" class="nav-link ${activeRoute === 'category-govt' ? 'active' : ''}">Government Jobs</a>
            <a href="#category-private" class="nav-link ${activeRoute === 'category-private' ? 'active' : ''}">Private Jobs</a>
            <a href="#category-bank" class="nav-link ${activeRoute === 'category-bank' ? 'active' : ''}">Bank</a>
            <a href="#category-railway" class="nav-link ${activeRoute === 'category-railway' ? 'active' : ''}">Railway</a>
            <a href="#category-defence" class="nav-link ${activeRoute === 'category-defence' ? 'active' : ''}">Defence</a>
            <a href="#category-teaching" class="nav-link ${activeRoute === 'category-teaching' ? 'active' : ''}">Teaching</a>
            <a href="#category-police" class="nav-link ${activeRoute === 'category-police' ? 'active' : ''}">Police</a>
            <a href="#exams" class="nav-link ${activeRoute === 'exams' ? 'active' : ''}">Exams</a>
            <a href="#results" class="nav-link ${activeRoute === 'results' ? 'active' : ''}">Results</a>
            <a href="#admit-cards" class="nav-link ${activeRoute === 'admit-cards' ? 'active' : ''}">Admit Card</a>
            <a href="#blog" class="nav-link ${activeRoute === 'blog' ? 'active' : ''}">Blog</a>
          </nav>

          <!-- Right Action: WhatsApp Contact & Mobile Hamburger -->
          <div class="flex items-center gap-3">
            ${settings.enableHeaderWhatsappBtn ? `
              <button class="whatsapp-btn" id="header-whatsapp-btn" title="Contact Job Khoj on WhatsApp">
                ${Icons.whatsapp}
                <span class="btn-text">WHATSAPP CONTACT</span>
              </button>
            ` : ''}

            <button class="hamburger-btn" id="mobile-menu-toggle" aria-label="Toggle Navigation Menu">
              ${Icons.menu}
            </button>
          </div>
        </div>
      </header>

      <!-- Mobile Navigation Drawer -->
      <div class="mobile-drawer-overlay" id="mobile-drawer-overlay">
        <div class="mobile-drawer" id="mobile-drawer">
          <div class="mobile-drawer-header">
            <div class="brand-logo">
              <div class="logo-icon-box" aria-hidden="true"><svg viewBox="0 0 48 48" width="38" height="38" role="img"><circle cx="24" cy="24" r="21" fill="#fff" stroke="#0B63CE" stroke-width="3"/><circle cx="24" cy="24" r="14" fill="#0B63CE" opacity=".10"/><rect x="16" y="15" width="16" height="13" rx="2.5" fill="#FF3B3B"/><path d="M18 28h12l3 6H15l3-6Z" fill="#0B63CE"/><path d="M19 18l5 4 5-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
              <div class="logo-text-group">
                <div class="logo-title" style="font-size:20px;">
                  <span class="logo-job">JOB</span>
                  <span class="logo-khoj">KHOJ</span>
                </div>
              </div>
            </div>
            <button id="mobile-drawer-close" style="background:none;border:none;cursor:pointer;color:var(--navy);">
              ${Icons.x}
            </button>
          </div>
          <nav class="mobile-drawer-nav">
            <a href="#home" class="nav-link ${activeRoute === 'home' ? 'active' : ''}">Home</a>
            <a href="#jobs" class="nav-link ${activeRoute === 'jobs' ? 'active' : ''}">Latest Jobs</a>
            <a href="#category-govt" class="nav-link ${activeRoute === 'category-govt' ? 'active' : ''}">Government Jobs</a>
            <a href="#category-private" class="nav-link ${activeRoute === 'category-private' ? 'active' : ''}">Private Jobs</a>
            <a href="#category-bank" class="nav-link ${activeRoute === 'category-bank' ? 'active' : ''}">Bank Jobs</a>
            <a href="#category-railway" class="nav-link ${activeRoute === 'category-railway' ? 'active' : ''}">Railway Jobs</a>
            <a href="#category-defence" class="nav-link ${activeRoute === 'category-defence' ? 'active' : ''}">Defence Jobs</a>
            <a href="#category-teaching" class="nav-link ${activeRoute === 'category-teaching' ? 'active' : ''}">Teaching Jobs</a>
            <a href="#category-police" class="nav-link ${activeRoute === 'category-police' ? 'active' : ''}">Police Jobs</a>
            <a href="#exams" class="nav-link ${activeRoute === 'exams' ? 'active' : ''}">Competitive Exams</a>
            <a href="#results" class="nav-link ${activeRoute === 'results' ? 'active' : ''}">Results</a>
            <a href="#admit-cards" class="nav-link ${activeRoute === 'admit-cards' ? 'active' : ''}">Admit Card</a>
            <a href="#blog" class="nav-link ${activeRoute === 'blog' ? 'active' : ''}">Blog & Updates</a>
          </nav>
          <div class="mobile-drawer-footer">
            <button class="whatsapp-btn w-full justify-center" id="drawer-whatsapp-btn">
              ${Icons.whatsapp}
              <span>WHATSAPP CONTACT</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Container where page views render -->
      <main id="app-main-content" class="flex-1"></main>

      ${JobKhojDataStore.getFeatures().popupEnabled ? `<div id="site-alert-popup" style="position:fixed;right:18px;bottom:18px;max-width:360px;background:#fff;border:1px solid #E2E8F0;border-radius:16px;box-shadow:0 20px 50px rgba(15,23,42,.18);padding:18px;z-index:9999;display:none;"><button id="site-alert-close" style="position:absolute;right:10px;top:8px;border:0;background:none;font-size:20px;cursor:pointer;">×</button><strong style="font-size:17px;color:#0F172A;display:block;margin-bottom:7px;">${this.escapeHtml(JobKhojDataStore.getFeatures().popupTitle)}</strong><p style="font-size:13px;color:#64748B;line-height:1.5;">${this.escapeHtml(JobKhojDataStore.getFeatures().popupMessage)}</p><a href="${JobKhojDataStore.getFeatures().popupUrl}" class="btn-admin-action-primary" style="display:inline-block;text-decoration:none;">VIEW UPDATES</a></div>` : ''}

      <!-- Public Footer -->
      <footer class="site-footer" id="site-footer">
        <div class="container">
          <div class="footer-top-grid">
            <!-- Left Brand Column -->
            <div>
              <a href="#home" class="brand-logo">
                <div class="logo-icon-box" aria-hidden="true"><svg viewBox="0 0 48 48" width="38" height="38" role="img"><circle cx="24" cy="24" r="21" fill="#fff" stroke="#0B63CE" stroke-width="3"/><circle cx="24" cy="24" r="14" fill="#0B63CE" opacity=".10"/><rect x="16" y="15" width="16" height="13" rx="2.5" fill="#FF3B3B"/><path d="M18 28h12l3 6H15l3-6Z" fill="#0B63CE"/><path d="M19 18l5 4 5-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="logo-text-group">
                  <div class="logo-title">
                    <span class="logo-job">JOB</span>
                    <span class="logo-khoj">KHOJ</span>
                  </div>
                  <span class="logo-tagline">${settings.siteTagline || 'FIND YOUR NEXT OPPORTUNITY'}</span>
                </div>
              </a>
              <p class="footer-brand-desc">${settings.footerAboutText}</p>
              <div class="footer-contact-info">
                Support: <a href="mailto:${settings.supportEmail}">${settings.supportEmail}</a>
              </div>
            </div>

            <!-- Quick Links 1 -->
            <div>
              <h4 class="footer-column-title">QUICK RECRUITMENTS</h4>
              <ul class="footer-links-list">
                <li class="footer-link-item"><a href="#category-govt">Government Jobs</a></li>
                <li class="footer-link-item"><a href="#category-private">Private Jobs</a></li>
                <li class="footer-link-item"><a href="#category-bank">Bank Jobs</a></li>
                <li class="footer-link-item"><a href="#category-railway">Railway Jobs</a></li>
                <li class="footer-link-item"><a href="#category-teaching">Teaching Jobs</a></li>
              </ul>
            </div>

            <!-- Quick Links 2 -->
            <div>
              <h4 class="footer-column-title">EXAMS & NOTICES</h4>
              <ul class="footer-links-list">
                <li class="footer-link-item"><a href="#category-defence">Defence Jobs</a></li>
                <li class="footer-link-item"><a href="#category-police">Police Jobs</a></li>
                <li class="footer-link-item"><a href="#exams">Competitive Exams</a></li>
                <li class="footer-link-item"><a href="#results">Examination Results</a></li>
                <li class="footer-link-item"><a href="#admit-cards">Admit Cards</a></li>
              </ul>
            </div>
          </div>

          <!-- Official Disclaimer Box -->
          <div class="footer-disclaimer-box">
            <strong>DISCLAIMER:</strong> JOB KHOJ is an independent job information platform. We are not the recruiting authority unless explicitly stated. Users should verify eligibility, dates, vacancies, fees and other recruitment details from the official notification or official organization website before applying.
          </div>

          <!-- Bottom bar -->
          <div class="footer-bottom-bar">
            <span>Find Your Next Opportunity • &copy; ${new Date().getFullYear()} JOB KHOJ. All Rights Reserved.</span>
          </div>
        </div>
      </footer>
    `;

    // Event listeners for WhatsApp Contact
    const handleWhatsAppClick = () => {
      JobKhojDataStore.incrementStat('whatsappClicks', 'Public WhatsApp Contact Initiated');
      const num = settings.whatsappNumber.replace(/[^0-9]/g, '');
      const msg = encodeURIComponent(settings.defaultSupportMsg);
      window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    };

    document.getElementById('header-whatsapp-btn')?.addEventListener('click', handleWhatsAppClick);
    document.getElementById('drawer-whatsapp-btn')?.addEventListener('click', handleWhatsAppClick);

    // Mobile drawer toggles
    const overlay = document.getElementById('mobile-drawer-overlay');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('mobile-drawer-close');

    toggleBtn?.addEventListener('click', () => overlay?.classList.add('open'));
    closeBtn?.addEventListener('click', () => overlay?.classList.remove('open'));
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });

    // Close drawer when link clicked
    document.querySelectorAll('.mobile-drawer-nav .nav-link').forEach(link => {
      link.addEventListener('click', () => overlay?.classList.remove('open'));
    });
  }

  // =========================================================================
  // HOMEPAGE VIEW
  // =========================================================================
  private renderHomeView(): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    const allJobs = JobKhojDataStore.getJobs().filter(j => j.published);
    const govtJobs = allJobs.filter(j => j.category === 'Government');
    const privateJobs = allJobs.filter(j => j.category === 'Private');
    const results = JobKhojDataStore.getResults().filter(r => r.published);
    const admitCards = JobKhojDataStore.getAdmitCards().filter(a => a.published);
    const settings = JobKhojDataStore.getSettings();

    // Calculate active count per category dynamically
    const getCatCount = (catName: string) => allJobs.filter(j => j.category.toLowerCase() === catName.toLowerCase()).length;

    main.innerHTML = `
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container">
          <h1 class="hero-title">Find Your Next Job</h1>
          <p class="hero-subtitle">Latest Government Jobs, Private Jobs, Exams, Results and Career Updates in One Place.</p>

          <!-- Search Bar -->
          <div class="search-bar-wrapper">
            <form class="hero-search-form" id="home-search-form">
              <input type="text" id="home-search-input" class="search-input" placeholder="Search jobs, exams, organizations or keywords..." autocomplete="off">
              <button type="submit" class="search-submit-btn">
                ${Icons.search}
                <span>SEARCH</span>
              </button>
            </form>
          </div>

          <!-- Popular Keywords -->
          <div class="popular-keywords">
            <span class="popular-label">POPULAR:</span>
            <span class="keyword-pill" data-keyword="10th Pass">10th Pass</span>
            <span>•</span>
            <span class="keyword-pill" data-keyword="12th Pass">12th Pass</span>
            <span>•</span>
            <span class="keyword-pill" data-keyword="Graduate">Graduate</span>
            <span>•</span>
            <span class="keyword-pill" data-keyword="Fresher">Fresher</span>
          </div>
        </div>
      </section>

      <!-- Homepage Ad Slot 2 (disappears cleanly if disabled) -->
      <div class="container">
        ${this.renderAdSlot('slot-2')}
      </div>

      <!-- Main Public Container -->
      <div class="container section-padding">

        <!-- BROWSE BY CATEGORY -->
        <div class="section-header-flex">
          <h2 class="section-heading">BROWSE BY CATEGORY</h2>
          <a href="#jobs" class="view-all-link">VIEW ALL CATEGORIES ${Icons.arrowRight}</a>
        </div>

        <div class="category-grid">
          <div class="category-card" data-cat="govt">
            <div class="category-icon-box">${Icons.building}</div>
            <div class="category-info">
              <div class="category-name">GOVT JOBS</div>
              <div class="category-count">${getCatCount('Government')} Active</div>
            </div>
          </div>

          <div class="category-card" data-cat="private">
            <div class="category-icon-box">${Icons.briefcase}</div>
            <div class="category-info">
              <div class="category-name">PRIVATE</div>
              <div class="category-count">${getCatCount('Private')} Active</div>
            </div>
          </div>

          <div class="category-card" data-cat="bank">
            <div class="category-icon-box">${Icons.bank}</div>
            <div class="category-info">
              <div class="category-name">BANK JOBS</div>
              <div class="category-count">${getCatCount('Bank')} Active</div>
            </div>
          </div>

          <div class="category-card" data-cat="railway">
            <div class="category-icon-box">${Icons.train}</div>
            <div class="category-info">
              <div class="category-name">RAILWAY</div>
              <div class="category-count">${getCatCount('Railway')} Active</div>
            </div>
          </div>

          <div class="category-card" data-cat="teaching">
            <div class="category-icon-box">${Icons.graduation}</div>
            <div class="category-info">
              <div class="category-name">TEACHING</div>
              <div class="category-count">${getCatCount('Teaching')} Active</div>
            </div>
          </div>

          <div class="category-card" data-cat="defence">
            <div class="category-icon-box">${Icons.defence}</div>
            <div class="category-info">
              <div class="category-name">DEFENCE</div>
              <div class="category-count">${getCatCount('Defence')} Active</div>
            </div>
          </div>

          <div class="category-card" data-cat="police">
            <div class="category-icon-box">${Icons.police}</div>
            <div class="category-info">
              <div class="category-name">POLICE</div>
              <div class="category-count">${getCatCount('Police')} Active</div>
            </div>
          </div>

          <div class="category-card" data-cat="apprentice">
            <div class="category-icon-box">${Icons.tools}</div>
            <div class="category-info">
              <div class="category-name">APPRENTICE</div>
              <div class="category-count">${getCatCount('Apprentice')} Active</div>
            </div>
          </div>
        </div>

        <!-- HIGH DENSITY SPLIT: GOVERNMENT ALERTS & CORPORATE OPENINGS -->
        <div class="jobs-split">
          <div class="section-area">
            <div class="section-header-flex">
              <h2 class="section-heading">LATEST GOVERNMENT ALERTS</h2>
              <a href="#category-govt" class="view-all-link">VIEW ALL ${Icons.arrowRight}</a>
            </div>
            <div class="job-cards-list">
              ${govtJobs.length > 0 ? govtJobs.slice(0, 4).map(job => this.renderJobCardHtml(job)).join('') : `
                <div class="empty-state-box">
                  <div class="empty-state-icon">${Icons.emptyState}</div>
                  <h3 class="empty-state-title">No active government job openings posted yet.</h3>
                  <p class="empty-state-sub">Check back shortly or subscribe to WhatsApp updates for instant alerts.</p>
                </div>
              `}
            </div>
          </div>

          <div class="section-area">
            <div class="section-header-flex">
              <h2 class="section-heading">CORPORATE OPENINGS</h2>
              <a href="#category-private" class="view-all-link">VIEW ALL ${Icons.arrowRight}</a>
            </div>
            <div class="job-cards-list">
              ${privateJobs.length > 0 ? privateJobs.slice(0, 4).map(job => this.renderJobCardHtml(job)).join('') : `
                <div class="empty-state-box">
                  <div class="empty-state-icon">${Icons.emptyState}</div>
                  <h3 class="empty-state-title">No private job notifications currently posted.</h3>
                  <p class="empty-state-sub">New corporate and apprentice vacancies will be displayed here.</p>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- TWIN COLUMNS: EXAMINATION RESULTS & ADMIT CARDS -->
        <div class="twin-columns-grid">
          <!-- Examination Results -->
          <div class="twin-card-container">
            <div class="twin-card-header">
              <div>
                <h3 class="twin-card-title">EXAMINATION RESULTS</h3>
                <div class="twin-card-subtitle">SCORECARDS & MERIT LISTS</div>
              </div>
              <a href="#results" class="view-all-link">VIEW ALL ${Icons.arrowRight}</a>
            </div>
            <div class="item-row-list">
              ${results.length > 0 ? results.slice(0, 3).map(res => `
                <div class="item-row">
                  <div class="item-row-title">${res.resultTitle}</div>
                  <div class="item-row-org">${res.org} • Declared: ${res.resultDate}</div>
                  <div class="item-row-footer">
                    <span>${res.exam}</span>
                    <a href="${res.resultUrl}" target="_blank" rel="noopener noreferrer" class="btn-item-action">
                      VIEW RESULT ↗
                    </a>
                  </div>
                </div>
              `).join('') : `
                <div class="empty-state-box" style="padding: 24px;">
                  <div class="empty-state-icon">${Icons.emptyState}</div>
                  <h4 class="empty-state-title" style="font-size:14px;">No recent examination results declared yet.</h4>
                </div>
              `}
            </div>
          </div>

          <!-- Admit Cards -->
          <div class="twin-card-container">
            <div class="twin-card-header">
              <div>
                <h3 class="twin-card-title">ADMIT CARDS</h3>
                <div class="twin-card-subtitle">HALL TICKET DOWNLOADS</div>
              </div>
              <a href="#admit-cards" class="view-all-link">VIEW ALL ${Icons.arrowRight}</a>
            </div>
            <div class="item-row-list">
              ${admitCards.length > 0 ? admitCards.slice(0, 3).map(ac => `
                <div class="item-row">
                  <div class="item-row-title">${ac.examName}</div>
                  <div class="item-row-org">${ac.org} • Released: ${ac.releaseDate}</div>
                  <div class="item-row-footer">
                    <span>Exam: ${ac.examDate}</span>
                    <a href="${ac.downloadUrl}" target="_blank" rel="noopener noreferrer" class="btn-item-action">
                      DOWNLOAD ADMIT CARD ↗
                    </a>
                  </div>
                </div>
              `).join('') : `
                <div class="empty-state-box" style="padding: 24px;">
                  <div class="empty-state-icon">${Icons.emptyState}</div>
                  <h4 class="empty-state-title" style="font-size:14px;">No new admit cards released yet.</h4>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- WHATSAPP + TELEGRAM CTA SECTION -->
        <div class="social-cta-grid">
          <div class="social-cta-card telegram-cta-card">
            <div class="social-cta-icon telegram-icon" aria-hidden="true"><svg viewBox="0 0 48 48" width="42" height="42"><circle cx="24" cy="24" r="22" fill="#16A8E8"/><path d="M35.8 12.8 10.7 22.5c-1.7.7-1.7 1.7-.3 2.1l6.4 2 2.4 7.5c.3.9.2 1.3 1.1 1.3.6 0 .9-.3 1.3-.7l3.1-3 6.5 4.8c1.2.7 2.1.3 2.4-1.1l4.2-20c.4-1.7-.7-2.4-2-1.8Z" fill="#fff"/></svg></div>
            <div class="social-cta-content">
              <strong>Don’t Miss Any Update!</strong>
              <span>Join Our Telegram Channel</span>
            </div>
            <a href="${settings.telegramChannelUrl}" target="_blank" rel="noopener noreferrer" class="social-cta-btn telegram-btn">Join Now</a>
          </div>
          <div class="social-cta-card whatsapp-cta-card">
            <div class="social-cta-icon">${Icons.whatsapp}</div>
            <div class="social-cta-content">
              <strong>Get Daily Job Alerts</strong>
              <span>On WhatsApp</span>
            </div>
            <a href="${settings.whatsappChannelUrl}" target="_blank" rel="noopener noreferrer" class="social-cta-btn whatsapp-btn-small" id="home-whatsapp-channel-btn">Join Now</a>
          </div>
        </div>

      </div>
    `;

    const alertPopup = document.getElementById('site-alert-popup');
    if (alertPopup) { setTimeout(() => { alertPopup.style.display = 'block'; }, JobKhojDataStore.getFeatures().popupDelayMs || 5000); document.getElementById('site-alert-close')?.addEventListener('click', () => { alertPopup.style.display='none'; }); }

    // Search Form Handler
    document.getElementById('home-search-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = (document.getElementById('home-search-input') as HTMLInputElement)?.value;
      if (input.trim()) {
        JobKhojDataStore.recordSearch(input.trim());
        window.location.hash = `#search?q=${encodeURIComponent(input.trim())}`;
      }
    });

    // Popular Keyword Pills
    document.querySelectorAll('.keyword-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const kw = pill.getAttribute('data-keyword');
        if (kw) {
          JobKhojDataStore.recordSearch(kw);
          window.location.hash = `#search?q=${encodeURIComponent(kw)}`;
        }
      });
    });

    // Category Card Clicks
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-cat');
        window.location.hash = `#category-${cat}`;
      });
    });

    // Bind Apply & Details button handlers
    this.bindJobButtons();
  }

  // Render individual Job Card HTML
  private renderJobCardHtml(job: JobItem): string {
    const statusClass = job.status === 'Active' ? 'status-active' : (job.status === 'Closing Soon' ? 'status-closing-soon' : 'status-expired');
    const badgeClass = `badge-${job.category.toLowerCase()}`;

    return `
      <article class="job-card" id="job-card-${job.id}">
        <div class="job-card-header">
          <div class="job-card-title-group">
            <span class="job-category-badge ${badgeClass}">${job.category} JOBS</span>
            <h3 class="job-card-title" data-job-id="${job.id}">${job.title}</h3>
            <div class="job-card-org">${job.org}</div>
          </div>
          <span class="job-status-badge ${statusClass}">${job.status}</span>
        </div>

        <div class="job-meta-grid">
          <div class="job-meta-item">
            <span class="job-meta-label">Total Vacancies</span>
            <span class="job-meta-val">${job.vacancies}</span>
          </div>
          <div class="job-meta-item">
            <span class="job-meta-label">Qualification</span>
            <span class="job-meta-val">${job.qualification}</span>
          </div>
          <div class="job-meta-item">
            <span class="job-meta-label">Location</span>
            <span class="job-meta-val">${job.location}</span>
          </div>
          <div class="job-meta-item">
            <span class="job-meta-label">Salary / Pay</span>
            <span class="job-meta-val">${job.salary}</span>
          </div>
        </div>

        <div class="job-card-footer">
          <div class="job-dates-info">
            <span>Posted: <strong>${job.postedDate}</strong></span>
            <span>•</span>
            <span>Last Date: <strong style="color: #D34300;">${job.lastDate}</strong></span>
          </div>
          <div class="job-btn-group">
            <button class="btn-view-details" data-job-id="${job.id}">
              VIEW DETAILS
            </button>
            <button class="btn-apply-now" data-apply-url="${job.applyUrl}" data-job-id="${job.id}">
              APPLY NOW ${Icons.external}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // Bind View Details & Apply Now Buttons
  private bindJobButtons(): void {
    // View details click
    document.querySelectorAll('.btn-view-details, .job-card-title').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jobId = (e.currentTarget as HTMLElement).getAttribute('data-job-id');
        if (jobId) {
          JobKhojDataStore.incrementStat('jobViews');
          window.location.hash = `#job/${jobId}`;
        }
      });
    });

    // Apply now click
    document.querySelectorAll('.btn-apply-now').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = (e.currentTarget as HTMLElement).getAttribute('data-apply-url');
        const id = (e.currentTarget as HTMLElement).getAttribute('data-job-id');
        JobKhojDataStore.incrementStat('applyClicks', `Apply Now clicked for Job ID: ${id}`);
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      });
    });
  }

  // =========================================================================
  // JOB DIRECTORY & CATEGORY VIEWS
  // =========================================================================
  private renderJobsView(filterCategory = 'All'): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    main.innerHTML = `
      <div class="directory-layout">
        <div class="container">
          <!-- Job Listing Top Ad Slot 3 -->
          ${this.renderAdSlot('slot-3')}

          <div class="directory-header">
            <h1 class="directory-title">${filterCategory === 'All' ? 'Latest Job Recruitments' : `${filterCategory} Jobs`}</h1>
            <p class="directory-subtitle">Browse all verified central & state recruitment notifications, qualification criteria, and application deadlines.</p>
          </div>

          <!-- Filters Card -->
          <div class="filters-card">
            <div class="flex items-center gap-2" style="font-weight:800;font-size:14px;color:var(--navy);">
              ${Icons.search}
              <span>SEARCH & FILTER RECRUITMENTS</span>
            </div>

            <div class="filters-grid">
              <div class="filter-group">
                <label class="filter-label">Keywords</label>
                <input type="text" id="dir-filter-kw" class="filter-input" placeholder="Role, organization, skill...">
              </div>

              <div class="filter-group">
                <label class="filter-label">Category</label>
                <select id="dir-filter-cat" class="filter-select">
                  <option value="All" ${filterCategory === 'All' ? 'selected' : ''}>All Categories</option>
                  <option value="Government" ${filterCategory === 'Government' ? 'selected' : ''}>Government Jobs</option>
                  <option value="Private" ${filterCategory === 'Private' ? 'selected' : ''}>Private Jobs</option>
                  <option value="Bank" ${filterCategory === 'Bank' ? 'selected' : ''}>Bank Jobs</option>
                  <option value="Railway" ${filterCategory === 'Railway' ? 'selected' : ''}>Railway Jobs</option>
                  <option value="Teaching" ${filterCategory === 'Teaching' ? 'selected' : ''}>Teaching Jobs</option>
                  <option value="Defence" ${filterCategory === 'Defence' ? 'selected' : ''}>Defence Jobs</option>
                  <option value="Police" ${filterCategory === 'Police' ? 'selected' : ''}>Police Jobs</option>
                  <option value="Apprentice" ${filterCategory === 'Apprentice' ? 'selected' : ''}>Apprentice Jobs</option>
                </select>
              </div>

              <div class="filter-group">
                <label class="filter-label">Qualification</label>
                <select id="dir-filter-qual" class="filter-select">
                  <option value="All">All Qualifications</option>
                  <option value="10th Pass">10th Pass</option>
                  <option value="12th Pass">12th Pass</option>
                  <option value="ITI">ITI</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Graduate">Graduate / Degree</option>
                  <option value="Post Graduate">Post Graduate</option>
                  <option value="B.Tech">B.Tech / B.E</option>
                </select>
              </div>

              <div class="filter-group">
                <label class="filter-label">Job Type</label>
                <select id="dir-filter-type" class="filter-select">
                  <option value="All">All Job Types</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Contractual">Contractual</option>
                  <option value="Apprentice">Apprentice</option>
                  <option value="Full Time">Full Time</option>
                </select>
              </div>

              <div class="filter-group">
                <label class="filter-label">Status</label>
                <select id="dir-filter-status" class="filter-select">
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Closing Soon">Closing Soon</option>
                </select>
              </div>
            </div>

            <div class="filter-actions">
              <span class="results-count-text" id="dir-results-count">Loading jobs...</span>
              <button class="btn-reset-filters" id="dir-reset-filters">Reset All Filters</button>
            </div>
          </div>

          <!-- Jobs List Output -->
          <div class="job-cards-list" id="directory-jobs-list"></div>
        </div>
      </div>
    `;

    const applyDirectoryFilters = () => {
      const kw = (document.getElementById('dir-filter-kw') as HTMLInputElement)?.value.toLowerCase().trim();
      const cat = (document.getElementById('dir-filter-cat') as HTMLSelectElement)?.value;
      const qual = (document.getElementById('dir-filter-qual') as HTMLSelectElement)?.value;
      const type = (document.getElementById('dir-filter-type') as HTMLSelectElement)?.value;
      const status = (document.getElementById('dir-filter-status') as HTMLSelectElement)?.value;

      let list = JobKhojDataStore.getJobs().filter(j => j.published);

      if (cat !== 'All') {
        list = list.filter(j => j.category === cat);
      }
      if (type !== 'All') {
        list = list.filter(j => j.jobType === type);
      }
      if (status !== 'All') {
        list = list.filter(j => j.status === status);
      }
      if (qual !== 'All') {
        list = list.filter(j => j.qualification.toLowerCase().includes(qual.toLowerCase()));
      }
      if (kw) {
        list = list.filter(j =>
          j.title.toLowerCase().includes(kw) ||
          j.org.toLowerCase().includes(kw) ||
          j.location.toLowerCase().includes(kw) ||
          j.qualification.toLowerCase().includes(kw)
        );
      }

      const countEl = document.getElementById('dir-results-count');
      if (countEl) {
        countEl.textContent = `Showing ${list.length} recruitment notification${list.length === 1 ? '' : 's'}`;
      }

      const container = document.getElementById('directory-jobs-list');
      if (container) {
        if (list.length === 0) {
          container.innerHTML = `
            <div class="empty-state-box">
              <div class="empty-state-icon">${Icons.emptyState}</div>
              <h3 class="empty-state-title">No matching job recruitments found.</h3>
              <p class="empty-state-sub">Try broadening your search keywords or resetting qualification and category filters.</p>
            </div>
          `;
        } else {
          container.innerHTML = list.map(job => this.renderJobCardHtml(job)).join('');
          this.bindJobButtons();
        }
      }
    };

    // Filter event listeners with debouncing
    document.getElementById('dir-filter-kw')?.addEventListener('input', () => {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = window.setTimeout(applyDirectoryFilters, 200);
    });
    document.getElementById('dir-filter-cat')?.addEventListener('change', applyDirectoryFilters);
    document.getElementById('dir-filter-qual')?.addEventListener('change', applyDirectoryFilters);
    document.getElementById('dir-filter-type')?.addEventListener('change', applyDirectoryFilters);
    document.getElementById('dir-filter-status')?.addEventListener('change', applyDirectoryFilters);

    document.getElementById('dir-reset-filters')?.addEventListener('click', () => {
      (document.getElementById('dir-filter-kw') as HTMLInputElement).value = '';
      (document.getElementById('dir-filter-cat') as HTMLSelectElement).value = 'All';
      (document.getElementById('dir-filter-qual') as HTMLSelectElement).value = 'All';
      (document.getElementById('dir-filter-type') as HTMLSelectElement).value = 'All';
      (document.getElementById('dir-filter-status') as HTMLSelectElement).value = 'All';
      applyDirectoryFilters();
    });

    applyDirectoryFilters();
  }

  private renderCategoryView(catKey: string): void {
    const map: Record<string, string> = {
      'govt': 'Government',
      'private': 'Private',
      'bank': 'Bank',
      'railway': 'Railway',
      'teaching': 'Teaching',
      'defence': 'Defence',
      'police': 'Police',
      'apprentice': 'Apprentice'
    };
    const catName = map[catKey.toLowerCase()] || 'Government';
    this.renderJobsView(catName);
  }

  // =========================================================================
  // JOB DETAILS VIEW
  // =========================================================================
  private renderJobDetailView(idOrSlug: string): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    const jobs = JobKhojDataStore.getJobs();
    const job = jobs.find(j => j.id === idOrSlug || j.slug === idOrSlug) || (jobs.length > 0 ? jobs[0] : null);
    if (!job) {
      main.innerHTML = `
        <div class="container section-padding">
          <div class="empty-state-box">
            <div class="empty-state-icon">${Icons.emptyState}</div>
            <h3 class="empty-state-title">Recruitment Notification Not Found</h3>
            <p class="empty-state-sub">The requested job recruitment could not be found or may have expired.</p>
            <div style="margin-top:16px;">
              <a href="#jobs" class="btn-view-details">Browse All Active Jobs</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const settings = JobKhojDataStore.getSettings();

    // Prepare WhatsApp Apply Message with {{JOB_TITLE}} and {{JOB_ID}} placeholders
    let waMsg = settings.whatsappApplyMsgTemplate || "Hello JOB KHOJ, I want information regarding Job: {{JOB_TITLE}}, Job ID: {{JOB_ID}}";
    waMsg = waMsg.replace(/\{\{JOB_TITLE\}\}/g, job.title).replace(/\{\{JOB_ID\}\}/g, job.id);
    const waApplyUrl = `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMsg)}`;

    main.innerHTML = `
      <div class="container" style="padding-top: 24px; padding-bottom: 64px;">
        <!-- Breadcrumb -->
        <nav class="breadcrumb-nav">
          <a href="#home">Home</a>
          <span class="breadcrumb-separator">›</span>
          <a href="#category-${job.category.toLowerCase()}">${job.category} Jobs</a>
          <span class="breadcrumb-separator">›</span>
          <span>${job.title}</span>
        </nav>

        <!-- Job Detail Top Ad Slot 4 -->
        ${this.renderAdSlot('slot-4')}

        <!-- Main Job Notification Card -->
        <div class="job-detail-card">
          <!-- Detail Header -->
          <div class="detail-header-block">
            <span class="job-category-badge badge-${job.category.toLowerCase()}">${job.category} RECRUITMENT</span>
            <h1 class="detail-job-title">${job.title}</h1>
            <div class="detail-org-name">${job.org}</div>
            <div class="flex items-center gap-3" style="font-size:13px;color:var(--muted);">
              <span>Posted: <strong>${job.postedDate}</strong></span>
              <span>•</span>
              <span>Status: <strong style="color:var(--green);">${job.status}</strong></span>
              <span>•</span>
              <span>Job Type: <strong>${job.jobType}</strong></span>
            </div>
          </div>

          <!-- 6-Box Important Information Grid -->
          <div class="key-stats-grid">
            <div class="stat-box">
              <span class="stat-box-label">Total Vacancies</span>
              <span class="stat-box-value">${job.vacancies}</span>
            </div>
            <div class="stat-box">
              <span class="stat-box-label">Application Start Date</span>
              <span class="stat-box-value">${job.appStartDate}</span>
            </div>
            <div class="stat-box">
              <span class="stat-box-label">Last Date to Apply</span>
              <span class="stat-box-value" style="color:#D34300;">${job.lastDate}</span>
            </div>
            <div class="stat-box">
              <span class="stat-box-label">Exam Date</span>
              <span class="stat-box-value">${job.examDate}</span>
            </div>
            <div class="stat-box">
              <span class="stat-box-label">Job Location</span>
              <span class="stat-box-value">${job.location}</span>
            </div>
            <div class="stat-box">
              <span class="stat-box-label">Educational Qualification</span>
              <span class="stat-box-value">${job.qualification}</span>
            </div>
          </div>

          <!-- Overview / Description -->
          <div class="detail-section">
            <h2 class="detail-section-title">Overview & Recruitment Description</h2>
            <p class="detail-text-content">${job.jobDesc}</p>
          </div>

          <!-- Important Dates -->
          <div class="detail-section">
            <h2 class="detail-section-title">Important Dates</h2>
            <div class="detail-text-content">
              • Notification Released: ${job.postedDate}
              • Online Application Begins: ${job.appStartDate}
              • Last Date for Online Submission & Fee: ${job.lastDate}
              • Tentative Examination / Admit Card Schedule: ${job.examDate}
            </div>
          </div>

          <!-- Eligibility Criteria & Qualification -->
          <div class="detail-section">
            <h2 class="detail-section-title">Eligibility Criteria & Educational Qualification</h2>
            <p class="detail-text-content">Candidates must possess <strong>${job.qualification}</strong> from a recognized State/Central Board, University or Institute as on the prescribed cut-off date.</p>
          </div>

          <!-- Age Limit -->
          <div class="detail-section">
            <h2 class="detail-section-title">Age Limit & Relaxations</h2>
            <p class="detail-text-content">${job.ageLimit}</p>
          </div>

          <!-- Application Fee -->
          <div class="detail-section">
            <h2 class="detail-section-title">Application Fee & Payment Mode</h2>
            <p class="detail-text-content">${job.appFee}</p>
          </div>

          <!-- Selection Process -->
          <div class="detail-section">
            <h2 class="detail-section-title">Selection Process</h2>
            <p class="detail-text-content">${job.selectionProcess}</p>
          </div>

          <!-- Salary / Pay Scale -->
          <div class="detail-section">
            <h2 class="detail-section-title">Salary & Pay Scale</h2>
            <p class="detail-text-content">Selected candidates will be placed in Pay Scale: <strong>${job.salary}</strong> along with admissible allowances as per organization norms.</p>
          </div>

          <!-- Documents Required (Only displays documents configured for this job!) -->
          <div class="detail-section">
            <h2 class="detail-section-title">Documents Required for Application</h2>
            <div class="documents-badges-list">
              ${job.documentsRequired && job.documentsRequired.length > 0 ? job.documentsRequired.map(doc => `
                <span class="doc-badge">
                  ${Icons.file}
                  <span>${doc}</span>
                </span>
              `).join('') : '<span class="detail-text-content">Refer to the official notification for document specifications.</span>'}
            </div>
          </div>

          <!-- Important Links Section -->
          <div class="important-links-box">
            <h3 style="font-size: 17px; font-weight: 900; color: var(--navy); margin-bottom: 6px;">
              IMPORTANT OFFICIAL RECRUITMENT LINKS
            </h3>
            <p style="font-size: 13px; color: var(--muted);">
              Always cross-verify all details from the official recruitment notification PDF before submitting payment.
            </p>

            <div class="links-grid">
              <a href="${job.officialNotifUrl}" target="_blank" rel="noopener noreferrer" class="official-action-link link-notif">
                ${Icons.file}
                <span>OFFICIAL NOTIFICATION</span>
              </a>

              <a href="${job.officialWebsiteUrl}" target="_blank" rel="noopener noreferrer" class="official-action-link link-website">
                ${Icons.external}
                <span>OFFICIAL WEBSITE</span>
              </a>

              <a href="${job.applyUrl}" target="_blank" rel="noopener noreferrer" class="official-action-link link-apply" id="detail-apply-btn">
                <span>APPLY ONLINE NOW ↗</span>
              </a>

              ${settings.enableWhatsappApplyGlobal && job.whatsappApplyEnabled ? `
                <a href="${waApplyUrl}" target="_blank" rel="noopener noreferrer" class="official-action-link link-whatsapp-apply" id="detail-whatsapp-apply-btn">
                  ${Icons.whatsapp}
                  <span>WHATSAPP APPLY / INQUIRE</span>
                </a>
              ` : ''}
            </div>
          </div>

          <!-- Disclaimer Box -->
          <div class="footer-disclaimer-box" style="margin-bottom:0;">
            <strong>VERIFICATION MANDATE:</strong> JOB KHOJ does not collect application fees or recruit directly. All candidate submissions take place on the respective organization's official portal. Ensure all personal details, photograph dimensions, and educational marksheets meet the gazetted standards.
          </div>
        </div>
      </div>
    `;

    // Track Apply click
    document.getElementById('detail-apply-btn')?.addEventListener('click', () => {
      JobKhojDataStore.incrementStat('applyClicks', `Official Apply clicked for ${job.title}`);
    });

    document.getElementById('detail-whatsapp-apply-btn')?.addEventListener('click', () => {
      JobKhojDataStore.incrementStat('whatsappClicks', `WhatsApp Apply initiated for ${job.title}`);
    });
  }

  // =========================================================================
  // COMPETITIVE EXAMS PUBLIC PAGE
  // =========================================================================
  private renderExamsView(): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    const exams = JobKhojDataStore.getExams().filter(e => e.published);

    main.innerHTML = `
      <div class="container section-padding">
        <div class="directory-header">
          <h1 class="directory-title">Competitive Exams</h1>
          <p class="directory-subtitle">National and state entrance and commission exams</p>
        </div>

        <div class="job-cards-list">
          ${exams.length > 0 ? exams.map(ex => `
            <div class="job-card">
              <div class="job-card-header">
                <div class="job-card-title-group">
                  <span class="job-category-badge" style="background:#E9F4FF;color:#0066CC;">COMMISSION EXAM</span>
                  <h3 class="job-card-title">${ex.examName}</h3>
                  <div class="job-card-org">${ex.org}</div>
                </div>
              </div>

              <div class="job-meta-grid" style="grid-template-columns: repeat(3, 1fr);">
                <div class="job-meta-item">
                  <span class="job-meta-label">Exam Date</span>
                  <span class="job-meta-val" style="color:var(--orange);">${ex.examDate}</span>
                </div>
                <div class="job-meta-item">
                  <span class="job-meta-label">Application Last Date</span>
                  <span class="job-meta-val">${ex.lastDate}</span>
                </div>
                <div class="job-meta-item">
                  <span class="job-meta-label">Eligibility</span>
                  <span class="job-meta-val">${ex.eligibility}</span>
                </div>
              </div>

              <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px;">${ex.details}</p>

              <div class="job-card-footer">
                <span>Official Exam Portal</span>
                <a href="${ex.officialUrl}" target="_blank" rel="noopener noreferrer" class="btn-apply-now">
                  EXAM DETAILS & PORTAL ↗
                </a>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state-box">
              <div class="empty-state-icon">${Icons.emptyState}</div>
              <h3 class="empty-state-title">No upcoming competitive exams posted currently.</h3>
              <p class="empty-state-sub">Exam notifications will appear here once released by commissions.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // RESULTS PUBLIC PAGE
  // =========================================================================
  private renderResultsView(): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    const results = JobKhojDataStore.getResults().filter(r => r.published);

    main.innerHTML = `
      <div class="container section-padding">
        <div class="directory-header">
          <h1 class="directory-title">Examination Results</h1>
          <p class="directory-subtitle">Scorecards, merit lists, selection cutoff marks and appointment lists.</p>
        </div>

        <div class="job-cards-list">
          ${results.length > 0 ? results.map(res => `
            <div class="job-card">
              <div class="job-card-header">
                <div>
                  <span class="job-category-badge" style="background:#E8FAF1;color:#20C76A;">DECLARATION</span>
                  <h3 class="job-card-title">${res.resultTitle}</h3>
                  <div class="job-card-org">${res.org} • Exam: ${res.exam}</div>
                </div>
                <span class="job-status-badge status-active">DECLARED</span>
              </div>

              <div style="font-size:14px;color:#334155;line-height:1.6;margin:16px 0;">
                ${res.description}
              </div>

              <div class="job-card-footer">
                <span>Result Declaration Date: <strong>${res.resultDate}</strong></span>
                <div class="flex gap-2">
                  <a href="${res.officialWebsite}" target="_blank" rel="noopener noreferrer" class="btn-view-details">
                    Official Website
                  </a>
                  <a href="${res.resultUrl}" target="_blank" rel="noopener noreferrer" class="btn-apply-now">
                    VIEW RESULT / SCORECARD ↗
                  </a>
                </div>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state-box">
              <div class="empty-state-icon">${Icons.emptyState}</div>
              <h3 class="empty-state-title">No recent examination results declared yet.</h3>
              <p class="empty-state-sub">Results will be refreshed as soon as published by recruiting commissions.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // ADMIT CARDS PUBLIC PAGE
  // =========================================================================
  private renderAdmitCardsView(): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    const cards = JobKhojDataStore.getAdmitCards().filter(c => c.published);

    main.innerHTML = `
      <div class="container section-padding">
        <div class="directory-header">
          <h1 class="directory-title">Admit Cards & Hall Tickets</h1>
          <p class="directory-subtitle">Download online exam call letters, city intimation slips, and reporting instructions.</p>
        </div>

        <div class="job-cards-list">
          ${cards.length > 0 ? cards.map(c => `
            <div class="job-card">
              <div class="job-card-header">
                <div>
                  <span class="job-category-badge badge-railway">HALL TICKET</span>
                  <h3 class="job-card-title">${c.examName}</h3>
                  <div class="job-card-org">${c.org}</div>
                </div>
                <span class="job-status-badge status-active">AVAILABLE</span>
              </div>

              <div class="job-meta-grid" style="grid-template-columns: repeat(2, 1fr);">
                <div class="job-meta-item">
                  <span class="job-meta-label">Release Date</span>
                  <span class="job-meta-val">${c.releaseDate}</span>
                </div>
                <div class="job-meta-item">
                  <span class="job-meta-label">Scheduled Exam Date</span>
                  <span class="job-meta-val" style="color:var(--orange);">${c.examDate}</span>
                </div>
              </div>

              <p style="font-size:14px;color:#334155;line-height:1.6;margin-bottom:16px;">${c.description}</p>

              <div class="job-card-footer">
                <span>Carry valid original Govt ID (Aadhaar/PAN/Voter ID) to the examination center.</span>
                <a href="${c.downloadUrl}" target="_blank" rel="noopener noreferrer" class="btn-apply-now">
                  DOWNLOAD ADMIT CARD ↗
                </a>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state-box">
              <div class="empty-state-icon">${Icons.emptyState}</div>
              <h3 class="empty-state-title">No new admit cards released yet.</h3>
              <p class="empty-state-sub">New hall ticket releases will be posted here as soon as announced.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // BLOG / CAREER UPDATES
  // =========================================================================
  private renderBlogView(): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    const articles = JobKhojDataStore.getBlog().filter(b => b.published);

    main.innerHTML = `
      <div class="container section-padding">
        <div class="directory-header">
          <h1 class="directory-title">Career & Exam Preparation Blog</h1>
          <p class="directory-subtitle">Expert guides, salary breakdowns, syllabus trends, and study timetables.</p>
        </div>

        <div class="blog-grid">
          ${articles.length > 0 ? articles.map(art => `
            <article class="blog-card">
              <img src="${art.featuredImage}" alt="${art.title}" class="blog-card-img" loading="lazy">
              <div class="blog-card-body">
                <span class="blog-category-tag">${art.category}</span>
                <h3 class="blog-card-title" data-art-slug="${art.slug || art.id}">${art.title}</h3>
                <p class="blog-card-excerpt">${art.excerpt}</p>
                <div class="blog-card-footer">
                  <span>${art.publishedDate}</span>
                  <a href="#article/${art.slug || art.id}" class="view-all-link">Read More →</a>
                </div>
              </div>
            </article>
          `).join('') : `
            <div class="empty-state-box" style="grid-column: 1 / -1;">
              <div class="empty-state-icon">${Icons.emptyState}</div>
              <h3 class="empty-state-title">No articles or study guides published yet.</h3>
              <p class="empty-state-sub">Career insights and notification analysis will appear here once published.</p>
            </div>
          `}
        </div>
      </div>
    `;

    document.querySelectorAll('.blog-card-title').forEach(el => {
      el.addEventListener('click', () => {
        const slug = el.getAttribute('data-art-slug');
        if (slug) window.location.hash = `#article/${slug}`;
      });
    });
  }

  private renderArticleDetailView(slugOrId: string): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    const articles = JobKhojDataStore.getBlog();
    const article = articles.find(a => a.slug === slugOrId || a.id === slugOrId) || (articles.length > 0 ? articles[0] : null);
    if (!article) {
      main.innerHTML = `
        <div class="container section-padding" style="max-width: 860px;">
          <div class="empty-state-box">
            <div class="empty-state-icon">${Icons.emptyState}</div>
            <h3 class="empty-state-title">Article Not Found</h3>
            <p class="empty-state-sub">The requested career article or study guide could not be found.</p>
            <div style="margin-top:16px;">
              <a href="#blog" class="btn-view-details">Browse All Articles</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="container" style="padding-top: 24px; padding-bottom: 64px; max-width: 860px;">
        <nav class="breadcrumb-nav">
          <a href="#home">Home</a>
          <span class="breadcrumb-separator">›</span>
          <a href="#blog">Blog</a>
          <span class="breadcrumb-separator">›</span>
          <span>${article.title}</span>
        </nav>

        <article class="job-detail-card">
          <span class="blog-category-tag" style="font-size:12px;">${article.category}</span>
          <h1 class="detail-job-title" style="margin-top:6px; margin-bottom:12px;">${article.title}</h1>

          <div class="flex items-center gap-4" style="font-size:13px; color:var(--muted); margin-bottom:24px;">
            <span>By <strong>${article.author}</strong></span>
            <span>•</span>
            <span>Published: <strong>${article.publishedDate}</strong></span>
          </div>

          <img src="${article.featuredImage}" alt="${article.title}" style="width:100%; border-radius:var(--radius-md); max-height:420px; object-fit:cover; margin-bottom:28px;">

          <div class="detail-text-content" style="font-size:16px; line-height:1.8;">
            ${article.content}
          </div>

          <div class="important-links-box" style="margin-top:40px;">
            <h4 style="font-size:16px; font-weight:800; color:var(--navy); margin-bottom:8px;">
              Looking for Current Job Openings?
            </h4>
            <p style="font-size:13.5px; color:var(--muted); margin-bottom:14px;">
              Explore over 1,50,000+ verified active vacancies across Government, Banking, Railways, and Private sectors.
            </p>
            <a href="#jobs" class="ad-action-btn" style="display:inline-block;">EXPLORE ALL JOBS →</a>
          </div>
        </article>
      </div>
    `;
  }

  // =========================================================================
  // GLOBAL VANILLA JAVASCRIPT SEARCH VIEW
  // =========================================================================
  private renderSearchResultsView(query: string): void {
    const main = document.getElementById('app-main-content');
    if (!main) return;

    const q = query.toLowerCase().trim();

    const jobs = JobKhojDataStore.getJobs().filter(j => j.published && (
      j.title.toLowerCase().includes(q) ||
      j.org.toLowerCase().includes(q) ||
      j.category.toLowerCase().includes(q) ||
      j.qualification.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.jobDesc.toLowerCase().includes(q)
    ));

    const exams = JobKhojDataStore.getExams().filter(e => e.published && (
      e.examName.toLowerCase().includes(q) ||
      e.org.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q)
    ));

    const results = JobKhojDataStore.getResults().filter(r => r.published && (
      r.resultTitle.toLowerCase().includes(q) ||
      r.org.toLowerCase().includes(q) ||
      r.exam.toLowerCase().includes(q)
    ));

    const admitCards = JobKhojDataStore.getAdmitCards().filter(a => a.published && (
      a.examName.toLowerCase().includes(q) ||
      a.org.toLowerCase().includes(q)
    ));

    const blog = JobKhojDataStore.getBlog().filter(b => b.published && (
      b.title.toLowerCase().includes(q) ||
      b.content.toLowerCase().includes(q)
    ));

    const totalMatches = jobs.length + exams.length + results.length + admitCards.length + blog.length;

    main.innerHTML = `
      <div class="search-results-page">
        <div class="container">
          <div class="search-summary-bar">
            <div>
              <h1 style="font-size:22px;font-weight:900;color:var(--navy);">Search Results for "${query}"</h1>
              <span style="font-size:13.5px;color:var(--muted);">${totalMatches} total match${totalMatches === 1 ? '' : 'es'} across all recruitment updates</span>
            </div>
            <a href="#home" class="btn-view-details">New Search</a>
          </div>

          ${totalMatches === 0 ? `
            <div class="empty-state-box">
              <div class="empty-state-icon">${Icons.emptyState}</div>
              <h3 class="empty-state-title">No matches found for "${query}".</h3>
              <p class="empty-state-sub">Check for typos, try keywords like "10th Pass", "Railway", "Bank PO", "SSC", or browse all categories.</p>
            </div>
          ` : `
            <!-- Job Matches -->
            ${jobs.length > 0 ? `
              <div class="section-header-flex">
                <h2 class="section-heading">Matching Jobs (${jobs.length})</h2>
              </div>
              <div class="job-cards-list">
                ${jobs.map(j => this.renderJobCardHtml(j)).join('')}
              </div>
            ` : ''}

            <!-- Exam Matches -->
            ${exams.length > 0 ? `
              <div class="section-header-flex" style="margin-top:32px;">
                <h2 class="section-heading">Matching Exams (${exams.length})</h2>
              </div>
              <div class="job-cards-list">
                ${exams.map(e => `
                  <div class="job-card">
                    <h3 class="job-card-title">${e.examName}</h3>
                    <div class="job-card-org">${e.org} • Exam Date: ${e.examDate}</div>
                    <p style="font-size:13.5px;color:#4A5568;margin:10px 0;">${e.details}</p>
                    <a href="${e.officialUrl}" target="_blank" rel="noopener noreferrer" class="btn-apply-now" style="display:inline-block;">EXAM PORTAL ↗</a>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Results & Admit Card Matches -->
            ${(results.length > 0 || admitCards.length > 0) ? `
              <div class="twin-columns-grid" style="margin-top:32px;">
                ${results.length > 0 ? `
                  <div class="twin-card-container">
                    <h3 class="twin-card-title">Results Matches (${results.length})</h3>
                    <div class="item-row-list" style="margin-top:14px;">
                      ${results.map(r => `
                        <div class="item-row">
                          <div class="item-row-title">${r.resultTitle}</div>
                          <div class="item-row-org">${r.org}</div>
                          <a href="${r.resultUrl}" target="_blank" class="btn-item-action" style="align-self:flex-start;margin-top:6px;">View Result ↗</a>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                ${admitCards.length > 0 ? `
                  <div class="twin-card-container">
                    <h3 class="twin-card-title">Admit Card Matches (${admitCards.length})</h3>
                    <div class="item-row-list" style="margin-top:14px;">
                      ${admitCards.map(a => `
                        <div class="item-row">
                          <div class="item-row-title">${a.examName}</div>
                          <div class="item-row-org">${a.org} • Exam: ${a.examDate}</div>
                          <a href="${a.downloadUrl}" target="_blank" class="btn-item-action" style="align-self:flex-start;margin-top:6px;">Download ↗</a>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          `}
        </div>
      </div>
    `;

    this.bindJobButtons();
  }

  // =========================================================================
  // ADMIN SYSTEM (AUTHENTICATION & SECURE PORTAL)
  // Accessible strictly via /admin or #admin
  // =========================================================================
  private renderAdminLogin(): void {
    const root = document.getElementById('root');
    if (!root) return;

    root.innerHTML = `
      <div class="admin-login-screen">
        <div class="login-card">
          <div class="login-header">
            <div class="brand-logo justify-center">
              <div class="logo-icon-box" aria-hidden="true"><svg viewBox="0 0 48 48" width="38" height="38" role="img"><circle cx="24" cy="24" r="21" fill="#fff" stroke="#0B63CE" stroke-width="3"/><circle cx="24" cy="24" r="14" fill="#0B63CE" opacity=".10"/><rect x="16" y="15" width="16" height="13" rx="2.5" fill="#FF3B3B"/><path d="M18 28h12l3 6H15l3-6Z" fill="#0B63CE"/><path d="M19 18l5 4 5-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
              <div class="logo-text-group">
                <div class="logo-title">
                  <span class="logo-job" style="color:#FFF;">JOB</span>
                  <span class="logo-khoj">KHOJ</span>
                </div>
              </div>
            </div>
            <h2 class="login-title">Portal Administration</h2>
            <p class="login-sub">Sign in with authorized staff credentials</p>
          </div>

          <form id="admin-login-form">
            <div class="admin-form-group">
              <label class="admin-form-label">Admin Email / Username</label>
              <input type="email" id="login-email" class="admin-form-input" required placeholder="Enter admin email" value="">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Password</label>
              <input type="password" id="login-password" class="admin-form-input" required placeholder="••••••••">
            </div>

            <div id="login-error-msg" style="color:#F87171;font-size:13px;margin-bottom:14px;display:none;"></div>

            <button type="submit" class="btn-admin-submit">LOG IN TO DASHBOARD</button>

            <div style="margin-top:20px;text-align:center;">
              <a href="#home" style="font-size:13px;color:#94A3B8;">← Return to Public Website</a>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = (document.getElementById('login-email') as HTMLInputElement).value.trim();
      const passInput = (document.getElementById('login-password') as HTMLInputElement).value;
      const errEl = document.getElementById('login-error-msg');

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password: passInput
        });

        if (error || !data.user) {
          if (errEl) {
            errEl.style.display = 'block';
            errEl.textContent = 'Invalid administrator credentials. Please check your email and password.';
          }
          return;
        }

        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (adminError || !adminUser) {
          await supabase.auth.signOut();
          if (errEl) {
            errEl.style.display = 'block';
            errEl.textContent = 'You are authenticated, but you are not authorized to access the Admin Panel.';
          }
          return;
        }

        JobKhojDataStore.setAdminLoggedIn(true);
        this.showToast('Successfully authenticated as Administrator');
        window.location.hash = '#admin/overview';
      } catch (error) {
        console.error('Admin login failed:', error);
        if (errEl) {
          errEl.style.display = 'block';
          errEl.textContent = 'Unable to sign in right now. Please try again.';
        }
      }
    });
  }

  // Render full Admin Dashboard with EXACT REQUIRED SIDEBAR
  private renderAdminDashboard(): void {
    const root = document.getElementById('root');
    if (!root) return;

    const jobs = JobKhojDataStore.getJobs();
    const exams = JobKhojDataStore.getExams();
    const results = JobKhojDataStore.getResults();
    const admitCards = JobKhojDataStore.getAdmitCards();
    const blog = JobKhojDataStore.getBlog();
    const activeTab = this.currentAdminTab;

    root.innerHTML = `
      <div class="admin-wrapper">
        <!-- Top Admin Header -->
        <header class="admin-top-bar">
          <div class="admin-brand">
            <div class="brand-logo">
              <div class="logo-icon-box" aria-hidden="true"><svg viewBox="0 0 48 48" width="38" height="38" role="img"><circle cx="24" cy="24" r="21" fill="#fff" stroke="#0B63CE" stroke-width="3"/><circle cx="24" cy="24" r="14" fill="#0B63CE" opacity=".10"/><rect x="16" y="15" width="16" height="13" rx="2.5" fill="#FF3B3B"/><path d="M18 28h12l3 6H15l3-6Z" fill="#0B63CE"/><path d="M19 18l5 4 5-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
              <div class="logo-title" style="font-size:19px;">
                <span class="logo-job" style="color:#FFF;">JOB</span>
                <span class="logo-khoj">KHOJ</span>
              </div>
            </div>
            <span class="admin-badge">ADMIN CONTROL</span>
          </div>

          <div class="admin-top-actions">
            <a href="#home" class="btn-admin-public">
              ${Icons.external}
              <span>Visit Public Site</span>
            </a>
            <button class="btn-admin-logout" id="admin-logout-btn">
              Log Out
            </button>
          </div>
        </header>

        <!-- Admin Workspace Body -->
        <div class="admin-body">
          <!-- Exact Required Admin Sidebar -->
          <aside class="admin-sidebar" id="admin-sidebar">
            <div class="admin-nav-item ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
              <div class="admin-nav-item-left">
                ${Icons.trending}
                <span>Overview & Analytics</span>
              </div>
            </div>

            <div class="admin-nav-item ${activeTab === 'jobs' ? 'active' : ''}" data-tab="jobs">
              <div class="admin-nav-item-left">
                ${Icons.building}
                <span>Manage Jobs</span>
              </div>
              <span class="admin-item-count">${jobs.length}</span>
            </div>

            <div class="admin-nav-item ${activeTab === 'exams' ? 'active' : ''}" data-tab="exams">
              <div class="admin-nav-item-left">
                ${Icons.award}
                <span>Manage Exams</span>
              </div>
              <span class="admin-item-count">${exams.length}</span>
            </div>

            <div class="admin-nav-item ${activeTab === 'results' ? 'active' : ''}" data-tab="results">
              <div class="admin-nav-item-left">
                ${Icons.file}
                <span>Manage Results</span>
              </div>
              <span class="admin-item-count">${results.length}</span>
            </div>

            <div class="admin-nav-item ${activeTab === 'admit-cards' ? 'active' : ''}" data-tab="admit-cards">
              <div class="admin-nav-item-left">
                ${Icons.calendar}
                <span>Manage Admit Cards</span>
              </div>
              <span class="admin-item-count">${admitCards.length}</span>
            </div>

            <div class="admin-nav-item ${activeTab === 'blog' ? 'active' : ''}" data-tab="blog">
              <div class="admin-nav-item-left">
                ${Icons.book}
                <span>Manage Blog</span>
              </div>
              <span class="admin-item-count">${blog.length}</span>
            </div>

            <!-- Separator -->
            <div class="admin-sidebar-separator"></div>

            <div class="admin-nav-item ${activeTab === 'ads' ? 'active' : ''}" data-tab="ads">
              <div class="admin-nav-item-left">
                ${Icons.megaphone}
                <span>Advertisement System</span>
              </div>
            </div>

            <div class="admin-nav-item ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
              <div class="admin-nav-item-left">
                ${Icons.settings}
                <span>WhatsApp & Site Settings</span>
              </div>
            </div>

            <div class="admin-nav-item ${activeTab === 'tools' ? 'active' : ''}" data-tab="tools">
              <div class="admin-nav-item-left">
                ${Icons.settings}
                <span>Advanced Tools</span>
              </div>
            </div>

            <div class="admin-nav-item ${activeTab === 'password' ? 'active' : ''}" data-tab="password">
              <div class="admin-nav-item-left">
                ${Icons.lock}
                <span>Change Admin Password</span>
              </div>
            </div>
          </aside>

          <!-- Admin Main Sub-view Container -->
          <main class="admin-main-content" id="admin-main-view"></main>
        </div>
      </div>

      <!-- Container for Dynamic Admin Modals -->
      <div id="admin-modal-root"></div>
    `;

    // Sidebar navigation handler
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        if (tab) {
          window.location.hash = `#admin/${tab}`;
        }
      });
    });

    // Logout handler
    document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
      await supabase.auth.signOut();
      JobKhojDataStore.setAdminLoggedIn(false);
      this.showToast('Logged out of admin panel');
      window.location.hash = '#home';
    });

    // Render active tab view
    this.renderAdminSubView(activeTab);
  }

  private renderAdminSubView(tab: string): void {
    const container = document.getElementById('admin-main-view');
    if (!container) return;

    switch (tab) {
      case 'overview':
        this.renderAdminOverview(container);
        break;
      case 'jobs':
        this.renderAdminJobs(container);
        break;
      case 'exams':
        this.renderAdminExams(container);
        break;
      case 'results':
        this.renderAdminResults(container);
        break;
      case 'admit-cards':
        this.renderAdminAdmitCards(container);
        break;
      case 'blog':
        this.renderAdminBlog(container);
        break;
      case 'ads':
        this.renderAdminAds(container);
        break;
      case 'settings':
        this.renderAdminSettings(container);
        break;
      case 'tools':
        this.renderAdminTools(container);
        break;
      case 'password':
        this.renderAdminPassword(container);
        break;
      default:
        this.renderAdminOverview(container);
        break;
    }
  }

  // 1. Overview & Analytics Sub-view
  private renderAdminOverview(container: HTMLElement): void {
    const analytics = JobKhojDataStore.getAnalytics();
    const jobs = JobKhojDataStore.getJobs();

    container.innerHTML = `
      <div>
        <div class="admin-view-header">
          <div>
            <h1 class="admin-heading">System Overview & Analytics</h1>
            <p class="admin-subheading">Real-time interaction stats, apply button clicks, and search trends</p>
          </div>
        </div>

        <!-- 5 Key Stats Metrics Cards -->
        <div class="admin-stats-grid">
          <div class="stat-metric-card">
            <span class="metric-label">TOTAL PAGE VIEWS</span>
            <span class="metric-value">${analytics.totalPageViews.toLocaleString()}</span>
          </div>

          <div class="stat-metric-card">
            <span class="metric-label">JOB VIEWS</span>
            <span class="metric-value">${analytics.jobViews.toLocaleString()}</span>
          </div>

          <div class="stat-metric-card">
            <span class="metric-label">APPLY CLICKS</span>
            <span class="metric-value" style="color:var(--orange);">${analytics.applyClicks.toLocaleString()}</span>
          </div>

          <div class="stat-metric-card">
            <span class="metric-label">WHATSAPP CLICKS</span>
            <span class="metric-value" style="color:var(--green);">${analytics.whatsappClicks.toLocaleString()}</span>
          </div>

          <div class="stat-metric-card">
            <span class="metric-label">SEARCH QUERIES</span>
            <span class="metric-value">${analytics.searchQueries.toLocaleString()}</span>
          </div>
        </div>

        <!-- Two Columns: Top Searches & Recent Activity Feed -->
        <div class="twin-columns-grid">
          <div class="stat-metric-card">
            <h3 style="font-size:16px;font-weight:900;color:#FFF;margin-bottom:14px;">TOP SEARCH TERMS</h3>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${analytics.topSearches.length > 0 ? analytics.topSearches.slice(0, 8).map(s => `
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.25);padding:8px 12px;border-radius:6px;">
                  <span style="font-weight:700;color:#E2E8F0;">${s.term}</span>
                  <span style="color:var(--orange);font-weight:800;">${s.count} searches</span>
                </div>
              `).join('') : `
                <div style="color:#94A3B8;font-size:13px;padding:8px 0;">No searches recorded yet. Search queries will appear here in real-time.</div>
              `}
            </div>
          </div>

          <div class="stat-metric-card">
            <h3 style="font-size:16px;font-weight:900;color:#FFF;margin-bottom:14px;">RECENT LIVE ACTIVITY</h3>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${analytics.recentActivity.length > 0 ? analytics.recentActivity.slice(0, 7).map(act => `
                <div style="display:flex;align-items:center;gap:10px;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="color:var(--orange);">●</span>
                  <span style="flex:1;color:#CBD5E1;">${act.text}</span>
                  <span style="color:#64748B;font-size:12px;">${act.time}</span>
                </div>
              `).join('') : `
                <div style="color:#94A3B8;font-size:13px;padding:8px 0;">No visitor activity recorded yet. Views and clicks will be logged here.</div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Manage Jobs Sub-view
  private renderAdminJobs(container: HTMLElement): void {
    const jobs = JobKhojDataStore.getJobs();

    container.innerHTML = `
      <div>
        <div class="admin-view-header">
          <div>
            <h1 class="admin-heading">Manage Job Recruitments</h1>
            <p class="admin-subheading">Total ${jobs.length} recruitments in database</p>
          </div>
          <button class="btn-admin-action-primary" id="admin-create-job-btn">
            ${Icons.plus}
            <span>+ CREATE NEW JOB</span>
          </button>
        </div>

        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>JOB TITLE & ORG</th>
                <th>CATEGORY</th>
                <th>VACANCIES</th>
                <th>LAST DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              ${jobs.length > 0 ? jobs.map(job => `
                <tr>
                  <td>
                    <div class="admin-table-title">${job.title}</div>
                    <div class="admin-table-sub">${job.org}</div>
                  </td>
                  <td><span class="job-category-badge badge-${job.category.toLowerCase()}">${job.category}</span></td>
                  <td><strong>${job.vacancies}</strong></td>
                  <td>${job.lastDate}</td>
                  <td>
                    <span class="job-status-badge ${job.published ? 'status-active' : 'status-expired'}">
                      ${job.published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </td>
                  <td>
                    <div class="admin-actions-cell">
                      <button class="btn-table-action job-edit-btn" data-id="${job.id}">Edit</button>
                      <button class="btn-table-action job-duplicate-btn" data-id="${job.id}">Duplicate</button>
                      <button class="btn-table-action job-toggle-btn" data-id="${job.id}">
                        ${job.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button class="btn-table-action btn-table-delete job-delete-btn" data-id="${job.id}">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="6" style="text-align:center;padding:32px;color:var(--muted);">
                    No job notifications created yet. Click <strong>+ CREATE NEW JOB</strong> to add your first recruitment.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind Create Job Button
    document.getElementById('admin-create-job-btn')?.addEventListener('click', () => {
      this.openJobModal(null);
    });

    // Actions
    document.querySelectorAll('.job-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = jobs.find(j => j.id === id);
        if (item) this.openJobModal(item);
      });
    });

    document.querySelectorAll('.job-duplicate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = jobs.find(j => j.id === id);
        if (item) {
          const clone: JobItem = {
            ...item,
            id: 'jk-' + Date.now(),
            title: `${item.title} (Copy)`,
            slug: `${item.slug}-copy`,
            published: false
          };
          jobs.unshift(clone);
          JobKhojDataStore.saveJobs(jobs);
          this.showToast('Job recruitment duplicated as draft');
          this.renderAdminJobs(container);
        }
      });
    });

    document.querySelectorAll('.job-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = jobs.find(j => j.id === id);
        if (item) {
          item.published = !item.published;
          JobKhojDataStore.saveJobs(jobs);
          this.showToast(`Job ${item.published ? 'published' : 'unpublished'}`);
          this.renderAdminJobs(container);
        }
      });
    });

    document.querySelectorAll('.job-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this job recruitment?')) {
          const updated = jobs.filter(j => j.id !== id);
          JobKhojDataStore.saveJobs(updated);
          this.showToast('Job recruitment deleted');
          this.renderAdminJobs(container);
        }
      });
    });
  }

  // Job Modal Dialog (Create & Edit)
  private openJobModal(existing: JobItem | null): void {
    const modalRoot = document.getElementById('admin-modal-root');
    if (!modalRoot) return;

    const docList = [
      'Aadhaar Card',
      'Educational Certificates',
      'Passport Size Photograph',
      'Signature',
      'Caste Certificate',
      'Domicile Certificate',
      'Experience Certificate',
      'Other required documents'
    ];

    modalRoot.innerHTML = `
      <div class="admin-modal-overlay open" id="job-modal-overlay">
        <div class="admin-modal">
          <div class="admin-modal-header">
            <h3 class="admin-modal-title">${existing ? 'Edit Job Recruitment' : 'Create New Job Recruitment'}</h3>
            <button class="admin-modal-close" id="job-modal-close">${Icons.x}</button>
          </div>

          <form id="job-modal-form" class="admin-modal-body">
            <div class="admin-form-section-title">1. Basic Information</div>
            <div class="admin-form-group">
              <label class="admin-form-label">Job Title *</label>
              <input type="text" id="m-title" class="admin-form-input" required value="${existing?.title || ''}">
            </div>

            <div class="admin-form-row">
              <div class="admin-form-group">
                <label class="admin-form-label">Organization *</label>
                <input type="text" id="m-org" class="admin-form-input" required value="${existing?.org || ''}">
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label">Category *</label>
                <select id="m-category" class="admin-form-select">
                  ${['Government', 'Private', 'Bank', 'Railway', 'Teaching', 'Defence', 'Police', 'Apprentice'].map(c => `
                    <option value="${c}" ${existing?.category === c ? 'selected' : ''}>${c} Jobs</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="admin-form-row">
              <div class="admin-form-group">
                <label class="admin-form-label">Job Type</label>
                <select id="m-jobType" class="admin-form-select">
                  ${['Permanent', 'Contractual', 'Apprentice', 'Full Time'].map(t => `
                    <option value="${t}" ${existing?.jobType === t ? 'selected' : ''}>${t}</option>
                  `).join('')}
                </select>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label">Total Vacancies *</label>
                <input type="text" id="m-vacancies" class="admin-form-input" required placeholder="e.g. 5,420 Posts" value="${existing?.vacancies || ''}">
              </div>
            </div>

            <div class="admin-form-row">
              <div class="admin-form-group">
                <label class="admin-form-label">Qualification *</label>
                <input type="text" id="m-qual" class="admin-form-input" required placeholder="e.g. 10th Pass / Graduate" value="${existing?.qualification || ''}">
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label">Location *</label>
                <input type="text" id="m-location" class="admin-form-input" required placeholder="e.g. All India / Delhi" value="${existing?.location || ''}">
              </div>
            </div>

            <div class="admin-form-row">
              <div class="admin-form-group">
                <label class="admin-form-label">Salary / Pay Scale</label>
                <input type="text" id="m-salary" class="admin-form-input" value="${existing?.salary || ''}">
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label">Age Limit</label>
                <input type="text" id="m-age" class="admin-form-input" value="${existing?.ageLimit || ''}">
              </div>
            </div>

            <div class="admin-form-section-title">2. Important Dates</div>
            <div class="admin-form-row">
              <div class="admin-form-group">
                <label class="admin-form-label">Application Start Date</label>
                <input type="text" id="m-start" class="admin-form-input" placeholder="e.g. 10 Feb 2026" value="${existing?.appStartDate || ''}">
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label">Application Last Date *</label>
                <input type="text" id="m-last" class="admin-form-input" required placeholder="e.g. 25 Mar 2026" value="${existing?.lastDate || ''}">
              </div>
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Exam Date</label>
              <input type="text" id="m-exam" class="admin-form-input" placeholder="e.g. May 2026" value="${existing?.examDate || ''}">
            </div>

            <div class="admin-form-section-title">3. Fee & Selection</div>
            <div class="admin-form-group">
              <label class="admin-form-label">Application Fee</label>
              <input type="text" id="m-fee" class="admin-form-input" value="${existing?.appFee || ''}">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Selection Process</label>
              <textarea id="m-selection" class="admin-form-textarea" rows="2">${existing?.selectionProcess || ''}</textarea>
            </div>

            <div class="admin-form-section-title">4. Documents Required (Check those applicable)</div>
            <div class="checkbox-group-grid">
              ${docList.map(doc => `
                <label class="checkbox-label-item">
                  <input type="checkbox" name="m-docs" value="${doc}" ${existing?.documentsRequired?.includes(doc) ? 'checked' : ''}>
                  <span>${doc}</span>
                </label>
              `).join('')}
            </div>

            <div class="admin-form-section-title">5. Description & Instructions</div>
            <div class="admin-form-group">
              <label class="admin-form-label">Job Description</label>
              <textarea id="m-desc" class="admin-form-textarea" rows="3">${existing?.jobDesc || ''}</textarea>
            </div>

            <div class="admin-form-section-title">6. Important Links</div>
            <div class="admin-form-group">
              <label class="admin-form-label">Official Notification URL</label>
              <input type="url" id="m-notif-url" class="admin-form-input" value="${existing?.officialNotifUrl || 'https://'}">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Official Website URL</label>
              <input type="url" id="m-web-url" class="admin-form-input" value="${existing?.officialWebsiteUrl || 'https://'}">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Apply Now URL</label>
              <input type="url" id="m-apply-url" class="admin-form-input" value="${existing?.applyUrl || 'https://'}">
            </div>

            <div class="admin-form-section-title">7. URL Slug & Publishing</div>
            <div class="admin-form-group">
              <label class="admin-form-label">URL Slug (Auto-generated or custom)</label>
              <input type="text" id="m-slug" class="admin-form-input" value="${existing?.slug || ''}">
            </div>

            <div class="flex items-center gap-6" style="margin-top:10px;">
              <label class="checkbox-label-item">
                <input type="checkbox" id="m-wa-enable" ${existing?.whatsappApplyEnabled ?? true ? 'checked' : ''}>
                <span>WhatsApp Apply Enabled</span>
              </label>

              <label class="checkbox-label-item">
                <input type="checkbox" id="m-featured" ${existing?.featured ? 'checked' : ''}>
                <span>Featured on Homepage</span>
              </label>
            </div>

            <div class="admin-modal-footer">
              <button type="button" class="btn-table-action" id="job-modal-cancel">CANCEL</button>
              <button type="button" class="btn-table-action" id="job-modal-save-draft">SAVE DRAFT</button>
              <button type="submit" class="btn-admin-action-primary">PUBLISH JOB</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = document.getElementById('job-modal-overlay');
    const closeBtn = document.getElementById('job-modal-close');
    const cancelBtn = document.getElementById('job-modal-cancel');
    const titleInput = document.getElementById('m-title') as HTMLInputElement;
    const slugInput = document.getElementById('m-slug') as HTMLInputElement;

    const closeModal = () => {
      modalRoot.innerHTML = '';
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Auto-generate slug from title
    titleInput?.addEventListener('input', () => {
      if (!existing) {
        slugInput.value = titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
    });

    const saveForm = (publishedState: boolean) => {
      const selectedDocs: string[] = [];
      document.querySelectorAll<HTMLInputElement>('input[name="m-docs"]:checked').forEach(cb => {
        selectedDocs.push(cb.value);
      });

      const title = titleInput.value.trim();
      const org = (document.getElementById('m-org') as HTMLInputElement).value.trim();
      if (!title || !org) {
        alert('Please fill in required fields: Job Title and Organization.');
        return;
      }

      let slug = slugInput.value.trim();
      if (!slug) {
        slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      const item: JobItem = {
        id: existing ? existing.id : 'jk-' + Date.now(),
        title,
        org,
        category: (document.getElementById('m-category') as HTMLSelectElement).value as any,
        jobType: (document.getElementById('m-jobType') as HTMLSelectElement).value as any,
        vacancies: (document.getElementById('m-vacancies') as HTMLInputElement).value.trim() || 'Various Posts',
        qualification: (document.getElementById('m-qual') as HTMLInputElement).value.trim(),
        location: (document.getElementById('m-location') as HTMLInputElement).value.trim(),
        salary: (document.getElementById('m-salary') as HTMLInputElement).value.trim() || 'As per norms',
        ageLimit: (document.getElementById('m-age') as HTMLInputElement).value.trim() || 'As per rules',
        appStartDate: (document.getElementById('m-start') as HTMLInputElement).value.trim() || 'Active',
        lastDate: (document.getElementById('m-last') as HTMLInputElement).value.trim(),
        examDate: (document.getElementById('m-exam') as HTMLInputElement).value.trim() || 'To be announced',
        appFee: (document.getElementById('m-fee') as HTMLInputElement).value.trim() || 'Refer notification',
        selectionProcess: (document.getElementById('m-selection') as HTMLTextAreaElement).value.trim() || 'Written Exam & Document Verification',
        documentsRequired: selectedDocs,
        jobDesc: (document.getElementById('m-desc') as HTMLTextAreaElement).value.trim(),
        officialNotifUrl: (document.getElementById('m-notif-url') as HTMLInputElement).value.trim(),
        officialWebsiteUrl: (document.getElementById('m-web-url') as HTMLInputElement).value.trim(),
        applyUrl: (document.getElementById('m-apply-url') as HTMLInputElement).value.trim(),
        whatsappApplyEnabled: (document.getElementById('m-wa-enable') as HTMLInputElement).checked,
        featured: (document.getElementById('m-featured') as HTMLInputElement).checked,
        published: publishedState,
        slug,
        postedDate: existing ? existing.postedDate : `${new Date().getDate()} ${new Date().toLocaleString('default', { month: 'short' })} ${new Date().getFullYear()}`,
        status: 'Active'
      };

      const jobs = JobKhojDataStore.getJobs();
      if (existing) {
        const idx = jobs.findIndex(j => j.id === existing.id);
        if (idx !== -1) jobs[idx] = item;
      } else {
        jobs.unshift(item);
      }

      JobKhojDataStore.saveJobs(jobs);
      this.showToast(`Job recruitment ${publishedState ? 'published' : 'saved as draft'}`);
      closeModal();
      const main = document.getElementById('admin-main-view');
      if (main) this.renderAdminJobs(main);
    };

    document.getElementById('job-modal-save-draft')?.addEventListener('click', () => saveForm(false));
    document.getElementById('job-modal-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveForm(true);
    });
  }

  // 3. Competitive Exams Admin Sub-view
  private renderAdminExams(container: HTMLElement): void {
    const exams = JobKhojDataStore.getExams();

    container.innerHTML = `
      <div>
        <div class="admin-view-header">
          <div>
            <h1 class="admin-heading">Manage Competitive Exams</h1>
            <p class="admin-subheading">Total ${exams.length} competitive exam notifications in database</p>
          </div>
          <button class="btn-admin-action-primary" id="admin-add-exam-btn">${Icons.plus}<span>+ CREATE NEW EXAM</span></button>
        </div>
        <div class="admin-table-container">
          <table class="admin-table">
            <thead><tr>
              <th>EXAM NAME & ORG</th><th>EXAM DATE</th><th>LAST DATE</th><th>STATUS</th><th>ACTIONS</th>
            </tr></thead>
            <tbody>
              ${exams.length ? exams.map(ex => `
                <tr>
                  <td><div class="admin-table-title">${this.escapeHtml(ex.examName)}</div><div class="admin-table-sub">${this.escapeHtml(ex.org)}</div></td>
                  <td><strong>${this.escapeHtml(ex.examDate)}</strong></td>
                  <td>${this.escapeHtml(ex.lastDate)}</td>
                  <td><span class="job-status-badge ${ex.published ? 'status-active' : 'status-expired'}">${ex.published ? 'PUBLISHED' : 'DRAFT'}</span></td>
                  <td><div class="admin-actions-cell">
                    <button class="btn-table-action exam-edit-btn" data-id="${ex.id}">Edit</button>
                    <button class="btn-table-action exam-duplicate-btn" data-id="${ex.id}">Duplicate</button>
                    <button class="btn-table-action exam-toggle-btn" data-id="${ex.id}">${ex.published ? 'Unpublish' : 'Publish'}</button>
                    <button class="btn-table-action btn-table-delete exam-delete-btn" data-id="${ex.id}">Delete</button>
                  </div></td>
                </tr>`).join('') : `
                <tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted);">No competitive exams created yet. Click <strong>+ CREATE NEW EXAM</strong> to add one.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('admin-add-exam-btn')?.addEventListener('click', () => this.openExamModal(null));
    document.querySelectorAll('.exam-edit-btn').forEach(btn => btn.addEventListener('click', () => {
      const item = exams.find(x => x.id === btn.getAttribute('data-id')); if (item) this.openExamModal(item);
    }));
    document.querySelectorAll('.exam-duplicate-btn').forEach(btn => btn.addEventListener('click', () => {
      const item = exams.find(x => x.id === btn.getAttribute('data-id')); if (!item) return;
      exams.unshift({...item, id:'ex-'+Date.now(), examName:`${item.examName} (Copy)`, published:false});
      JobKhojDataStore.saveExams(exams); this.showToast('Exam duplicated as draft'); this.renderAdminExams(container);
    }));
    document.querySelectorAll('.exam-toggle-btn').forEach(btn => btn.addEventListener('click', () => {
      const item = exams.find(x => x.id === btn.getAttribute('data-id')); if (!item) return;
      item.published=!item.published; JobKhojDataStore.saveExams(exams);
      this.showToast(`Exam ${item.published ? 'published' : 'unpublished'}`); this.renderAdminExams(container);
    }));
    document.querySelectorAll('.exam-delete-btn').forEach(btn => btn.addEventListener('click', () => {
      if (!confirm('Are you sure you want to delete this competitive exam?')) return;
      JobKhojDataStore.saveExams(exams.filter(x => x.id !== btn.getAttribute('data-id')));
      this.showToast('Exam deleted'); this.renderAdminExams(container);
    }));
  }

  private openExamModal(existing: ExamItem | null): void {
    const root=document.getElementById('admin-modal-root'); if(!root) return;
    root.innerHTML=`<div class="admin-modal-overlay" id="content-modal-overlay"><div class="admin-modal" style="max-width:760px;">
      <div class="admin-modal-header"><div><h2 class="admin-modal-title">${existing?'Edit Competitive Exam':'Create Competitive Exam'}</h2><p class="admin-subheading">Manage exam details just like a job recruitment.</p></div><button class="admin-modal-close" id="content-modal-close">×</button></div>
      <form id="content-modal-form">
        <div class="admin-form-section-title">Exam Information</div>
        <div class="admin-form-group"><label class="admin-form-label">Exam Name *</label><input id="cm-name" class="admin-form-input" required value="${this.escapeHtml(existing?.examName||'')}"></div>
        <div class="admin-form-group"><label class="admin-form-label">Conducting Organization *</label><input id="cm-org" class="admin-form-input" required value="${this.escapeHtml(existing?.org||'')}"></div>
        <div class="admin-form-group"><label class="admin-form-label">Exam Date</label><input id="cm-exam-date" class="admin-form-input" value="${this.escapeHtml(existing?.examDate||'')}"></div>
        <div class="admin-form-group"><label class="admin-form-label">Application Last Date</label><input id="cm-last-date" class="admin-form-input" value="${this.escapeHtml(existing?.lastDate||'')}"></div>
        <div class="admin-form-group"><label class="admin-form-label">Eligibility</label><input id="cm-eligibility" class="admin-form-input" value="${this.escapeHtml(existing?.eligibility||'')}"></div>
        <div class="admin-form-group"><label class="admin-form-label">Details</label><textarea id="cm-details" class="admin-form-textarea" rows="4">${this.escapeHtml(existing?.details||'')}</textarea></div>
        <div class="admin-form-group"><label class="admin-form-label">Official Exam URL</label><input id="cm-url" type="url" class="admin-form-input" value="${this.escapeHtml(existing?.officialUrl||'')}"></div>
        <div class="admin-modal-footer"><button type="button" class="btn-table-action" id="content-modal-cancel">CANCEL</button><button type="button" class="btn-table-action" id="content-modal-draft">SAVE DRAFT</button><button type="submit" class="btn-admin-action-primary">PUBLISH EXAM</button></div>
      </form></div></div>`;
    root.querySelector('#content-modal-overlay')?.classList.add('open');
    const close=()=>root.innerHTML=''; document.getElementById('content-modal-close')?.addEventListener('click',close); document.getElementById('content-modal-cancel')?.addEventListener('click',close);
    const save=(published:boolean)=>{
      const name=(document.getElementById('cm-name') as HTMLInputElement).value.trim(), org=(document.getElementById('cm-org') as HTMLInputElement).value.trim();
      if(!name||!org){alert('Please fill in Exam Name and Organization.');return;}
      const item:ExamItem={id:existing?.id||'ex-'+Date.now(),examName:name,org,
        examDate:(document.getElementById('cm-exam-date') as HTMLInputElement).value.trim()||'To be announced',
        lastDate:(document.getElementById('cm-last-date') as HTMLInputElement).value.trim()||'To be announced',
        eligibility:(document.getElementById('cm-eligibility') as HTMLInputElement).value.trim(),
        details:(document.getElementById('cm-details') as HTMLTextAreaElement).value.trim(),
        officialUrl:(document.getElementById('cm-url') as HTMLInputElement).value.trim(),published};
      const all=JobKhojDataStore.getExams(); const i=all.findIndex(x=>x.id===item.id); if(i>=0) all[i]=item; else all.unshift(item);
      JobKhojDataStore.saveExams(all); close(); this.showToast(`Exam ${published?'published':'saved as draft'}`);
      const main=document.getElementById('admin-main-view'); if(main) this.renderAdminExams(main);
    };
    document.getElementById('content-modal-draft')?.addEventListener('click',()=>save(false));
    document.getElementById('content-modal-form')?.addEventListener('submit',e=>{e.preventDefault();save(true);});
  }

  // 4. Results Admin Sub-view
  private renderAdminResults(container: HTMLElement): void {
    const results = JobKhojDataStore.getResults();
    container.innerHTML=`<div><div class="admin-view-header"><div><h1 class="admin-heading">Manage Results Announcements</h1><p class="admin-subheading">Total ${results.length} result announcements in database</p></div><button class="btn-admin-action-primary" id="admin-add-result-btn">${Icons.plus}<span>+ CREATE NEW RESULT</span></button></div>
      <div class="admin-table-container"><table class="admin-table"><thead><tr><th>RESULT TITLE & ORG</th><th>EXAM</th><th>RESULT DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      ${results.length?results.map(r=>`<tr><td><div class="admin-table-title">${this.escapeHtml(r.resultTitle)}</div><div class="admin-table-sub">${this.escapeHtml(r.org)}</div></td><td>${this.escapeHtml(r.exam)}</td><td>${this.escapeHtml(r.resultDate)}</td><td><span class="job-status-badge ${r.published?'status-active':'status-expired'}">${r.published?'PUBLISHED':'DRAFT'}</span></td><td><div class="admin-actions-cell"><button class="btn-table-action result-edit-btn" data-id="${r.id}">Edit</button><button class="btn-table-action result-duplicate-btn" data-id="${r.id}">Duplicate</button><button class="btn-table-action result-toggle-btn" data-id="${r.id}">${r.published?'Unpublish':'Publish'}</button><button class="btn-table-action btn-table-delete result-delete-btn" data-id="${r.id}">Delete</button></div></td></tr>`).join(''):`<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted);">No result announcements created yet. Click <strong>+ CREATE NEW RESULT</strong> to add one.</td></tr>`}
      </tbody></table></div></div>`;
    document.getElementById('admin-add-result-btn')?.addEventListener('click',()=>this.openResultModal(null));
    document.querySelectorAll('.result-edit-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=results.find(r=>r.id===btn.getAttribute('data-id'));if(x)this.openResultModal(x);}));
    document.querySelectorAll('.result-duplicate-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=results.find(r=>r.id===btn.getAttribute('data-id'));if(!x)return;results.unshift({...x,id:'res-'+Date.now(),resultTitle:`${x.resultTitle} (Copy)`,published:false});JobKhojDataStore.saveResults(results);this.showToast('Result duplicated as draft');this.renderAdminResults(container);}));
    document.querySelectorAll('.result-toggle-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=results.find(r=>r.id===btn.getAttribute('data-id'));if(!x)return;x.published=!x.published;JobKhojDataStore.saveResults(results);this.showToast(`Result ${x.published?'published':'unpublished'}`);this.renderAdminResults(container);}));
    document.querySelectorAll('.result-delete-btn').forEach(btn=>btn.addEventListener('click',()=>{if(!confirm('Are you sure you want to delete this result announcement?'))return;JobKhojDataStore.saveResults(results.filter(x=>x.id!==btn.getAttribute('data-id')));this.showToast('Result deleted');this.renderAdminResults(container);}));
  }

  private openResultModal(existing: ResultItem | null): void {
    const root=document.getElementById('admin-modal-root');if(!root)return;
    root.innerHTML=`<div class="admin-modal-overlay" id="content-modal-overlay"><div class="admin-modal" style="max-width:760px;"><div class="admin-modal-header"><div><h2 class="admin-modal-title">${existing?'Edit Result Announcement':'Create Result Announcement'}</h2><p class="admin-subheading">Create, edit, publish or save a result as draft.</p></div><button class="admin-modal-close" id="content-modal-close">×</button></div><form id="content-modal-form">
      <div class="admin-form-section-title">Result Information</div><div class="admin-form-group"><label class="admin-form-label">Result Title *</label><input id="rm-title" class="admin-form-input" required value="${this.escapeHtml(existing?.resultTitle||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Organization *</label><input id="rm-org" class="admin-form-input" required value="${this.escapeHtml(existing?.org||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Exam Name</label><input id="rm-exam" class="admin-form-input" value="${this.escapeHtml(existing?.exam||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Result Date</label><input id="rm-date" class="admin-form-input" value="${this.escapeHtml(existing?.resultDate||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Description</label><textarea id="rm-desc" class="admin-form-textarea" rows="4">${this.escapeHtml(existing?.description||'')}</textarea></div>
      <div class="admin-form-group"><label class="admin-form-label">Official Result URL</label><input id="rm-url" type="url" class="admin-form-input" value="${this.escapeHtml(existing?.resultUrl||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Official Website</label><input id="rm-web" type="url" class="admin-form-input" value="${this.escapeHtml(existing?.officialWebsite||'')}"></div>
      <div class="admin-modal-footer"><button type="button" class="btn-table-action" id="content-modal-cancel">CANCEL</button><button type="button" class="btn-table-action" id="content-modal-draft">SAVE DRAFT</button><button type="submit" class="btn-admin-action-primary">PUBLISH RESULT</button></div></form></div></div>`;
    root.querySelector('#content-modal-overlay')?.classList.add('open');
    const close=()=>root.innerHTML='';document.getElementById('content-modal-close')?.addEventListener('click',close);document.getElementById('content-modal-cancel')?.addEventListener('click',close);
    const save=(published:boolean)=>{const title=(document.getElementById('rm-title')as HTMLInputElement).value.trim(),org=(document.getElementById('rm-org')as HTMLInputElement).value.trim();if(!title||!org){alert('Please fill in Result Title and Organization.');return;}const item:ResultItem={id:existing?.id||'res-'+Date.now(),resultTitle:title,org,exam:(document.getElementById('rm-exam')as HTMLInputElement).value.trim(),resultDate:(document.getElementById('rm-date')as HTMLInputElement).value.trim()||'Today',description:(document.getElementById('rm-desc')as HTMLTextAreaElement).value.trim(),resultUrl:(document.getElementById('rm-url')as HTMLInputElement).value.trim(),officialWebsite:(document.getElementById('rm-web')as HTMLInputElement).value.trim(),published,featured:existing?.featured??false};const all=JobKhojDataStore.getResults(),i=all.findIndex(x=>x.id===item.id);if(i>=0)all[i]=item;else all.unshift(item);JobKhojDataStore.saveResults(all);close();this.showToast(`Result ${published?'published':'saved as draft'}`);const main=document.getElementById('admin-main-view');if(main)this.renderAdminResults(main);};
    document.getElementById('content-modal-draft')?.addEventListener('click',()=>save(false));document.getElementById('content-modal-form')?.addEventListener('submit',e=>{e.preventDefault();save(true);});
  }

  // 5. Admit Cards Admin Sub-view
  private renderAdminAdmitCards(container: HTMLElement): void {
    const cards=JobKhojDataStore.getAdmitCards();
    container.innerHTML=`<div><div class="admin-view-header"><div><h1 class="admin-heading">Manage Admit Cards</h1><p class="admin-subheading">Total ${cards.length} admit card notifications in database</p></div><button class="btn-admin-action-primary" id="admin-add-admit-btn">${Icons.plus}<span>+ CREATE NEW ADMIT CARD</span></button></div>
      <div class="admin-table-container"><table class="admin-table"><thead><tr><th>EXAM NAME & ORG</th><th>RELEASE DATE</th><th>EXAM DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      ${cards.length?cards.map(c=>`<tr><td><div class="admin-table-title">${this.escapeHtml(c.examName)}</div><div class="admin-table-sub">${this.escapeHtml(c.org)}</div></td><td>${this.escapeHtml(c.releaseDate)}</td><td><strong>${this.escapeHtml(c.examDate)}</strong></td><td><span class="job-status-badge ${c.published?'status-active':'status-expired'}">${c.published?'PUBLISHED':'DRAFT'}</span></td><td><div class="admin-actions-cell"><button class="btn-table-action admit-edit-btn" data-id="${c.id}">Edit</button><button class="btn-table-action admit-duplicate-btn" data-id="${c.id}">Duplicate</button><button class="btn-table-action admit-toggle-btn" data-id="${c.id}">${c.published?'Unpublish':'Publish'}</button><button class="btn-table-action btn-table-delete admit-delete-btn" data-id="${c.id}">Delete</button></div></td></tr>`).join(''):`<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted);">No admit cards created yet. Click <strong>+ CREATE NEW ADMIT CARD</strong> to add one.</td></tr>`}
      </tbody></table></div></div>`;
    document.getElementById('admin-add-admit-btn')?.addEventListener('click',()=>this.openAdmitModal(null));
    document.querySelectorAll('.admit-edit-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=cards.find(c=>c.id===btn.getAttribute('data-id'));if(x)this.openAdmitModal(x);}));
    document.querySelectorAll('.admit-duplicate-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=cards.find(c=>c.id===btn.getAttribute('data-id'));if(!x)return;cards.unshift({...x,id:'ac-'+Date.now(),examName:`${x.examName} (Copy)`,published:false});JobKhojDataStore.saveAdmitCards(cards);this.showToast('Admit card duplicated as draft');this.renderAdminAdmitCards(container);}));
    document.querySelectorAll('.admit-toggle-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=cards.find(c=>c.id===btn.getAttribute('data-id'));if(!x)return;x.published=!x.published;JobKhojDataStore.saveAdmitCards(cards);this.showToast(`Admit card ${x.published?'published':'unpublished'}`);this.renderAdminAdmitCards(container);}));
    document.querySelectorAll('.admit-delete-btn').forEach(btn=>btn.addEventListener('click',()=>{if(!confirm('Are you sure you want to delete this admit card?'))return;JobKhojDataStore.saveAdmitCards(cards.filter(x=>x.id!==btn.getAttribute('data-id')));this.showToast('Admit card deleted');this.renderAdminAdmitCards(container);}));
  }

  private openAdmitModal(existing: AdmitCardItem | null): void {
    const root=document.getElementById('admin-modal-root');if(!root)return;
    root.innerHTML=`<div class="admin-modal-overlay" id="content-modal-overlay"><div class="admin-modal" style="max-width:760px;"><div class="admin-modal-header"><div><h2 class="admin-modal-title">${existing?'Edit Admit Card':'Create Admit Card'}</h2><p class="admin-subheading">Manage hall-ticket notifications like job recruitments.</p></div><button class="admin-modal-close" id="content-modal-close">×</button></div><form id="content-modal-form">
      <div class="admin-form-section-title">Admit Card Information</div><div class="admin-form-group"><label class="admin-form-label">Exam Name *</label><input id="am-name" class="admin-form-input" required value="${this.escapeHtml(existing?.examName||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Organization *</label><input id="am-org" class="admin-form-input" required value="${this.escapeHtml(existing?.org||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Release Date</label><input id="am-release" class="admin-form-input" value="${this.escapeHtml(existing?.releaseDate||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Exam Date</label><input id="am-exam" class="admin-form-input" value="${this.escapeHtml(existing?.examDate||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Download URL</label><input id="am-url" type="url" class="admin-form-input" value="${this.escapeHtml(existing?.downloadUrl||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Official Website</label><input id="am-web" type="url" class="admin-form-input" value="${this.escapeHtml(existing?.officialWebsite||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Description</label><textarea id="am-desc" class="admin-form-textarea" rows="4">${this.escapeHtml(existing?.description||'')}</textarea></div>
      <div class="admin-modal-footer"><button type="button" class="btn-table-action" id="content-modal-cancel">CANCEL</button><button type="button" class="btn-table-action" id="content-modal-draft">SAVE DRAFT</button><button type="submit" class="btn-admin-action-primary">PUBLISH ADMIT CARD</button></div></form></div></div>`;
    root.querySelector('#content-modal-overlay')?.classList.add('open');
    const close=()=>root.innerHTML='';document.getElementById('content-modal-close')?.addEventListener('click',close);document.getElementById('content-modal-cancel')?.addEventListener('click',close);
    const save=(published:boolean)=>{const name=(document.getElementById('am-name')as HTMLInputElement).value.trim(),org=(document.getElementById('am-org')as HTMLInputElement).value.trim();if(!name||!org){alert('Please fill in Exam Name and Organization.');return;}const item:AdmitCardItem={id:existing?.id||'ac-'+Date.now(),examName:name,org,releaseDate:(document.getElementById('am-release')as HTMLInputElement).value.trim()||'To be announced',examDate:(document.getElementById('am-exam')as HTMLInputElement).value.trim()||'To be announced',downloadUrl:(document.getElementById('am-url')as HTMLInputElement).value.trim(),officialWebsite:(document.getElementById('am-web')as HTMLInputElement).value.trim(),description:(document.getElementById('am-desc')as HTMLTextAreaElement).value.trim(),published};const all=JobKhojDataStore.getAdmitCards(),i=all.findIndex(x=>x.id===item.id);if(i>=0)all[i]=item;else all.unshift(item);JobKhojDataStore.saveAdmitCards(all);close();this.showToast(`Admit card ${published?'published':'saved as draft'}`);const main=document.getElementById('admin-main-view');if(main)this.renderAdminAdmitCards(main);};
    document.getElementById('content-modal-draft')?.addEventListener('click',()=>save(false));document.getElementById('content-modal-form')?.addEventListener('submit',e=>{e.preventDefault();save(true);});
  }

  // 6. Manage Blog Admin Sub-view
  private renderAdminBlog(container: HTMLElement): void {
    const articles=JobKhojDataStore.getBlog();
    container.innerHTML=`<div><div class="admin-view-header"><div><h1 class="admin-heading">Manage Blog Articles</h1><p class="admin-subheading">Total ${articles.length} blog articles in database</p></div><button class="btn-admin-action-primary" id="admin-add-article-btn">${Icons.plus}<span>+ CREATE NEW ARTICLE</span></button></div>
      <div class="admin-table-container"><table class="admin-table"><thead><tr><th>TITLE & CATEGORY</th><th>AUTHOR</th><th>DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      ${articles.length?articles.map(a=>`<tr><td><div class="admin-table-title">${this.escapeHtml(a.title)}</div><div class="admin-table-sub">${this.escapeHtml(a.category)}</div></td><td>${this.escapeHtml(a.author)}</td><td>${this.escapeHtml(a.publishedDate)}</td><td><span class="job-status-badge ${a.published?'status-active':'status-expired'}">${a.published?'PUBLISHED':'DRAFT'}</span></td><td><div class="admin-actions-cell"><button class="btn-table-action blog-edit-btn" data-id="${a.id}">Edit</button><button class="btn-table-action blog-duplicate-btn" data-id="${a.id}">Duplicate</button><button class="btn-table-action blog-toggle-btn" data-id="${a.id}">${a.published?'Unpublish':'Publish'}</button><button class="btn-table-action btn-table-delete blog-delete-btn" data-id="${a.id}">Delete</button></div></td></tr>`).join(''):`<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted);">No blog articles created yet. Click <strong>+ CREATE NEW ARTICLE</strong> to add one.</td></tr>`}
      </tbody></table></div></div>`;
    document.getElementById('admin-add-article-btn')?.addEventListener('click',()=>this.openBlogModal(null));
    document.querySelectorAll('.blog-edit-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=articles.find(a=>a.id===btn.getAttribute('data-id'));if(x)this.openBlogModal(x);}));
    document.querySelectorAll('.blog-duplicate-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=articles.find(a=>a.id===btn.getAttribute('data-id'));if(!x)return;articles.unshift({...x,id:'bl-'+Date.now(),title:`${x.title} (Copy)`,slug:`${x.slug}-copy`,published:false});JobKhojDataStore.saveBlog(articles);this.showToast('Article duplicated as draft');this.renderAdminBlog(container);}));
    document.querySelectorAll('.blog-toggle-btn').forEach(btn=>btn.addEventListener('click',()=>{const x=articles.find(a=>a.id===btn.getAttribute('data-id'));if(!x)return;x.published=!x.published;JobKhojDataStore.saveBlog(articles);this.showToast(`Article ${x.published?'published':'unpublished'}`);this.renderAdminBlog(container);}));
    document.querySelectorAll('.blog-delete-btn').forEach(btn=>btn.addEventListener('click',()=>{if(!confirm('Are you sure you want to delete this article?'))return;JobKhojDataStore.saveBlog(articles.filter(x=>x.id!==btn.getAttribute('data-id')));this.showToast('Article deleted');this.renderAdminBlog(container);}));
  }

  private openBlogModal(existing: BlogItem | null): void {
    const root=document.getElementById('admin-modal-root');if(!root)return;
    root.innerHTML=`<div class="admin-modal-overlay" id="content-modal-overlay"><div class="admin-modal" style="max-width:820px;"><div class="admin-modal-header"><div><h2 class="admin-modal-title">${existing?'Edit Blog Article':'Create Blog Article'}</h2><p class="admin-subheading">Full editor with draft and publish workflow.</p></div><button class="admin-modal-close" id="content-modal-close">×</button></div><form id="content-modal-form">
      <div class="admin-form-section-title">Article Information</div><div class="admin-form-group"><label class="admin-form-label">Article Title *</label><input id="bm-title" class="admin-form-input" required value="${this.escapeHtml(existing?.title||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Category</label><input id="bm-category" class="admin-form-input" value="${this.escapeHtml(existing?.category||'Career Guidance')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Author</label><input id="bm-author" class="admin-form-input" value="${this.escapeHtml(existing?.author||'Job Khoj Editorial Team')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Featured Image URL</label><input id="bm-image" type="url" class="admin-form-input" value="${this.escapeHtml(existing?.featuredImage||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">Short Excerpt</label><textarea id="bm-excerpt" class="admin-form-textarea" rows="3">${this.escapeHtml(existing?.excerpt||'')}</textarea></div>
      <div class="admin-form-group"><label class="admin-form-label">Article Content *</label><textarea id="bm-content" class="admin-form-textarea" rows="9" required>${this.escapeHtml(existing?.content||'')}</textarea></div>
      <div class="admin-form-section-title">SEO</div><div class="admin-form-group"><label class="admin-form-label">SEO Title</label><input id="bm-seo-title" class="admin-form-input" value="${this.escapeHtml(existing?.seoTitle||'')}"></div>
      <div class="admin-form-group"><label class="admin-form-label">SEO Description</label><textarea id="bm-seo-desc" class="admin-form-textarea" rows="3">${this.escapeHtml(existing?.seoDescription||'')}</textarea></div>
      <div class="admin-form-group"><label class="admin-form-label">Keywords</label><input id="bm-keywords" class="admin-form-input" value="${this.escapeHtml(existing?.keywords||'')}"></div>
      <div class="admin-modal-footer"><button type="button" class="btn-table-action" id="content-modal-cancel">CANCEL</button><button type="button" class="btn-table-action" id="content-modal-draft">SAVE DRAFT</button><button type="submit" class="btn-admin-action-primary">PUBLISH ARTICLE</button></div></form></div></div>`;
    root.querySelector('#content-modal-overlay')?.classList.add('open');
    const close=()=>root.innerHTML='';document.getElementById('content-modal-close')?.addEventListener('click',close);document.getElementById('content-modal-cancel')?.addEventListener('click',close);
    const save=(published:boolean)=>{const title=(document.getElementById('bm-title')as HTMLInputElement).value.trim(),content=(document.getElementById('bm-content')as HTMLTextAreaElement).value.trim();if(!title||!content){alert('Please fill in Article Title and Article Content.');return;}const slug=existing?.slug||title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');const item:BlogItem={id:existing?.id||'bl-'+Date.now(),title,slug,category:(document.getElementById('bm-category')as HTMLInputElement).value.trim()||'Career Guidance',featuredImage:(document.getElementById('bm-image')as HTMLInputElement).value.trim(),excerpt:(document.getElementById('bm-excerpt')as HTMLTextAreaElement).value.trim(),content,author:(document.getElementById('bm-author')as HTMLInputElement).value.trim()||'Job Khoj Editorial Team',publishedDate:existing?.publishedDate||`${new Date().getDate()} ${new Date().toLocaleString('default',{month:'short'})} ${new Date().getFullYear()}`,seoTitle:(document.getElementById('bm-seo-title')as HTMLInputElement).value.trim()||`${title} | JOB KHOJ`,seoDescription:(document.getElementById('bm-seo-desc')as HTMLTextAreaElement).value.trim(),keywords:(document.getElementById('bm-keywords')as HTMLInputElement).value.trim(),published};const all=JobKhojDataStore.getBlog(),i=all.findIndex(x=>x.id===item.id);if(i>=0)all[i]=item;else all.unshift(item);JobKhojDataStore.saveBlog(all);close();this.showToast(`Article ${published?'published':'saved as draft'}`);const main=document.getElementById('admin-main-view');if(main)this.renderAdminBlog(main);};
    document.getElementById('content-modal-draft')?.addEventListener('click',()=>save(false));document.getElementById('content-modal-form')?.addEventListener('submit',e=>{e.preventDefault();save(true);});
  }

  // 7. Advertisements (7 Slots) Admin Sub-view
  private renderAdminAds(container: HTMLElement): void {
    const ads = JobKhojDataStore.getAdSlots();

    container.innerHTML = `
      <div>
        <div class="admin-view-header">
          <div>
            <h1 class="admin-heading">Advertisement System (Configurable Placement Slots)</h1>
            <p class="admin-subheading">Configure sponsor notices and banner codes across high-traffic page locations</p>
          </div>
        </div>

        <form id="admin-ads-form" style="display:flex;flex-direction:column;gap:20px;">
          ${ads.map(ad => `
            <div class="stat-metric-card" id="ad-slot-editor-${this.escapeHtml(ad.id)}">
              <div class="flex items-center justify-between" style="margin-bottom:12px;">
                <div>
                  <h3 style="font-size:16px;font-weight:900;color:var(--orange);">${this.escapeHtml(ad.title)}</h3>
                  <span style="font-size:12px;color:#94A3B8;">Location: ${this.escapeHtml(ad.locationName)}</span>
                </div>
                <label class="checkbox-label-item">
                  <input type="checkbox" id="ad-enable-${this.escapeHtml(ad.id)}" ${ad.enabled ? 'checked' : ''}>
                  <span style="font-weight:800;color:#FFF;">ENABLED</span>
                </label>
              </div>

              <div class="admin-form-group" style="margin-bottom:8px;">
                <label class="admin-form-label">Banner HTML / Embed Markup</label>
                <textarea id="ad-code-${this.escapeHtml(ad.id)}" class="admin-form-textarea" rows="4" style="font-family:monospace;font-size:12px;">${this.escapeHtml(ad.htmlContent)}</textarea>
              </div>
              <span style="font-size:11.5px;color:#64748B;">* If disabled, this advertisement slot will completely disappear from the public layout without leaving blank space.</span>
            </div>
          `).join('')}

          <div style="margin-top:10px;">
            <button type="submit" class="btn-admin-action-primary" style="padding:12px 28px;font-size:15px;">
              SAVE ADVERTISEMENT SLOTS
            </button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('admin-ads-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedAds = ads.map(ad => {
        const checkbox = document.getElementById(`ad-enable-${ad.id}`) as HTMLInputElement | null;
        const textarea = document.getElementById(`ad-code-${ad.id}`) as HTMLTextAreaElement | null;
        return {
          ...ad,
          enabled: checkbox?.checked ?? ad.enabled,
          htmlContent: textarea?.value ?? ad.htmlContent
        };
      });

      try {
        await JobKhojDataStore.saveAdSlots(updatedAds);
        this.showToast('Advertisement slots updated successfully');
      } catch (error) {
        console.error('Advertisement save failed:', error);
        this.showToast('Could not save advertisements. Check your Supabase API key and RLS policy.', false);
      }
    });
  }

  // 8. WhatsApp & Site Settings Admin Sub-view
  private renderAdminSettings(container: HTMLElement): void {
    const settings = JobKhojDataStore.getSettings();

    container.innerHTML = `
      <div>
        <div class="admin-view-header">
          <div>
            <h1 class="admin-heading">WhatsApp & Site Settings</h1>
            <p class="admin-subheading">Configure messaging templates, support channels, and platform metadata</p>
          </div>
        </div>

        <form id="admin-settings-form" style="display:flex;flex-direction:column;gap:24px;max-width:820px;">
          <!-- Section 1: WhatsApp Settings -->
          <div class="stat-metric-card">
            <h3 style="font-size:17px;font-weight:900;color:var(--green);margin-bottom:16px;">WhatsApp Integration Settings</h3>

            <div class="admin-form-group">
              <label class="admin-form-label">WhatsApp Number (With Country Code)</label>
              <input type="text" id="st-wa-num" class="admin-form-input" value="${settings.whatsappNumber}" placeholder="+919876543210">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Official WhatsApp Channel Link</label>
              <input type="url" id="st-wa-chan" class="admin-form-input" value="${settings.whatsappChannelUrl}">
            </div>
            <div class="admin-form-group">
              <label class="admin-form-label">Official Telegram Channel Link</label>
              <input type="url" id="st-telegram" class="admin-form-input" value="${settings.telegramChannelUrl || 'https://t.me/'}" placeholder="https://t.me/yourchannel">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Support Inquiries Default Message Template</label>
              <textarea id="st-wa-supp" class="admin-form-textarea" rows="2">${settings.defaultSupportMsg}</textarea>
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">WhatsApp Apply Message Template</label>
              <textarea id="st-wa-apply" class="admin-form-textarea" rows="2">${settings.whatsappApplyMsgTemplate}</textarea>
              <span style="font-size:11.5px;color:#94A3B8;margin-top:4px;">Supported dynamic placeholders: <strong>{{JOB_TITLE}}</strong> and <strong>{{JOB_ID}}</strong></span>
            </div>

            <div class="flex flex-col gap-3" style="margin-top:8px;">
              <label class="checkbox-label-item">
                <input type="checkbox" id="st-wa-global" ${settings.enableWhatsappApplyGlobal ? 'checked' : ''}>
                <span>Enable WhatsApp Apply Feature Globally</span>
              </label>

              <label class="checkbox-label-item">
                <input type="checkbox" id="st-wa-header" ${settings.enableHeaderWhatsappBtn ? 'checked' : ''}>
                <span>Enable Header WhatsApp Contact Button</span>
              </label>
            </div>
          </div>

          <!-- Section 2: General Platform Settings -->
          <div class="stat-metric-card">
            <h3 style="font-size:17px;font-weight:900;color:#FFF;margin-bottom:16px;">General Platform Settings</h3>

            <div class="admin-form-group">
              <label class="admin-form-label">Platform Tagline</label>
              <input type="text" id="st-tagline" class="admin-form-input" value="${settings.siteTagline}">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Contact Support Email</label>
              <input type="email" id="st-email" class="admin-form-input" value="${settings.supportEmail}">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Footer Text / Short About</label>
              <textarea id="st-about" class="admin-form-textarea" rows="3">${settings.footerAboutText}</textarea>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <button type="submit" class="btn-admin-action-primary" style="padding:12px 28px;font-size:15px;">
              SAVE SETTINGS
            </button>
            <button type="button" class="btn-table-action" id="btn-goto-password" style="padding:12px 20px;">
              Change Admin Password
            </button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('btn-goto-password')?.addEventListener('click', () => {
      window.location.hash = '#admin/password';
    });

    document.getElementById('admin-settings-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      settings.whatsappNumber = (document.getElementById('st-wa-num') as HTMLInputElement).value.trim();
      settings.whatsappChannelUrl = (document.getElementById('st-wa-chan') as HTMLInputElement).value.trim();
      settings.telegramChannelUrl = (document.getElementById('st-telegram') as HTMLInputElement).value.trim();
      settings.defaultSupportMsg = (document.getElementById('st-wa-supp') as HTMLTextAreaElement).value.trim();
      settings.whatsappApplyMsgTemplate = (document.getElementById('st-wa-apply') as HTMLTextAreaElement).value.trim();
      settings.enableWhatsappApplyGlobal = (document.getElementById('st-wa-global') as HTMLInputElement).checked;
      settings.enableHeaderWhatsappBtn = (document.getElementById('st-wa-header') as HTMLInputElement).checked;
      settings.siteTagline = (document.getElementById('st-tagline') as HTMLInputElement).value.trim();
      settings.supportEmail = (document.getElementById('st-email') as HTMLInputElement).value.trim();
      settings.footerAboutText = (document.getElementById('st-about') as HTMLTextAreaElement).value.trim();

      JobKhojDataStore.saveSettings(settings);
      this.showToast('Platform & WhatsApp settings saved successfully');
    });
  }

  // Advanced tools: import/export, SEO, announcements, popup, backup, redirects and admin roles
  private renderAdminTools(container: HTMLElement): void {
    const features = JobKhojDataStore.getFeatures();
    const jobs = JobKhojDataStore.getJobs();
    container.innerHTML = `
      <div>
        <div class="admin-view-header"><div><h1 class="admin-heading">Advanced Tools</h1><p class="admin-subheading">Manage bulk jobs, SEO, alerts, backups and automation from one place.</p></div></div>
        <div class="admin-stats-grid">
          <div class="stat-metric-card"><span class="metric-label">TOTAL JOBS</span><span class="metric-value">${jobs.length}</span></div>
          <div class="stat-metric-card"><span class="metric-label">PUBLISHED</span><span class="metric-value">${jobs.filter(j=>j.published).length}</span></div>
          <div class="stat-metric-card"><span class="metric-label">EXPIRED</span><span class="metric-value">${jobs.filter(j=>j.status==='Expired').length}</span></div>
        </div>
        <div class="stat-metric-card" style="margin-bottom:20px;">
          <h3 class="admin-heading" style="font-size:18px;">CSV Job Import / Export</h3>
          <p class="admin-subheading">Bulk add jobs from Excel/Google Sheets. Import is validated before saving; export creates a CSV backup.</p>
          <div class="flex items-center gap-3" style="flex-wrap:wrap;">
            <button class="btn-admin-action-primary" id="csv-template-btn">DOWNLOAD CSV TEMPLATE</button>
            <button class="btn-table-action" id="csv-export-btn">EXPORT ALL JOBS</button>
            <label class="btn-table-action" style="cursor:pointer;">IMPORT CSV<input id="csv-import-input" type="file" accept=".csv,text/csv" hidden></label>
          </div>
          <div id="csv-preview" style="margin-top:14px;font-size:13px;color:#94A3B8;"></div>
        </div>
        <div class="stat-metric-card" style="margin-bottom:20px;">
          <h3 class="admin-heading" style="font-size:18px;">SEO Manager</h3>
          <div class="admin-form-group"><label class="admin-form-label">Site SEO Title</label><input id="ft-seo-title" class="admin-form-input" value="${this.escapeHtml(features.seoSiteTitle)}"></div>
          <div class="admin-form-group"><label class="admin-form-label">Meta Description</label><textarea id="ft-seo-desc" class="admin-form-textarea" rows="2">${this.escapeHtml(features.seoSiteDescription)}</textarea></div>
          <div class="admin-form-group"><label class="admin-form-label">Keywords</label><input id="ft-seo-keywords" class="admin-form-input" value="${this.escapeHtml(features.seoKeywords)}"></div>
          <div class="admin-form-group"><label class="admin-form-label">Canonical URL</label><input id="ft-seo-canonical" class="admin-form-input" value="${this.escapeHtml(features.seoCanonicalUrl)}" placeholder="https://yourdomain.com/"></div>
          <button class="btn-admin-action-primary" id="seo-save-btn">SAVE SEO SETTINGS</button>
        </div>
        <div class="stat-metric-card" style="margin-bottom:20px;">
          <h3 class="admin-heading" style="font-size:18px;">Announcement & Popup</h3>
          <label class="checkbox-label-item"><input type="checkbox" id="ft-ann-enabled" ${features.announcementEnabled?'checked':''}><span>Enable breaking announcement bar</span></label>
          <div class="admin-form-group"><label class="admin-form-label">Announcement Text</label><input id="ft-ann-text" class="admin-form-input" value="${this.escapeHtml(features.announcementText)}"></div>
          <div class="admin-form-group"><label class="admin-form-label">Announcement Link</label><input id="ft-ann-url" class="admin-form-input" value="${this.escapeHtml(features.announcementUrl)}"></div>
          <label class="checkbox-label-item"><input type="checkbox" id="ft-popup-enabled" ${features.popupEnabled?'checked':''}><span>Enable visitor alert popup</span></label>
          <div class="admin-form-row"><div class="admin-form-group"><label class="admin-form-label">Popup Title</label><input id="ft-popup-title" class="admin-form-input" value="${this.escapeHtml(features.popupTitle)}"></div><div class="admin-form-group"><label class="admin-form-label">Delay (ms)</label><input id="ft-popup-delay" type="number" class="admin-form-input" value="${features.popupDelayMs}"></div></div>
          <div class="admin-form-group"><label class="admin-form-label">Popup Message</label><textarea id="ft-popup-msg" class="admin-form-textarea" rows="2">${this.escapeHtml(features.popupMessage)}</textarea></div>
          <div class="admin-form-group"><label class="admin-form-label">Popup Button URL</label><input id="ft-popup-url" class="admin-form-input" value="${this.escapeHtml(features.popupUrl)}"></div>
          <button class="btn-admin-action-primary" id="alerts-save-btn">SAVE ALERT SETTINGS</button>
        </div>
        <div class="stat-metric-card" style="margin-bottom:20px;">
          <h3 class="admin-heading" style="font-size:18px;">Maintenance & Automation</h3>
          <div class="flex items-center gap-3" style="flex-wrap:wrap;">
            <button class="btn-table-action" id="expire-jobs-btn">EXPIRE OVERDUE JOBS NOW</button>
            <button class="btn-table-action" id="sitemap-btn">GENERATE SITEMAP</button>
            <button class="btn-table-action" id="backup-btn">DOWNLOAD FULL BACKUP</button>
            <label class="btn-table-action" style="cursor:pointer;">RESTORE BACKUP<input id="restore-input" type="file" accept=".json,application/json" hidden></label>
          </div>
          <p style="font-size:12px;color:#94A3B8;margin-top:12px;">Expired jobs are automatically hidden when their last date can be parsed. Backups contain local website data and settings.</p>
        </div>
        <div class="stat-metric-card" style="margin-bottom:20px;">
          <h3 class="admin-heading" style="font-size:18px;">Redirect Manager</h3>
          <div class="admin-form-row"><input id="redir-from" class="admin-form-input" placeholder="/old-page"><input id="redir-to" class="admin-form-input" placeholder="/new-page"><button class="btn-table-action" id="redir-add">ADD</button></div>
          <div id="redir-list" style="margin-top:12px;">${features.redirectRules.map((r,i)=>`<div style="display:flex;gap:10px;align-items:center;margin:7px 0;"><code>${this.escapeHtml(r.from)}</code> → <code>${this.escapeHtml(r.to)}</code><button class="btn-table-action" data-redir-delete="${i}">Delete</button></div>`).join('') || '<span style="color:#94A3B8;font-size:13px;">No redirect rules.</span>'}</div>
        </div>
        <div class="stat-metric-card">
          <h3 class="admin-heading" style="font-size:18px;">Admin Roles & Notifications</h3>
          <p style="font-size:13px;color:#94A3B8;">Owner/editor/viewer roles are stored as configuration. Secure multi-user authentication requires Supabase Auth/RLS; this static client must not be treated as a security boundary.</p>
          <div class="admin-form-group"><label class="admin-form-label">Admin Email</label><input id="role-email" class="admin-form-input" placeholder="editor@example.com"></div>
          <div class="admin-form-row"><select id="role-select" class="admin-form-select"><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button class="btn-table-action" id="role-add">ADD ADMIN ROLE</button></div>
          <div style="margin-top:12px;">${features.adminUsers.map(u=>`<div style="padding:7px 0;color:#CBD5E1;">${this.escapeHtml(u.email)} — <strong>${u.role}</strong></div>`).join('')}</div>
          <label class="checkbox-label-item" style="margin-top:10px;"><input type="checkbox" id="push-enabled" ${features.pushNotificationsEnabled?'checked':''}><span>Enable push-notification configuration</span></label>
          <p style="font-size:11px;color:#64748B;margin-top:8px;">Browser push delivery also needs a service worker, VAPID keys and a notification backend/provider.</p>
        </div>
      </div>`;

    const download = (name:string, content:string, type:string) => { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); };
    const csvEscape=(v:any)=>{const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
    const csvHeaders=['title','organization','category','post','vacancy','qualification','age_limit','application_fee','start_date','last_date','exam_date','selection_process','salary','apply_url','notification_url','official_url','status','featured'];
    document.getElementById('csv-template-btn')?.addEventListener('click',()=>download('job-khoj-template.csv',csvHeaders.join(',')+'\n', 'text/csv'));
    document.getElementById('csv-export-btn')?.addEventListener('click',()=>{ const rows=jobs.map(j=>[j.title,j.org,j.category,'',j.vacancies,j.qualification,j.ageLimit,j.appFee,j.appStartDate,j.lastDate,j.examDate,j.selectionProcess,j.salary,j.applyUrl,j.officialNotifUrl,j.officialWebsiteUrl,j.published?'published':'draft',j.featured?'yes':'no']); download('job-khoj-jobs.csv',[csvHeaders.join(','),...rows.map(r=>r.map(csvEscape).join(','))].join('\n'),'text/csv'); });
    document.getElementById('csv-import-input')?.addEventListener('change',(ev)=>{const file=(ev.target as HTMLInputElement).files?.[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{const text=String(reader.result||''); const lines=text.split(/\r?\n/).filter(Boolean); if(lines.length<2){this.showToast('CSV has no job rows',false);return;} const headers=lines[0].split(',').map(x=>x.trim().replace(/^"|"$/g,'')); const idx=(n:string)=>headers.indexOf(n); const imported:JobItem[]=[]; for(let i=1;i<lines.length;i++){const vals=lines[i].match(/(?:"(?:[^"]|"")*"|[^,])+/g)?.map(v=>v.trim().replace(/^"|"$/g,'').replace(/""/g,'"'))||[]; const get=(n:string)=>vals[idx(n)]||''; const title=get('title'),org=get('organization'); if(!title||!org)continue; const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); imported.push({id:'jk-'+Date.now()+'-'+i,title,org,category:(get('category')||'Government') as any,jobType:'Permanent',vacancies:get('vacancy')||'Various Posts',qualification:get('qualification'),location:'All India',salary:get('salary')||'As per norms',ageLimit:get('age_limit')||'As per rules',appStartDate:get('start_date'),lastDate:get('last_date'),examDate:get('exam_date')||'To be announced',appFee:get('application_fee')||'Refer notification',selectionProcess:get('selection_process')||'Written Exam & Document Verification',documentsRequired:[],jobDesc:'',officialNotifUrl:get('notification_url'),officialWebsiteUrl:get('official_url'),applyUrl:get('apply_url'),whatsappApplyEnabled:true,featured:get('featured').toLowerCase()==='yes',published:get('status').toLowerCase()==='published',slug,postedDate:new Date().toLocaleDateString('en-IN'),status:'Active'});} const existing=JobKhojDataStore.getJobs(); const seen=new Set(existing.map(j=>j.title.toLowerCase())); const fresh=imported.filter(j=>!seen.has(j.title.toLowerCase())); JobKhojDataStore.saveJobs([...fresh,...existing]); document.getElementById('csv-preview')!.textContent=`Imported ${fresh.length} new jobs; skipped ${imported.length-fresh.length} duplicates.`; this.showToast(`Imported ${fresh.length} jobs`); }; reader.readAsText(file);});
    document.getElementById('seo-save-btn')?.addEventListener('click',()=>{features.seoSiteTitle=(document.getElementById('ft-seo-title') as HTMLInputElement).value.trim();features.seoSiteDescription=(document.getElementById('ft-seo-desc') as HTMLTextAreaElement).value.trim();features.seoKeywords=(document.getElementById('ft-seo-keywords') as HTMLInputElement).value.trim();features.seoCanonicalUrl=(document.getElementById('ft-seo-canonical') as HTMLInputElement).value.trim();JobKhojDataStore.saveFeatures(features);document.title=features.seoSiteTitle;this.showToast('SEO settings saved');});
    document.getElementById('alerts-save-btn')?.addEventListener('click',()=>{features.announcementEnabled=(document.getElementById('ft-ann-enabled') as HTMLInputElement).checked;features.announcementText=(document.getElementById('ft-ann-text') as HTMLInputElement).value;features.announcementUrl=(document.getElementById('ft-ann-url') as HTMLInputElement).value;features.popupEnabled=(document.getElementById('ft-popup-enabled') as HTMLInputElement).checked;features.popupTitle=(document.getElementById('ft-popup-title') as HTMLInputElement).value;features.popupMessage=(document.getElementById('ft-popup-msg') as HTMLTextAreaElement).value;features.popupUrl=(document.getElementById('ft-popup-url') as HTMLInputElement).value;features.popupDelayMs=Number((document.getElementById('ft-popup-delay') as HTMLInputElement).value)||5000;JobKhojDataStore.saveFeatures(features);this.showToast('Alert settings saved');});
    document.getElementById('expire-jobs-btn')?.addEventListener('click',()=>{const n=JobKhojDataStore.expireJobs();this.showToast(`${n} expired job(s) checked`);this.renderAdminTools(container);});
    document.getElementById('backup-btn')?.addEventListener('click',()=>download('job-khoj-backup.json',JobKhojDataStore.backupAll(),'application/json'));
    document.getElementById('restore-input')?.addEventListener('change',(ev)=>{const file=(ev.target as HTMLInputElement).files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{JobKhojDataStore.restoreAll(JSON.parse(String(reader.result)));this.showToast('Backup restored');this.renderAdminTools(container);}catch{this.showToast('Invalid backup file',false);}};reader.readAsText(file);});
    document.getElementById('sitemap-btn')?.addEventListener('click',()=>{const base=features.seoCanonicalUrl.replace(/\/$/,'')||location.origin;const urls=[base+'/',base+'/#jobs',...JobKhojDataStore.getJobs().filter(j=>j.published).map(j=>base+'/#job/'+j.slug)];const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(u=>`<url><loc>${this.escapeHtml(u)}</loc></url>`).join('')+'</urlset>';download('sitemap.xml',xml,'application/xml');});
    document.getElementById('redir-add')?.addEventListener('click',()=>{const from=(document.getElementById('redir-from') as HTMLInputElement).value.trim();const to=(document.getElementById('redir-to') as HTMLInputElement).value.trim();if(!from||!to)return;features.redirectRules.push({from,to,enabled:true});JobKhojDataStore.saveFeatures(features);this.renderAdminTools(container);});
    document.querySelectorAll('[data-redir-delete]').forEach(b=>b.addEventListener('click',()=>{features.redirectRules.splice(Number((b as HTMLElement).dataset.redirDelete),1);JobKhojDataStore.saveFeatures(features);this.renderAdminTools(container);}));
    document.getElementById('role-add')?.addEventListener('click',()=>{const email=(document.getElementById('role-email') as HTMLInputElement).value.trim();const role=(document.getElementById('role-select') as HTMLSelectElement).value as 'editor'|'viewer';if(!email)return;features.adminUsers.push({email,role});JobKhojDataStore.saveFeatures(features);this.renderAdminTools(container);});
    document.getElementById('push-enabled')?.addEventListener('change',(e)=>{features.pushNotificationsEnabled=(e.target as HTMLInputElement).checked;JobKhojDataStore.saveFeatures(features);this.showToast('Push notification setting saved');});
  }

  // 9. Change Admin Password Sub-view
  private renderAdminPassword(container: HTMLElement): void {
    const settings = JobKhojDataStore.getSettings();

    container.innerHTML = `
      <div>
        <div class="admin-view-header">
          <div>
            <h1 class="admin-heading">Change Admin Password</h1>
            <p class="admin-subheading">Update login credentials for jobkhojsupport@gmail.com</p>
          </div>
        </div>

        <div class="stat-metric-card" style="max-width:540px;">
          <form id="change-pass-form">
            <div class="admin-form-group">
              <label class="admin-form-label">Current Password *</label>
              <input type="password" id="cp-current" class="admin-form-input" required placeholder="Enter current password">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">New Password *</label>
              <input type="password" id="cp-new" class="admin-form-input" required placeholder="Minimum 6 characters">
            </div>

            <div class="admin-form-group">
              <label class="admin-form-label">Confirm New Password *</label>
              <input type="password" id="cp-confirm" class="admin-form-input" required placeholder="Re-enter new password">
            </div>

            <div id="cp-error" style="color:#F87171;font-size:13px;margin-bottom:12px;display:none;"></div>

            <button type="submit" class="btn-admin-action-primary" style="padding:10px 24px;">
              UPDATE PASSWORD
            </button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('change-pass-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const current = (document.getElementById('cp-current') as HTMLInputElement).value;
      const newP = (document.getElementById('cp-new') as HTMLInputElement).value;
      const confirmP = (document.getElementById('cp-confirm') as HTMLInputElement).value;
      const err = document.getElementById('cp-error');

      if (current !== settings.adminPassword) {
        if (err) {
          err.style.display = 'block';
          err.textContent = 'Current password does not match.';
        }
        return;
      }

      if (newP.length < 6) {
        if (err) {
          err.style.display = 'block';
          err.textContent = 'New password must be at least 6 characters.';
        }
        return;
      }

      if (newP !== confirmP) {
        if (err) {
          err.style.display = 'block';
          err.textContent = 'New passwords do not match.';
        }
        return;
      }

      settings.adminPassword = newP;
      JobKhojDataStore.saveSettings(settings);
      this.showToast('Admin password updated successfully');
      if (err) err.style.display = 'none';
      (document.getElementById('change-pass-form') as HTMLFormElement).reset();
    });
  }
}

// Bootstrap Vanilla JS Application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new JobKhojApp());
} else {
  new JobKhojApp();
}
