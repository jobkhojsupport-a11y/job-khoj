import { supabase } from './supabase';

export type JobCategory = 'Government'|'Private'|'Bank'|'Railway'|'Teaching'|'Defence'|'Police'|'Apprentice';
export type JobType = 'Permanent'|'Contractual'|'Apprentice'|'Full Time';

export interface JobItem {
  id:string; title:string; org:string; post?:string; category:JobCategory; jobType:JobType;
  vacancies:string; qualification:string; location:string; salary:string; ageLimit:string;
  appStartDate:string; lastDate:string; examDate:string; appFee:string; selectionProcess:string;
  documentsRequired:string[]; jobDesc:string; howToApply?:string; officialNotifUrl:string;
  officialWebsiteUrl:string; applyUrl:string; whatsappApplyEnabled:boolean; featured:boolean;
  published:boolean; slug:string; postedDate:string; status:'Active'|'Closing Soon'|'Expired';
}
export interface ExamItem { id:string; examName:string; org:string; examDate:string; lastDate:string; details:string; eligibility:string; officialUrl:string; published:boolean; }
export interface ResultItem { id:string; resultTitle:string; exam:string; org:string; resultDate:string; description:string; resultUrl:string; officialWebsite:string; published:boolean; featured:boolean; }
export interface AdmitCardItem { id:string; examName:string; org:string; releaseDate:string; examDate:string; downloadUrl:string; officialWebsite:string; description:string; published:boolean; }
export interface BlogItem { id:string; title:string; slug:string; category:string; featuredImage:string; excerpt:string; content:string; author:string; publishedDate:string; seoTitle:string; seoDescription:string; keywords:string; published:boolean; }
export interface AdSlot { id:string; title:string; locationName:string; htmlContent:string; enabled:boolean; }
export interface SiteSettings { whatsappNumber:string; whatsappChannelUrl:string; telegramChannelUrl:string; defaultSupportMsg:string; whatsappApplyMsgTemplate:string; enableWhatsappApplyGlobal:boolean; enableHeaderWhatsappBtn:boolean; siteTagline:string; supportEmail:string; footerAboutText:string;  }
export interface FeatureSettings { announcementEnabled:boolean; announcementText:string; announcementUrl:string; popupEnabled:boolean; popupTitle:string; popupMessage:string; popupUrl:string; popupDelayMs:number; seoSiteTitle:string; seoSiteDescription:string; seoKeywords:string; seoCanonicalUrl:string; pushNotificationsEnabled:boolean; redirectRules:Array<{from:string;to:string;enabled:boolean}>; adminUsers:Array<{email:string;role:'owner'|'editor'|'viewer'}>; }
export interface AnalyticsData { totalPageViews:number; jobViews:number; applyClicks:number; whatsappClicks:number; searchQueries:number; recentActivity:Array<{id:string;text:string;time:string;type:string}>; topSearches:Array<{term:string;count:number}>; }

export const INITIAL_JOBS:JobItem[]=[]; export const INITIAL_EXAMS:ExamItem[]=[]; export const INITIAL_RESULTS:ResultItem[]=[]; export const INITIAL_ADMIT_CARDS:AdmitCardItem[]=[]; export const INITIAL_BLOG:BlogItem[]=[];
export const INITIAL_AD_SLOTS:AdSlot[]=['slot-1','slot-2','slot-3','slot-4','slot-6'].map((id,i)=>({id,title:['Header Banner — Top of public pages','Homepage Banner — Under hero section','Jobs Directory Banner — Top of jobs listing','Job Detail Top Banner — Top of job recruitment notice','Sidebar Placement Banner'][i],locationName:['Header Banner','Homepage Top','Job Listing Top','Job Detail Top','Sidebar'][i],htmlContent:'',enabled:false}));
export const INITIAL_SETTINGS:SiteSettings={whatsappNumber:'',whatsappChannelUrl:'',telegramChannelUrl:'',defaultSupportMsg:'Hello JOB KHOJ Support, I have an inquiry regarding recruitment notifications.',whatsappApplyMsgTemplate:'Hello JOB KHOJ, I want information regarding Job: {{JOB_TITLE}}, Job ID: {{JOB_ID}}',enableWhatsappApplyGlobal:true,enableHeaderWhatsappBtn:true,siteTagline:'Find Your Next Opportunity',supportEmail:'',footerAboutText:'JOB KHOJ - Dedicated Indian Job Alert & Recruitment Information Portal',};
export const INITIAL_FEATURES:FeatureSettings={announcementEnabled:false,announcementText:'Latest Government Job Updates — Check new vacancies daily.',announcementUrl:'#jobs',popupEnabled:false,popupTitle:'Get Job Alerts',popupMessage:'Join our Telegram and WhatsApp channels for the latest updates.',popupUrl:'#home',popupDelayMs:5000,seoSiteTitle:'Job Khoj - Latest Government Jobs, Results & Admit Cards',seoSiteDescription:'Latest government jobs, recruitment notifications, results, admit cards, answer keys and exam updates.',seoKeywords:'government jobs, sarkari job, recruitment, admit card, results, job alerts',seoCanonicalUrl:'',pushNotificationsEnabled:false,redirectRules:[],adminUsers:[]};
export const INITIAL_ANALYTICS:AnalyticsData={totalPageViews:0,jobViews:0,applyClicks:0,whatsappClicks:0,searchQueries:0,recentActivity:[],topSearches:[]};

