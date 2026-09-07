import { supabase } from './supabase';
// Data models and persistent localStorage manager for JOB KHOJ

export interface JobItem {
  id: string;
  title: string;
  org: string;
  category: 'Government' | 'Private' | 'Bank' | 'Railway' | 'Teaching' | 'Defence' | 'Police' | 'Apprentice';
  jobType: 'Permanent' | 'Contractual' | 'Apprentice' | 'Full Time';
  vacancies: string;
  qualification: string;
  location: string;
  salary: string;
  ageLimit: string;
  appStartDate: string;
  lastDate: string;
  examDate: string;
  appFee: string;
  selectionProcess: string;
  documentsRequired: string[];
  jobDesc: string;
  howToApply?: string;
  officialNotifUrl: string;
  officialWebsiteUrl: string;
  applyUrl: string;
  whatsappApplyEnabled: boolean;
  featured: boolean;
  published: boolean;
  slug: string;
  postedDate: string;
  status: 'Active' | 'Closing Soon' | 'Expired';
}

export interface ExamItem {
  id: string;
  examName: string;
  org: string;
  examDate: string;
  lastDate: string;
  details: string;
  eligibility: string;
  officialUrl: string;
  published: boolean;
}

export interface ResultItem {
  id: string;
  resultTitle: string;
  exam: string;
  org: string;
  resultDate: string;
  description: string;
  resultUrl: string;
  officialWebsite: string;
  published: boolean;
  featured: boolean;
}

export interface AdmitCardItem {
  id: string;
  examName: string;
  org: string;
  releaseDate: string;
  examDate: string;
  downloadUrl: string;
  officialWebsite: string;
  description: string;
  published: boolean;
}

export interface BlogItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  featuredImage: string;
  excerpt: string;
  content: string;
  author: string;
  publishedDate: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  published: boolean;
}

export interface AdSlot {
  id: string;
  title: string;
  locationName: string;
  htmlContent: string;
  enabled: boolean;
}

export interface SiteSettings {
  whatsappNumber: string;
  whatsappChannelUrl: string;
  telegramChannelUrl: string;
  defaultSupportMsg: string;
  whatsappApplyMsgTemplate: string;
  enableWhatsappApplyGlobal: boolean;
  enableHeaderWhatsappBtn: boolean;
  siteTagline: string;
  supportEmail: string;
  footerAboutText: string;
  adminEmail: string;
  adminPassword: string;
}

export interface FeatureSettings {
  announcementEnabled: boolean;
  announcementText: string;
  announcementUrl: string;
  popupEnabled: boolean;
  popupTitle: string;
  popupMessage: string;
  popupUrl: string;
  popupDelayMs: number;
  seoSiteTitle: string;
  seoSiteDescription: string;
  seoKeywords: string;
  seoCanonicalUrl: string;
  pushNotificationsEnabled: boolean;
  redirectRules: Array<{ from: string; to: string; enabled: boolean }>;
  adminUsers: Array<{ email: string; role: 'owner' | 'editor' | 'viewer' }>;
}

export interface AnalyticsData {
  totalPageViews: number;
  jobViews: number;
  applyClicks: number;
  whatsappClicks: number;
  searchQueries: number;
  recentActivity: Array<{ id: string; text: string; time: string; type: string }>;
  topSearches: Array<{ term: string; count: number }>;
}

// Initial Data (Empty & Deploy-Ready - No Sample Data)
export const INITIAL_JOBS: JobItem[] = [];

export const INITIAL_EXAMS: ExamItem[] = [];

export const INITIAL_RESULTS: ResultItem[] = [];

export const INITIAL_ADMIT_CARDS: AdmitCardItem[] = [];

export const INITIAL_BLOG: BlogItem[] = [];