const KEYS={JOBS:'jobkhoj_jobs_v2',EXAMS:'jobkhoj_exams_v2',RESULTS:'jobkhoj_results_v2',ADMIT:'jobkhoj_admit_cards_v2',BLOG:'jobkhoj_blog_v2',SETTINGS:'jobkhoj_settings_v2',FEATURES:'jobkhoj_features_v2',ANALYTICS:'jobkhoj_analytics_v2'};

type Kind='jobs'|'exams'|'results'|'admit_cards'|'blog';
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const id=()=>crypto.randomUUID();
const safeUrl=(v:string)=>{const s=(v||'').trim(); if(!s)return ''; try{const u=new URL(s,location.origin); return ['http:','https:'].includes(u.protocol)?s:'';}catch{return ''}};
const normalizeDate=(v:string)=>{const s=(v||'').trim(); if(!s)return ''; if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s; let m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; m=s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/); if(m){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];const mi=months.indexOf(m[2].slice(0,3).toLowerCase());if(mi>=0)return `${m[3]}-${String(mi+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;} const d=new Date(s); return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const parseDate=(v:string)=>{const n=normalizeDate(v); return n?new Date(`${n}T23:59:59`).getTime():NaN};

export class JobKhojDataStore {
 private static jobsCache:JobItem[]=[]; private static examsCache:ExamItem[]=[]; private static resultsCache:ResultItem[]=[]; private static admitCardsCache:AdmitCardItem[]=[]; private static blogCache:BlogItem[]=[]; private static adSlotsCache=clone(INITIAL_AD_SLOTS); private static settingsCache=clone(INITIAL_SETTINGS); private static featuresCache=clone(INITIAL_FEATURES); private static analyticsCache=clone(INITIAL_ANALYTICS); private static loaded=false; private static remoteAvailable=false;
 private static previousIds:Record<Kind,Set<string>>={jobs:new Set(),exams:new Set(),results:new Set(),admit_cards:new Set(),blog:new Set()};
 static async loadAll():Promise<void>{
   this.remoteAvailable=false;
   try{
     const {data,error}=await supabase.from('content_records').select('kind,id,payload,published');
     if(error)throw error;
     for(const kind of ['jobs','exams','results','admit_cards','blog'] as Kind[]){const vals=(data||[]).filter((r:any)=>r.kind===kind).map((r:any)=>({...r.payload,id:String(r.id),published:Boolean(r.published)})); this.setCache(kind,vals); this.previousIds[kind]=new Set(vals.map((x:any)=>String(x.id)));}
     this.remoteAvailable=true;
   }catch(e){console.error('Content database read failed',e);this.jobsCache=[];this.examsCache=[];this.resultsCache=[];this.admitCardsCache=[];this.blogCache=[];}
   try{const {data,error}=await supabase.from('site_config').select('key,value').in('key',['settings','features']);if(error)throw error;for(const r of data||[]){if(r.key==='settings')this.settingsCache={...INITIAL_SETTINGS,...(r.value||{})};if(r.key==='features')this.featuresCache={...INITIAL_FEATURES,...(r.value||{}),adminUsers:[]};}}catch(e){console.error('Site configuration read failed',e);}
   try{const {data,error}=await supabase.from('ad_slots').select('id,title,location_name,html_content,enabled');if(error)throw error;this.adSlotsCache=(data||[]).map((a:any)=>({id:a.id,title:a.title,locationName:a.location_name,htmlContent:a.html_content||'',enabled:Boolean(a.enabled)}));}catch(e){console.error('Ad slot read failed',e);}
   await this.loadAnalytics(); this.loaded=true;
 }
 private static async ensureRemote(){if(!this.remoteAvailable)throw new Error('Database is unavailable. No changes were saved.');}
 private static async saveRecord(kind:Kind,item:any):Promise<void>{
   await this.ensureRemote();
   const x=clone(item);
   const urlFields=['officialNotifUrl','officialWebsiteUrl','applyUrl','officialUrl','resultUrl','officialWebsite','downloadUrl','featuredImage'];
   for(const field of urlFields){ if(field in x && x[field]){ const u=new URL(String(x[field]),location.origin); if(!['http:','https:'].includes(u.protocol)) throw new Error(`Invalid URL in ${field}`); } }
   if(kind==='jobs'){
     x.appStartISO=normalizeDate(x.appStartDate); x.lastDateISO=normalizeDate(x.lastDate); x.examDateISO=normalizeDate(x.examDate);
     if(x.lastDate && !x.lastDateISO) throw new Error('Invalid application last date. Use YYYY-MM-DD or DD/MM/YYYY.');
     if(x.appStartDate && !x.appStartISO) throw new Error('Invalid application start date. Use YYYY-MM-DD or DD/MM/YYYY.');
     if(x.appStartISO && x.lastDateISO && x.appStartISO>x.lastDateISO) throw new Error('Application start date cannot be after the last date.');
   }
   const current=this.getCollection(kind).find((v:any)=>String(v.id)===String(x.id));
   if(kind==='jobs'||kind==='blog'){
     const existingSlugs=new Set(this.getCollection(kind).filter((v:any)=>String(v.id)!==String(x.id)).map((v:any)=>String(v.slug||'').toLowerCase()).filter(Boolean));
     const base=String(x.slug||x.title||'item').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'')||'item'; let slug=base,n=2; while(existingSlugs.has(slug.toLowerCase())) slug=`${base}-${n++}`; x.slug=slug;
   }
   const row={kind,id:String(x.id||crypto.randomUUID()),payload:x,published:Boolean(x.published),updated_at:new Date().toISOString()};
   let result=await supabase.from('content_records').upsert(row,{onConflict:'kind,id'});
   if(result.error && (kind==='jobs'||kind==='blog') && /duplicate|unique/i.test(result.error.message||'')){
     const base=String(x.slug||'item'); x.slug=`${base}-${crypto.randomUUID().slice(0,8)}`; row.payload=x; result=await supabase.from('content_records').upsert(row,{onConflict:'kind,id'});
   }
   if(result.error)throw result.error;
   const merged=this.getCollection(kind).filter((v:any)=>String(v.id)!==String(row.id)); merged.push({...x,id:row.id,published:row.published}); this.setCache(kind,merged);
 }
 private static async saveCollection(kind:Kind,items:any[],key:string):Promise<void>{
   await this.ensureRemote();
   for(const item of items) await this.saveRecord(kind,item);
 }
 private static getCollection(kind:Kind){return kind==='jobs'?this.jobsCache:kind==='exams'?this.examsCache:kind==='results'?this.resultsCache:kind==='admit_cards'?this.admitCardsCache:this.blogCache;}
 private static setCache(kind:Kind,items:any[]){if(kind==='jobs')this.jobsCache=clone(items);if(kind==='exams')this.examsCache=clone(items);if(kind==='results')this.resultsCache=clone(items);if(kind==='admit_cards')this.admitCardsCache=clone(items);if(kind==='blog')this.blogCache=clone(items);}
 static getJobs(){return clone(this.jobsCache)} static getExams(){return clone(this.examsCache)} static getResults(){return clone(this.resultsCache)} static getAdmitCards(){return clone(this.admitCardsCache)} static getBlog(){return clone(this.blogCache)} static getAdSlots(){return clone(this.adSlotsCache)} static getSettings(){return clone(this.settingsCache)} static getFeatures(){return {...clone(this.featuresCache),adminUsers:[]}} static getAnalytics(){return clone(this.analyticsCache)}
 static isRemoteAvailable(){return this.remoteAvailable} static getAdminRole(){return this.adminRole}
 static canWrite(){return this.adminRole==='owner'||this.adminRole==='editor'} static canManageAdmins(){return this.adminRole==='owner'} private static adminRole:'owner'|'editor'|'viewer'|null=null;
 static setAdminLoggedIn(v:boolean,role?:'owner'|'editor'|'viewer'){this.adminRole=v?(role||'viewer'):null;}
 static isAdminLoggedIn(){return !!this.adminRole}
 static async saveJob(v:JobItem){await this.saveRecord('jobs',v)} static async saveJobs(v:JobItem[]){await this.saveCollection('jobs',v,KEYS.JOBS)}
 static async deleteContent(kind:Kind,recordId:string){await this.ensureRemote();if(!this.canWrite())throw new Error('Editor permission required');const {error}=await supabase.rpc('delete_content_record',{p_kind:kind,p_id:recordId});if(error)throw error;this.setCache(kind,this.getCollection(kind).filter((x:any)=>String(x.id)!==String(recordId)));}
 static async setPublished(kind:Kind,recordId:string,published:boolean){await this.ensureRemote();if(!this.canWrite())throw new Error('Editor permission required');const {error}=await supabase.rpc('set_content_published',{p_kind:kind,p_id:recordId,p_published:published});if(error)throw error;const arr=this.getCollection(kind).map((x:any)=>String(x.id)===String(recordId)?{...x,published}:x);this.setCache(kind,arr);} static async saveExam(v:ExamItem){await this.saveRecord('exams',v)} static async saveExams(v:ExamItem[]){await this.saveCollection('exams',v,KEYS.EXAMS)} static async saveResult(v:ResultItem){await this.saveRecord('results',v)} static async saveResults(v:ResultItem[]){await this.saveCollection('results',v,KEYS.RESULTS)} static async saveAdmitCard(v:AdmitCardItem){await this.saveRecord('admit_cards',v)} static async saveAdmitCards(v:AdmitCardItem[]){await this.saveCollection('admit_cards',v,KEYS.ADMIT)} static async saveBlogItem(v:BlogItem){await this.saveRecord('blog',v)} static async saveBlog(v:BlogItem[]){await this.saveCollection('blog',v,KEYS.BLOG)}
 static async saveAdSlots(v:AdSlot[]){await this.ensureRemote();if(!this.canWrite())throw new Error('Editor permission required');const rows=v.map(a=>({id:a.id,title:a.title,location_name:a.locationName,html_content:a.htmlContent,enabled:Boolean(a.enabled)}));const {error}=await supabase.from('ad_slots').upsert(rows,{onConflict:'id'});if(error)throw error;this.adSlotsCache=clone(v)}
 static async saveSettings(v:SiteSettings){await this.ensureRemote();if(!this.canWrite())throw new Error('Editor permission required');const clean={...INITIAL_SETTINGS,...v,whatsappNumber:v.whatsappNumber.trim(),whatsappChannelUrl:safeUrl(v.whatsappChannelUrl),telegramChannelUrl:safeUrl(v.telegramChannelUrl),supportEmail:v.supportEmail.trim()};const {error}=await supabase.from('site_config').upsert({key:'settings',value:clean,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;this.settingsCache=clone(clean)}
 static async saveFeatures(v:FeatureSettings){await this.ensureRemote();if(!this.canWrite())throw new Error('Editor permission required');const clean={...INITIAL_FEATURES,...v,adminUsers:[]};for(const field of ['announcementUrl','popupUrl','seoCanonicalUrl'] as const){if(clean[field]&&!/^(https?:\/\/|\/|#)/i.test(clean[field]))throw new Error(`Invalid ${field}`);}for(const r of clean.redirectRules){if(!r.from||!r.to||/^javascript:/i.test(r.to)||/^data:/i.test(r.to))throw new Error('Invalid redirect rule');}const {error}=await supabase.from('site_config').upsert({key:'features',value:clean,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;this.featuresCache=clean}
 private static async loadAnalytics(){
   try{const {data,error}=await supabase.rpc('analytics_summary');if(error)throw error;const map:any={page_view:'totalPageViews',job_view:'jobViews',apply_click:'applyClicks',whatsapp_click:'whatsappClicks',search:'searchQueries'};const next={...INITIAL_ANALYTICS,recentActivity:[],topSearches:[]};for(const r of data||[]){const k=map[r.event_type];if(k)next[k]=Number(r.event_count)||0;}const {data:searches}=await supabase.rpc('analytics_searches');next.topSearches=(searches||[]).map((r:any)=>({term:String(r.term),count:Number(r.event_count)||0}));this.analyticsCache=next;}catch(e){console.error('Analytics summary failed',e);}
 }
 static async sendPushNotification(title:string,body:string,url='/'){await this.ensureRemote();if(!this.canManageAdmins())throw new Error('Owner permission required');const {data,error}=await supabase.functions.invoke('send-push',{body:{title:title.trim().slice(0,120),body:body.trim().slice(0,500),url}});if(error)throw error;if(data?.error)throw new Error(String(data.error));return data;}
 static async subscribeToPush(){
   const key=import.meta.env.VITE_VAPID_PUBLIC_KEY; if(!key)throw new Error('Push notifications are not configured. Set VITE_VAPID_PUBLIC_KEY.');
   if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Push notifications are not supported in this browser.');
   const permission=await Notification.requestPermission(); if(permission!=='granted')throw new Error('Notification permission was not granted.');
   const reg=await navigator.serviceWorker.ready; let sub=await reg.pushManager.getSubscription();
   if(!sub){const b64=key.replace(/-/g,'+').replace(/_/g,'/'); const padded=b64+'='.repeat((4-b64.length%4)%4); const raw=Uint8Array.from(atob(padded),c=>c.charCodeAt(0));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:raw});}
   const json=sub.toJSON(); if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error('Invalid push subscription.');
   const {error}=await supabase.rpc('upsert_push_subscription',{p_endpoint:json.endpoint,p_p256dh:json.keys.p256dh,p_auth:json.keys.auth,p_user_agent:navigator.userAgent});if(error)throw error; return true;
 }
 static async loadAdSlots(){try{const {data,error}=await supabase.from('ad_slots').select('id,title,location_name,html_content,enabled');if(error)throw error;this.adSlotsCache=(data||[]).map((a:any)=>({id:a.id,title:a.title,locationName:a.location_name,htmlContent:a.html_content||'',enabled:Boolean(a.enabled)}))}catch(e){console.error(e)}}
 static async incrementStat(stat:'totalPageViews'|'jobViews'|'applyClicks'|'whatsappClicks'|'searchQueries',label?:string){const map:any={totalPageViews:'page_view',jobViews:'job_view',applyClicks:'apply_click',whatsappClicks:'whatsapp_click',searchQueries:'search'};const key=`jobkhoj_analytics_last_${stat}_${label?.slice(0,80)||''}`;try{const last=Number(sessionStorage.getItem(key)||0);const cooldown=stat==='totalPageViews'?30000:stat==='searchQueries'?3000:1000;if(Date.now()-last<cooldown)return;sessionStorage.setItem(key,String(Date.now()));}catch{}let visitorKey='';try{visitorKey=sessionStorage.getItem('jobkhoj_visitor_key')||crypto.randomUUID();sessionStorage.setItem('jobkhoj_visitor_key',visitorKey)}catch{} const {error}=await supabase.rpc('record_analytics_event',{p_event_type:map[stat],p_label:label?.slice(0,200)||null,p_visitor_key:visitorKey});if(error){console.error('Analytics event failed',error);return;}this.analyticsCache[stat]++;if(label)this.analyticsCache.recentActivity.unshift({id:id(),text:label.slice(0,200),time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),type:stat});this.analyticsCache.recentActivity=this.analyticsCache.recentActivity.slice(0,50);}
 static recordSearch(term:string){const t=term.trim().slice(0,100);if(!t)return;void this.incrementStat('searchQueries',t);const x=this.analyticsCache.topSearches.find(s=>s.term.toLowerCase()===t.toLowerCase());if(x)x.count++;else this.analyticsCache.topSearches.push({term:t,count:1});this.analyticsCache.topSearches.sort((a,b)=>b.count-a.count);this.analyticsCache.topSearches=this.analyticsCache.topSearches.slice(0,15)}
 static async expireJobs():Promise<number>{await this.ensureRemote(); const {data,error}=await supabase.rpc('expire_due_jobs'); if(error)throw error; await this.loadAll(); return Number(data)||0}
 static backupAll(){return JSON.stringify({version:4,createdAt:new Date().toISOString(),jobs:this.getJobs(),exams:this.getExams(),results:this.getResults(),admitCards:this.getAdmitCards(),blog:this.getBlog(),settings:this.getSettings(),features:this.getFeatures(),adSlots:this.getAdSlots()})}
 static async restoreAll(payload:any){if(!payload||typeof payload!=='object'||![3,4].includes(Number(payload.version)))throw new Error('Unsupported or invalid backup version');for(const [key,value] of [['jobs',payload.jobs],['exams',payload.exams],['results',payload.results],['admit_cards',payload.admitCards],['blog',payload.blog]] as any){if(!Array.isArray(value))throw new Error(`Backup is missing ${key}`);for(const i of value)if(!i||!i.id)throw new Error(`Invalid ${key} record id`);}await this.ensureRemote();const {error}=await supabase.rpc('restore_content_backup',{p_backup:payload});if(error)throw error;await this.loadAll()}
}