export const INITIAL_AD_SLOTS: AdSlot[] = [
  {
    id: "slot-1",
    title: "Header Banner — Top of public pages",
    locationName: "Header Banner",
    htmlContent: "",
    enabled: false
  },
  {
    id: "slot-2",
    title: "Homepage Banner — Under hero section",
    locationName: "Homepage Top",
    htmlContent: "",
    enabled: false
  },
  {
    id: "slot-3",
    title: "Jobs Directory Banner — Top of jobs listing",
    locationName: "Job Listing Top",
    htmlContent: "",
    enabled: false
  },
  {
    id: "slot-4",
    title: "Job Detail Top Banner — Top of job recruitment notice",
    locationName: "Job Detail Top",
    htmlContent: "",
    enabled: false
  },
  {
    id: "slot-6",
    title: "Sidebar Placement Banner",
    locationName: "Sidebar",
    htmlContent: "",
    enabled: false
  }
];

export const INITIAL_SETTINGS: SiteSettings = {
  whatsappNumber: "+919876543210",
  whatsappChannelUrl: "https://whatsapp.com/channel/0029VaJobKhojOfficial",
  telegramChannelUrl: "https://t.me/",
  defaultSupportMsg: "Hello JOB KHOJ Support, I have an inquiry regarding recruitment notifications.",
  whatsappApplyMsgTemplate: "Hello JOB KHOJ, I want information regarding Job: {{JOB_TITLE}}, Job ID: {{JOB_ID}}",
  enableWhatsappApplyGlobal: true,
  enableHeaderWhatsappBtn: true,
  siteTagline: "Find Your Next Opportunity",
  supportEmail: "jobkhojsupport@gmail.com",
  footerAboutText: "JOB KHOJ - Dedicated Indian Job Alert & Recruitment Information Portal",
  adminEmail: "jobkhojsupport@gmail.com",
  adminPassword: "JOBKHOJ2026"
};

export const INITIAL_FEATURES: FeatureSettings = {
  announcementEnabled: false,
  announcementText: 'Latest Government Job Updates — Check new vacancies daily.',
  announcementUrl: '#jobs',
  popupEnabled: false,
  popupTitle: 'Get Job Alerts',
  popupMessage: 'Join our Telegram and WhatsApp channels for the latest updates.',
  popupUrl: '#home',
  popupDelayMs: 5000,
  seoSiteTitle: 'Job Khoj - Latest Government Jobs, Results & Admit Cards',
  seoSiteDescription: 'Latest government jobs, recruitment notifications, results, admit cards, answer keys and exam updates.',
  seoKeywords: 'government jobs, sarkari job, recruitment, admit card, results, job alerts',
  seoCanonicalUrl: '',
  pushNotificationsEnabled: false,
  redirectRules: [],
  adminUsers: [{ email: 'jobkhojsupport@gmail.com', role: 'owner' }]
};

export const INITIAL_ANALYTICS: AnalyticsData = {
  totalPageViews: 0,
  jobViews: 0,
  applyClicks: 0,
  whatsappClicks: 0,
  searchQueries: 0,
  recentActivity: [],
  topSearches: []
};

// Storage Layer (v2 deploy-ready)
const STORAGE_KEYS = {
  JOBS: "jobkhoj_jobs_v2",
  EXAMS: "jobkhoj_exams_v2",
  RESULTS: "jobkhoj_results_v2",
  ADMIT_CARDS: "jobkhoj_admit_cards_v2",
  BLOG: "jobkhoj_blog_v2",
  ADS: "jobkhoj_ads_v2",
  SETTINGS: "jobkhoj_settings_v2",
  ANALYTICS: "jobkhoj_analytics_v2",
  FEATURES: "jobkhoj_features_v1",
  ADMIN_SESSION: "jobkhoj_admin_session_v2"
};

// Purge legacy mock data from visitor caches
try {
  [
    'jobkhoj_jobs_v1',
    'jobkhoj_exams_v1',
    'jobkhoj_results_v1',
    'jobkhoj_admit_cards_v1',
    'jobkhoj_blog_v1',
    'jobkhoj_ads_v1',
    'jobkhoj_analytics_v1',
    'jobkhoj_settings_v1'
  ].forEach(k => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(k);
    }
  });
} catch {
  // Ignored in restricted environments
}

export class JobKhojDataStore {
  private static adSlotsCache: 
  AdSlot[] = [...INITIAL_AD_SLOTS];
  static getJobs(): JobItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(INITIAL_JOBS));
      return [...INITIAL_JOBS];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...INITIAL_JOBS];
    }
  }

  static saveJobs(jobs: JobItem[]): void {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
  }

  static getExams(): ExamItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
      return [...INITIAL_EXAMS];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...INITIAL_EXAMS];
    }
  }

  static saveExams(exams: ExamItem[]): void {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
  }

  static getResults(): ResultItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.RESULTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(INITIAL_RESULTS));
      return [...INITIAL_RESULTS];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...INITIAL_RESULTS];
    }
  }

  static saveResults(results: ResultItem[]): void {
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  }

  static getAdmitCards(): AdmitCardItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ADMIT_CARDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(INITIAL_ADMIT_CARDS));
      return [...INITIAL_ADMIT_CARDS];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...INITIAL_ADMIT_CARDS];
    }
  }

  static saveAdmitCards(cards: AdmitCardItem[]): void {
    localStorage.setItem(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(cards));
  }

  static getBlog(): BlogItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BLOG, JSON.stringify(INITIAL_BLOG));
      return [...INITIAL_BLOG];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...INITIAL_BLOG];
    }
  }

  static saveBlog(articles: BlogItem[]): void {
    localStorage.setItem(STORAGE_KEYS.BLOG, JSON.stringify(articles));
  }

static getAdSlots(): AdSlot[] {
  // Always return a copy so callers cannot accidentally mutate the cache.
  return this.adSlotsCache.map(ad => ({ ...ad }));
}

static async loadAdSlots(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('ad_slots')
      .select('id, title, location_name, html_content, enabled');

    if (error) {
      console.error('Failed to load advertisement slots:', error);
      // Keep the built-in slots so the admin UI never renders blank.
      return;
    }

    // A successful query can legitimately return zero rows (for example on a
    // fresh project or with restrictive RLS). Never replace the default slot
    // list with an empty array. Merge database values over the known slots.
    const databaseSlots: AdSlot[] = (data ?? []).map(row => ({
      id: String(row.id ?? ''),
      title: String(row.title ?? ''),
      locationName: String(row.location_name ?? ''),
      htmlContent: typeof row.html_content === 'string' ? row.html_content : '',
      enabled: Boolean(row.enabled)
    })).filter(row => row.id);

    const merged = new Map<string, AdSlot>(
      INITIAL_AD_SLOTS.map(slot => [slot.id, { ...slot }])
    );

    for (const slot of databaseSlots) {
      merged.set(slot.id, slot);
    }

    this.adSlotsCache = Array.from(merged.values());
  } catch (error) {
    console.error('Unexpected advertisement loading error:', error);
    // Keep defaults on network/client failures.
  }
}

static async saveAdSlots(ads: AdSlot[]): Promise<void> {
  const safeAds = ads.map(ad => ({
    id: String(ad.id),
    title: String(ad.title),
    locationName: String(ad.locationName),
    htmlContent: String(ad.htmlContent ?? ''),
    enabled: Boolean(ad.enabled)
  }));

  const rows = safeAds.map(ad => ({
    id: ad.id,
    title: ad.title,
    location_name: ad.locationName,
    html_content: ad.htmlContent,
    enabled: ad.enabled
  }));

  const { error } = await supabase
    .from('ad_slots')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Failed to save advertisement slots:', error);
    throw error;
  }

  this.adSlotsCache = safeAds.map(ad => ({ ...ad }));
}
  static getSettings(): SiteSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return { ...INITIAL_SETTINGS };
    }
    try {
      return { ...INITIAL_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...INITIAL_SETTINGS };
    }
  }

  static saveSettings(settings: SiteSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static getAnalytics(): AnalyticsData {
    const raw = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(INITIAL_ANALYTICS));
      return { ...INITIAL_ANALYTICS };
    }
    try {
      return { ...INITIAL_ANALYTICS, ...JSON.parse(raw) };
    } catch {
      return { ...INITIAL_ANALYTICS };
    }
  }

  static incrementStat(statKey: 'totalPageViews' | 'jobViews' | 'applyClicks' | 'whatsappClicks' | 'searchQueries', label?: string): void {
    const data = this.getAnalytics();
    data[statKey] = (data[statKey] || 0) + 1;

    if (label) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      data.recentActivity.unshift({
        id: "act-" + Date.now(),
        text: label,
        time: timeStr,
        type: statKey
      });
      if (data.recentActivity.length > 25) {
        data.recentActivity.pop();
      }
    }

    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(data));
  }

  static recordSearch(term: string): void {
    const trimmed = term.trim();
    if (!trimmed) return;
    const data = this.getAnalytics();
    data.searchQueries = (data.searchQueries || 0) + 1;
    
    const existing = data.topSearches.find(s => s.term.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      existing.count += 1;
    } else {
      data.topSearches.push({ term: trimmed, count: 1 });
    }
    data.topSearches.sort((a, b) => b.count - a.count);
    if (data.topSearches.length > 15) {
      data.topSearches.pop();
    }
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(data));
  }

  static getFeatures(): FeatureSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.FEATURES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.FEATURES, JSON.stringify(INITIAL_FEATURES));
      return { ...INITIAL_FEATURES, redirectRules: [], adminUsers: [...INITIAL_FEATURES.adminUsers] };
    }
    try {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_FEATURES, ...parsed, redirectRules: parsed.redirectRules || [], adminUsers: parsed.adminUsers || INITIAL_FEATURES.adminUsers };
    } catch {
      return { ...INITIAL_FEATURES, redirectRules: [], adminUsers: [...INITIAL_FEATURES.adminUsers] };
    }
  }

  static saveFeatures(features: FeatureSettings): void {
    localStorage.setItem(STORAGE_KEYS.FEATURES, JSON.stringify(features));
  }

  static expireJobs(): number {
    const jobs = this.getJobsRaw();
    let changed = false;
    const now = Date.now();
    const updated = jobs.map(job => {
      const parsed = Date.parse(job.lastDate || '');
      if (job.published && !Number.isNaN(parsed) && parsed < now && job.status !== 'Expired') {
        changed = true;
        return { ...job, published: false, status: 'Expired' as const };
      }
      return job;
    });
    if (changed) this.saveJobs(updated);
    return updated.filter(j => j.status === 'Expired').length;
  }

  private static getJobsRaw(): JobItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (!raw) return [...INITIAL_JOBS];
    try { return JSON.parse(raw); } catch { return [...INITIAL_JOBS]; }
  }

  static backupAll(): string {
    const payload = { version: 1, exportedAt: new Date().toISOString(), jobs: this.getJobs(), exams: this.getExams(), results: this.getResults(), admitCards: this.getAdmitCards(), blog: this.getBlog(), ads: this.getAdSlots(), settings: this.getSettings(), analytics: this.getAnalytics(), features: this.getFeatures() };
    return JSON.stringify(payload, null, 2);
  }

  static restoreAll(payload: any): void {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid backup file');
    if (Array.isArray(payload.jobs)) this.saveJobs(payload.jobs);
    if (Array.isArray(payload.exams)) this.saveExams(payload.exams);
    if (Array.isArray(payload.results)) this.saveResults(payload.results);
    if (Array.isArray(payload.admitCards)) this.saveAdmitCards(payload.admitCards);
    if (Array.isArray(payload.blog)) this.saveBlog(payload.blog);
    if (payload.settings) this.saveSettings({ ...INITIAL_SETTINGS, ...payload.settings });
    if (payload.analytics) localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify({ ...INITIAL_ANALYTICS, ...payload.analytics }));
    if (payload.features) this.saveFeatures({ ...INITIAL_FEATURES, ...payload.features });
  }

  static isAdminLoggedIn(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === "true";
  }

  static setAdminLoggedIn(status: boolean): void {
    if (status) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  }
}
