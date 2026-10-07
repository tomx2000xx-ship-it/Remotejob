import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  ArrowLeft, ArrowRight, Bell, Bookmark, BriefcaseBusiness, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, CreditCard, FileText, Filter,
  Globe2, Heart, LayoutDashboard, Landmark, LockKeyhole, Mail, MapPin,
  Menu, MessageCircle, MoreHorizontal, PenLine, Plus, Search, Send,
  Settings as SettingsIcon, ShieldCheck, SlidersHorizontal, Sparkles, Star, UserRound,
  Users, WalletCards, X, Zap
} from "lucide-react";



const UNIVERSAL_FORM_TYPES = [
  {value:"text",label:"Text — letters, words or mixed text"},
  {value:"textarea",label:"Long text / paragraph"},
  {value:"number",label:"Number"},
  {value:"email",label:"Email address"},
  {value:"tel",label:"Phone number"},
  {value:"url",label:"Website / URL"},
  {value:"password",label:"Password"},
  {value:"date",label:"Date"},
  {value:"time",label:"Time"},
  {value:"datetime-local",label:"Date & time"},
  {value:"select",label:"Dropdown / select"},
  {value:"radio",label:"Single choice"},
  {value:"checkbox",label:"Checkbox / agreement"},
  {value:"file",label:"File upload"},
  {value:"country",label:"Country"}
];

const registrationCountries = [
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇩🇪","Germany"],["🇫🇷","France"],
  ["🇳🇱","Netherlands"],["🇮🇪","Ireland"],["🇸🇪","Sweden"],["🇩🇰","Denmark"],["🇳🇴","Norway"],
  ["🇫🇮","Finland"],["🇧🇪","Belgium"],["🇨🇭","Switzerland"],["🇦🇹","Austria"],["🇵🇱","Poland"]
];

function normalizeGovernmentIdentifier(value){return String(value||"").toUpperCase().replace(/[\s-]/g,"");}
function luhnValid(value){
  const digits=normalizeGovernmentIdentifier(value);
  if(!/^\d+$/.test(digits))return false;
  let sum=0,doubleIt=false;
  for(let i=digits.length-1;i>=0;i--){let n=Number(digits[i]);if(doubleIt){n*=2;if(n>9)n-=9;}sum+=n;doubleIt=!doubleIt;}
  return sum%10===0;
}
function validDateParts(value){
  const y=Number(value.slice(0,2)),m=Number(value.slice(2,4)),d=Number(value.slice(4,6));
  if(m<1||m>12||d<1||d>31)return false;
  const year=2000+y;
  const date=new Date(Date.UTC(year,m-1,d));
  return date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
function validDanishDateParts(value){
  const d=Number(value.slice(0,2)),m=Number(value.slice(2,4)),y=Number(value.slice(4,6));
  if(m<1||m>12||d<1||d>31)return false;
  const date=new Date(Date.UTC(2000+y,m-1,d));
  return date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
function validateGovernmentIdentifier(country,value){
  const raw=String(value||"").trim();
  const id=normalizeGovernmentIdentifier(raw);
  if(!raw)return {valid:false,message:"Enter your government identifier."};
  if(id.length<6)return {valid:false,message:"This identifier is too short."};
  if(country==="United States"){
    if(!/^\d{9}$/.test(id))return {valid:false,message:"A U.S. SSN must contain exactly 9 digits."};
    const area=id.slice(0,3),group=id.slice(3,5),serial=id.slice(5);
    if(area==="000"||area==="666"||Number(area)>=900)return {valid:false,message:"That SSN area number is not valid."};
    if(group==="00"||serial==="0000")return {valid:false,message:"That SSN contains an invalid group or serial number."};
    return {valid:true,normalized:id,message:"Format check passed. Identity ownership is not verified by this demo."};
  }
  if(country==="Canada"){
    if(!/^\d{9}$/.test(id))return {valid:false,message:"A Canadian SIN must contain exactly 9 digits."};
    if(/^0{9}$/.test(id)||id[0]==="0")return {valid:false,message:"That SIN cannot begin with 0 or be all zeros."};
    if(!luhnValid(id))return {valid:false,message:"The SIN check digit is invalid."};
    return {valid:true,normalized:id,message:"Format and check digit passed. Identity ownership is not verified by this demo."};
  }
  if(country==="United Kingdom"){
    if(!/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/.test(id))return {valid:false,message:"A UK National Insurance number must be 2 letters, 6 numbers, then A, B, C or D."};
    const prefix=id.slice(0,2);
    const blocked=["BG","GB","KN","NK","NT","TN","ZZ"];
    if(/[DFIQUV]/.test(prefix)||prefix[1]==="O"||blocked.includes(prefix))return {valid:false,message:"That National Insurance prefix is not valid."};
    return {valid:true,normalized:id,message:"Format check passed. A National Insurance number is not proof of identity by itself."};
  }
  if(country==="Germany"){
    if(!/^\d{11}$/.test(id))return {valid:false,message:"A German tax identification number must contain exactly 11 digits."};
    if(/^0{11}$/.test(id))return {valid:false,message:"That tax identification number is not valid."};
    let product=10;
    for(let i=0;i<10;i++){let digit=(Number(id[i])+product)%10;if(digit===0)digit=10;product=(2*digit)%11;}
    const check=(11-product)%10;
    if(check!==Number(id[10]))return {valid:false,message:"The German tax ID check digit is invalid."};
    return {valid:true,normalized:id,message:"Format and check digit passed."};
  }
  if(country==="France"){
    if(!/^\d{15}$/.test(id))return {valid:false,message:"A French NIR/social-security number must contain 15 digits in this demo."};
    const base=BigInt(id.slice(0,13)),key=Number(id.slice(13));
    if(97-Number(base%97n)!==key)return {valid:false,message:"The French identifier check key is invalid."};
    return {valid:true,normalized:id,message:"Format and check key passed."};
  }
  if(country==="Netherlands"){
    if(!/^\d{9}$/.test(id))return {valid:false,message:"A Dutch BSN must contain exactly 9 digits."};
    if(/^0{9}$/.test(id))return {valid:false,message:"That BSN is not valid."};
    const sum=id.split("").reduce((t,d,i)=>t+Number(d)*(9-i),0);
    if(sum%11!==0)return {valid:false,message:"The Dutch BSN 11-test check failed."};
    return {valid:true,normalized:id,message:"Format and check rule passed."};
  }
  if(country==="Sweden"){
    if(!/^\d{10}$/.test(id))return {valid:false,message:"A Swedish personal identity number must contain 10 digits in this demo."};
    if(!validDateParts(id))return {valid:false,message:"The date portion of this Swedish identifier is not valid."};
    if(!luhnValid(id))return {valid:false,message:"The Swedish personal identity number check digit is invalid."};
    return {valid:true,normalized:id,message:"Format, date and check digit passed."};
  }
  if(country==="Norway"){
    if(!/^\d{11}$/.test(id))return {valid:false,message:"A Norwegian national identity number must contain exactly 11 digits."};
    const a=[3,7,6,1,8,9,4,5,2],b=[5,4,3,2,7,6,5,4,3,2];
    let s1=a.reduce((t,w,i)=>t+Number(id[i])*w,0),r1=11-(s1%11);
    if(r1===11)r1=0;if(r1===10||r1!==Number(id[9]))return {valid:false,message:"The first Norwegian check digit is invalid."};
    let s2=b.reduce((t,w,i)=>t+Number(id[i])*w,0),r2=11-(s2%11);
    if(r2===11)r2=0;if(r2===10||r2!==Number(id[10]))return {valid:false,message:"The second Norwegian check digit is invalid."};
    return {valid:true,normalized:id,message:"Format and check digits passed."};
  }
  if(country==="Finland"){
    if(!/^\d{6}[-+A]\d{3}[0-9A-Z]$/.test(id))return {valid:false,message:"A Finnish personal identity code has 6 digits, a century marker, 3 digits and a check character."};
    const chars="0123456789ABCDEFHJKLMNPRSTUVWXY";
    const remainder=Number(id.slice(0,6)+id.slice(7,10))%31;
    if(id[10]!==chars[remainder])return {valid:false,message:"The Finnish identity code check character is invalid."};
    return {valid:true,normalized:id,message:"Format and check character passed."};
  }
  if(country==="Belgium"){
    if(!/^\d{11}$/.test(id))return {valid:false,message:"A Belgian national number must contain exactly 11 digits."};
    const first9=BigInt(id.slice(0,9)),tail=Number(id.slice(9));
    const ok=(97-Number(first9%97n)===tail)||(97-Number(BigInt("2"+id.slice(0,9))%97n)===tail);
    if(!ok)return {valid:false,message:"The Belgian national number check digits are invalid."};
    return {valid:true,normalized:id,message:"Format and check digits passed."};
  }
  if(country==="Austria"){
    if(!/^\d{10}$/.test(id))return {valid:false,message:"An Austrian social insurance number must contain exactly 10 digits."};
    const weights=[3,7,9,5,8,4,2,1,6],sum=weights.reduce((t,w,i)=>t+Number(id[i])*w,0);
    if(sum%11!==Number(id[9]))return {valid:false,message:"The Austrian social insurance check digit is invalid."};
    return {valid:true,normalized:id,message:"Format and check digit passed."};
  }
  if(country==="Poland"){
    if(!/^\d{11}$/.test(id))return {valid:false,message:"A Polish PESEL must contain exactly 11 digits."};
    const weights=[1,3,7,9,1,3,7,9,1,3],sum=weights.reduce((t,w,i)=>t+Number(id[i])*w,0),check=(10-(sum%10))%10;
    if(check!==Number(id[10]))return {valid:false,message:"The Polish PESEL check digit is invalid."};
    return {valid:true,normalized:id,message:"Format and check digit passed."};
  }
  if(country==="Denmark"){
    if(!/^\d{10}$/.test(id))return {valid:false,message:"A Danish CPR number must contain exactly 10 digits."};
    if(!validDanishDateParts(id))return {valid:false,message:"The date portion of this Danish CPR number is not valid."};
    return {valid:true,normalized:id,message:"Format and date check passed. CPR check digits are not used as a universal validation rule for all modern numbers."};
  }
  if(country==="Ireland"){
    if(!/^\d{7}[A-Z]{1,2}$/.test(id))return {valid:false,message:"An Irish PPS number must contain 7 digits followed by 1 or 2 letters."};
    return {valid:true,normalized:id,message:"Format check passed. Final eligibility/ownership checks require the official authority/provider."};
  }
  if(country==="Switzerland"){
    if(!/^756\d{10}$/.test(id))return {valid:false,message:"A Swiss AHV number must contain 13 digits and begin with 756."};
    return {valid:true,normalized:id,message:"Format check passed. Official issuance/ownership requires the authority or provider."};
  }
  return {valid:false,message:"This country does not yet have a configured validation rule."};
}

const navItems = [
  ["dashboard","Dashboard",LayoutDashboard],["jobs","Find Jobs",Search],["saved","Saved Jobs",Bookmark],
  ["applications","Applications",FileText],["interview","Interviews",MessageCircle],["profile","Profile",UserRound],["payouts","Payouts",WalletCards],
  ["verification","Verification",ShieldCheck]
];

function Logo({light=false}){return <div className={`brand ${light?"brand-light":""}`}><span className="brand-mark">↗</span><span>RemotePath</span></div>}
function Button({children,variant="primary",className="",onClick,type="button",disabled=false}){return <button type={type} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>}
function Badge({children,tone="soft"}){return <span className={`badge badge-${tone}`}>{children}</span>}
function Avatar({letter="A",size="md"}){return <span className={`avatar avatar-${size}`}>{letter}</span>}
function Toast({message,onClose}){return <div className="toast"><Check size={16}/>{message}<button onClick={onClose}><X size={14}/></button></div>}

function JobCard({job,onOpen,compact=false}){
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);  useEffect(()=>{let mounted=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from("saved_jobs").select("job_id").eq("user_id",user.id).eq("job_id",job.id).maybeSingle();if(mounted)setSaved(!!data)})();
return()=>{mounted=false}},[job.id]);  const toggleSave=async e=>{e.stopPropagation();if(saving)return;setSaving(true);try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;if(saved){const {error}=await supabase.from("saved_jobs").delete().eq("user_id",user.id).eq("job_id",job.id);if(error)throw error;setSaved(false)}else{const {error}=await supabase.from("saved_jobs").insert({user_id:user.id,job_id:job.id});if(error)throw error;setSaved(true)}}catch(err){console.error(err)}finally{setSaving(false)}};
  return <article className={`job-card ${compact?"compact":""}`} onClick={()=>onOpen?.(job.id)}>
    <div className="job-card-top"><div className="company-avatar">{job.logo}</div><button className={`icon-btn ${saved?"is-saved":""}`} onClick={toggleSave} aria-label="Save job"><Bookmark size={17} fill={saved?"currentColor":"none"}/></button></div>
    <div className="company-line">{job.company}{job.verified&&<ShieldCheck size={13}/>}</div>
    <h3>{job.title}</h3>
    <div className="job-facts"><span><MapPin size={13}/>{job.location}</span><strong>{job.salary}</strong><span>{job.type}</span></div>
    <div className="tag-row">{job.tags.map(t=><Badge key={t}>{t}</Badge>)}</div>
    <div className="job-card-bottom"><span><Clock3 size={13}/>{job.posted}</span><Button variant="ghost" className="apply-mini">View role <ArrowRight size={14}/></Button></div>
  </article>
}

function PublicNav({go}){
  const [open,setOpen]=useState(false);
  return <header className="public-nav">
    <Logo/>
    <nav className={open?"public-links open":"public-links"}>
      <button onClick={()=>go("jobs")}>Find Jobs</button><button>Companies</button><button>Resources</button><button>About</button>
    </nav>
    <div className="nav-actions"><button className="text-btn" onClick={()=>go("login")}>Log in</button><Button className="nav-cta" onClick={()=>go("signup")}>Get Started</Button><button className="menu-trigger" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div>
  </header>
}

function Home({go}){
  const [query,setQuery]=useState(""),[where,setWhere]=useState("Anywhere"),[cfg,setCfg]=useState(null),[sections,setSections]=useState({});
  useEffect(()=>{let mounted=true;(async()=>{const [{data},{data:secs}]=await Promise.all([supabase.from("site_settings").select("key,value").in("key",["brand","home_hero","home_metrics"]),supabase.from("site_sections").select("section_key,is_visible")]);if(mounted){const m={};(data||[]).forEach(x=>m[x.key]=x.value);const vis={};(secs||[]).forEach(x=>vis[x.section_key]=x.is_visible);setCfg(m);setSections(vis)}})();return()=>{mounted=false}},[]);
  const hero=cfg?.home_hero||{badge:"Trusted by 2,500+ companies worldwide",title:"Work that fits your life.",description:"Discover verified remote opportunities from trusted companies around the world. Build your career on your terms.",search_button:"Search Jobs",popular:["Remote","Design","Development","Marketing","Customer Support","Data Entry"]};
  const metrics=cfg?.home_metrics?.items||[["50,000+","Active job seekers"],["3,200+","Trusted companies"],["120+","Countries"],["98%","Satisfaction rate"]];
  const section=(key)=>cfg?true:true;
  return <div style={{"--site-accent":cfg?.brand?.accent||"#2f6b52","--site-bg":cfg?.brand?.background||"#f7f4ec"}}>
    <PublicNav go={go}/>
    <main>
      <section className="hero">
        <div className="hero-copy"><Badge tone="green"><span className="dot"/> {hero.badge}</Badge><h1>{hero.title.includes("your life.")?<>{hero.title.replace("your life.","")}<em>your life.</em></>:hero.title}</h1><p>{hero.description}</p>
          <form className="hero-search" onSubmit={e=>{e.preventDefault();go("jobs",query)}}><div><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Job title, skill or company"/></div><div><MapPin size={18}/><select value={where} onChange={e=>setWhere(e.target.value)}><option>Anywhere</option><option>North America</option><option>Europe</option><option>Africa</option><option>Asia-Pacific</option></select><ChevronDown size={15}/></div><Button type="submit">{hero.search_button||"Search Jobs"} <ArrowRight size={16}/></Button></form>
          <div className="popular"><span>Popular:</span>{(hero.popular||[]).map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div>
        </div>
        <div className="hero-media"><div className="hero-photo"><div className="hero-photo-copy"><span className="kicker">REMOTE WORK, REIMAGINED</span><strong>Find work that moves with you.</strong><small>Verified opportunities, built for the way you want to work.</small></div></div><div className="floating-card rating"><div className="avatar-stack"><Avatar letter="S" size="xs"/><Avatar letter="M" size="xs"/><Avatar letter="J" size="xs"/></div><div><strong>50,000+</strong><small>professionals finding work</small></div></div><div className="floating-card quote"><Sparkles size={16}/><span><strong>Better opportunities.</strong><small>Built around your life.</small></span></div></div>
      </section>
      {sections.metrics!==false&&<section className="metric-strip">{metrics.map((m,i)=>{const icons=[Users,BriefcaseBusiness,Globe2,ShieldCheck],Icon=icons[i]||Sparkles;return <Metric key={i} icon={Icon} value={m.value||m[0]} label={m.label||m[1]}/>})}</section>}
      {sections.featured_jobs!==false&&<section className="content-section"><SectionTitle kicker="FEATURED JOBS" title="Top remote opportunities" text="Explore popular remote jobs, handpicked for you." action="View all jobs" onAction={()=>go("jobs")}/><FeaturedJobs go={go}/></section>}
      {sections.categories!==false&&<section className="category-row"><div><span className="kicker">BROWSE BY CATEGORY</span><h2>Find your next direction.</h2></div><div className="category-list">{["Design","Development","Marketing","Customer Support","Sales","Data Entry","Administration","Healthcare"].map((x,i)=><button key={x} onClick={()=>go("jobs",x)}><span>{["◈","</>","↗","◉","↗","▤","▥","+"][i]}</span>{x}<small>{1248-i*137} jobs</small></button>)}</div></section>}
      {sections.how_it_works!==false&&<section className="how-section"><div className="mountain-art" aria-label="Professional remote worker"></div><div className="how-copy"><span className="kicker">HOW IT WORKS</span><h2>Get hired in <em>4 simple steps.</em></h2><p>Finding your next opportunity is easier than you think.</p><div className="how-steps">{[["01","Create your profile"],["02","Find the right jobs"],["03","Apply with ease"],["04","Get hired"]].map(([n,t])=><div key={n}><b>{n}</b><strong>{t}</strong><small>Simple, secure and built for you.</small></div>)}</div></div></section>}
      {sections.trust_banner!==false&&<section className="trust-banner"><div><ShieldCheck size={25}/><div><strong>Trusted. Verified. Secure.</strong><span>We verify companies and job listings so you can focus on your next move.</span></div></div><Button variant="outline" onClick={()=>go("jobs")}>Explore opportunities <ArrowRight size={15}/></Button></section>}
    </main><Footer go={go}/>
  </div>
}
function FeaturedJobs({go}){const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);useEffect(()=>{let mounted=true;(async()=>{const {data,error}=await supabase.from("jobs").select("*").eq("status","published").order("created_at",{ascending:false}).limit(4);if(!mounted)return;if(!error)setItems((data||[]).map(j=>({...j,company:j.company_name,logo:j.company_logo||j.company_name?.[0]||"R",type:j.job_type,posted:relativePosted(j.created_at),salary:formatSalary(j)})));setLoading(false)})();return()=>{mounted=false}},[]);if(loading)return <div className="empty-state"><h3>Loading featured jobs…</h3><p>Fetching the latest verified opportunities.</p></div>;if(items.length===0)return <EmptyState title="New opportunities are coming soon" text="Our team is preparing verified roles from partner companies. Check back shortly." action="Browse all jobs" onAction={()=>go("jobs")}/>;return <div className="job-grid">{items.map(j=><JobCard key={j.id} job={j} onOpen={id=>go("job",id)}/>)}</div>}
function formatSalary(job){if(job.salary_min==null&&job.salary_max==null)return "Salary not disclosed";const currency=job.salary_currency||"USD";const fmt=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);const period=job.salary_period==="hour"?"/ hour":job.salary_period==="month"?"/ month":"/ year";if(job.salary_min!=null&&job.salary_max!=null)return currency+" "+fmt(job.salary_min)+"–"+fmt(job.salary_max)+" "+period;if(job.salary_min!=null)return currency+" "+fmt(job.salary_min)+"+ "+period;return "Up to "+currency+" "+fmt(job.salary_max)+" "+period}

function Metric({icon:Icon,value,label}){return <div><Icon/><div><strong>{value}</strong><span>{label}</span></div></div>}
function SectionTitle({kicker,title,text,action,onAction}){return <div className="section-title"><div><span className="kicker">{kicker}</span><h2>{title}</h2><p>{text}</p></div>{action&&<button onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>}
function Footer({go}){return <footer className="footer"><div className="footer-grid"><div><Logo light/><p>Work. Anywhere.</p></div><div><h4>For Job Seekers</h4><button onClick={()=>go("jobs")}>Find Jobs</button><button>Career Resources</button><button>Help Center</button></div><div><h4>For Companies</h4><span className="footer-copy">Partner companies work directly with our RemotePath team.</span><button>Partner with us</button><button>Company enquiries</button></div><div><h4>Company</h4><button>About Us</button><button>Blog</button><button>Contact</button></div><div><h4>Stay in the loop</h4><p>Get the latest jobs and career tips.</p><div className="newsletter"><input placeholder="Your email address"/><button><ArrowRight size={15}/></button></div></div></div><div className="footer-bottom"><span>© 2026 RemotePath. All rights reserved.</span><div><span>Privacy Policy</span><span>Terms of Service</span><span>Cookies</span></div></div></footer>}

function Jobs({go,initialQuery=""}){  const [query,setQuery]=useState(initialQuery); const [remote,setRemote]=useState("All"); const [sort,setSort]=useState("Most relevant"); const [mobileFilters,setMobileFilters]=useState(false);  const [jobsData,setJobsData]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");  useEffect(()=>{let mounted=true;(async()=>{setLoading(true);let request=supabase.from("jobs").select("*").eq("status","published");if(remote!=="All")request=request.ilike("location","%"+remote+"%");const {data,error}=await request.order("created_at",{ascending:false});if(!mounted)return;if(error){setError(error.message);setJobsData([])}else setJobsData((data||[]).map(j=>({...j,company:j.company_name,logo:j.company_logo||j.company_name?.[0]||"R",type:j.job_type,posted:relativePosted(j.created_at),salary:formatSalary(j)})));setLoading(false)})();return()=>{mounted=false}},[remote]);  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();const result=jobsData.filter(j=>!q||(j.title+" "+j.company_name+" "+(j.tags||[]).join(" ")+" "+(j.category||"")).toLowerCase().includes(q));if(sort==="Highest salary")return [...result].sort((a,b)=>(b.salary_max||0)-(a.salary_max||0));if(sort==="Newest")return [...result].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));return result},[jobsData,query,sort]);  return <div><PublicNav go={go}/><main className="jobs-page"><div className="jobs-heading"><div><span className="kicker">REMOTE JOB SEARCH</span><h1>Find work that <em>works for you.</em></h1><p>Verified roles from companies hiring across the world.</p></div><Badge tone="soft">{loading?"Loading…":filtered.length+" roles found"}</Badge></div><div className="search-bar-wide"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search jobs, skills or companies"/><MapPin size={17}/><select value={remote} onChange={e=>setRemote(e.target.value)}><option>All</option><option>North America</option><option>Europe</option></select><Button onClick={()=>{}}>Search</Button></div><button className="filter-mobile" onClick={()=>setMobileFilters(!mobileFilters)}><SlidersHorizontal size={16}/> Filters</button><div className="results-layout"><aside className={mobileFilters?"filter-panel mobile-open":"filter-panel"}><div className="filter-head"><strong>Filters</strong><button onClick={()=>setQuery("")}>Clear search</button></div><FilterGroup title="Remote type" options={["Fully remote","Hybrid","On-site"]}/><FilterGroup title="Job type" options={["Full-time","Part-time","Contract","Freelance"]}/><FilterGroup title="Experience" options={["Entry level","Mid level","Senior level"]}/><FilterGroup title="Salary range" options={["$40k+","$60k+","$80k+","$100k+"]}/><FilterGroup title="Categories" options={["Design","Development","Marketing","Customer Support","Sales"]}/></aside><section className="results"><div className="results-toolbar"><span>Showing <strong>{filtered.length}</strong> opportunities</span><label>Sort by <select value={sort} onChange={e=>setSort(e.target.value)}><option>Most relevant</option><option>Newest</option><option>Highest salary</option></select></label></div>{loading&&<div className="empty-state"><h3>Loading opportunities…</h3><p>We’re fetching the latest verified roles.</p></div>}{!loading&&error&&<div className="empty-state"><h3>We couldn’t load jobs</h3><p>{error}</p></div>}{!loading&&!error&&filtered.map(j=><JobRow key={j.id} job={j} go={go}/>)}{!loading&&!error&&filtered.length===0&&<EmptyState title="No roles match that search" text="Try a broader keyword or clear a filter." action="Browse all jobs" onAction={()=>{setQuery("");setRemote("All")}}/>}</section></div></main></div>}
function FilterGroup({title,options}){return <div className="filter-group"><strong>{title}</strong>{options.map((x,i)=><label key={x}><input type="checkbox" defaultChecked={i===0&&title==="Remote type"}/><span>{x}</span></label>)}</div>}
function JobRow({job,go}){const [saved,setSaved]=useState(false); const [saving,setSaving]=useState(false); useEffect(()=>{let mounted=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from("saved_jobs").select("job_id").eq("user_id",user.id).eq("job_id",job.id).maybeSingle();if(mounted)setSaved(!!data)})();return()=>{mounted=false}},[job.id]); const toggleSave=async e=>{e.stopPropagation();if(saving)return;setSaving(true);try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;if(saved){const {error}=await supabase.from("saved_jobs").delete().eq("user_id",user.id).eq("job_id",job.id);if(error)throw error;setSaved(false)}else{const {error}=await supabase.from("saved_jobs").insert({user_id:user.id,job_id:job.id});if(error)throw error;setSaved(true)}}catch(err){console.error(err)}finally{setSaving(false)}};return <article className="job-row" onClick={()=>go("job",job.id)}><div className={`company-avatar ${job.logo==="B"?"green":""}`}>{job.logo}</div><div className="job-row-main"><div className="company-line">{job.company}{job.verified&&<ShieldCheck size={13}/>}</div><h3>{job.title}</h3><div className="job-row-meta"><span>{job.type}</span><span>{job.location}</span><span>{job.salary}</span></div><div className="tag-row">{job.tags.map(t=><Badge key={t}>{t}</Badge>)}</div></div><div className="job-row-actions"><button className={`icon-btn ${saved?"is-saved":""}`} onClick={toggleSave}><Bookmark size={17} fill={saved?"currentColor":"none"}/></button><Button variant="soft" onClick={e=>{e.stopPropagation();go("application",job.id)}}>Apply</Button></div></article>}

function JobDetail({go,id=1}){const [job,setJob]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");useEffect(()=>{let mounted=true;(async()=>{const {data,error}=await supabase.from("jobs").select("*").eq("id",Number(id)).eq("status","published").maybeSingle();if(!mounted)return;if(error)setError(error.message);setJob(data?{...data,company:data.company_name,logo:data.company_logo||data.company_name?.[0]||"R",type:data.job_type,posted:relativePosted(data.created_at),salary:formatSalary(data)}:null);setLoading(false)})();return()=>{mounted=false}},[id]);if(loading)return <div><PublicNav go={go}/><main className="detail-page"><div className="empty-state"><h3>Loading role…</h3><p>Preparing the latest job details.</p></div></main></div>;if(error||!job)return <div><PublicNav go={go}/><main className="detail-page"><button className="back-link" onClick={()=>go("jobs")}><ArrowLeft size={15}/> Back to jobs</button><EmptyState title="This role is no longer available" text={error||"The job may have been closed or is not currently published."} action="Browse all jobs" onAction={()=>go("jobs")}/></main></div>;const responsibilities=job.responsibilities?.length?job.responsibilities:["Collaborate with the team to deliver high-quality work.","Own projects end-to-end and communicate clearly across time zones.","Contribute to a thoughtful remote-first working culture."];const requirements=job.requirements?.length?job.requirements:[job.experience_level||"Relevant professional experience.","Strong communication and collaboration skills.","Comfort working independently in a distributed environment."];const benefits=job.benefits?.length?job.benefits:["Flexible remote work","Professional development","Remote-first culture"];return <div><PublicNav go={go}/><main className="detail-page"><button className="back-link" onClick={()=>go("jobs")}><ArrowLeft size={15}/> Back to jobs</button><div className="detail-grid"><article className="detail-main"><div className="detail-company"><div className="company-avatar large">{job.logo}</div><div><div className="company-line">{job.company}<ShieldCheck size={14}/></div><span>Verified opportunity · {job.location||"Worldwide"}</span></div></div><h1>{job.title}</h1><div className="detail-meta"><Badge tone="green">{job.type}</Badge><span><MapPin size={14}/>{job.location||"Worldwide"}</span><span><Clock3 size={14}/>Posted {job.posted}</span></div><div className="detail-actions"><Button onClick={()=>go("application",job.id)}>Apply now <ArrowRight size={16}/></Button><Button variant="outline"><Bookmark size={16}/> Save job</Button></div><DetailSection title="About the role"><p>{job.description||"This partner-company opportunity is looking for a thoughtful professional to join a distributed team and create meaningful work experiences."}</p></DetailSection><DetailSection title="What you'll do"><ul>{responsibilities.map((x,i)=><li key={i}>{x}</li>)}</ul></DetailSection><DetailSection title="What we're looking for"><ul>{requirements.map((x,i)=><li key={i}>{x}</li>)}</ul></DetailSection><DetailSection title="Benefits"><div className="benefit-grid">{benefits.map((x,i)=><Badge tone="soft" key={i}>{x}</Badge>)}</div></DetailSection>{job.company_description&&<DetailSection title="About the company"><p>{job.company_description}</p></DetailSection>}</article><aside className="detail-side"><div className="apply-card"><span className="kicker">READY TO APPLY?</span><h3>Take the next step.</h3><p>Your profile and application can be completed in a few minutes.</p><div className="apply-price"><strong>{job.salary||"Salary not disclosed"}</strong><span>{job.remote_type||"Remote"} · {job.job_type||"Full-time"}</span></div><Button className="full" onClick={()=>go("application",job.id)}>Apply for this role <ArrowRight size={15}/></Button><div className="apply-trust"><ShieldCheck size={15}/><span>Verified opportunity from a RemotePath partner company.</span></div></div><div className="company-card"><div className="company-avatar">{job.logo}</div><h3>{job.company}</h3><p>{job.company_description||"A trusted partner company hiring through RemotePath."}</p></div></aside></div></main></div>}
function DetailSection({title,children}){return <section className="detail-section"><h2>{title}</h2>{children}</section>}

function relativePosted(value){const d=new Date(value);const mins=Math.max(1,Math.floor((Date.now()-d.getTime())/60000));if(mins<60)return mins+"m ago";const hrs=Math.floor(mins/60);if(hrs<24)return hrs+"h ago";const days=Math.floor(hrs/24);return days===1?"1d ago":days+"d ago"}

function GoogleLogo(){return <svg className="google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.88-1.73 2.99-4.28 2.99-7.34Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.22-2.51c-.9.6-2.04.96-3.39.96-2.61 0-4.83-1.76-5.62-4.13H3.05v2.59A9.99 9.99 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.38 13.89A6 6 0 0 1 6.07 12c0-.66.11-1.3.31-1.89V7.52H3.05A10 10 0 0 0 2 12c0 1.61.38 3.13 1.05 4.48l3.33-2.59Z"/><path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.94 14.7 2 12 2a9.99 9.99 0 0 0-8.95 5.52l3.33 2.59C7.17 7.74 9.39 5.98 12 5.98Z"/></svg>}

function VerifyEmail({go}){
  return <div className="auth-page">
    <div className="auth-art"><Logo light/><div><span className="kicker">ONE LAST STEP</span><h1>Confirm your email, then make your profile yours.</h1><p>We’ll use your verified account to start a short onboarding process and personalize the opportunities you see.</p></div><small>© 2026 RemotePath</small></div>
    <div className="auth-form-wrap"><button className="back-link" onClick={()=>go("signup")}><ArrowLeft size={15}/> Back</button><div className="auth-card verify-card"><Logo/><div className="verify-icon"><Mail size={22}/></div><h2>Check your inbox.</h2><p>We’ve sent a verification link to your email. After you verify, we’ll take you straight into your quick profile setup.</p><div className="notice"><ShieldCheck size={17}/><span>Verification keeps accounts genuine and helps protect our job marketplace.</span></div><Button className="full" onClick={()=>go("onboarding")}>I’ve verified my email <ArrowRight size={15}/></Button><button className="auth-secondary">Resend verification email</button></div></div>
  </div>
}

function Onboarding({go}){
  const [step,setStep]=useState(1);
  const [country,setCountry]=useState("");
  const [experience,setExperience]=useState("");
  const [adaptiveAnswer,setAdaptiveAnswer]=useState("");
  const [workType,setWorkType]=useState("");
  const [goal,setGoal]=useState("");
  const [categories,setCategories]=useState([]);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const toggleCategory=x=>setCategories(v=>v.includes(x)?v.filter(i=>i!==x):[...v,x]);
  const canContinue=step===1?!!country:step===2?!!experience:step===3?!!adaptiveAnswer:step===4?!!workType:!!goal;
  const next=async()=>{
    if(!canContinue||saving)return;
    setSaveError("");
    if(step<5){setStep(step+1);return}
    setSaving(true);
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const {error}=await supabase.from("profiles").update({
        country,
        experience,
        adaptive_answer:adaptiveAnswer,
        work_type:workType,
        goal,
        interest_areas:categories,
        onboarding_completed:true
      }).eq("id",user.id);
      if(error)throw error;
      go("dashboard");
    }catch(err){
      setSaveError(err?.message||"We couldn't save your profile yet. Please try again.");
    }finally{setSaving(false)}
  };
  const progress=["About you","Experience","Your next step","Work style","Your goals"];
  const experienced=["Entry level","1–2 years","3–5 years","6–10 years","10+ years"].includes(experience);
  return <div className="flow-page onboarding-page">
    <header className="flow-header"><Logo/><span className="onboarding-save">Profile setup · Step {step} of 5</span></header>
    <div className="flow-wrap onboarding-wrap">
      <div className="flow-intro onboarding-intro">
        <span className="kicker">YOUR FIRST 5 MINUTES</span>
        <h1>Let’s make your job search personal.</h1>
        <p>We’ll ask five quick questions, one step at a time. Your answers help us show you more relevant opportunities.</p>
      </div>
      <div className="onboarding-progressbar" aria-label={`Step ${step} of 5`}><span style={{width:`${step*20}%`}}/></div>
      <div className="onboarding-step-card">
        <div className="onboarding-step-count">0{step} <span>/ 05</span></div>
        {step===1&&<>
          <span className="kicker">ABOUT YOU</span>
          <h2>Where are you based?</h2>
          <p>We use your location to show opportunities you can actually work from.</p>
          <label className="field onboarding-select"><span>Your country <b className="required-mark">*</b></span><select value={country} onChange={e=>setCountry(e.target.value)}><option value="">Select your country</option>{registrationCountries.map(([flag,name])=><option key={name} value={name}>{flag} {name}</option>)}</select></label>
        </>}
        {step===2&&<>
          <span className="kicker">YOUR EXPERIENCE</span>
          <h2>Where are you in your career?</h2>
          <p>There’s no wrong answer. We support people starting out and people with years of experience.</p>
          <div className="onboarding-choice-grid single-question-grid">{[
            ["No professional experience","I’m looking for my first opportunity"],
            ["Entry level","I have some early experience"],
            ["1–2 years","I’m building my professional experience"],
            ["3–5 years","I’m an experienced professional"],
            ["6–10 years","I have substantial experience"],
            ["10+ years","I’m a highly experienced professional"]
          ].map(([title,sub])=><button type="button" className={experience===title?"selected":""} onClick={()=>{setExperience(title);setAdaptiveAnswer("")}} key={title}><span><strong>{title}</strong><small>{sub}</small></span>{experience===title&&<Check size={16}/>}</button>)}</div>
        </>}
        {step===3&&<>
          <span className="kicker">{experienced?"BUILD ON YOUR EXPERIENCE":"GETTING STARTED"}</span>
          <h2>{experienced?"Which area best matches your experience?":"Would you be open to learning for the right opportunity?"}</h2>
          <p>{experienced?"Choose the area you most want us to use when matching you with roles.":"Some roles provide training or expect you to learn new skills. Tell us what feels right for you."}</p>
          {!experienced?<div className="onboarding-choice-grid single-question-grid">{[
            ["Yes, I’m open to learning","I’m happy to train for a good opportunity"],
            ["Yes, with guidance","I’d like support while I learn"],
            ["I prefer roles I already know","I want to start with familiar work"]
          ].map(([title,sub])=><button type="button" className={adaptiveAnswer===title?"selected":""} onClick={()=>setAdaptiveAnswer(title)} key={title}><span><strong>{title}</strong><small>{sub}</small></span>{adaptiveAnswer===title&&<Check size={16}/>}</button>)}</div>:<div className="onboarding-choice-grid single-question-grid">{["Design & Creative","Technology & Development","Marketing & Sales","Customer Support","Operations & Administration","Finance & Data"].map(x=><button type="button" className={adaptiveAnswer===x?"selected":""} onClick={()=>setAdaptiveAnswer(x)} key={x}><span><strong>{x}</strong><small>Prioritize matching roles in this area</small></span>{adaptiveAnswer===x&&<Check size={16}/>}</button>)}</div>}
        </>}
        {step===4&&<>
          <span className="kicker">WORK STYLE</span>
          <h2>What kind of work are you looking for?</h2>
          <p>Choose the arrangement that best matches what you want right now.</p>
          <div className="onboarding-choice-grid single-question-grid">{[
            ["Full-time","A regular full-time role"],
            ["Part-time","A role with fewer weekly hours"],
            ["Contract","A defined project or contract"],
            ["Freelance","Independent work across projects"],
            ["Flexible","I’m open to different arrangements"]
          ].map(([title,sub])=><button type="button" className={workType===title?"selected":""} onClick={()=>setWorkType(title)} key={title}><span><strong>{title}</strong><small>{sub}</small></span>{workType===title&&<Check size={16}/>}</button>)}</div>
        </>}
        {step===5&&<>
          <span className="kicker">YOUR GOALS</span>
          <h2>What should we help you find?</h2>
          <p>Choose your main goal. You can also add areas you’d like to explore.</p>
          <span className="field-label">My main goal <b className="required-mark">*</b></span>
          <div className="onboarding-tags goal-tags">{["Find my first remote job","Find my next remote job","Move into a new career","Build experience","Find better-paying work"].map(x=><button type="button" className={goal===x?"selected":""} onClick={()=>setGoal(x)} key={x}>{x}{goal===x&&<Check size={13}/>}</button>)}</div>
          <span className="field-label">Areas I’m interested in <small>(optional)</small></span>
          <div className="onboarding-tags">{["Design","Development","Marketing","Customer Support","Sales","Data Entry","Administration","Healthcare"].map(x=><button type="button" className={categories.includes(x)?"selected":""} onClick={()=>toggleCategory(x)} key={x}>{x}{categories.includes(x)&&<Check size={12}/>}</button>)}</div>
        </>}
        {saveError&&<div className="auth-message auth-error" role="alert">{saveError}</div>}
        <div className="onboarding-actions">
          <Button variant="outline" onClick={()=>step>1&&setStep(step-1)} disabled={step===1||saving}>Back</Button>
          <Button onClick={next} disabled={!canContinue||saving}>{saving?"Saving…":step<5?"Continue":"Finish my setup"} {!saving&&<ArrowRight size={15}/>}</Button>
        </div>
      </div>
    </div>
  </div>
}

function Auth({go,mode="login"}){
 const login=mode==="login";
 const [fullName,setFullName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[agreed,setAgreed]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[info,setInfo]=useState("");
 const submit=async()=>{setError("");setInfo("");if(!email.trim()||!password){setError("Please enter your email address and password.");return}if(!login&&fullName.trim().length<2){setError("Please enter your full name.");return}if(!login&&!agreed){setError("Please agree to the Terms of Service and Privacy Policy.");return}setLoading(true);try{if(login){const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;go("dashboard")}else{const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:fullName.trim(),account_type:"job_seeker"}}});if(error)throw error;if(data.session)go("dashboard");else setInfo("Your account was created. Email confirmation is currently enabled in Supabase, so you’ll need to confirm your email before signing in.")}}catch(err){setError(err?.message||"Something went wrong. Please try again.")}finally{setLoading(false)}};
 return <div className="auth-page"><div className="auth-art"><Logo light/><div><span className="kicker">REMOTE WORK, REIMAGINED</span><h1>Build a career that moves with you.</h1><p>One trusted place to discover opportunities, manage applications and grow your remote career.</p></div><small>© 2026 RemotePath</small></div><div className="auth-form-wrap"><button className="back-link" onClick={()=>go("home")}><ArrowLeft size={15}/> Back to home</button><div className="auth-card"><Logo/><h2>{login?"Welcome back":"Create your account"}</h2><p>{login?"Sign in to continue your remote journey.":"Create your free RemotePath job-seeker account."}</p><div className="social-row"><Button variant="outline" disabled><GoogleLogo/> Continue with Gmail</Button></div><div className="or"><span>or</span></div>{!login&&<Field label="Full name" placeholder="Enter your full name" value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name"/>}<Field label="Email address" placeholder="you@example.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/><Field label="Password" placeholder={login?"Enter your password":"Create a password"} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={login?"current-password":"new-password"}/>{login&&<div className="forgot"><button type="button" onClick={()=>setInfo("Password recovery will be connected when the production email/domain setup is added.")}>Forgot password?</button></div>}{error&&<div className="auth-message auth-error" role="alert">{error}</div>}{info&&<div className="auth-message auth-info" role="status">{info}</div>}<Button className="full" onClick={submit} disabled={loading}>{loading?"Please wait…":login?"Sign in":"Create account"} {!loading&&<ArrowRight size={15}/>}</Button><label className="checkline"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I agree to the Terms of Service and Privacy Policy.</span></label><p className="auth-switch">{login?"Don't have an account?":"Already have an account?"} <button onClick={()=>go(login?"signup":"login")}>{login?"Create one":"Log in"}</button></p></div></div></div>;
}
function Field({label,placeholder,type="text",value,onChange,autoComplete}){return <label className="field"><span>{label}</span><input type={type} placeholder={placeholder} value={value} onChange={onChange} autoComplete={autoComplete}/></label>}
const PRIVATE_ADMIN_ROUTE = "rpx-7m4q2";

function AdminAuth({go}){
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const submit=async()=>{setError("");if(!email.trim()||!password){setError("Enter your email and password.");return}setLoading(true);try{const {data,error:e}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(e)throw e;const {data:sessionData,error:se}=await supabase.auth.getSession();if(se)throw se;if(!sessionData.session||sessionData.session.user.id!==data.user.id)throw new Error("Session not ready");let {data:access,error:ae}=await supabase.rpc("get_my_admin_access");if(ae||!access?.length){const fallback=await supabase.from("profiles").select("role,account_status").eq("id",data.user.id).maybeSingle();if(fallback.error)throw fallback.error;access=fallback.data?[fallback.data]:[]}const profile=access?.[0];if(!["admin","super_admin"].includes(profile?.role)||profile?.account_status!=="active"){await supabase.auth.signOut();setError("Unable to sign in.");return}window.history.replaceState(null,"",`/${PRIVATE_ADMIN_ROUTE}`);setScreen("admin");}catch(err){setError("Unable to sign in.");}finally{setLoading(false)}};
  return <div className="auth-page"><div className="auth-art"><Logo light/><div><span className="kicker">SECURE ACCESS</span><h1>Welcome back.</h1><p>Sign in to continue.</p></div><small>© 2026 RemotePath</small></div><div className="auth-form-wrap"><div className="auth-card"><Logo/><h2>Sign in</h2><p>Enter your email and password to continue.</p><Field label="Email" placeholder="Enter your email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/><Field label="Password" placeholder="Enter your password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/>{error&&<div className="auth-message auth-error" role="alert">{error}</div>}<Button className="full" onClick={submit} disabled={loading}>{loading?"Checking…":"Continue"} {!loading&&<ArrowRight size={15}/>}</Button></div></div></div>;
}

function AppShell({go,screen,children}){
  const [mobile,setMobile]=useState(false);
  const [profile,setProfile]=useState(null);
  const [unreadNotifications,setUnreadNotifications]=useState(0);

  useEffect(()=>{
    let mounted=true;
    const loadUnread=async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user||!mounted)return;
      const {count}=await supabase.from("notifications").select("id",{count:"exact",head:true}).is("read_at",null);
      if(mounted)setUnreadNotifications(count||0);
    };
    loadUnread();
    return()=>{mounted=false};
  },[screen]);

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getUser().then(async({data})=>{
      if(!data.user||!mounted)return;
      const {data:row}=await supabase.from("profiles").select("full_name,account_type,role").eq("id",data.user.id).maybeSingle();
      if(mounted)setProfile(row);
    });
    return()=>{mounted=false};
  },[]);

  const displayName=profile?.full_name||"RemotePath member";
  const letter=(displayName.trim()[0]||"R").toUpperCase();

  const isAdmin=profile?.role==="admin"||profile?.role==="super_admin";
  const adminNav=[["admin","Job management",BriefcaseBusiness],["admin-applications","Applications",FileText],["admin-verification","Verification",ShieldCheck],["admin-members","Members",Users],["admin-support","Support",MessageCircle],["admin-studio","Studio",SlidersHorizontal]];
  const nav=isAdmin?adminNav:navItems;
  return (
    <div className="app-shell">
      <aside className={mobile?"app-sidebar open":"app-sidebar"}>
        <div className="side-top">
          <Logo/>
          <button onClick={()=>setMobile(false)} className="mobile-close"><X/></button>
        </div>

        <div className="profile-mini">
          <Avatar letter={letter}/>
          <div>
            <strong>{displayName}</strong>
            <small>{(profile?.role==="admin"||profile?.role==="super_admin")?"Administrator":"Job seeker"}</small>
          </div>
          <ChevronDown size={14}/>
        </div>

        <nav>
          {nav.map(([key,label,Icon])=>(
            <button
              className={screen===key?"active":""}
              key={key}
              onClick={()=>{go(key);setMobile(false)}}
            >
              <Icon size={17}/>{label}
            </button>
          ))}

        </nav>

        <div className="side-bottom">
          {isAdmin?<button onClick={()=>go("admin-studio")}><SettingsIcon size={17}/>Admin settings</button>:<button onClick={()=>go("settings")}><SettingsIcon size={17}/>Settings</button>}
          <button onClick={async()=>{await supabase.auth.signOut();go("home")}}><ArrowLeft size={17}/>Sign out</button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button className="mobile-menu" onClick={()=>setMobile(true)}><Menu/></button>
          <div className="crumb">
            {screen==="dashboard"?"Dashboard":screen==="applications"?"Applications":screen==="interview"?"Interviews":screen==="admin-applications"?"Application management":screen==="admin-verification"?"Verification review":screen==="admin-members"?"Member management":screen==="admin-support"?"Support management":screen==="admin-studio"?"Admin Studio":screen==="admin"?"Job management":screen==="notifications"?"Notifications":"Workspace"}
          </div>
          <div className="top-actions">
            {!isAdmin&&<button className="notification-bell" onClick={()=>go("notifications")} aria-label="Notifications"><Bell size={18}/>{unreadNotifications>0&&<i>{unreadNotifications>99?"99+":unreadNotifications}</i>}</button>}
            <Avatar letter={letter} size="sm"/>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
function Dashboard({go}){
 const [profile,setProfile]=useState(null);
 const [dashboard,setDashboard]=useState({applications:0,interviews:0,offers:0,saved:0,latestApplication:null,recommended:[]});
 useEffect(()=>{
   let mounted=true;
   (async()=>{
     const {data:{user}}=await supabase.auth.getUser();
     if(!user||!mounted)return;
     const [profileRes,applicationsRes,interviewsRes,offersRes,savedRes,latestRes,jobsRes]=await Promise.all([
       supabase.from("profiles").select("full_name,onboarding_completed").eq("id",user.id).maybeSingle(),
       supabase.from("applications").select("id",{count:"exact",head:true}).eq("user_id",user.id).neq("status","draft"),
       supabase.from("interviews").select("id",{count:"exact",head:true}).eq("candidate_id",user.id),
       supabase.from("applications").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("status","hired"),
       supabase.from("saved_jobs").select("job_id",{count:"exact",head:true}).eq("user_id",user.id),
       supabase.from("applications").select("id,status,submitted_at,created_at,jobs(id,title,company_name,company_logo)").eq("user_id",user.id).neq("status","draft").order("created_at",{ascending:false}).limit(1).maybeSingle(),
       supabase.from("jobs").select("*").eq("status","published").order("created_at",{ascending:false}).limit(3)
     ]);
     if(!mounted)return;
     if(profileRes.data)setProfile(profileRes.data);
     setDashboard({
       applications:applicationsRes.count||0,
       interviews:interviewsRes.count||0,
       offers:offersRes.count||0,
       saved:savedRes.count||0,
       latestApplication:latestRes.data||null,
       recommended:(jobsRes.data||[]).map(j=>({...j,company:j.company_name,logo:j.company_logo||j.company_name?.[0]||"R",type:j.job_type,posted:relativePosted(j.created_at),salary:formatSalary(j)}))
     });
   })();
   return()=>{mounted=false};
 },[]);
 const firstName=(profile?.full_name||"there").trim().split(/\s+/)[0]||"there";
 return <div className="workspace">
   <div className="workspace-head"><div><span className="kicker">REMOTE PATH WORKSPACE</span><h1>Good morning, {firstName} <span>✦</span></h1><p>{profile?.onboarding_completed?"Here’s what’s happening with your job search.":"Finish your profile setup to personalize your job search."}</p></div><Button onClick={()=>go("jobs")}>Find jobs <ArrowRight size={15}/></Button></div>
   {!profile?.onboarding_completed&&<section className="payout-reminder" aria-label="Profile setup reminder">
     <div className="payout-reminder-icon"><UserRound size={20}/></div>
     <div className="payout-reminder-copy"><span className="kicker">PROFILE SETUP</span><h2>Finish your profile setup</h2><p>Tell us where you’re based, your experience, work style and goals so we can personalize the opportunities you see.</p></div>
     <button className="payout-reminder-action" onClick={()=>go("onboarding")}><span>Complete profile</span><ArrowRight size={16}/></button>
   </section>}
   <section className="verification-banner verification-required">
     <div className="verification-banner-icon"><CircleHelp size={20}/></div>
     <div className="verification-banner-copy"><span className="kicker">ACCOUNT VERIFICATION</span><h2>Complete your verification</h2><p>Your profile is almost ready. Confirm your identity so RemotePath can keep the marketplace trusted and secure.</p><div className="verification-status"><span><i/> Verification required</span><small>Usually takes a few minutes once verification is connected.</small></div></div>
     <button className="verification-banner-action" onClick={()=>go("verification")}><span className="verification-help">?</span><strong>Complete verification</strong><ArrowRight size={16}/></button>
   </section>
   <section className="payout-reminder" aria-label="Payout method reminder">
     <div className="payout-reminder-icon"><WalletCards size={20}/></div>
     <div className="payout-reminder-copy"><span className="kicker">WITHDRAWALS</span><h2>Add a payout method before you withdraw</h2><p>You need to select and save a payout method before you can make a withdrawal. Choose bank transfer, PayPal, or debit card and keep your details up to date.</p></div>
     <button className="payout-reminder-action" onClick={()=>go("payouts")}><span>Add payout method</span><ArrowRight size={16}/></button>
   </section>
   <div className="summary-grid"><Summary icon={FileText} value={dashboard.applications} label="Applications" change="Your submitted applications"/><Summary icon={MessageCircle} value={dashboard.interviews} label="Interviews" change="Scheduled interview activity"/><Summary icon={Star} value={dashboard.offers} label="Offers" change="Hired applications"/><Summary icon={Bookmark} value={dashboard.saved} label="Saved jobs" change="Jobs you bookmarked"/></div>
   <div className="workspace-grid"><section className="panel"><PanelTitle title="Continue where you left off" action="View all" onAction={()=>go("applications")}/>{dashboard.latestApplication?<div className="application-highlight"><div className="company-avatar">{dashboard.latestApplication.jobs?.company_logo||dashboard.latestApplication.jobs?.company_name?.[0]||"R"}</div><div><strong>{dashboard.latestApplication.jobs?.title||"Application"}</strong><span>{dashboard.latestApplication.jobs?.company_name||"Partner company"} · {dashboard.latestApplication.submitted_at?new Date(dashboard.latestApplication.submitted_at).toLocaleDateString():new Date(dashboard.latestApplication.created_at).toLocaleDateString()}</span><Badge tone="amber">{dashboard.latestApplication.status}</Badge></div><Button variant="soft" onClick={()=>go("applications")}>View details</Button></div>:<EmptyState title="No applications yet" text="Find a role you like and your application will appear here." action="Find jobs" onAction={()=>go("jobs")}/>}</section><section className="panel"><PanelTitle title="Recommended for you" action="View more" onAction={()=>go("jobs")}/>{dashboard.recommended.length?<div className="mini-job-grid">{dashboard.recommended.map(j=><JobCard key={j.id} job={j} compact onOpen={id=>go("job",id)}/>)}</div>:<EmptyState title="No published jobs yet" text="Our team is preparing verified roles from partner companies." action="Browse jobs" onAction={()=>go("jobs")}/>}</section></div>
 </div>
}
function Summary({icon:Icon,value,label,change}){return <div className="summary-card"><div><Icon size={17}/><span>{label}</span></div><strong>{value}</strong><small>{change}</small></div>}
function PanelTitle({title,action,onAction}){return <div className="panel-title"><h2>{title}</h2>{action&&<button onClick={onAction}>{action} <ArrowRight size={14}/></button>}</div>}

const payoutBanks = {
  "United States":["JPMorgan Chase","Bank of America","Wells Fargo","Citibank","Capital One","U.S. Bank","PNC Bank","Truist"],
  "Canada":["Royal Bank of Canada (RBC)","TD Canada Trust","Bank of Montreal (BMO)","Scotiabank","CIBC","National Bank of Canada","Desjardins"],
  "United Kingdom":["HSBC UK","Barclays","Lloyds Bank","NatWest","Santander UK","Halifax","Nationwide"],
  "Germany":["Deutsche Bank","Commerzbank","DZ Bank","ING Germany","DKB","Sparkasse","Volksbank Raiffeisenbank"],
  "France":["BNP Paribas","Crédit Agricole","Société Générale","Groupe BPCE","Crédit Mutuel","La Banque Postale"],
  "Netherlands":["ING","ABN AMRO","Rabobank","ASN Bank","de Volksbank","Triodos Bank"],
  "Ireland":["AIB","Bank of Ireland","Permanent TSB","Ulster Bank","Revolut"],
  "Sweden":["Nordea","SEB","Swedbank","Svenska Handelsbanken","SBAB Bank"],
  "Denmark":["Danske Bank","Jyske Bank","Nordea","Sydbank","Nykredit"],
  "Norway":["DNB","SpareBank 1","Nordea","Danske Bank","Sbanken"],
  "Finland":["Nordea","OP Financial Group","Danske Bank","S-Bank","Aktia"],
  "Belgium":["KBC","Belfius","BNP Paribas Fortis","ING Belgium","Argenta"],
  "Switzerland":["UBS","Zürcher Kantonalbank","Raiffeisen Switzerland","PostFinance","Banque Cantonale Vaudoise"],
  "Austria":["Erste Bank","Raiffeisen Bank International","Bank Austria","BAWAG","Oberbank"],
  "Poland":["PKO Bank Polski","Bank Pekao","Santander Bank Polska","mBank","ING Bank Śląski","Alior Bank"]
};

function Payouts({go}){
  const [method,setMethod]=useState("bank");
  const [country,setCountry]=useState("United States");
  const [bank,setBank]=useState("");
  const [name,setName]=useState("");
  const [account,setAccount]=useState("");
  const [paypalEmail,setPaypalEmail]=useState("");
  const [paypalName,setPaypalName]=useState("");
  const [cardName,setCardName]=useState("");
  const [cardLast4,setCardLast4]=useState("");
  const [confirmed,setConfirmed]=useState(false);
  const [savedMethod,setSavedMethod]=useState(null);
  const [history,setHistory]=useState([]);
  const [loading,setLoading]=useState(true);
  const [payoutConfigs,setPayoutConfigs]=useState([]);
  const [withdrawalFields,setWithdrawalFields]=useState([]),[withdrawalValues,setWithdrawalValues]=useState({});
  const [customValues,setCustomValues]=useState({});
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [modalOpen,setModalOpen]=useState(false);
  const banks=payoutBanks[country]||[];
  const bankReady=!!bank&&name.trim().length>2&&account.trim().length>4;
  const paypalReady=paypalEmail.trim().includes("@")&&paypalName.trim().length>2;
  const cardReady=cardName.trim().length>2&&/^\d{4}$/.test(cardLast4.trim());
  const methodConfig=payoutConfigs.find(x=>x.method_key===method);
  const customReady=!!methodConfig&&(methodConfig.fields||[]).filter(f=>f.required).every(f=>String(customValues[f.key]||"").trim().length>0);
  const canSave=method==="bank"?bankReady:method==="paypal"?paypalReady:method==="card"?cardReady:customReady;

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){if(mounted)setLoading(false);return;}
      const [methodsRes,payoutsRes,p,w]=await Promise.all([
        supabase.from("payout_methods").select("*").eq("user_id",user.id).eq("status","active").order("updated_at",{ascending:false}).limit(1).maybeSingle(),
        supabase.from("payouts").select("id,amount,currency,status,provider_reference,created_at,payout_method_id").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20),
        supabase.from("payout_method_configs").select("*").eq("enabled",true).order("sort_order").order("name"),
        supabase.from("site_settings").select("value").eq("key","withdrawal_form_fields").maybeSingle()
      ]);
      if(!mounted)return;
      if(methodsRes.error||payoutsRes.error||p.error||w.error)setError((methodsRes.error||payoutsRes.error||p.error||w.error).message);
      setPayoutConfigs(p.data||[]);setWithdrawalFields(Array.isArray(w.data?.value)?w.data.value:[{key:"amount",label:"Amount to withdraw",type:"number",required:true,placeholder:"Enter amount",help_text:"Enter the amount you want to withdraw.",config:{min:1,step:"0.01"}}]);
      const m=methodsRes.data||null;
      setSavedMethod(m);
      setHistory(payoutsRes.data||[]);
      if(m){
        setMethod(m.method_type);
        setCountry(m.bank_country||"United States");
        setBank(m.bank_name||"");
        setName(m.account_holder_name||"");
        setPaypalName(m.paypal_name||"");
        setPaypalEmail(m.paypal_email||"");
        setCardName(m.cardholder_name||"");
        setCardLast4(m.card_last4||"");
        if(m.method_type==="custom")setCustomValues(m.details||{});
      }
      setLoading(false);
    })();
    return()=>{mounted=false};
  },[]);

  const selectCountry=(value)=>{setCountry(value);setBank("");};

  const saveMethod=async()=>{
    if(!canSave||!confirmed||saving)return;
    setSaving(true);setError("");
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const payload={
        user_id:user.id,method_type:method,is_default:true,status:"active",
        bank_country:method==="bank"?country:null,
        bank_name:method==="bank"?bank:null,
        account_holder_name:method==="bank"?name.trim():null,
        account_last4:method==="bank"?account.slice(-4):null,
        paypal_name:method==="paypal"?paypalName.trim():null,
        paypal_email:method==="paypal"?paypalEmail.trim():null,
        cardholder_name:method==="card"?cardName.trim():null,
        card_last4:method==="card"?cardLast4.trim():null,
        details:method==="custom"?customValues:{}
      };
      if(savedMethod){
        const {data,error:e}=await supabase.from("payout_methods").update(payload).eq("id",savedMethod.id).select("*").single();
        if(e)throw e;
        setSavedMethod(data);
      }else{
        const {data,error:e}=await supabase.from("payout_methods").insert(payload).select("*").single();
        if(e)throw e;
        setSavedMethod(data);
      }
      setConfirmed(false);setModalOpen(false);
    }catch(err){setError(err?.message||"We couldn't save your payout method.");}
    finally{setSaving(false);}
  };

  const methodLabel=m=>payoutConfigs.find(x=>x.method_key===m)?.name||(m==="bank"?"Bank transfer":m==="paypal"?"PayPal":"Debit card");
  const methodSummary=m=>m.method_type==="bank"?`${m.bank_name||"Bank"} · ${m.bank_country||""} · Account ending ${m.account_last4||"••••"}`:m.method_type==="paypal"?`${m.paypal_name||""} · ${m.paypal_email||""}`:m.method_type==="card"?`${m.cardholder_name||""} · Card ending ${m.card_last4||"••••"}`:`${methodLabel(m.method_type)} · ${Object.values(m.details||{}).filter(Boolean).join(" · ")}`;

  if(loading)return <div className="workspace"><div className="workspace-head"><div><span className="kicker">GET PAID</span><h1>Payouts</h1><p>Loading your payout settings securely…</p></div></div></div>;

  return <div className="workspace">
    <div className="workspace-head"><div><span className="kicker">GET PAID</span><h1>Payouts</h1><p>Choose where you want your earnings sent and keep your payment details up to date.</p></div><Badge tone="soft"><ShieldCheck size={13}/> Secure payout details</Badge></div>
    {error&&<div className="auth-message auth-error">{error}</div>}
    {savedMethod?<section className="payout-success"><div className="payout-success-icon"><Check size={24}/></div><div><span className="kicker">PRIMARY PAYOUT METHOD</span><h2>{methodLabel(savedMethod.method_type)}</h2><p>{methodSummary(savedMethod)}</p><Badge tone="green">Ready for payouts</Badge></div><Button variant="outline" onClick={()=>setModalOpen(true)}><PenLine size={15}/> Review details</Button></section>:null}
    <section className="payout-warning"><div className="payout-warning-icon"><CircleHelp size={19}/></div><div><strong>Take your time before you save.</strong><p>Make sure your name, bank or PayPal details are exactly correct. Incorrect payout information can cause a payment to fail or be sent to the wrong destination. Once saved, changes may be restricted and you may need to contact <button onClick={()=>go("home")}>Customer Care</button> to request an update.</p></div></section>
    <section className="payout-method-panel">
      <div className="payout-section-head"><div><span className="kicker">PAYOUT METHOD</span><h2>{savedMethod?"Change your payout method":"Where should we send your earnings?"}</h2><p>Select one method. You can change the method later according to the platform's payout rules.</p></div></div>
      <div className="payout-method-grid">{payoutConfigs.map(cfg=><button key={cfg.id} className="payout-method-card" onClick={()=>{setMethod(cfg.method_key);setCustomValues({});setModalOpen(true)}}><span className="payout-method-icon">{cfg.method_type==="bank"?<Landmark size={19}/>:cfg.method_type==="paypal"?<span className="paypal-mark">P</span>:cfg.method_type==="card"?<CreditCard size={19}/>:<WalletCards size={19}/>}</span><div><strong>{cfg.name}</strong><small>{cfg.description||"Choose this payout method."}</small></div><i><ArrowRight size={13}/></i></button>)}</div>
      {modalOpen&&<div className="payout-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><div className="payout-modal" role="dialog" aria-modal="true">
        <div className="payout-modal-head"><div><span className="kicker">PAYOUT METHOD</span><h2>{methodLabel(method)}</h2><p>Enter the details required for this payout method.</p></div><button className="payout-modal-close" onClick={()=>setModalOpen(false)} aria-label="Close"><X size={18}/></button></div>
        {method==="bank"&&<div className="payout-form"><div className="payout-form-heading"><span className="kicker">BANK DETAILS</span><h3>Where should we send the bank transfer?</h3><p>Bank options are filtered by the country you select.</p></div><div className="payout-form-grid">
          <label className="field"><span>Bank country</span><select value={country} onChange={e=>selectCountry(e.target.value)}>{registrationCountries.map(([flag,c])=><option key={c} value={c}>{flag} {c}</option>)}</select></label>
          <label className="field"><span>Bank name</span><select value={bank} onChange={e=>setBank(e.target.value)}><option value="">Select your bank</option>{banks.map(b=><option key={b}>{b}</option>)}</select></label>
          <label className="field"><span>Account holder name</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Name on the bank account" autoComplete="name"/></label>
          <label className="field"><span>Account number / IBAN</span><input value={account} onChange={e=>setAccount(e.target.value)} placeholder="Enter your account details" autoComplete="off"/></label>
        </div><div className="payout-country-note"><Globe2 size={15}/><span>RemotePath stores only the last 4 digits for this payout method. Additional bank routing details should be collected by the eventual payout provider.</span></div></div>}
        {method==="paypal"&&<div className="payout-form"><div className="payout-form-heading"><span className="kicker">PAYPAL DETAILS</span><h3>Which PayPal account should receive your earnings?</h3><p>Make sure the email belongs to the correct PayPal account.</p></div><div className="payout-form-grid">
          <label className="field"><span>PayPal account name</span><input value={paypalName} onChange={e=>setPaypalName(e.target.value)} placeholder="Name on your PayPal account" autoComplete="name"/></label>
          <label className="field"><span>PayPal email</span><input type="email" value={paypalEmail} onChange={e=>setPaypalEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
        </div><div className="payout-country-note"><Mail size={15}/><span>PayPal receiving features can vary by country.</span></div></div>}
        {method==="card"&&<div className="payout-form"><div className="payout-form-heading"><span className="kicker">DEBIT CARD DETAILS</span><h3>Connect an eligible debit card securely.</h3><p>Only the last 4 digits are retained by RemotePath. Full card details must be handled by the eventual payout provider.</p></div><div className="payout-form-grid">
          <label className="field"><span>Cardholder name</span><input value={cardName} onChange={e=>setCardName(e.target.value)} placeholder="Name on your debit card" autoComplete="cc-name"/></label>
          <label className="field"><span>Card ending</span><input value={cardLast4} onChange={e=>setCardLast4(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="Last 4 digits" inputMode="numeric" autoComplete="off"/></label>
        </div><div className="payout-country-note"><CreditCard size={15}/><span>RemotePath will not store a full card number, CVV or PIN.</span></div></div>}
        {methodConfig&&methodConfig.method_type==="custom"&&<div className="payout-form"><div className="payout-form-heading"><span className="kicker">PAYMENT DETAILS</span><h3>{methodConfig.name}</h3><p>{methodConfig.description||"Enter the information required for this payout method."}</p></div><div className="payout-form-grid">{(methodConfig.fields||[]).map(f=>{const value=customValues[f.key]||"";const setValue=v=>setCustomValues(prev=>({...prev,[f.key]:v}));return <label className="field" key={f.key}><span>{f.label}{f.required?"":" (optional)"}</span>{f.type==="textarea"?<textarea value={value} placeholder={f.label} onChange={e=>setValue(e.target.value)}/>:f.type==="select"?<select value={value} onChange={e=>setValue(e.target.value)}><option value="">Select…</option>{(f.options||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>:f.type==="radio"?<div className="universal-choice-list">{(f.options||[]).map(o=><label key={o}><input type="radio" name={f.key} checked={value===o} onChange={()=>setValue(o)}/><span>{o}</span></label>)}</div>:f.type==="checkbox"?<span className="checkbox-field"><input type="checkbox" checked={value==="true"||value===true} onChange={e=>setValue(e.target.checked)}/><span>{f.label}</span></span>:<input type={["number","email","tel","url","date","time","datetime-local"].includes(f.type)?f.type:"text"} inputMode={f.type==="last4"?"numeric":undefined} value={value} onChange={e=>setValue(f.type==="last4"?e.target.value.replace(/\D/g,"").slice(0,4):e.target.value)} placeholder={f.label}/>} {f.help_text&&<small>{f.help_text}</small>}</label>})}</div><div className="payout-country-note"><WalletCards size={15}/><span>{methodConfig.instructions||"Your payout details are stored according to RemotePath's security policy."}</span></div></div>}
        <div className="payout-modal-warning"><CircleHelp size={16}/><span>Double-check your details. Changes may require Customer Care assistance after saving.</span></div>
        <div className="payout-confirm-row"><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I have checked these details carefully.</span></label><Button onClick={saveMethod} disabled={!canSave||!confirmed||saving}>{saving?"Saving…":"Save payout method"} {!saving&&<ArrowRight size={15}/>}</Button></div>
      </div></div>}
    </section>
    <section className="payout-withdrawal-request panel"><div className="payout-section-head"><div><span className="kicker">WITHDRAWAL</span><h2>How much would you like to withdraw?</h2><p>Enter the amount and any additional information requested for this withdrawal.</p></div></div><div className="payout-form-grid">{withdrawalFields.map(f=><label className="field" key={f.key}><span>{f.label}{f.required?" *":""}</span><input type={["number","email","date","time","url","tel"].includes(f.type)?f.type:"text"} value={withdrawalValues[f.key]||""} placeholder={f.placeholder||""} min={f.config?.min} max={f.config?.max} step={f.config?.step} onChange={e=>setWithdrawalValues(v=>({...v,[f.key]:e.target.value}))}/>{f.help_text&&<small>{f.help_text}</small>}</label>)}</div><div className="payout-country-note"><WalletCards size={15}/><span>The withdrawal fields are controlled from Admin Studio. Processing will be connected when the withdrawal-request workflow is enabled.</span></div></section>
    <section className="payout-history panel"><PanelTitle title="Payout history" action="View all" onAction={()=>{}}/>{history.length===0?<div className="payout-empty"><WalletCards size={20}/><strong>No payouts yet</strong><span>Your payout history will appear here once you receive your first payout.</span></div>:<div className="payout-history-list">{history.map(p=><div className="payout-history-row" key={p.id}><div><strong>{p.currency} {Number(p.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</strong><small>{new Date(p.created_at).toLocaleDateString()} · {p.status}</small></div><Badge tone={p.status==="paid"?"green":"amber"}>{p.status}</Badge></div>)}</div>}</section>
  </div>
}
function Saved({go}){const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);useEffect(()=>{let mounted=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}const {data,error}=await supabase.from("saved_jobs").select("job_id,created_at,jobs(*)").eq("user_id",user.id).order("created_at",{ascending:false});if(mounted){if(error)console.error(error);setItems((data||[]).map(x=>({...x.jobs,company:x.jobs?.company_name,logo:x.jobs?.company_logo,type:x.jobs?.job_type,posted:relativePosted(x.jobs?.created_at)})).filter(Boolean));setLoading(false)}})();return()=>{mounted=false}},[]);return <div><AppShell go={go}><main className="workspace-page"><div className="page-heading"><span className="kicker">YOUR SHORTLIST</span><h1>Saved <em>jobs.</em></h1><p>Keep the roles you want to come back to in one place.</p></div>{loading?<div className="empty-state"><h3>Loading saved jobs…</h3><p>Fetching your shortlist.</p></div>:items.length===0?<EmptyState title="No saved jobs yet" text="Bookmark a role you like and it will appear here." action="Find jobs" onAction={()=>go("jobs")}/>:<div className="job-grid">{items.map(j=><JobCard key={j.id} job={j} onOpen={id=>go("job",id)}/>)}</div>}</main></AppShell></div>}

function Applications({go}){const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);useEffect(()=>{let mounted=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}const {data,error}=await supabase.from("applications").select("id,status,submitted_at,created_at,jobs(id,title,company_name,location,job_type,salary_min,salary_max,salary_currency)").eq("user_id",user.id).order("created_at",{ascending:false});if(mounted){if(error)console.error(error);setItems(data||[]);setLoading(false)}})();return()=>{mounted=false}},[]);return <div><AppShell go={go}><main className="workspace-page"><div className="page-heading"><span className="kicker">YOUR JOB SEARCH</span><h1>Your <em>applications.</em></h1><p>Track every role you’ve applied for and what happens next.</p></div>{loading?<div className="empty-state"><h3>Loading applications…</h3><p>Fetching your application history.</p></div>:items.length===0?<EmptyState title="No applications yet" text="When you apply for a job, you’ll be able to track it here." action="Find jobs" onAction={()=>go("jobs")}/>:<div className="application-list">{items.map(a=><article className="application-row" key={a.id}><div className="company-avatar">{a.jobs?.company_name?.[0]||"R"}</div><div className="application-row-main"><span className="kicker">{a.jobs?.company_name||"Company"}</span><h3>{a.jobs?.title||"Job application"}</h3><div className="job-row-meta"><span>{a.jobs?.job_type||"Remote"}</span><span>{a.jobs?.location||"Worldwide"}</span><span>{a.submitted_at?"Submitted":"Draft"}</span></div></div><Badge tone={a.status==="submitted"?"green":"soft"}>{a.status==="submitted"?"Submitted":a.status}</Badge></article>)}</div>}</main></AppShell></div>}
function ApplicationFlow({go,id=1}){const [job,setJob]=useState(null);const [profile,setProfile]=useState(null);const [resumes,setResumes]=useState([]);const [resumeId,setResumeId]=useState(null);const [step,setStep]=useState(1);const [answers,setAnswers]=useState({interest:"",availability:"",remote:"Yes"});const [saving,setSaving]=useState(false);const [uploading,setUploading]=useState(false);const [error,setError]=useState("");const [customForm,setCustomForm]=useState(null);const [customAnswers,setCustomAnswers]=useState({});useEffect(()=>{let mounted=true;(async()=>{const [{data:jobRow},{data:{user}}]=await Promise.all([supabase.from("jobs").select("*").eq("id",Number(id)).maybeSingle(),supabase.auth.getUser()]);if(!user){go("login");return}const [{data:profileRow},{data:resumeRows}]=await Promise.all([supabase.from("profiles").select("full_name,country").eq("id",user.id).maybeSingle(),supabase.from("resumes").select("*").eq("user_id",user.id).order("created_at",{ascending:false})]);if(mounted){setJob(jobRow);setProfile({...profileRow,email:user.email||""});setResumes(resumeRows||[]);if(resumeRows?.[0])setResumeId(resumeRows[0].id);if(jobRow?.application_form_id){const {data:formRow}=await supabase.from("form_definitions").select("id,name,description,submit_label,success_message,status,form_fields(*)").eq("id",jobRow.application_form_id).eq("status","published").maybeSingle();if(formRow)setCustomForm({...formRow,form_fields:(formRow.form_fields||[]).sort((x,y)=>x.position-y.position)})}}})();return()=>{mounted=false}},[id]);if(!job)return <div className="flow-page"><header className="flow-header"><Logo/></header><div className="flow-wrap"><div className="empty-state"><h3>Loading application…</h3><p>Preparing this application for you.</p></div></div></div>;const uploadResume=async e=>{const file=e.target.files?.[0];if(!file)return;if(file.type!=="application/pdf"){setError("Please upload a PDF resume.");return}if(file.size>5*1024*1024){setError("Your resume must be 5 MB or smaller.");return}setUploading(true);setError("");try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Your session has expired. Please sign in again.");const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=user.id+"/"+Date.now()+"-"+safeName;const {error:uploadError}=await supabase.storage.from("resumes").upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;const {data:row,error:rowError}=await supabase.from("resumes").insert({user_id:user.id,file_name:file.name,storage_path:path,file_size:file.size,mime_type:file.type}).select().single();if(rowError)throw rowError;setResumes(prev=>[row,...prev]);setResumeId(row.id)}catch(err){setError(err?.message||"We couldn't upload your resume yet. Please try again.")}finally{setUploading(false)}};const submit=async()=>{const missing=(customForm?.form_fields||[]).filter(f=>f.required&&!String(customAnswers[f.field_key]??"").trim());if(missing.length){setError("Please complete the required application fields.");setStep(3);return}if(!resumeId){setError("Please select or upload a resume before submitting.");setStep(2);return}if(!answers.interest||!answers.availability){setError("Please complete the application questions before submitting.");setStep(3);return}setSaving(true);setError("");try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Your session has expired. Please sign in again.");const payload=[{question:"Why are you interested in this role?",answer:answers.interest},{question:"What is your availability to start?",answer:answers.availability},{question:"Are you comfortable working remotely?",answer:answers.remote},...((customForm?.form_fields||[]).map(f=>({question:f.label,field_key:f.field_key,answer:customAnswers[f.field_key]??""})))];const {error}=await supabase.from("applications").upsert({user_id:user.id,job_id:job.id,status:"submitted",resume_id:resumeId,answers:payload,submitted_at:new Date().toISOString()},{onConflict:"user_id,job_id"});if(error)throw error;go("applications")}catch(err){setError(err?.message||"We couldn't submit your application yet. Please try again.")}finally{setSaving(false)}};return <div className="flow-page"><header className="flow-header"><Logo/><button onClick={()=>go("job",job.id)}>Save and exit</button></header><div className="flow-wrap"><div className="flow-intro"><span className="kicker">APPLICATION</span><h1>Apply for {job.title}</h1><p>{job.company_name} · {job.location}</p></div><div className="progress">{["Profile","Resume","Questions","Review"].map((s,i)=><div key={s} className={step>=i+1?"done":""}><span>{step>i+1?<Check size={13}/>:i+1}</span><strong>{s}</strong></div>)}</div><div className="flow-card">{step===1&&<><h2>Your profile</h2><p>Tell the employer a little about you. This information will be included with your application.</p><Field label="Full name" value={profile?.full_name||""} placeholder="Your full name" readOnly/><Field label="Email address" value={profile?.email||""} placeholder="you@example.com" readOnly/><Field label="Location" value={profile?.country||""} placeholder="Your country" readOnly/></>}{step===2&&<><h2>Your resume</h2><p>Choose the resume you want to use for this application.</p>{resumes.length===0&&<div className="resume-card"><FileText size={23}/><div><strong>No resume uploaded yet</strong><span>Upload your PDF resume to continue.</span></div></div>}{resumes.map(r=><button type="button" key={r.id} className="resume-card" onClick={()=>setResumeId(r.id)} style={{width:"100%",textAlign:"left",border:resumeId===r.id?"2px solid var(--green)":"1px solid var(--line)",cursor:"pointer"}}><FileText size={23}/><div><strong>{r.file_name}</strong><span>{Math.round((r.file_size||0)/1024)} KB · {new Date(r.created_at).toLocaleDateString()}</span></div>{resumeId===r.id&&<Badge tone="green"><Check size={12}/> Selected</Badge>}</button>)}<label className="btn btn-outline" style={{display:"inline-flex",marginTop:12,cursor:uploading?"wait":"pointer"}}><Plus size={15}/>{uploading?"Uploading…":"Upload resume"}<input type="file" accept="application/pdf,.pdf" hidden onChange={uploadResume} disabled={uploading}/></label></>}{step===3&&<><h2>A few questions</h2><p>These questions are specific to {job.company_name}.</p><label className="field"><span>Why are you interested in this role?</span><textarea value={answers.interest} onChange={e=>setAnswers({...answers,interest:e.target.value})} placeholder="Tell us what makes this opportunity a good fit..."/></label><Field label="What is your availability to start?" value={answers.availability} onChange={e=>setAnswers({...answers,availability:e.target.value})} placeholder="e.g. 2 weeks"/><label className="field"><span>Are you comfortable working remotely?</span><select value={answers.remote} onChange={e=>setAnswers({...answers,remote:e.target.value})}><option>Yes</option><option>No</option></select></label>{customForm&&<div className="custom-form-block"><span className="kicker">ADDITIONAL QUESTIONS</span><h3>{customForm.name}</h3><p>{customForm.description}</p>{customForm.form_fields.map(f=>{const value=customAnswers[f.field_key]||"";const setValue=v=>setCustomAnswers(prev=>({...prev,[f.field_key]:v}));return <label className="field" key={f.id}><span>{f.label}{f.required?" *":""}</span>{f.field_type==="textarea"?<textarea value={value} placeholder={f.placeholder||""} onChange={e=>setValue(e.target.value)}/>:f.field_type==="select"?<select value={value} onChange={e=>setValue(e.target.value)}><option value="">Select…</option>{(f.options||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>:f.field_type==="radio"?<div className="universal-choice-list">{(f.options||[]).map(o=><label key={o}><input type="radio" name={f.field_key} checked={value===o} onChange={()=>setValue(o)}/><span>{o}</span></label>)}</div>:f.field_type==="checkbox"?<span className="checkbox-field"><input type="checkbox" checked={value==="true"||value===true} onChange={e=>setValue(e.target.checked)}/><span>{f.help_text||f.label}</span></span>:f.field_type==="file"?<input type="file" onChange={e=>setValue(e.target.files?.[0]?.name||"")}/>:<input type={["number","email","tel","url","password","date","time","datetime-local"].includes(f.field_type)?f.field_type:"text"} value={value} placeholder={f.placeholder||""} min={f.config?.min} max={f.config?.max} onChange={e=>setValue(e.target.value)}/>} {f.help_text&&f.field_type!=="checkbox"&&<small>{f.help_text}</small>}</label>})}</div>}</>}{step===4&&<><h2>Review your application</h2><p>Everything looks good? You can submit now or go back to edit.</p><div className="review-list"><ReviewItem label="Profile" value={(profile?.full_name||"Your profile")+" · "+(profile?.country||"Location not set")}/><ReviewItem label="Resume" value={resumes.find(r=>r.id===resumeId)?.file_name||"No resume selected"}/><ReviewItem label="Questions" value={(answers.interest&&answers.availability)?"3 answers completed":"Complete your answers before submitting"}/></div><div className="notice"><ShieldCheck size={18}/><span>Your application is shared only with {job.company_name} for this role.</span></div>{error&&<div className="auth-error">{error}</div>}</>}<div className="flow-actions"><Button variant="outline" onClick={()=>step>1&&setStep(step-1)} disabled={step===1||saving||uploading}>Back</Button><Button onClick={()=>step<4?setStep(step+1):submit()} disabled={saving||uploading}>{saving?"Submitting…":step<4?"Continue":"Submit application"} {!saving&&<ArrowRight size={15}/>}</Button></div></div></div></div>}
function ReviewItem({label,value}){return <div className="review-item"><span>{label}</span><strong>{value}</strong><Check size={15}/></div>}

function Interview({go}){
  const [interviews,setInterviews]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [questions,setQuestions]=useState([]);
  const [answers,setAnswers]=useState({});
  const [loading,setLoading]=useState(true);
  const [loadingQuestions,setLoadingQuestions]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [completed,setCompleted]=useState(false);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      setLoading(true);setError("");
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){if(mounted){setError("Your session has expired. Please sign in again.");setLoading(false)};return}
      const {data,error}=await supabase.from("interviews").select("id,title,company_name,status,scheduled_at,duration_minutes,current_question,started_at,completed_at").eq("candidate_id",user.id).order("scheduled_at",{ascending:true,nullsFirst:false}).order("created_at",{ascending:false});
      if(!mounted)return;
      if(error){setError(error.message);setInterviews([])}
      else{const rows=data||[];setInterviews(rows);setActiveId(rows[0]?.id||null);setCompleted(rows[0]?.status==="completed")}
      setLoading(false);
    })();
    return()=>{mounted=false};
  },[]);

  const activeInterview=interviews.find(x=>x.id===activeId)||null;

  useEffect(()=>{
    if(!activeInterview)return;
    let mounted=true;
    (async()=>{
      setLoadingQuestions(true);setError("");
      const [{data:questionRows,error:qError},{data:answerRows,error:aError}]=await Promise.all([
        supabase.from("interview_questions").select("id,position,section,prompt,help_text,max_length").eq("interview_id",activeInterview.id).order("position",{ascending:true}),
        supabase.from("interview_answers").select("question_id,answer").eq("interview_id",activeInterview.id)
      ]);
      if(!mounted)return;
      if(qError||aError){setError((qError||aError).message);setQuestions([]);setAnswers({})}
      else{const answerMap={};(answerRows||[]).forEach(row=>{answerMap[row.question_id]=row.answer||""});setQuestions(questionRows||[]);setAnswers(answerMap);setCompleted(activeInterview.status==="completed")}
      setLoadingQuestions(false);
    })();
    return()=>{mounted=false};
  },[activeInterview?.id]);

  const currentIndex=Math.max(0,(activeInterview?.current_question||1)-1);
  const question=questions[currentIndex]||questions[0];
  const currentAnswer=question?answers[question.id]||"":"";
  const progress=questions.length?Math.min(100,Math.round(((currentIndex+1)/questions.length)*100)):0;

  const saveAnswer=async()=>{
    if(!activeInterview||!question)return true;
    setSaving(true);setError("");
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const {error:answerError}=await supabase.from("interview_answers").upsert({interview_id:activeInterview.id,question_id:question.id,candidate_id:user.id,answer:currentAnswer,submitted_at:null},{onConflict:"interview_id,question_id"});
      if(answerError)throw answerError;
      return true;
    }catch(err){setError(err?.message||"We couldn't save your answer yet.");return false}
    finally{setSaving(false)}
  };

  const startInterview=async()=>{
    if(!activeInterview)return;
    setSaving(true);setError("");
    const {error:updateError}=await supabase.from("interviews").update({status:"in_progress",started_at:activeInterview.started_at||new Date().toISOString(),current_question:Math.max(1,activeInterview.current_question||1)}).eq("id",activeInterview.id);
    if(updateError)setError(updateError.message);
    else setInterviews(prev=>prev.map(x=>x.id===activeInterview.id?{...x,status:"in_progress",started_at:x.started_at||new Date().toISOString()}:x));
    setSaving(false);
  };

  const nextQuestion=async()=>{
    if(!activeInterview||!question||saving)return;
    const saved=await saveAnswer();if(!saved)return;
    if(currentIndex>=questions.length-1){
      setSaving(true);
      const {error:updateError}=await supabase.from("interviews").update({status:"completed",completed_at:new Date().toISOString(),current_question:questions.length||1}).eq("id",activeInterview.id);
      if(updateError)setError(updateError.message);
      else{setCompleted(true);setInterviews(prev=>prev.map(x=>x.id===activeInterview.id?{...x,status:"completed",completed_at:new Date().toISOString(),current_question:questions.length||1}:x))}
      setSaving(false);return;
    }
    const next=currentIndex+2;
    setSaving(true);
    const {error:updateError}=await supabase.from("interviews").update({current_question:next}).eq("id",activeInterview.id);
    if(updateError)setError(updateError.message);
    else setInterviews(prev=>prev.map(x=>x.id===activeInterview.id?{...x,current_question:next}:x));
    setSaving(false);
  };

  if(loading)return <div className="interview-page"><header className="flow-header"><Logo/><Badge tone="soft">Loading interview</Badge><Avatar letter="R" size="sm"/></header><div className="interview-empty"><Clock3 size={24}/><h2>Loading your interviews…</h2><p>We’re preparing your interview workspace.</p></div></div>;
  if(error&&!activeInterview)return <div className="interview-page"><header className="flow-header"><Logo/><Badge tone="soft">Interview workspace</Badge><Avatar letter="R" size="sm"/></header><div className="interview-empty"><X size={24}/><h2>We couldn't load your interviews</h2><p>{error}</p><Button onClick={()=>go("dashboard")}>Back to dashboard</Button></div></div>;
  if(!activeInterview)return <div className="interview-page"><header className="flow-header"><Logo/><Badge tone="soft">Interview workspace</Badge><Avatar letter="R" size="sm"/></header><div className="interview-empty"><MessageCircle size={28}/><span className="kicker">YOUR INTERVIEWS</span><h2>No interviews yet.</h2><p>When a company invites you to an interview, it will appear here with the schedule and interview workspace.</p><Button onClick={()=>go("applications")}>View applications <ArrowRight size={15}/></Button></div></div>;

  const statusLabel=activeInterview.status==="completed"?"Interview completed":activeInterview.status==="in_progress"?"Interview in progress":activeInterview.status==="cancelled"?"Interview cancelled":"Interview scheduled";
  const questionCount=questions.length||5;
  const displayIndex=questions.length?currentIndex+1:1;
  const timeLeft=Math.max(1,(questionCount-displayIndex+1)*3);

  return <div className="interview-page">
    <header className="flow-header"><Logo/><div className="interview-top-status">{interviews.length>1&&<select value={activeInterview.id} onChange={e=>{setActiveId(Number(e.target.value));setError("")}}>{interviews.map(x=><option key={x.id} value={x.id}>{x.company_name} · {x.title}</option>)}</select>}<Badge tone={activeInterview.status==="completed"?"soft":"green"}><span className="dot"/>{statusLabel}</Badge></div><Avatar letter="R" size="sm"/></header>
    <div className="interview-layout">
      <aside className="interview-side"><div><span className="kicker">{activeInterview.company_name}</span><h2>{activeInterview.title}</h2><p>Interview workspace</p></div>
        <nav>{questions.map((q,i)=>{const done=i<currentIndex||activeInterview.status==="completed";const active=i===currentIndex&&activeInterview.status!=="completed";return <button className={active?"active":done?"done":""} key={q.id}><span>{done?<Check size={13}/>:i+1}</span>{q.section}{done&&<Check size={13}/>}</button>})}</nav>
        <div className="interview-help"><CircleHelp size={17}/><span><strong>Need help?</strong>Review interview tips</span></div>
      </aside>
      <main className="interview-main">
        {activeInterview.status==="scheduled"&&<div className="interview-start-card"><div><span className="kicker">READY WHEN YOU ARE</span><h2>Your interview is scheduled.</h2><p>{activeInterview.scheduled_at?new Date(activeInterview.scheduled_at).toLocaleString():"Estimated "+activeInterview.duration_minutes+" minutes"}</p></div><Button onClick={startInterview} disabled={saving}>Start interview <ArrowRight size={15}/></Button></div>}
        {loadingQuestions&&<div className="question-card"><h1>Loading questions…</h1><p>Preparing your interview.</p></div>}
        {!loadingQuestions&&questions.length===0&&<div className="question-card"><span className="kicker">INTERVIEW</span><h1>Your questions are not ready yet.</h1><p>This interview has been created, but the question set hasn't been published yet. Please check back shortly.</p></div>}
        {!loadingQuestions&&questions.length>0&&<><div className="question-meta"><span>Question {displayIndex} of {questionCount}</span><div><span>{activeInterview.status==="completed"?"Completed":"Estimated "+timeLeft+" min left"}</span><div className="progress-line"><i style={{width:progress+"%"}}/></div></div></div>
          <div className="question-card"><span className="kicker">{question.section}</span><h1>{question.prompt}</h1>{question.help_text&&<p>{question.help_text}</p>}
            {activeInterview.status==="completed"?<div className="interview-complete"><Check size={24}/><strong>Interview completed</strong><span>Your responses have been saved.</span></div>:activeInterview.status==="cancelled"?<div className="interview-complete"><X size={24}/><strong>This interview was cancelled</strong><span>Please contact the hiring team if you believe this is an error.</span></div>:<><textarea value={currentAnswer} onChange={e=>setAnswers(prev=>({...prev,[question.id]:e.target.value}))} placeholder="Type your answer here..." maxLength={question.max_length||1500} disabled={activeInterview.status!=="in_progress"}/><div className="answer-footer"><span>{currentAnswer.length} / {question.max_length||1500}</span><Button variant="soft" onClick={saveAnswer} disabled={saving||activeInterview.status!=="in_progress"}>Save draft</Button><Button onClick={nextQuestion} disabled={saving||activeInterview.status!=="in_progress"}>{saving?"Saving…":currentIndex===questions.length-1?"Complete interview":"Next question"} <ArrowRight size={15}/></Button></div></>}
          </div>
        </>}
        {error&&activeInterview&&<div className="auth-error interview-inline-error">{error}</div>}
      </main>
    </div>
  </div>;
}
function Profile({go}){return <div className="workspace"><div className="workspace-head"><div><span className="kicker">YOUR PROFILE</span><h1>Profile & preferences</h1><p>Keep your professional story ready for every application.</p></div><Button onClick={()=>go("jobs")}>Preview jobs <ArrowRight size={15}/></Button></div><div className="profile-layout"><aside className="profile-card panel"><div className="profile-avatar"><Avatar letter="A" size="xl"/><button><PenLine size={14}/></button></div><h2>Alex Carter</h2><p>Product Designer</p><Badge tone="green">Profile 86% complete</Badge><div className="profile-links"><span><MapPin size={14}/>Lagos, Nigeria</span><span><Globe2 size={14}/>Open to worldwide</span></div></aside><section className="profile-editor panel"><PanelTitle title="About you"/><Field label="Professional headline" placeholder="Senior Product Designer"/><Field label="About" placeholder="A short introduction about your experience and the work you want to do."/><div className="two-fields"><Field label="Years of experience" placeholder="5"/><Field label="Availability" placeholder="Open to opportunities"/></div><PanelTitle title="Skills"/><div className="skill-editor">{["Product Design","Figma","UX Research","Design Systems","Prototyping"].map(x=><Badge key={x} tone="soft">{x} <X size={11}/></Badge>)}<button><Plus size={13}/> Add skill</button></div><Button>Save changes <Check size={15}/></Button></section></div></div>}

function Employer({go}){
 const [profile,setProfile]=useState(null),[jobs,setJobs]=useState([]),[applications,setApplications]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let mounted=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){if(mounted)setLoading(false);return}const [{data:ep},{data:jobRows,error:jobError},{data:appRows}]=await Promise.all([supabase.from("employer_profiles").select("company_name,verified").eq("id",user.id).maybeSingle(),supabase.from("jobs").select("id,title,status,job_type,remote_type,created_at").eq("employer_id",user.id).order("created_at",{ascending:false}),supabase.from("applications").select("id,status,created_at,job_id,user_id,jobs!inner(title)").order("created_at",{ascending:false}).limit(8)]);if(!mounted)return;if(jobError)setError(jobError.message);setProfile(ep);setJobs(jobRows||[]);setApplications(appRows||[]);setLoading(false)})();return()=>{mounted=false}},[]);
 if(loading)return <div className="workspace"><div className="workspace-head"><div><span className="kicker">EMPLOYER WORKSPACE</span><h1>Loading your hiring workspace…</h1></div></div></div>;
 const active=jobs.filter(j=>j.status==="published").length,interviews=applications.filter(a=>a.status==="interview").length;
 return <div className="workspace employer-workspace"><div className="workspace-head"><div><span className="kicker">EMPLOYER WORKSPACE</span><h1>Welcome back{profile?.company_name?", "+profile.company_name:""} <span>✦</span></h1><p>Here’s what’s happening with your hiring pipeline.</p></div><Button onClick={()=>go("postjob")}>Post a job <Plus size={15}/></Button></div>{error&&<div className="auth-message auth-error">{error}</div>}<div className="summary-grid"><Summary icon={BriefcaseBusiness} value={String(active)} label="Active jobs" change={jobs.length+" total listings"}/><Summary icon={Users} value={String(applications.length)} label="Recent applications" change="Live from Supabase"/><Summary icon={MessageCircle} value={String(interviews)} label="Interviews" change="Current pipeline"/><Summary icon={Star} value={String(jobs.filter(j=>j.status==="closed").length)} label="Closed jobs" change="Historical listings"/></div><div className="employer-grid"><section className="panel"><PanelTitle title="Your job listings" action="Post another" onAction={()=>go("postjob")}/>{jobs.length===0?<EmptyState title="No jobs yet" text="Create your first remote role and send it through verification review." action="Post a job" onAction={()=>go("postjob")}/>:jobs.slice(0,5).map(j=><div className="candidate-row" key={j.id}><div><strong>{j.title}</strong><span>{j.job_type} · {j.remote_type}</span></div><Badge tone={j.status==="published"?"green":j.status==="pending_review"?"amber":"soft"}>{j.status==="pending_review"?"Pending review":j.status}</Badge></div>)}</section><section className="panel hiring-card"><span className="kicker">HIRING PIPELINE</span><h2>{applications.length?"Candidates are moving through your pipeline.":"Your pipeline is ready."}</h2><p>Review applications and keep the next hiring decision visible.</p><Button variant="soft" onClick={()=>go("candidates")}>Review candidates <ArrowRight size={14}/></Button></section></div></div>;
}
function PostJob({go}){
 const [step,setStep]=useState(1),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const [form,setForm]=useState({title:"",category:"",jobType:"Full-time",remoteType:"Fully remote",salaryMin:"",salaryMax:"",experience:"",skills:"",description:""});
 const set=(k,v)=>setForm(x=>({...x,[k]:v}));
 const submit=async()=>{if(!form.title.trim()||!form.category.trim()||!form.description.trim()){setError("Please complete the job title, category and role description.");return}setSaving(true);setError("");try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Your session has expired. Please sign in again.");const {data:profile}=await supabase.from("employer_profiles").select("company_name,logo_url").eq("id",user.id).maybeSingle();if(!profile?.company_name)throw new Error("Add your company profile before posting a job.");const money=v=>{const n=Number(String(v).replace(/[^0-9.]/g,""));return Number.isFinite(n)&&n>0?Math.round(n):null};const {error:e}=await supabase.from("jobs").insert({employer_id:user.id,title:form.title.trim(),company_name:profile.company_name,company_logo:profile.logo_url||null,category:form.category.trim(),job_type:form.jobType,remote_type:form.remoteType,salary_min:money(form.salaryMin),salary_max:money(form.salaryMax),experience_level:form.experience.trim(),tags:form.skills.split(",").map(x=>x.trim()).filter(Boolean),description:form.description.trim(),status:"pending_review"});if(e)throw e;go("employer")}catch(err){setError(err?.message||"We couldn't submit the job yet.")}finally{setSaving(false)}};
 return <div className="flow-page employer-flow"><header className="flow-header"><Logo/><button onClick={()=>go("employer")}>Save and exit</button></header><div className="flow-wrap"><div className="flow-intro"><span className="kicker">EMPLOYER</span><h1>Post a new job</h1><p>Create a clear, compelling role for the right remote candidates.</p></div><div className="progress">{["Details","Requirements","Review"].map((x,i)=><div className={step>=i+1?"done":""} key={x}><span>{step>i+1?<Check size={13}/>:i+1}</span><strong>{x}</strong></div>)}</div><div className="flow-card">{step===1&&<><h2>Job details</h2><p>Start with the essentials candidates need to understand the opportunity.</p><Field label="Job title" placeholder="Senior Product Designer" value={form.title} onChange={e=>set("title",e.target.value)}/><div className="two-fields"><Field label="Job category" placeholder="Product Design" value={form.category} onChange={e=>set("category",e.target.value)}/><label className="field"><span>Employment type</span><select value={form.jobType} onChange={e=>set("jobType",e.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Freelance</option><option>Temporary</option></select></label></div><div className="two-fields"><label className="field"><span>Work arrangement</span><select value={form.remoteType} onChange={e=>set("remoteType",e.target.value)}><option>Fully remote</option><option>Hybrid</option><option>On-site</option></select></label><Field label="Minimum salary" placeholder="80000" value={form.salaryMin} onChange={e=>set("salaryMin",e.target.value)}/></div><Field label="Maximum salary" placeholder="120000" value={form.salaryMax} onChange={e=>set("salaryMax",e.target.value)}/></>}{step===2&&<><h2>Requirements</h2><p>Help the right candidates understand what success looks like.</p><Field label="Required experience" placeholder="3+ years in product design" value={form.experience} onChange={e=>set("experience",e.target.value)}/><Field label="Skills" placeholder="Figma, UX Research, Design Systems" value={form.skills} onChange={e=>set("skills",e.target.value)}/><Field label="Role description" placeholder="Describe responsibilities, team and impact..." value={form.description} onChange={e=>set("description",e.target.value)}/></>}{step===3&&<><h2>Review your job</h2><p>Check the listing before sending it to verification review.</p><div className="review-list"><ReviewItem label="Title" value={form.title||"—"}/><ReviewItem label="Work arrangement" value={form.remoteType+" · Worldwide"}/><ReviewItem label="Salary" value={(form.salaryMin||"—")+" – "+(form.salaryMax||"—")+" USD / year"}/><ReviewItem label="Requirements" value={(form.experience||"No experience requirement")+" · "+(form.skills||"No skills listed")}/></div><div className="notice"><ShieldCheck size={18}/><span>Your listing will enter verification review and remain unpublished until approved.</span></div></>}{error&&<div className="auth-message auth-error">{error}</div>}<div className="flow-actions"><Button variant="outline" onClick={()=>step>1&&setStep(step-1)} disabled={saving}>Back</Button><Button onClick={()=>step<3?setStep(step+1):submit()} disabled={saving}>{saving?"Submitting…":step<3?"Continue":"Submit for review"} {!saving&&<ArrowRight size={15}/>}</Button></div></div></div></div>;
}
function Candidates({go}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let mounted=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){if(mounted)setLoading(false);return}const {data,error}=await supabase.from("applications").select("id,status,created_at,user_id,job_id,jobs!inner(title,employer_id),profiles!applications_user_id_fkey(full_name,country,experience)").eq("jobs.employer_id",user.id).order("created_at",{ascending:false});if(!mounted)return;if(error)setError(error.message);setRows(data||[]);setLoading(false)})();return()=>{mounted=false}},[]);
 const updateStatus=async(id,status)=>{setError("");const {error}=await supabase.from("applications").update({status}).eq("id",id);if(error)setError(error.message);else setRows(prev=>prev.map(x=>x.id===id?{...x,status}:x))};
 if(loading)return <div className="workspace"><div className="workspace-head"><div><span className="kicker">TALENT PIPELINE</span><h1>Loading candidates…</h1></div></div></div>;
 return <div className="workspace"><div className="workspace-head"><div><span className="kicker">TALENT PIPELINE</span><h1>Candidates</h1><p>Review applications submitted to your jobs.</p></div><Button variant="outline"><Filter size={15}/> Filters</Button></div>{error&&<div className="auth-message auth-error">{error}</div>}<div className="pipeline-tabs"><button className="active">All <span>{rows.length}</span></button><button>New <span>{rows.filter(x=>x.status==="submitted").length}</span></button><button>Shortlisted <span>{rows.filter(x=>x.status==="reviewing").length}</span></button><button>Interview <span>{rows.filter(x=>x.status==="interview").length}</span></button><button>Hired <span>{rows.filter(x=>x.status==="hired").length}</span></button></div>{rows.length===0?<EmptyState title="No candidates yet" text="Applications to your published or review-stage jobs will appear here." action="Post a job" onAction={()=>go("postjob")}/>:<div className="candidate-table">{rows.map((r,i)=><div className="candidate-row large" key={r.id}><Avatar letter={(r.profiles?.full_name||"C")[0]}/><div><strong>{r.profiles?.full_name||"Candidate"}</strong><span>{r.jobs?.title||"Job application"}{r.profiles?.experience?" · "+r.profiles.experience:""}</span></div><span>{new Date(r.created_at).toLocaleDateString()}</span><select value={r.status} onChange={e=>updateStatus(r.id,e.target.value)}><option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="interview">Interview</option><option value="rejected">Rejected</option><option value="hired">Hired</option><option value="withdrawn">Withdrawn</option></select><span className="candidate-action"><ArrowRight size={15}/></span></div>)}</div>}</div>;
}
function AdminSupport({go}){
const [tickets,setTickets]=useState([]),[selected,setSelected]=useState(null),[messages,setMessages]=useState([]),[query,setQuery]=useState(""),[statusFilter,setStatusFilter]=useState("all"),[issueFilter,setIssueFilter]=useState("all"),[draft,setDraft]=useState(""),[loading,setLoading]=useState(true),[detailLoading,setDetailLoading]=useState(false),[sending,setSending]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
const loadTickets=async()=>{setLoading(true);const {data,error:e}=await supabase.from("support_tickets").select("id,user_id,issue_type,subject,status,created_at,updated_at,profiles(full_name,country)").order("updated_at",{ascending:false});if(e)setError(e.message);setTickets(data||[]);setLoading(false)};
const loadMessages=async t=>{setDetailLoading(true);const {data,error:e}=await supabase.from("support_messages").select("id,ticket_id,user_id,sender_type,body,created_at").eq("ticket_id",t.id).order("created_at",{ascending:true});if(e)setError(e.message);setMessages(data||[]);setDetailLoading(false)};
useEffect(()=>{loadTickets()},[]);
const updateStatus=async status=>{if(!selected||saving||selected.status===status)return;setSaving(true);try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Your session has expired. Please sign in again.");const {data,error:e}=await supabase.from("support_tickets").update({status}).eq("id",selected.id).select("id,user_id,issue_type,subject,status,created_at,updated_at,profiles(full_name,country)").single();if(e)throw e;setSelected(data);setTickets(v=>v.map(t=>t.id===data.id?data:t));await supabase.from("admin_audit_logs").insert({admin_user_id:user.id,action:"support_ticket_status_changed",target_type:"support_ticket",details:{ticket_id:data.id,from:selected.status,to:status}})}catch(e){setError(e.message||"We couldn't update this ticket.")}finally{setSaving(false)}};
const sendReply=async()=>{const body=draft.trim();if(!selected||!body||sending)return;setSending(true);try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Your session has expired. Please sign in again.");const {data:row,error:e}=await supabase.from("support_messages").insert({ticket_id:selected.id,user_id:selected.user_id,sender_type:"support",body}).select("id,ticket_id,user_id,sender_type,body,created_at").single();if(e)throw e;setMessages(v=>[...v,row]);setDraft("");if(selected.status==="open"||selected.status==="waiting_on_user")await updateStatus("in_progress");}catch(e){setError(e.message||"We couldn't send the support reply.")}finally{setSending(false)}};
const filtered=tickets.filter(t=>{const hay=[t.subject,t.issue_type,t.status,t.profiles?.full_name,t.profiles?.country].filter(Boolean).join(" ").toLowerCase();const q=query.trim().toLowerCase();return(!q||hay.includes(q))&&(statusFilter==="all"||t.status===statusFilter)&&(issueFilter==="all"||t.issue_type===issueFilter)});const counts={open:0,in_progress:0,waiting_on_user:0};tickets.forEach(t=>{if(counts[t.status]!==undefined)counts[t.status]++});
return <div className="workspace admin-workspace"><div className="workspace-head"><div><span className="kicker">PLATFORM OPERATIONS</span><h1>Support management</h1><p>Review candidate support requests, reply securely and manage ticket status.</p></div><Button variant="outline" onClick={loadTickets}><ArrowRight size={15}/> Refresh</Button></div><section className="admin-control-note"><CircleHelp size={18}/><div><strong>Admin-only support console</strong><span>Support conversations are private. Replies can notify the ticket owner automatically.</span></div></section>{error&&<div className="auth-message auth-error">{error}</div>}<section className="panel admin-support-filters"><label className="field"><span>Search tickets</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Subject, member or issue type"/></label><label className="field"><span>Status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_on_user">Waiting on user</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label><label className="field"><span>Issue type</span><select value={issueFilter} onChange={e=>setIssueFilter(e.target.value)}><option value="all">All issue types</option><option>Account & login</option><option>Job or application</option><option>Partner company / job</option><option>Technical issue</option><option>Report a concern</option><option>Other</option></select></label></section><div className="admin-support-layout"><section className="panel admin-support-list-panel"><div className="admin-support-summary"><strong>{filtered.length} ticket{filtered.length===1?"":"s"}</strong><span>{counts.open} open · {counts.in_progress} in progress · {counts.waiting_on_user} waiting</span></div>{loading?<div className="empty-state"><h3>Loading support tickets…</h3><p>Fetching private support conversations.</p></div>:filtered.length===0?<EmptyState title="No support tickets found" text="Try another search or filter."/>:<div className="admin-support-list">{filtered.map(t=><button className={selected?.id===t.id?"admin-support-row active":"admin-support-row"} key={t.id} onClick={()=>{setSelected(t);loadMessages(t)}}><span className="notification-icon"><MessageCircle size={15}/></span><span className="admin-support-row-main"><strong>{t.subject}</strong><small>{t.profiles?.full_name||"RemotePath member"} · {t.issue_type}</small><small>{relativePosted(t.updated_at)}</small></span><Badge tone={t.status==="open"?"green":t.status==="resolved"||t.status==="closed"?"soft":"warning"}>{t.status.replaceAll("_"," ")}</Badge><ChevronRight size={15}/></button>)}</div>}</section><section className="panel admin-support-detail">{!selected?<div className="empty-state"><MessageCircle size={28}/><h3>Select a support ticket</h3><p>Choose a ticket to review the conversation and respond.</p></div>:<><div className="admin-support-detail-head"><div><span className="kicker">TICKET #{selected.id}</span><h2>{selected.subject}</h2><p>{selected.profiles?.full_name||"RemotePath member"} · {selected.profiles?.country||"Country not set"} · {selected.issue_type}</p></div><button className="icon-btn" onClick={()=>setSelected(null)}><X size={16}/></button></div><div className="admin-support-statusbar"><span>Ticket status</span><select value={selected.status} disabled={saving} onChange={e=>updateStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_on_user">Waiting on user</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><small>Updated {new Date(selected.updated_at).toLocaleString()}</small></div><div className="admin-support-messages">{detailLoading?<div className="empty-state"><h3>Loading conversation…</h3></div>:messages.length===0?<div className="empty-state"><h3>No messages yet</h3></div>:messages.map(m=><div className={m.sender_type==="support"?"admin-support-message support":"admin-support-message user"} key={m.id}><div className="admin-support-message-meta"><strong>{m.sender_type==="support"?"RemotePath Support":selected.profiles?.full_name||"Member"}</strong><span>{new Date(m.created_at).toLocaleString()}</span></div><p>{m.body}</p></div>)}</div>{selected.status!=="closed"&&<div className="admin-support-reply"><label className="field"><span>Reply to member</span><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a clear, helpful response…" rows={4}/></label><div><small>Replies move open/waiting tickets to <strong>In progress</strong>.</small><Button onClick={sendReply} disabled={!draft.trim()||sending}>{sending?"Sending…":"Send reply"} <Send size={14}/></Button></div></div>}</>}</section></div></div>;
}

function AdminStudio({go,role}){
 const [tab,setTab]=useState("site"),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [settings,setSettings]=useState({brand:{site_name:"RemotePath",tagline:"Work. Anywhere.",accent:"#2f6b52",background:"#f7f4ec",heading_font:"DM Serif Display",body_font:"Inter"},home_hero:{badge:"",title:"",description:"",search_button:"Search Jobs",popular:[]},home_metrics:{items:[]},verification_demo_uploads:{enabled:false},verification_demo_identity_storage:{enabled:false}});
 const [sections,setSections]=useState([]),[forms,setForms]=useState([]),[selectedForm,setSelectedForm]=useState(null),[formFields,setFormFields]=useState([]),[templates,setTemplates]=useState([]),[selectedTemplate,setSelectedTemplate]=useState(null),[templateQuestions,setTemplateQuestions]=useState([]),[admins,setAdmins]=useState([]),[invite,setInvite]=useState({email:"",full_name:""}),[payoutConfigs,setPayoutConfigs]=useState([]),[payoutEditor,setPayoutEditor]=useState(null),[payoutField,setPayoutField]=useState({key:"",label:"",type:"text",required:true}),[withdrawalFields,setWithdrawalFields]=useState([]),[auditLogs,setAuditLogs]=useState([]),[saving,setSaving]=useState(false);
 const flash=(msg)=>{setNotice(msg);setTimeout(()=>setNotice(""),2600)};
 const load=async()=>{
   setError("");
   const [s,f,t,a,p,w,al]=await Promise.all([
     supabase.from("site_settings").select("key,value").order("key"),
     supabase.from("form_definitions").select("*").order("created_at",{ascending:false}),
     supabase.from("interview_templates").select("*").order("created_at",{ascending:false}),
     supabase.from("profiles").select("id,full_name,role,account_status,created_at").in("role",["admin","super_admin"]).order("created_at",{ascending:false}),
     supabase.from("payout_method_configs").select("*").order("sort_order").order("name"),
     supabase.from("site_settings").select("key,value").eq("key","withdrawal_form_fields").maybeSingle(),
     supabase.from("admin_audit_logs").select("id,admin_user_id,action,target_type,target_id,details,created_at").order("created_at",{ascending:false}).limit(100)
   ]);
   if(s.error||f.error||t.error||a.error||p.error||w.error||al.error)setError(s.error?.message||f.error?.message||t.error?.message||a.error?.message||p.error?.message||w.error?.message||al.error?.message||"Some control-center data could not be loaded.");
   const map={};(s.data||[]).forEach(x=>map[x.key]=x.value);setSettings(x=>({...x,...map}));
   const {data:secs}=await supabase.from("site_sections").select("*").order("sort_order");setSections(secs||[]);
   setForms(f.data||[]);setTemplates(t.data||[]);setAdmins(a.data||[]);setPayoutConfigs(p.data||[]);setWithdrawalFields(Array.isArray(w.data?.value)?w.data.value:[{key:"amount",label:"Amount to withdraw",type:"number",required:true,placeholder:"Enter amount",help_text:"Enter the amount you want to withdraw.",config:{min:1,step:"0.01"}}]);setAuditLogs(al.data||[]);
 };
 useEffect(()=>{load()},[]);
 const saveSetting=async(key,value)=>{setSaving(true);const {data:{user}}=await supabase.auth.getUser();const {error:e}=await supabase.from("site_settings").upsert({key,value,updated_by:user?.id||null,updated_at:new Date().toISOString()},{onConflict:"key"});setSaving(false);if(e)setError(e.message);else flash("Site settings saved.")};
 const toggleSection=async(sec)=>{const {data:{user}}=await supabase.auth.getUser();const next=!sec.is_visible;const {data,error:e}=await supabase.from("site_sections").update({is_visible:next,updated_by:user?.id||null}).eq("id",sec.id).select("*").single();if(e)setError(e.message);else setSections(v=>v.map(x=>x.id===sec.id?data:x))};
 const createForm=async()=>{const name=prompt("Form name");if(!name?.trim())return;const slug=name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");const {data,error:e}=await supabase.from("form_definitions").insert({name:name.trim(),slug,description:"",created_by:(await supabase.auth.getUser()).data.user?.id}).select("*").single();if(e)setError(e.message);else{setForms(v=>[data,...v]);setSelectedForm(data);setFormFields([]);flash("Form created.")}};
 const addField=async()=>{if(!selectedForm)return;const key="field_"+(formFields.length+1);const {data,error:e}=await supabase.from("form_fields").insert({form_id:selectedForm.id,position:formFields.length+1,label:"New field",field_key:key,field_type:"text",placeholder:"",help_text:"",options:[],required:false,config:{}}).select("*").single();if(e)setError(e.message);else setFormFields(v=>[...v,data])};
 const updateForm=async(patch)=>{if(!selectedForm)return;const {data,error:e}=await supabase.from("form_definitions").update({...patch,updated_at:new Date().toISOString()}).eq("id",selectedForm.id).select("*").single();if(e)setError(e.message);else{setSelectedForm(data);setForms(v=>v.map(x=>x.id===data.id?data:x));flash("Form settings saved.")}};
 const loadForm=async f=>{setSelectedForm(f);const {data,error:e}=await supabase.from("form_fields").select("*").eq("form_id",f.id).order("position");if(e)setError(e.message);setFormFields(data||[])};
 const updateField=async(field,patch)=>{const {data,error:e}=await supabase.from("form_fields").update(patch).eq("id",field.id).select("*").single();if(e)setError(e.message);else setFormFields(v=>v.map(x=>x.id===field.id?data:x))};
 const deleteField=async(field)=>{const {error:e}=await supabase.from("form_fields").delete().eq("id",field.id);if(e)setError(e.message);else{const remaining=formFields.filter(x=>x.id!==field.id);await Promise.all(remaining.map((x,i)=>supabase.from("form_fields").update({position:i+1}).eq("id",x.id)));setFormFields(remaining.map((x,i)=>({...x,position:i+1})))}}; 
 const moveField=async(field,direction)=>{const sorted=[...formFields].sort((x,y)=>x.position-y.position),i=sorted.findIndex(x=>x.id===field.id),j=i+direction;if(i<0||j<0||j>=sorted.length)return;const next=[...sorted];[next[i],next[j]]=[next[j],next[i]];await Promise.all(next.map((x,n)=>supabase.from("form_fields").update({position:n+1}).eq("id",x.id)));setFormFields(next.map((x,n)=>({...x,position:n+1})))};
 const saveWithdrawalFields=async()=>{setSaving(true);const {data:{user}}=await supabase.auth.getUser();const {error:e}=await supabase.from("site_settings").upsert({key:"withdrawal_form_fields",value:withdrawalFields,updated_by:user?.id||null,updated_at:new Date().toISOString()},{onConflict:"key"});setSaving(false);if(e)setError(e.message);else flash("Withdrawal fields saved.")};
 const addWithdrawalField=()=>setWithdrawalFields(v=>[...v,{key:"field_"+(v.length+1),label:"New field",type:"text",required:false,placeholder:"",help_text:"",config:{}}]);
 const updateWithdrawalField=(key,patch)=>setWithdrawalFields(v=>v.map(x=>x.key===key?{...x,...patch}:x));
 const removeWithdrawalField=key=>setWithdrawalFields(v=>v.filter(x=>x.key!==key));
 const createTemplate=async()=>{const name=prompt("Interview series name");if(!name?.trim())return;const {data,error:e}=await supabase.from("interview_templates").insert({name:name.trim(),created_by:(await supabase.auth.getUser()).data.user?.id}).select("*").single();if(e)setError(e.message);else{setTemplates(v=>[data,...v]);setSelectedTemplate(data);setTemplateQuestions([]);flash("Interview series created.")}};
 const updateTemplate=async(patch)=>{if(!selectedTemplate)return;const {data,error:e}=await supabase.from("interview_templates").update({...patch,updated_at:new Date().toISOString()}).eq("id",selectedTemplate.id).select("*").single();if(e)setError(e.message);else{setSelectedTemplate(data);setTemplates(v=>v.map(x=>x.id===data.id?data:x));flash("Interview series settings saved.")}};
 const loadTemplate=async t=>{setSelectedTemplate(t);const {data,error:e}=await supabase.from("interview_template_questions").select("*").eq("template_id",t.id).order("position");if(e)setError(e.message);setTemplateQuestions(data||[])}
 const addQuestion=async()=>{if(!selectedTemplate)return;const promptText=prompt("Interview question");if(!promptText?.trim())return;const {data,error:e}=await supabase.from("interview_template_questions").insert({template_id:selectedTemplate.id,position:templateQuestions.length+1,prompt:promptText.trim(),section:"Interview"}).select("*").single();if(e)setError(e.message);else setTemplateQuestions(v=>[...v,data])};
 const newPayoutConfig=()=>setPayoutEditor({id:null,method_key:"",name:"",description:"",method_type:"custom",enabled:true,sort_order:(payoutConfigs.length+1)*10,instructions:"",fields:[]});
 const editPayoutConfig=(item)=>setPayoutEditor({...item,fields:Array.isArray(item.fields)?item.fields:[]});
 const addPayoutField=()=>{const key=payoutField.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g,"_").replace(/^_|_$/g,"");if(!key||!payoutField.label.trim())return;setPayoutEditor(v=>({...v,fields:[...(v?.fields||[]),{key,label:payoutField.label.trim(),type:payoutField.type,required:payoutField.required}]}));setPayoutField({key:"",label:"",type:"text",required:true});};
 const removePayoutField=(key)=>setPayoutEditor(v=>({...v,fields:(v?.fields||[]).filter(f=>f.key!==key)}));
 const savePayoutConfig=async()=>{if(!payoutEditor?.name?.trim()||!payoutEditor?.method_key?.trim())return;setSaving(true);const {data:{user}}=await supabase.auth.getUser();const payload={method_key:payoutEditor.method_key.trim().toLowerCase().replace(/[^a-z0-9_]+/g,"_"),name:payoutEditor.name.trim(),description:payoutEditor.description||"",method_type:payoutEditor.method_type||"custom",enabled:!!payoutEditor.enabled,sort_order:Number(payoutEditor.sort_order)||0,fields:payoutEditor.fields||[],instructions:payoutEditor.instructions||"",updated_by:user?.id||null,updated_at:new Date().toISOString()};const q=payoutEditor.id?supabase.from("payout_method_configs").update(payload).eq("id",payoutEditor.id).select("*").single():supabase.from("payout_method_configs").insert(payload).select("*").single();const {data,error:e}=await q;setSaving(false);if(e){setError(e.message);return;}setPayoutConfigs(v=>payoutEditor.id?v.map(x=>x.id===data.id?data:x):[...v,data].sort((x,y)=>x.sort_order-y.sort_order));setPayoutEditor(null);flash("Payout method saved.")};
 const disablePayoutConfig=async(item)=>{const {data,error:e}=await supabase.from("payout_method_configs").update({enabled:false}).eq("id",item.id).select("*").single();if(e)setError(e.message);else{setPayoutConfigs(v=>v.map(x=>x.id===data.id?data:x));flash("Payout method removed from the user payout options.")}};
 const inviteAdmin=async()=>{if(role!=="super_admin")return;setSaving(true);setError("");const {data,error:e}=await supabase.functions.invoke("invite-admin",{body:invite});setSaving(false);if(e)setError(e.message);else{setInvite({email:"",full_name:""});flash(data?.existing_user?"Existing account promoted to admin.":"Admin invitation sent.");load()}};
 const tabs=[["site","Site Studio"],["forms","Forms"],["interviews","Interview Builder"],["payouts","Payouts / Withdraw"],["team","Admin Team"],["audit","Audit Log"]];
 return <div className="workspace admin-workspace">
   <div className="workspace-head"><div><span className="kicker">PLATFORM CONTROL CENTER</span><h1>Admin Studio</h1><p>Manage the public experience, reusable forms, interview series and administrative team without editing source code.</p></div><Button variant="outline" onClick={load}><ArrowRight size={15}/> Refresh</Button></div>
   <div className="studio-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}</div>
   {notice&&<div className="auth-message auth-success">{notice}</div>}{error&&<div className="auth-message auth-error">{error}</div>}
   {tab==="site"&&<section className="studio-grid">
     <div className="panel"><PanelTitle title="Brand controls"/><div className="studio-fields">
       <label className="field"><span>Site name</span><input value={settings.brand.site_name||""} onChange={e=>setSettings(v=>({...v,brand:{...v.brand,site_name:e.target.value}}))}/></label>
       <label className="field"><span>Tagline</span><input value={settings.brand.tagline||""} onChange={e=>setSettings(v=>({...v,brand:{...v.brand,tagline:e.target.value}}))}/></label>
       <label className="field"><span>Accent color</span><input value={settings.brand.accent||""} onChange={e=>setSettings(v=>({...v,brand:{...v.brand,accent:e.target.value}}))}/></label>
       <label className="field"><span>Page background</span><input value={settings.brand.background||""} onChange={e=>setSettings(v=>({...v,brand:{...v.brand,background:e.target.value}}))}/></label>
     </div><Button onClick={()=>saveSetting("brand",settings.brand)} disabled={saving}>Save brand <Check size={14}/></Button></div>
     <div className="panel"><PanelTitle title="Homepage hero"/><div className="studio-fields">
       <label className="field"><span>Badge</span><input value={settings.home_hero.badge||""} onChange={e=>setSettings(v=>({...v,home_hero:{...v.home_hero,badge:e.target.value}}))}/></label>
       <label className="field"><span>Headline</span><input value={settings.home_hero.title||""} onChange={e=>setSettings(v=>({...v,home_hero:{...v.home_hero,title:e.target.value}}))}/></label>
       <label className="field"><span>Description</span><textarea rows="4" value={settings.home_hero.description||""} onChange={e=>setSettings(v=>({...v,home_hero:{...v.home_hero,description:e.target.value}}))}/></label>
       <label className="field"><span>Search button label</span><input value={settings.home_hero.search_button||""} onChange={e=>setSettings(v=>({...v,home_hero:{...v.home_hero,search_button:e.target.value}}))}/></label>
     </div><Button onClick={()=>saveSetting("home_hero",settings.home_hero)} disabled={saving}>Save hero <Check size={14}/></Button></div>
     <div className="panel"><PanelTitle title="Homepage sections"/><p className="studio-muted">Turn approved sections on/off without touching React code. Layout and spacing remain protected.</p><div className="studio-section-list">{sections.map(s=><div key={s.id}><div><strong>{s.title}</strong><small>{s.section_key}</small></div><button className={s.is_visible?"toggle on":"toggle"} onClick={()=>toggleSection(s)}><i/></button></div>)}</div></div>
   </section>}
   {tab==="site"&&<section className="studio-grid">
     <div className="panel">
       <PanelTitle title="Verification demo mode"/>
       <p className="studio-muted">For testing only. These switches let us exercise verification before a production identity provider is connected. Turn both off before production/provider handoff.</p>
       <div className="studio-toggle-row"><div><strong>Direct Supabase verification document uploads</strong><small>{settings.verification_demo_uploads?.enabled?"Enabled for demo testing":"Disabled — documents stay local/provider path remains active"}</small></div><button className={settings.verification_demo_uploads?.enabled?"toggle on":"toggle"} onClick={()=>setSettings(v=>({...v,verification_demo_uploads:{enabled:!v.verification_demo_uploads?.enabled}}))}><i/></button></div>
       <Button onClick={()=>saveSetting("verification_demo_uploads",settings.verification_demo_uploads)} disabled={saving}>Save document setting <Check size={14}/></Button>
       <div className="studio-toggle-row" style={{marginTop:16}}><div><strong>Demo identity-data storage</strong><small>{settings.verification_demo_identity_storage?.enabled?"Enabled — test identity fields are saved with RLS protection":"Disabled — sensitive fields are not saved by RemotePath"}</small></div><button className={settings.verification_demo_identity_storage?.enabled?"toggle on":"toggle"} onClick={()=>setSettings(v=>({...v,verification_demo_identity_storage:{enabled:!v.verification_demo_identity_storage?.enabled}}))}><i/></button></div>
       <Button variant="outline" onClick={()=>saveSetting("verification_demo_identity_storage",settings.verification_demo_identity_storage)} disabled={saving}>Save identity-data setting <Check size={14}/></Button>
     </div>
   </section>}
   {tab==="forms"&&<section className="studio-two-col"><div className="panel"><div className="studio-head"><div><PanelTitle title="Forms"/><p className="studio-muted">Build reusable forms from universal elements. Every element is stored in Supabase and can be attached to jobs.</p></div><Button onClick={createForm}><Plus size={14}/> New form</Button></div>{forms.length===0?<EmptyState title="No forms yet" text="Create your first form."/>:<div className="studio-list">{forms.map(f=><button key={f.id} className={selectedForm?.id===f.id?"selected":""} onClick={()=>loadForm(f)}><strong>{f.name}</strong><span>{f.status} · {f.slug}</span></button>)}</div>}</div><div className="panel">{!selectedForm?<EmptyState title="Select a form" text="Choose a form to manage its settings and elements."/>:<><PanelTitle title={selectedForm.name}/><div className="studio-inline"><Badge tone={selectedForm.status==="published"?"green":"soft"}>{selectedForm.status}</Badge><Button variant="outline" onClick={()=>updateForm({status:selectedForm.status==="published"?"draft":"published"})}>{selectedForm.status==="published"?"Unpublish":"Publish"}</Button><Button variant="outline" onClick={addField}><Plus size={13}/> Add element</Button></div><div className="studio-fields"><label className="field"><span>Form name</span><input value={selectedForm.name} onChange={e=>setSelectedForm(v=>({...v,name:e.target.value}))} onBlur={e=>updateForm({name:e.target.value})}/></label><label className="field"><span>Description</span><textarea rows="2" value={selectedForm.description||""} onChange={e=>setSelectedForm(v=>({...v,description:e.target.value}))} onBlur={e=>updateForm({description:e.target.value})}/></label><label className="field"><span>Submit button label</span><input value={selectedForm.submit_label||"Submit"} onChange={e=>setSelectedForm(v=>({...v,submit_label:e.target.value}))} onBlur={e=>updateForm({submit_label:e.target.value})}/></label><label className="field"><span>Success message</span><input value={selectedForm.success_message||""} onChange={e=>setSelectedForm(v=>({...v,success_message:e.target.value}))} onBlur={e=>updateForm({success_message:e.target.value})}/></label></div><div className="studio-list">{formFields.map((f,index)=><div className="studio-universal-field" key={f.id}><div className="studio-field-toolbar"><strong>{f.label||"Untitled field"}</strong><Badge tone="soft">{UNIVERSAL_FORM_TYPES.find(t=>t.value===f.field_type)?.label||f.field_type}</Badge><span className="studio-field-actions"><Button variant="outline" onClick={()=>moveField(f,-1)} disabled={index===0}>↑</Button><Button variant="outline" onClick={()=>moveField(f,1)} disabled={index===formFields.length-1}>↓</Button><Button variant="outline" onClick={()=>deleteField(f)}>Remove</Button></span></div><div className="studio-fields"><label className="field"><span>Label</span><input value={f.label||""} onChange={e=>updateField(f,{label:e.target.value})}/></label><label className="field"><span>Field type</span><select value={f.field_type} onChange={e=>updateField(f,{field_type:e.target.value})}>{UNIVERSAL_FORM_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label><label className="field"><span>Field key</span><input value={f.field_key||""} onChange={e=>updateField(f,{field_key:e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g,"_")})}/></label><label className="field"><span>Placeholder</span><input value={f.placeholder||""} onChange={e=>updateField(f,{placeholder:e.target.value})}/></label><label className="field"><span>Help text</span><input value={f.help_text||""} onChange={e=>updateField(f,{help_text:e.target.value})}/></label><label className="studio-toggle"><input type="checkbox" checked={!!f.required} onChange={e=>updateField(f,{required:e.target.checked})}/><span>Required</span></label></div>{["select","radio"].includes(f.field_type)&&<label className="field"><span>Options (one per line)</span><textarea rows="4" value={(Array.isArray(f.options)?f.options:[]).join("\n")} onChange={e=>updateField(f,{options:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)})}/></label>}{f.field_type==="number"&&<div className="two-fields"><label className="field"><span>Minimum</span><input type="number" value={f.config?.min??""} onChange={e=>updateField(f,{config:{...(f.config||{}),min:e.target.value}})}/></label><label className="field"><span>Maximum</span><input type="number" value={f.config?.max??""} onChange={e=>updateField(f,{config:{...(f.config||{}),max:e.target.value}})}/></label></div>}</div>)}</div></>}</div></section>}
{tab==="interviews"&&<section className="studio-two-col"><div className="panel"><div className="studio-head"><div><PanelTitle title="Interview series"/><p className="studio-muted">Build repeatable interview experiences, control duration/status, and attach them to jobs.</p></div><Button onClick={createTemplate}><Plus size={14}/> New series</Button></div>{templates.length===0?<EmptyState title="No interview series yet" text="Create your first interview series."/>:<div className="studio-list">{templates.map(t=><button key={t.id} className={selectedTemplate?.id===t.id?"selected":""} onClick={()=>loadTemplate(t)}><strong>{t.name}</strong><span>{t.status} · {t.duration_minutes} minutes</span></button>)}</div>}</div><div className="panel">{!selectedTemplate?<EmptyState title="Select an interview series" text="Choose a series to manage its settings and questions."/>:<><PanelTitle title={selectedTemplate.name}/><div className="studio-inline"><Badge tone={selectedTemplate.status==="published"?"green":"soft"}>{selectedTemplate.status}</Badge><Badge>{templateQuestions.length} questions</Badge><Button variant="outline" onClick={()=>updateTemplate({status:selectedTemplate.status==="published"?"draft":"published"})}>{selectedTemplate.status==="published"?"Unpublish":"Publish"}</Button><Button variant="outline" onClick={addQuestion}><Plus size={13}/> Add question</Button></div><div className="two-fields"><label className="field"><span>Series name</span><input value={selectedTemplate.name} onChange={e=>setSelectedTemplate(v=>({...v,name:e.target.value}))} onBlur={e=>updateTemplate({name:e.target.value})}/></label><label className="field"><span>Duration (minutes)</span><input type="number" min="5" max="180" value={selectedTemplate.duration_minutes} onChange={e=>setSelectedTemplate(v=>({...v,duration_minutes:e.target.value}))} onBlur={e=>updateTemplate({duration_minutes:Number(e.target.value)||30})}/></label></div><label className="field"><span>Description</span><textarea rows="2" value={selectedTemplate.description||""} onChange={e=>setSelectedTemplate(v=>({...v,description:e.target.value}))} onBlur={e=>updateTemplate({description:e.target.value})}/></label><div className="studio-list">{templateQuestions.map(q=><div className="studio-question-row" key={q.id}><span>{q.position}</span><textarea rows="2" value={q.prompt} onChange={async e=>{const {data,error}=await supabase.from("interview_template_questions").update({prompt:e.target.value}).eq("id",q.id).select("*").single();if(error)setError(error.message);else setTemplateQuestions(v=>v.map(x=>x.id===q.id?data:x))}}/><Badge tone="soft">{q.section}</Badge></div>)}</div></>}</div></section>}
   {tab==="payouts"&&<><section className="studio-two-col"><div className="panel"><div className="studio-head"><div><PanelTitle title="Payout & Withdraw methods"/><p className="studio-muted">Control which payment methods users can choose and exactly which details each method asks for.</p></div><Button onClick={newPayoutConfig}><Plus size={14}/> Add payment method</Button></div>{payoutConfigs.length===0?<EmptyState title="No payout methods configured" text="Add a payout method to make it available in Withdraw / Payouts."/>:<div className="studio-list">{payoutConfigs.map(p=><div className="studio-team-row" key={p.id}><div><strong>{p.name}</strong><span>{p.method_type} · position {p.sort_order} · {p.enabled?"Available to users":"Disabled"}</span><small>{p.description||"No description yet."}</small></div><div className="studio-inline"><Badge tone={p.enabled?"green":"soft"}>{p.enabled?"LIVE":"OFF"}</Badge><Button variant="outline" onClick={()=>editPayoutConfig(p)}><PenLine size={13}/> Edit</Button>{p.enabled&&<Button variant="outline" onClick={()=>disablePayoutConfig(p)}>Remove</Button>}</div></div>)}</div>}</div><div className="panel">{!payoutEditor?<EmptyState title="Payment method editor" text="Select a method to edit it, or add a new method."/>:<><PanelTitle title={payoutEditor.id?"Edit payment method":"Add payment method"}/><div className="studio-fields"><label className="field"><span>Internal key</span><input value={payoutEditor.method_key} disabled={!!payoutEditor.id} onChange={e=>setPayoutEditor(v=>({...v,method_key:e.target.value}))}/></label><label className="field"><span>Customer-facing name</span><input value={payoutEditor.name} onChange={e=>setPayoutEditor(v=>({...v,name:e.target.value}))}/></label><label className="field"><span>Description</span><input value={payoutEditor.description} onChange={e=>setPayoutEditor(v=>({...v,description:e.target.value}))}/></label><label className="field"><span>Method type</span><select value={payoutEditor.method_type} onChange={e=>setPayoutEditor(v=>({...v,method_type:e.target.value}))}><option value="bank">Bank transfer</option><option value="paypal">PayPal</option><option value="card">Debit card</option><option value="custom">Custom provider</option></select></label><label className="field"><span>Display order</span><input type="number" value={payoutEditor.sort_order} onChange={e=>setPayoutEditor(v=>({...v,sort_order:e.target.value}))}/></label><label className="field"><span>User instructions</span><textarea value={payoutEditor.instructions} onChange={e=>setPayoutEditor(v=>({...v,instructions:e.target.value}))}/></label><label className="studio-toggle"><input type="checkbox" checked={payoutEditor.enabled} onChange={e=>setPayoutEditor(v=>({...v,enabled:e.target.checked}))}/><span>Available in Withdraw / Payouts</span></label></div><div className="studio-inline"><strong>Payment fields</strong><Badge>{payoutEditor.fields.length}</Badge></div><div className="studio-list">{payoutEditor.fields.map(f=><div className="studio-field-row" key={f.key}><div><strong>{f.label}</strong><span>{f.key} · {f.type} · {f.required?"Required":"Optional"}</span></div><Button variant="outline" onClick={()=>removePayoutField(f.key)}>Remove</Button></div>)}</div><div className="two-fields"><label className="field"><span>Field label</span><input value={payoutField.label} onChange={e=>setPayoutField(v=>({...v,label:e.target.value}))}/></label><label className="field"><span>Field type</span><select value={payoutField.type} onChange={e=>setPayoutField(v=>({...v,type:e.target.value}))}>{UNIVERSAL_FORM_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label></div><div className="studio-inline"><label className="field" style={{flex:1}}><span>Field key</span><input value={payoutField.key} onChange={e=>setPayoutField(v=>({...v,key:e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g,"_")}) )}/></label><label className="studio-toggle"><input type="checkbox" checked={payoutField.required} onChange={e=>setPayoutField(v=>({...v,required:e.target.checked}))}/><span>Required</span></label><Button variant="outline" onClick={addPayoutField}><Plus size={13}/> Add field</Button></div><div className="flow-actions"><Button variant="outline" onClick={()=>setPayoutEditor(null)}>Cancel</Button><Button onClick={savePayoutConfig} disabled={saving}>{saving?"Saving…":"Save method"} <Check size={14}/></Button></div></>}</div></section><section className="panel withdrawal-config-panel"><PanelTitle title="Withdrawal request fields"/><p className="studio-muted">The withdrawal amount is not hardcoded anymore. You control this field and any other withdrawal elements here.</p><div className="studio-list">{withdrawalFields.map((f,index)=><div className="studio-universal-field" key={f.key}><div className="studio-field-toolbar"><strong>{f.label}</strong><Badge tone="soft">{f.type}</Badge><span className="studio-field-actions"><Button variant="outline" onClick={()=>setWithdrawalFields(v=>{const x=[...v];if(index>0)[x[index-1],x[index]]=[x[index],x[index-1]];return x})} disabled={index===0}>↑</Button><Button variant="outline" onClick={()=>setWithdrawalFields(v=>{const x=[...v];if(index<x.length-1)[x[index],x[index+1]]=[x[index+1],x[index]];return x})} disabled={index===withdrawalFields.length-1}>↓</Button><Button variant="outline" onClick={()=>removeWithdrawalField(f.key)}>Remove</Button></span></div><div className="studio-fields"><label className="field"><span>Label</span><input value={f.label} onChange={e=>updateWithdrawalField(f.key,{label:e.target.value})}/></label><label className="field"><span>Type</span><select value={f.type} onChange={e=>updateWithdrawalField(f.key,{type:e.target.value})}>{UNIVERSAL_FORM_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label><label className="field"><span>Placeholder</span><input value={f.placeholder||""} onChange={e=>updateWithdrawalField(f.key,{placeholder:e.target.value})}/></label><label className="field"><span>Help text</span><input value={f.help_text||""} onChange={e=>updateWithdrawalField(f.key,{help_text:e.target.value})}/></label><label className="studio-toggle"><input type="checkbox" checked={!!f.required} onChange={e=>updateWithdrawalField(f.key,{required:e.target.checked})}/><span>Required</span></label></div></div>)}</div><div className="studio-inline"><Button variant="outline" onClick={addWithdrawalField}><Plus size={13}/> Add withdrawal element</Button><Button onClick={saveWithdrawalFields} disabled={saving}>{saving?"Saving…":"Save withdrawal fields"} <Check size={14}/></Button></div></section></>}
{tab==="audit"&&<section className="panel"><PanelTitle title="Administrative audit log"/><p className="studio-muted">Recent administrator actions across member, support and platform-management workflows.</p>{auditLogs.length===0?<EmptyState title="No audit activity yet" text="Administrative actions will appear here as the platform is used."/>:<div className="studio-list">{auditLogs.map(a=><div className="studio-team-row" key={a.id}><div><strong>{a.action.replaceAll("_"," ")}</strong><span>{a.target_type}</span><small>{new Date(a.created_at).toLocaleString()}</small></div><Badge tone="soft">ADMIN</Badge></div>)}</div>}</section>}
   {tab==="points"&&<section className="studio-two-col"><div className="panel"><div className="studio-head"><div><PanelTitle title="Points & bidding"/><p className="studio-muted">Manage point packages members can purchase for job bidding.</p></div><Button onClick={()=>setPointEditor({id:null,name:"",points:"",price:"",currency:"USD",status:"active"})}><Plus size={14}/> Add package</Button></div><div className="studio-toggle-row"><div><strong>Demo point purchases</strong><small>{pointDemo.enabled?"Enabled — demo checkout is available":"Disabled — purchases are unavailable"}</small></div><button className={pointDemo.enabled?"toggle on":"toggle"} onClick={()=>setPointDemo(v=>({...v,enabled:!v.enabled}))}><i/></button></div><Button variant="outline" onClick={savePointDemo} disabled={saving}>Save demo setting <Check size={14}/></Button><div className="studio-list">{pointPackages.map(p=><div className="studio-team-row" key={p.id}><div><strong>{p.name}</strong><span>{p.points} points · {p.currency} {Number(p.price).toFixed(2)}</span></div><div className="studio-inline"><Badge tone={p.status==="active"?"green":"soft"}>{p.status==="active"?"LIVE":"OFF"}</Badge><Button variant="outline" onClick={()=>setPointEditor({...p})}><PenLine size={13}/> Edit</Button><Button variant="outline" onClick={()=>togglePointPackage(p)}>{p.status==="active"?"Disable":"Enable"}</Button></div></div>)}</div></div><div className="panel">{!pointEditor?<div className="empty-state"><Zap size={24}/><h3>Package editor</h3><p>Create point packages and control their demo price and availability.</p></div>:<><PanelTitle title={pointEditor.id?"Edit points package":"Add points package"}/><label className="field"><span>Package name</span><input value={pointEditor.name} onChange={e=>setPointEditor(v=>({...v,name:e.target.value}))} placeholder="Starter"/></label><div className="two-fields"><label className="field"><span>Points</span><input type="number" min="1" value={pointEditor.points} onChange={e=>setPointEditor(v=>({...v,points:e.target.value}))}/></label><label className="field"><span>Demo price</span><input type="number" min="0" step="0.01" value={pointEditor.price} onChange={e=>setPointEditor(v=>({...v,price:e.target.value}))}/></label></div><div className="two-fields"><label className="field"><span>Currency</span><select value={pointEditor.currency} onChange={e=>setPointEditor(v=>({...v,currency:e.target.value}))}><option>USD</option><option>CAD</option><option>GBP</option><option>EUR</option></select></label><label className="field"><span>Status</span><select value={pointEditor.status} onChange={e=>setPointEditor(v=>({...v,status:e.target.value}))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><div className="flow-actions"><Button variant="outline" onClick={()=>setPointEditor(null)}>Cancel</Button><Button onClick={savePointPackage} disabled={saving||!pointEditor.name.trim()||!Number(pointEditor.points)}>{saving?"Saving…":"Save package"} <Check size={14}/></Button></div></>}</div></section>}
   {tab==="team"&&<section className="studio-two-col"><div className="panel"><PanelTitle title="Administrative team"/><p className="studio-muted">Super admin is the highest level. Administrators can manage the platform but cannot create or promote administrators.</p>{admins.length===0?<EmptyState title="No administrators yet" text="The first super administrator must be assigned after the owner account is created."/>:<div className="studio-list">{admins.map(a=><div className="studio-team-row" key={a.id}><Avatar letter={(a.full_name||"A")[0]}/><div><strong>{a.full_name||"Administrator"}</strong><span>{a.role==="super_admin"?"Super administrator":"Administrator"} · {a.account_status}</span></div><Badge tone={a.role==="super_admin"?"green":"soft"}>{a.role==="super_admin"?"OWNER":"ADMIN"}</Badge></div>)}</div>}</div><div className="panel">{role==="super_admin"?<><PanelTitle title="Create administrator"/><p className="studio-muted">Invite a new administrator by email. Existing members can also be promoted. The authentication secret stays server-side.</p><label className="field"><span>Full name</span><input value={invite.full_name} onChange={e=>setInvite(v=>({...v,full_name:e.target.value}))} placeholder="Administrator name"/></label><label className="field"><span>Email address</span><input type="email" value={invite.email} onChange={e=>setInvite(v=>({...v,email:e.target.value}))} placeholder="admin@example.com"/></label><Button onClick={inviteAdmin} disabled={saving||!invite.email.trim()}>{saving?"Creating…":"Create administrator"} <Users size={14}/></Button></>:<div className="empty-state"><ShieldCheck size={24}/><h3>Super admin only</h3><p>Only the super administrator can create or promote another administrator.</p></div>}</div></section>}
 </div>;
}

function Admin({go}){
  const emptyForm={title:"",companyName:"",location:"Worldwide",salaryMin:"",salaryMax:"",salaryCurrency:"USD",salaryPeriod:"year",jobType:"Full-time",remoteType:"Fully remote",experienceLevel:"",category:"",tags:"",description:"",status:"draft",applicationFormId:"",interviewTemplateId:""};
  const [rows,setRows]=useState([]);
  const [form,setForm]=useState(emptyForm);
  const [editingId,setEditingId]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [forms,setForms]=useState([]); const [templates,setTemplates]=useState([]);
  const load=async()=>{
    setLoading(true);setError("");
    const [{data,error:e},{data:formsData},{data:templatesData}]=await Promise.all([
      supabase.from("jobs").select("*").order("created_at",{ascending:false}),
      supabase.from("form_definitions").select("id,name,status").order("name"),
      supabase.from("interview_templates").select("id,name,status").order("name")
    ]);
    if(e)setError(e.message);
    setRows(data||[]);setForms(formsData||[]);setTemplates(templatesData||[]);
    setLoading(false);
  };
  useEffect(()=>{load()},[]);
  const set=(key,value)=>setForm(v=>({...v,[key]:value}));
  const openNew=()=>{setEditingId(null);setForm(emptyForm);setError("");setShowForm(true)};
  const openEdit=(job)=>{setEditingId(job.id);setForm({
    title:job.title||"",companyName:job.company_name||"",location:job.location||"Worldwide",
    salaryMin:job.salary_min||"",salaryMax:job.salary_max||"",salaryCurrency:job.salary_currency||"USD",
    salaryPeriod:job.salary_period||"year",jobType:job.job_type||"Full-time",remoteType:job.remote_type||"Fully remote",
    experienceLevel:job.experience_level||"",category:job.category||"",tags:(job.tags||[]).join(", "),
    description:job.description||"",status:job.status||"draft",applicationFormId:job.application_form_id||"",interviewTemplateId:job.interview_template_id||""
  });setError("");setShowForm(true)};
  const save=async()=>{
    if(!form.title.trim()||!form.companyName.trim()||!form.description.trim()){setError("Job title, company name and description are required.");return}
    setSaving(true);setError("");
    try{
      const payload={
        title:form.title.trim(),company_name:form.companyName.trim(),location:form.location.trim()||"Worldwide",
        salary_min:Number(form.salaryMin)||null,salary_max:Number(form.salaryMax)||null,salary_currency:form.salaryCurrency,
        salary_period:form.salaryPeriod,job_type:form.jobType,remote_type:form.remoteType,
        experience_level:form.experienceLevel.trim(),category:form.category.trim(),
        tags:form.tags.split(",").map(x=>x.trim()).filter(Boolean),description:form.description.trim(),status:form.status,application_form_id:form.applicationFormId||null,interview_template_id:form.interviewTemplateId||null,
        employer_id:null
      };
      const result=editingId
        ? await supabase.from("jobs").update(payload).eq("id",editingId)
        : await supabase.from("jobs").insert(payload);
      if(result.error)throw result.error;
      setShowForm(false);setEditingId(null);setForm(emptyForm);await load();
    }catch(err){setError(err?.message||"We couldn't save this job yet.")}
    finally{setSaving(false)}
  };
  const changeStatus=async(id,status)=>{
    const {error}=await supabase.from("jobs").update({status}).eq("id",id);
    if(error)setError(error.message);else setRows(v=>v.map(j=>j.id===id?{...j,status}:j));
  };
  return <div className="workspace admin-workspace">
    <div className="workspace-head"><div><span className="kicker">PLATFORM OPERATIONS</span><h1>Job management</h1><p>Your team controls which partner-company opportunities appear on RemotePath.</p></div><Button onClick={openNew}><Plus size={15}/> Add a job</Button></div>
    <section className="admin-control-note"><ShieldCheck size={18}/><div><strong>Admin-controlled listings</strong><span>Partner companies do not create accounts or post jobs here. Your team adds, reviews and publishes every opportunity.</span></div></section>
    {error&&<div className="auth-message auth-error" role="alert">{error}</div>}
    {showForm&&<section className="panel admin-job-form">
      <div className="panel-title"><div><span className="kicker">{editingId?"EDIT LISTING":"NEW LISTING"}</span><h2>{editingId?"Update job":"Add a partner-company job"}</h2></div><button onClick={()=>setShowForm(false)}><X size={16}/></button></div>
      <div className="two-fields"><Field label="Job title" placeholder="Senior Product Designer" value={form.title} onChange={e=>set("title",e.target.value)}/><Field label="Company name" placeholder="Partner company" value={form.companyName} onChange={e=>set("companyName",e.target.value)}/></div>
      <div className="two-fields"><Field label="Location" placeholder="Worldwide" value={form.location} onChange={e=>set("location",e.target.value)}/><Field label="Category" placeholder="Design" value={form.category} onChange={e=>set("category",e.target.value)}/></div>
      <div className="two-fields"><label className="field"><span>Job type</span><select value={form.jobType} onChange={e=>set("jobType",e.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Freelance</option><option>Temporary</option></select></label><label className="field"><span>Work arrangement</span><select value={form.remoteType} onChange={e=>set("remoteType",e.target.value)}><option>Fully remote</option><option>Hybrid</option><option>On-site</option></select></label></div>
      <div className="two-fields"><Field label="Minimum salary" placeholder="80000" value={form.salaryMin} onChange={e=>set("salaryMin",e.target.value)}/><Field label="Maximum salary" placeholder="120000" value={form.salaryMax} onChange={e=>set("salaryMax",e.target.value)}/></div>
      <div className="two-fields"><Field label="Experience" placeholder="3+ years" value={form.experienceLevel} onChange={e=>set("experienceLevel",e.target.value)}/><Field label="Skills / tags" placeholder="Figma, UX Research, Product Design" value={form.tags} onChange={e=>set("tags",e.target.value)}/></div>
      <label className="field"><span>Role description</span><textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Responsibilities, requirements, benefits and other role details..."/></label>
      <div className="two-fields"><label className="field"><span>Salary currency</span><select value={form.salaryCurrency} onChange={e=>set("salaryCurrency",e.target.value)}><option>USD</option><option>CAD</option><option>GBP</option><option>EUR</option><option>CHF</option><option>PLN</option><option>NOK</option><option>SEK</option><option>DKK</option></select></label><label className="field"><span>Application form</span><select value={form.applicationFormId} onChange={e=>set("applicationFormId",e.target.value)}><option value="">Default application</option>{forms.filter(x=>x.status==="published").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="field"><span>Interview series</span><select value={form.interviewTemplateId} onChange={e=>set("interviewTemplateId",e.target.value)}><option value="">No series</option>{templates.filter(x=>x.status==="published").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div><div className="two-fields"><label className="field"><span>Publishing status</span><select value={form.status} onChange={e=>set("status",e.target.value)}><option>draft</option><option>pending_review</option><option>published</option><option>paused</option><option>closed</option></select></label></div>
      <div className="flow-actions"><Button variant="outline" onClick={()=>setShowForm(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving?"Saving…":editingId?"Save changes":"Add job"} {!saving&&<Check size={15}/>}</Button></div>
    </section>}
    <section className="panel">
      <PanelTitle title="Partner job listings" action="Refresh" onAction={load}/>
      {loading?<div className="empty-state"><h3>Loading listings…</h3><p>Fetching jobs from Supabase.</p></div>:rows.length===0?<EmptyState title="No jobs have been added yet" text="Add the first partner-company opportunity when you’re ready." action="Add a job" onAction={openNew}/>:<div className="admin-job-list">{rows.map(job=><div className="admin-job-row" key={job.id}><div className="company-avatar">{(job.company_name||"R")[0]}</div><div className="admin-job-main"><div><strong>{job.title}</strong><span>{job.company_name} · {job.location}</span></div><small>{job.job_type} · {job.salary_min||"—"}–{job.salary_max||"—"} {job.salary_currency||"USD"}</small></div><label className="admin-status"><span>Status</span><select value={job.status} onChange={e=>changeStatus(job.id,e.target.value)}><option>draft</option><option>pending_review</option><option>published</option><option>paused</option><option>closed</option></select></label><button className="icon-btn" onClick={()=>openEdit(job)} aria-label={"Edit "+job.title}><PenLine size={16}/></button></div>)}</div>}
    </section>
  </div>
}

function AdminApplications({go}){
  const [rows,setRows]=useState([]);
  const [jobs,setJobs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [status,setStatus]=useState("All");
  const [jobId,setJobId]=useState("All");
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState(null);
  const [resumeUrl,setResumeUrl]=useState("");
  const [updating,setUpdating]=useState(false);

  const load=async()=>{
    setLoading(true);setError("");
    const [{data:apps,error:appError},{data:jobRows,error:jobError}]=await Promise.all([
      supabase.from("applications").select("id,user_id,job_id,status,cover_note,answers,submitted_at,created_at,updated_at,resume_id,jobs!inner(id,title,company_name,status),profiles!applications_user_id_fkey(id,full_name,country,experience,work_type,goal,interest_areas,onboarding_completed),resumes(id,file_name,file_size,mime_type,storage_path,created_at)").neq("status","draft").order("created_at",{ascending:false}),
      supabase.from("jobs").select("id,title,company_name").order("created_at",{ascending:false})
    ]);
    if(appError||jobError){setError((appError||jobError).message);setRows([]);setJobs([])}
    else{setRows(apps||[]);setJobs(jobRows||[])}
    setLoading(false);
  };

  useEffect(()=>{load()},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return rows.filter(r=>{
      const matchesStatus=status==="All"||r.status===status;
      const matchesJob=jobId==="All"||String(r.job_id)===String(jobId);
      const hay=[r.profiles?.full_name,r.profiles?.country,r.jobs?.title,r.jobs?.company_name].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus&&matchesJob&&(!q||hay.includes(q));
    });
  },[rows,status,jobId,query]);

  const openApplication=async(row)=>{
    setSelected(row);setResumeUrl("");setError("");
    if(row.resume_id&&row.resumes?.storage_path){
      const {data,error:e}=await supabase.storage.from("resumes").createSignedUrl(row.resumes.storage_path,300);
      if(e)setError(e.message); else setResumeUrl(data?.signedUrl||"");
    }
  };

  const updateStatus=async(nextStatus)=>{
    if(!selected)return;
    setUpdating(true);setError("");
    const {data,error:e}=await supabase.from("applications").update({status:nextStatus,updated_at:new Date().toISOString()}).eq("id",selected.id).select("id,status,updated_at").single();
    if(e){setError(e.message);setUpdating(false);return}
    setRows(prev=>prev.map(r=>r.id===selected.id?{...r,status:data.status,updated_at:data.updated_at}:r));
    setSelected(prev=>prev?{...prev,status:data.status,updated_at:data.updated_at}:prev);
    setUpdating(false);
  };

  const statusTone=s=>s==="submitted"?"green":s==="reviewing"||s==="interview"?"amber":s==="hired"?"green":"soft";

  return <div className="workspace admin-workspace">
    <div className="workspace-head"><div><span className="kicker">PLATFORM OPERATIONS</span><h1>Application management</h1><p>Review incoming applications from candidates who applied to your partner-company jobs.</p></div><Button variant="outline" onClick={load}><ArrowRight size={15}/> Refresh</Button></div>
    <section className="admin-control-note"><ShieldCheck size={18}/><div><strong>Admin-only candidate pipeline</strong><span>Candidate information is visible only to authorized RemotePath administrators. Partner companies do not access this workspace.</span></div></section>
    {error&&<div className="auth-message auth-error" role="alert">{error}</div>}
    <section className="panel">
      <div className="application-admin-filters">
        <label className="field"><span>Search candidates</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, job or company"/></label>
        <label className="field"><span>Job</span><select value={jobId} onChange={e=>setJobId(e.target.value)}><option value="All">All jobs</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title} · {j.company_name}</option>)}</select></label>
        <label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="interview">Interview</option><option value="rejected">Rejected</option><option value="hired">Hired</option><option value="withdrawn">Withdrawn</option></select></label>
      </div>
    </section>
    <div className="pipeline-tabs">
      {["All","submitted","reviewing","interview","hired"].map(x=><button key={x} className={status===x?"active":""} onClick={()=>setStatus(x)}>{x==="All"?"All":x[0].toUpperCase()+x.slice(1)} <span>{x==="All"?rows.length:rows.filter(r=>r.status===x).length}</span></button>)}
    </div>
    {loading?<div className="empty-state"><h3>Loading applications…</h3><p>Fetching the latest candidate submissions.</p></div>:filtered.length===0?<EmptyState title="No applications match these filters" text="New candidate applications will appear here when job seekers submit their applications." action="Clear filters" onAction={()=>{setQuery("");setJobId("All");setStatus("All")}}/>:<section className="panel"><div className="candidate-table">{filtered.map(r=><button type="button" className="candidate-row large admin-application-row" key={r.id} onClick={()=>openApplication(r)}><Avatar letter={(r.profiles?.full_name||"C")[0].toUpperCase()}/><div><strong>{r.profiles?.full_name||"Candidate"}</strong><span>{r.jobs?.title||"Job application"} · {r.jobs?.company_name||"Partner company"}</span></div><span>{r.profiles?.country||"Country not set"}</span><span>{r.submitted_at?new Date(r.submitted_at).toLocaleDateString():new Date(r.created_at).toLocaleDateString()}</span><Badge tone={statusTone(r.status)}>{r.status}</Badge><span className="candidate-action"><ArrowRight size={15}/></span></button>)}</div></section>}
    {selected&&<div className="payout-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="payout-modal admin-application-modal" role="dialog" aria-modal="true">
      <div className="payout-modal-head"><div><span className="kicker">APPLICATION #{selected.id}</span><h2>{selected.profiles?.full_name||"Candidate"}</h2><p>{selected.jobs?.title||"Job application"} · {selected.jobs?.company_name||"Partner company"}</p></div><button className="payout-modal-close" onClick={()=>setSelected(null)}><X size={18}/></button></div>
      <div className="review-list">
        <ReviewItem label="Country" value={selected.profiles?.country||"Not provided"}/>
        <ReviewItem label="Experience" value={selected.profiles?.experience||"Not provided"}/>
        <ReviewItem label="Work preference" value={selected.profiles?.work_type||"Not provided"}/>
        <ReviewItem label="Goal" value={selected.profiles?.goal||"Not provided"}/>
        <ReviewItem label="Resume" value={selected.resumes?.file_name||"No resume attached"}/>
      </div>
      {selected.resumes?.file_name&&resumeUrl&&<a className="btn btn-soft" href={resumeUrl} target="_blank" rel="noreferrer">Open resume <ArrowRight size={14}/></a>}
      {selected.cover_note&&<div className="notice"><FileText size={17}/><span><strong>Cover note</strong><br/>{selected.cover_note}</span></div>}
      <section className="admin-answer-list"><span className="kicker">APPLICATION QUESTIONS</span>{Array.isArray(selected.answers)&&selected.answers.length?selected.answers.map((a,i)=><div className="admin-answer" key={i}><strong>{a.question||("Question "+(i+1))}</strong><p>{a.answer||"No answer provided"}</p></div>):<p>No additional answers were submitted.</p>}</section>
      <div className="admin-application-actions"><label className="field"><span>Application status</span><select value={selected.status} disabled={updating} onChange={e=>updateStatus(e.target.value)}><option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="interview">Interview</option><option value="rejected">Rejected</option><option value="hired">Hired</option><option value="withdrawn">Withdrawn</option></select></label><Button variant="outline" onClick={()=>setSelected(null)}>Close</Button></div>
    </section></div>}
  </div>;
}

function AdminVerification({go}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [saving,setSaving]=useState("");
  const [documents,setDocuments]=useState([]);
  const [documentsLoading,setDocumentsLoading]=useState(false);
  const [selectedDocument,setSelectedDocument]=useState(null);
  const [selectedCandidate,setSelectedCandidate]=useState(null);

  const load=async()=>{
    setLoading(true);setError("");
    const {data,error:e}=await supabase.from("verification_profiles").select("id,user_id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason,profiles(full_name)").order("updated_at",{ascending:false});
    if(e)setError(e.message);
    setItems(data||[]);
    setLoading(false);
  };

  useEffect(()=>{load()},[]);

  const updateStatus=async(item,status)=>{
    setSaving(String(item.id));setError("");
    const payload={status};
    if(status==="verified")payload.verified_at=new Date().toISOString();
    if(status==="in_progress")payload.verified_at=null;
    if(status==="needs_attention")payload.needs_attention_reason="Manual review required";
    if(status==="rejected")payload.needs_attention_reason="Verification could not be completed";
    const {data,error:e}=await supabase.from("verification_profiles").update(payload).eq("id",item.id).select("id,user_id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason,profiles(full_name)").single();
    if(e)setError(e.message); else setItems(prev=>prev.map(x=>x.id===item.id?data:x));
    setSaving("");
  };

  const openDocuments=async(item)=>{
    setSelectedCandidate(item);
    setDocuments([]);
    setSelectedDocument(null);
    setDocumentsLoading(true);
    setError("");
    const {data,error:e}=await supabase.from("verification_documents").select("id,verification_id,document_type,side,storage_path,status,created_at").eq("verification_id",item.id).order("side");
    if(e){setError(e.message);setDocumentsLoading(false);return;}
    const resolved=[];
    for(const doc of data||[]){
      if(!doc.storage_path)continue;
      const {data:signed,error:signedError}=await supabase.storage.from("verification-demo").createSignedUrl(doc.storage_path,300);
      if(signedError){setError(signedError.message);continue;}
      resolved.push({...doc,signedUrl:signed?.signedUrl||""});
    }
    setDocuments(resolved);
    setDocumentsLoading(false);
  };

  const closeDocuments=()=>{setSelectedCandidate(null);setDocuments([]);setSelectedDocument(null)};
  const openIdentity=async(item)=>{
    setSelectedCandidate(item);setIdentityRecord(null);setIdentityLoading(true);setError("");
    const {data,error:e}=await supabase.from("demo_identity_records").select("id,verification_id,user_id,legal_name,date_of_birth,residential_address,country,government_identifier,created_at,updated_at").eq("verification_id",item.id).maybeSingle();
    if(e)setError(e.message);else setIdentityRecord(data||null);
    setIdentityLoading(false);
  };
  const closeIdentity=()=>{setSelectedCandidate(null);setIdentityRecord(null);setIdentityLoading(false)};

  return <div className="workspace">
    <div className="workspace-head"><div><span className="kicker">ADMIN · IDENTITY</span><h1>Verification review</h1><p>Review verification workflow status and, when demo uploads are enabled, securely preview submitted identity documents.</p></div><Badge tone="soft"><ShieldCheck size={13}/> Restricted admin view</Badge></div>
    <div className="admin-control-note"><ShieldCheck size={18}/><div><strong>Privacy-first review</strong><span>Raw documents remain in the private demo bucket. Preview links are short-lived and available only to authorized administrators.</span></div></div>
    {error&&<div className="auth-message auth-error">{error}</div>}
    <section className="panel admin-verification-panel">
      {loading?<div className="empty-state"><h3>Loading verification cases…</h3><p>Fetching the latest secure status records.</p></div>:items.length===0?<EmptyState title="No verification cases yet" text="Candidates will appear here after they start the identity verification flow."/>:
      <div className="admin-verification-list">{items.map(item=><div className="admin-verification-row" key={item.id}>
        <div className="company-avatar"><ShieldCheck size={16}/></div>
        <div className="admin-verification-main"><strong>{item.profiles?.full_name||"RemotePath member"}</strong><span>{item.country||"Country not selected"} · {item.document_type||"Document not selected"}</span><small>{item.provider?"Provider: "+item.provider:"Provider handoff pending"}</small></div>
        <Badge tone={item.status==="verified"?"green":item.status==="needs_attention"?"warning":"soft"}>{item.status.replace("_"," ")}</Badge>
        <div className="admin-verification-actions"><button className="btn btn-soft" onClick={()=>openDocuments(item)}>View documents <ArrowRight size={14}/></button><button className="btn btn-outline" onClick={()=>openIdentity(item)}>View demo identity data <ArrowRight size={14}/></button><label className="admin-status"><span>Status</span><select value={item.status} disabled={saving===String(item.id)} onChange={e=>updateStatus(item,e.target.value)}><option value="in_progress">In progress</option><option value="verified">Verified</option><option value="needs_attention">Needs attention</option><option value="rejected">Rejected</option></select></label></div>
      </div>)}</div>}
    </section>

    {selectedCandidate&&<div className="payout-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeDocuments()}}>
      <section className="payout-modal admin-verification-doc-modal" role="dialog" aria-modal="true">
        <div className="payout-modal-head"><div><span className="kicker">DEMO DOCUMENTS</span><h2>{selectedCandidate.profiles?.full_name||"RemotePath member"}</h2><p>{selectedCandidate.document_type||"Identity document"} · Private preview</p></div><button className="payout-modal-close" onClick={closeDocuments}><X size={18}/></button></div>
        {documentsLoading?<div className="empty-state"><h3>Loading secure previews…</h3><p>Generating short-lived document links.</p></div>:documents.length===0?<div className="empty-state"><FileText size={24}/><h3>No uploaded documents found</h3><p>This verification case has no demo files available for preview.</p></div>:<div className="admin-verification-doc-grid">
          {documents.map(doc=><button type="button" className="admin-verification-doc-card" key={doc.id} onClick={()=>setSelectedDocument(doc)}>
            <span className="admin-verification-doc-thumb">{doc.signedUrl&&/\.(jpe?g|png|webp)$/i.test(doc.storage_path||"")?<img src={doc.signedUrl} alt={doc.side+" of identity document"}/>:<FileText size={26}/>}</span>
            <span><strong>{doc.side==="front"?"Front":"Back"} of document</strong><small>{doc.storage_path?.split("/").pop()||"Uploaded document"}</small></span>
            <ArrowRight size={15}/>
          </button>)}
        </div>}
        <div className="verification-preview-note"><LockKeyhole size={15}/><span>Preview links expire automatically. The storage bucket remains private and documents are never made public.</span></div>
      </section>
    </div>}

    {selectedCandidate&&identityRecord&&<div className="payout-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeIdentity()}}>
      <section className="payout-modal admin-application-modal" role="dialog" aria-modal="true">
        <div className="payout-modal-head"><div><span className="kicker">DEMO IDENTITY DATA</span><h2>{selectedCandidate.profiles?.full_name||"RemotePath member"}</h2><p>Protected test record · not for production use</p></div><button className="payout-modal-close" onClick={closeIdentity}><X size={18}/></button></div>
        <div className="review-list">
          <ReviewItem label="Legal name" value={identityRecord.legal_name||"—"}/>
          <ReviewItem label="Date of birth" value={identityRecord.date_of_birth||"—"}/>
          <ReviewItem label="Country" value={identityRecord.country||"—"}/>
          <ReviewItem label="Government identifier" value={identityRecord.government_identifier||"—"}/>
        </div>
        <div className="notice"><LockKeyhole size={17}/><span><strong>Demo-only sensitive data.</strong><br/>{identityRecord.residential_address||"—"}</span></div>
        <div className="verification-preview-note"><LockKeyhole size={15}/><span>Access is restricted by Supabase Row Level Security. Remove this demo mode before production and connect a dedicated identity provider.</span></div>
      </section>
    </div>}
    {selectedCandidate&&!identityRecord&&identityLoading&&<div className="payout-modal-backdrop"><section className="payout-modal"><div className="empty-state"><h3>Loading demo identity data…</h3><p>Reading the protected test record.</p></div></section></div>}
    {selectedDocument?.signedUrl&&<div className="payout-modal-backdrop verification-preview-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedDocument(null)}}>
      <section className="verification-document-viewer" role="dialog" aria-modal="true">
        <div className="verification-document-viewer-head"><div><span className="kicker">{selectedDocument.side==="front"?"FRONT":"BACK"} OF DOCUMENT</span><strong>{selectedCandidate?.profiles?.full_name||"RemotePath member"}</strong></div><button className="payout-modal-close" onClick={()=>setSelectedDocument(null)}><X size={18}/></button></div>
        <div className="verification-document-viewer-body">{selectedDocument.mime_type?.startsWith("image/")?<img src={selectedDocument.signedUrl} alt={selectedDocument.side+" of identity document"}/>:<iframe title="Secure identity document preview" src={selectedDocument.signedUrl}/>}</div>
      </section>
    </div>}
  </div>;
}
function AdminMembers({go}){
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [saving,setSaving]=useState("");
  const [query,setQuery]=useState("");
  const load=async()=>{
    setLoading(true);setError("");
    const {data,error:e}=await supabase.from("profiles").select("id,full_name,country,experience,work_type,goal,role,account_type,account_status,onboarding_completed,created_at").order("created_at",{ascending:false});
    if(e)setError(e.message);
    setRows(data||[]);setLoading(false);
  };
  useEffect(()=>{load()},[]);
  const changeStatus=async(row,status)=>{
    if(row.account_status===status)return;
    setSaving(row.id);setError("");
    const {data:{user}}=await supabase.auth.getUser();
    const {data,error:e}=await supabase.from("profiles").update({account_status:status}).eq("id",row.id).select("id,full_name,country,experience,work_type,goal,role,account_type,account_status,onboarding_completed,created_at").single();
    if(e)setError(e.message);
    else{
      setRows(prev=>prev.map(x=>x.id===row.id?data:x));
      await supabase.from("admin_audit_logs").insert({admin_user_id:user.id,action:"account_status_changed",target_type:"profile",target_id:row.id,details:{from:row.account_status,to:status}});
    }
    setSaving("");
  };
  const q=query.trim().toLowerCase();
  const filtered=rows.filter(r=>[r.full_name,r.country,r.account_type,r.role,r.account_status].filter(Boolean).join(" ").toLowerCase().includes(q));
  return <div className="workspace admin-workspace">
    <div className="workspace-head"><div><span className="kicker">PLATFORM OPERATIONS</span><h1>Member management</h1><p>Manage candidate accounts and account access without exposing authentication secrets.</p></div><Button variant="outline" onClick={load}><ArrowRight size={15}/> Refresh</Button></div>
    <section className="admin-control-note"><ShieldCheck size={18}/><div><strong>Restricted administrative controls</strong><span>Passwords, authentication tokens and private identity data are never exposed here. Access controls apply to the RemotePath profile only.</span></div></section>
    {error&&<div className="auth-message auth-error" role="alert">{error}</div>}
    <section className="panel"><div className="application-admin-filters"><label className="field"><span>Search members</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, country or status"/></label></div></section>
    {loading?<div className="empty-state"><h3>Loading members…</h3><p>Fetching profile records from Supabase.</p></div>:filtered.length===0?<EmptyState title="No members found" text="Try a different search."/>:<section className="panel"><div className="admin-member-list">{filtered.map(row=><div className="admin-member-row" key={row.id}>
      <Avatar letter={(row.full_name||"M")[0].toUpperCase()}/>
      <div className="admin-member-main"><strong>{row.full_name||"Unnamed member"}</strong><span>{row.country||"Country not set"} · {row.account_type==="job_seeker"?"Job seeker":"Employer"} · {(row.role==="admin"||row.role==="super_admin")?"Administrator":"Member"}</span><small>{row.onboarding_completed?"Onboarding complete":"Onboarding incomplete"} · Joined {new Date(row.created_at).toLocaleDateString()}</small></div>
      <Badge tone={row.account_status==="active"?"green":row.account_status==="suspended"?"warning":"soft"}>{row.account_status}</Badge>
      {(row.role==="admin"||row.role==="super_admin")?<span className="admin-member-protected">Protected admin</span>:<label className="admin-status"><span>Access</span><select value={row.account_status} disabled={saving===row.id} onChange={e=>changeStatus(row,e.target.value)}><option value="active">Active</option><option value="restricted">Restricted</option><option value="suspended">Suspended</option></select></label>}
    </div>)}</div></section>}
  </div>;
}

function Settings({go}){return <div className="workspace"><div className="workspace-head"><div><span className="kicker">ACCOUNT</span><h1>Settings</h1><p>Manage your account, preferences and privacy.</p></div></div><div className="settings-layout"><aside className="settings-nav">{["Account","Notifications","Privacy","Security","Preferences"].map((x,i)=><button className={i===0?"active":""} key={x}>{x}</button>)}</aside><section className="panel settings-panel"><PanelTitle title="Account details"/><Field label="Email address" placeholder="alex@example.com"/><Field label="Display name" placeholder="Alex Carter"/><PanelTitle title="Job preferences"/><div className="toggle-row"><div><strong>Open to opportunities</strong><span>Let verified employers discover your profile.</span></div><button className="toggle on"><i/></button></div><div className="toggle-row"><div><strong>Weekly job digest</strong><span>Receive a curated email every Monday.</span></div><button className="toggle on"><i/></button></div><Button>Save changes <Check size={15}/></Button></section></div></div>}

function EmptyState({title,text,action,onAction}){return <div className="empty-state"><div><Search size={20}/></div><h3>{title}</h3><p>{text}</p>{action&&<Button variant="outline" onClick={onAction}>{action}</Button>}</div>}

function Verification({go}){
  const [step,setStep]=useState(1);
  const [submitted,setSubmitted]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [existing,setExisting]=useState(null);
  const [legalName,setLegalName]=useState("");
  const [dob,setDob]=useState("");
  const [address,setAddress]=useState("");
  const [identifier,setIdentifier]=useState("");
  const [identifierError,setIdentifierError]=useState("");
  const [documentType,setDocumentType]=useState("");
  const [frontFile,setFrontFile]=useState(null);
  const [backFile,setBackFile]=useState(null);
  const [demoUploadsEnabled,setDemoUploadsEnabled]=useState(false);
  const [demoIdentityStorageEnabled,setDemoIdentityStorageEnabled]=useState(false);
  const countries=registrationCountries.map(x=>x[1]);
  const [country,setCountry]=useState("United States");
  const identifierLabels={"United States":"Social Security Number (SSN)","Canada":"Social Insurance Number (SIN)","United Kingdom":"National Insurance number","Germany":"Tax Identification Number (Steuer-ID)","France":"Social Security number (NIR)","Netherlands":"Citizen Service Number (BSN)","Ireland":"PPS Number","Sweden":"Personal identity number","Denmark":"CPR number","Norway":"National identity number","Finland":"Personal identity code","Belgium":"National number","Switzerland":"AHV/OASI number","Austria":"Social insurance number","Poland":"PESEL"};
  const docs=["Passport","Driver’s licence","National identity card","Residence permit"];
  const identifierCheck=step===4?validateGovernmentIdentifier(country,identifier):{valid:true,message:""};
  const required=step===1?legalName.trim().length>2:step===2?!!dob:step===3?address.trim().length>5:step===4?identifierCheck.valid:!!documentType&&!!frontFile&&!!backFile;
  useEffect(()=>{
    let mounted=true;
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){if(mounted)setLoading(false);return;}
      const [{data,error:e},{data:demoSetting},{data:identityDemoSetting}]=await Promise.all([supabase.from("verification_profiles").select("id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason").eq("user_id",user.id).maybeSingle(),supabase.from("site_settings").select("value").eq("key","verification_demo_uploads").maybeSingle(),supabase.from("site_settings").select("value").eq("key","verification_demo_identity_storage").maybeSingle()]);
      if(!mounted)return;
      if(e)setError(e.message);
      setDemoUploadsEnabled(demoSetting?.value?.enabled===true);
      setDemoIdentityStorageEnabled(identityDemoSetting?.value?.enabled===true);
      if(data){
        setExisting(data);
        setCountry(data.country||"United States");
        setDocumentType(data.document_type||"");
        if(data.status==="in_progress")setStep(5);
      }
      setLoading(false);
    })();
    return()=>{mounted=false};
  },[]);
  const startVerification=async()=>{
    if(saving)return;
    const finalIdentifierCheck=validateGovernmentIdentifier(country,identifier);
    if(!finalIdentifierCheck.valid){setIdentifierError(finalIdentifierCheck.message);setStep(4);return;}
    setSaving(true);setError("");
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const payload={user_id:user.id,status:"in_progress",country,document_type:documentType,started_at:existing?.started_at||new Date().toISOString()};
      let verification=existing;
      if(existing){
        const {data,error:e}=await supabase.from("verification_profiles").update({country,document_type,started_at:payload.started_at}).eq("id",existing.id).select("id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason").single();
        if(e)throw e;
        verification=data;
      }else{
        const {data,error:e}=await supabase.from("verification_profiles").insert(payload).select("id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason").single();
        if(e)throw e;
        verification=data;
      }
      if(demoUploadsEnabled){
        const files=[["front",frontFile],["back",backFile]].filter(([,file])=>file);
        for(const [side,file] of files){
          if(file.size>10*1024*1024)throw new Error("Each identity document must be 10 MB or smaller.");
          const allowed=["image/jpeg","image/png","image/webp","application/pdf"];
          if(!allowed.includes(file.type))throw new Error("Please use a JPG, PNG, WebP or PDF identity document.");
          const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
          const path=user.id+"/"+verification.id+"/"+side+"-"+Date.now()+"-"+safeName;
          const {error:uploadError}=await supabase.storage.from("verification-demo").upload(path,file,{contentType:file.type,upsert:false});
          if(uploadError)throw uploadError;
          const {error:docError}=await supabase.from("verification_documents").insert({verification_id:verification.id,document_type,side,storage_path:path,status:"submitted"});
          if(docError)throw docError;
        }
      }
      if(demoIdentityStorageEnabled){
        const {error:identityError}=await supabase.from("demo_identity_records").upsert({
          verification_id:verification.id,
          user_id:user.id,
          legal_name:legalName.trim(),
          date_of_birth:dob,
          residential_address:address.trim(),
          country,
          government_identifier:identifier.trim(),
          updated_at:new Date().toISOString()
        },{onConflict:"verification_id"});
        if(identityError)throw identityError;
      }
      setExisting(verification);
      setSubmitted(true);
    }catch(err){setError(err?.message||"We couldn't start verification.");}
    finally{setSaving(false);}
  };
  const back=()=>{if(step>1)setStep(v=>v-1);};
  if(loading)return <div className="verification-page"><div className="verification-complete"><ShieldCheck size={28}/><span className="kicker">IDENTITY VERIFICATION</span><h1>Loading your verification status…</h1></div></div>;
  if(existing?.status==="verified")return <div className="verification-page"><div className="verification-complete"><div className="verification-complete-icon"><Check size={28}/></div><span className="kicker">VERIFIED</span><h1>Your identity is verified.</h1><p>Your verification status is securely recorded. In production, raw identity data will be handled by the verification provider; demo storage is clearly marked and can be switched off before launch.</p><Button onClick={()=>go("dashboard")}>Back to dashboard <ArrowRight size={15}/></Button></div></div>;
  if(submitted)return <div className="verification-page"><div className="verification-complete"><div className="verification-complete-icon"><Check size={28}/></div><span className="kicker">{demoUploadsEnabled?"DEMO UPLOAD COMPLETE":"VERIFICATION STARTED"}</span><h1>{demoUploadsEnabled?"Your demo verification upload is complete.":"Your verification has been securely started."}</h1><p>{demoUploadsEnabled?(<>The selected identity documents were uploaded to the private Supabase Storage bucket for this demo. {demoIdentityStorageEnabled?" Your test identity fields were also saved to the protected demo identity record.":" Your sensitive identity fields remained session-only."}</>):"RemotePath saved only the verification workflow status, country and document type. The selected documents remain local until a production verification provider is connected."}</p><div className="verification-complete-note"><ShieldCheck size={17}/><span>{demoUploadsEnabled?"Demo mode is active. Files are private and access-controlled; turn this setting off before production.":"The next production step is the secure identity-provider handoff. Verification decisions and document handling will be managed by that provider."}</span></div><Button onClick={()=>go("dashboard")}>Back to dashboard <ArrowRight size={15}/></Button></div></div>;
  return <div className="verification-page">
    <header className="verification-topbar"><Logo/><button className="back-link" onClick={()=>go("dashboard")}><ArrowLeft size={15}/> Back to dashboard</button></header>
    <main className="verification-wrap">
      <div className="verification-intro"><Badge tone="green"><ShieldCheck size={13}/> Identity verification</Badge><h1>Build a verified profile.</h1><p>Complete the guided identity flow. In demo mode, sensitive identity fields can be saved to a protected test record so we can verify the full workflow before connecting the production provider.</p><div className="verification-security-note"><LockKeyhole size={16}/><span><strong>Security-first design.</strong> RemotePath stores verification status and minimal workflow metadata only.</span></div></div>
      {error&&<div className="auth-message auth-error">{error}</div>}
      <div className="verification-progress"><span style={{width:`${(step/5)*100}%`}}/></div>
      <div className="verification-step-card">
        <div className="verification-step-meta"><span>STEP {step} <em>OF 5</em></span><Badge tone="soft">In progress</Badge></div>
        {step===1&&<><span className="kicker">LEGAL IDENTITY</span><h2>What is your full government name?</h2><p>Enter the name exactly as it appears on the document you will use. In demo identity-data mode, this test value is stored in the protected demo record; otherwise it remains session-only.</p><label className="field"><span>Full legal name</span><input value={legalName} onChange={e=>setLegalName(e.target.value)} placeholder="e.g. Alex Carter" autoComplete="name"/></label></>}
        {step===2&&<><span className="kicker">DATE OF BIRTH</span><h2>When were you born?</h2><p>Your date of birth is used only to prepare the secure verification handoff. Demo identity-data mode stores the test value in the protected demo record; otherwise it remains session-only.</p><label className="field"><span>Date of birth</span><input type="date" value={dob} onChange={e=>setDob(e.target.value)} autoComplete="bday"/></label></>}
        {step===3&&<><span className="kicker">RESIDENTIAL ADDRESS</span><h2>Where do you currently live?</h2><p>Enter your current residential address. Demo identity-data mode stores the test value in the protected demo record; otherwise it remains session-only.</p><label className="field"><span>Home address</span><textarea className="verification-textarea" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street address, city, region/state and postal code" rows="4" autoComplete="street-address"/></label></>}
        {step===4&&<><span className="kicker">GOVERNMENT IDENTIFIER</span><h2>Which country issued your identity details?</h2><p>Choose your country and enter the identifier. In demo identity-data mode it is saved only to the protected test record; in production/provider mode it will be handed to the verification provider instead.</p><label className="field"><span>Country</span><select value={country} onChange={e=>{setCountry(e.target.value);setIdentifier("");setIdentifierError("");}}>{countries.map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>{identifierLabels[country]||"Government identifier"}</span><input value={identifier} onChange={e=>{const value=e.target.value;setIdentifier(value);setIdentifierError(validateGovernmentIdentifier(country,value).valid?"" : validateGovernmentIdentifier(country,value).message)}} placeholder="Enter the identifier" inputMode="text" spellCheck={false} aria-invalid={!!identifierError}/>{identifierError&&<small className="verification-validation-error">{identifierError}</small>}{!identifierError&&identifier.trim()&&<small className="verification-validation-success"><Check size={12}/>{identifierCheck.message}</small>}</label><div className="verification-sensitive-note"><LockKeyhole size={15}/><span>{demoIdentityStorageEnabled?"Demo identity-data storage is enabled: this test identifier will be saved in the protected demo record with row-level access controls.":"Production mode: this identifier is not saved by RemotePath and will be handled by the future verification provider."}</span></div></>}
        {step===5&&<><span className="kicker">IDENTITY DOCUMENT</span><h2>Select your government-issued ID.</h2><p>Select the document you plan to use. {demoUploadsEnabled?"For this demo, the selected files will upload to a private Supabase Storage bucket.":"The files will remain local until a production verification provider is connected."}</p><label className="field"><span>Document type</span><select value={documentType} onChange={e=>setDocumentType(e.target.value)}><option value="">Choose a document</option>{docs.map(x=><option key={x}>{x}</option>)}</select></label><div className="document-upload-grid"><label className={frontFile?"document-upload selected":"document-upload"}><input type="file" accept="image/*,.pdf" onChange={e=>setFrontFile(e.target.files?.[0]||null)}/><span className="document-upload-icon"><Plus size={18}/></span><strong>Front of document</strong><small>{frontFile?.name||"Select front file"}</small></label><label className={backFile?"document-upload selected":"document-upload"}><input type="file" accept="image/*,.pdf" onChange={e=>setBackFile(e.target.files?.[0]||null)}/><span className="document-upload-icon"><Plus size={18}/></span><strong>Back of document</strong><small>{backFile?.name||"Select back file"}</small></label></div><div className="verification-sensitive-note"><ShieldCheck size={15}/><span>{demoUploadsEnabled?"Demo mode is enabled: files upload to private Supabase Storage and are not public.":"The selected files remain local to this browser session. A future provider integration will upload them directly through a protected flow."}</span></div></>}
        <div className="verification-actions"><Button variant="outline" onClick={back} disabled={step===1}>Back</Button>{step<5?<Button onClick={()=>setStep(v=>v+1)} disabled={!required}>Continue <ArrowRight size={15}/></Button>:<Button onClick={startVerification} disabled={!required||saving}>{saving?"Starting…":"Start secure verification"} <ArrowRight size={15}/></Button>}</div>
      </div>
    </main>
  </div>
}
function SupportWidget(){
  const [open,setOpen]=useState(false);
  const [view,setView]=useState("empty");
  const [issueType,setIssueType]=useState("");
  const [subject,setSubject]=useState("");
  const [message,setMessage]=useState("");
  const [draft,setDraft]=useState("");
  const [messages,setMessages]=useState([]);
  const [ticket,setTicket]=useState(null);
  const [loading,setLoading]=useState(false);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");

  const issueTypes=["Account & login","Job or application","Partner company / job","Technical issue","Report a concern","Other"];

  const loadTicket=async(ticketId)=>{
    const {data,error:e}=await supabase.from("support_messages").select("id,sender_type,body,created_at").eq("ticket_id",ticketId).order("created_at",{ascending:true});
    if(e){setError(e.message);return;}
    setMessages((data||[]).map(m=>({id:m.id,from:m.sender_type==="user"?"user":"support",text:m.body,time:new Date(m.created_at).toLocaleString()})));
  };

  const loadLatestTicket=async()=>{
    setLoading(true);setError("");
    const {data,error:e}=await supabase.from("support_tickets").select("id,issue_type,subject,status,created_at,updated_at").order("updated_at",{ascending:false}).limit(1).maybeSingle();
    if(e){setError(e.message);setLoading(false);return;}
    if(data){setTicket(data);await loadTicket(data.id);setView("chat");}
    setLoading(false);
  };

  const openChat=async()=>{
    setOpen(true);setView("empty");setError("");
    await loadLatestTicket();
  };

  const startChat=async()=>{
    setError("");
    if(ticket){setView("chat");await loadTicket(ticket.id);return;}
    setView("chat");
    setMessages([{from:"support",text:"Hi there — how can we help today?",time:"Just now"}]);
  };

  const sendMessage=async()=>{
    const text=draft.trim();
    if(!text||sending)return;
    setSending(true);setError("");
    try{
      let activeTicket=ticket;
      if(!activeTicket){
        const {data:{user}}=await supabase.auth.getUser();
        if(!user)throw new Error("Your session has expired. Please sign in again.");
        const {data:newTicket,error:ticketError}=await supabase.from("support_tickets").insert({user_id:user.id,issue_type:"Other",subject:"Support conversation"}).select("id,issue_type,subject,status,created_at,updated_at").single();
        if(ticketError)throw ticketError;
        activeTicket=newTicket;setTicket(newTicket);
      }
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const {data:newMessage,error:messageError}=await supabase.from("support_messages").insert({ticket_id:activeTicket.id,user_id:user.id,sender_type:"user",body:text}).select("id,sender_type,body,created_at").single();
      if(messageError)throw messageError;
      setMessages(v=>[...v,{id:newMessage.id,from:"user",text:newMessage.body,time:new Date(newMessage.created_at).toLocaleString()}]);
      setDraft("");
    }catch(err){setError(err?.message||"We couldn't send your message.");}
    finally{setSending(false);}
  };

  const submitTicket=async()=>{
    if(!issueType||!subject.trim()||!message.trim()||sending)return;
    setSending(true);setError("");
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const {data:newTicket,error:ticketError}=await supabase.from("support_tickets").insert({user_id:user.id,issue_type:issueType,subject:subject.trim()}).select("id,issue_type,subject,status,created_at,updated_at").single();
      if(ticketError)throw ticketError;
      const {error:messageError}=await supabase.from("support_messages").insert({ticket_id:newTicket.id,user_id:user.id,sender_type:"user",body:message.trim()});
      if(messageError)throw messageError;
      setTicket(newTicket);setMessages([{from:"user",text:message.trim(),time:"Just now"}]);setView("success");
    }catch(err){setError(err?.message||"We couldn't create your ticket.");}
    finally{setSending(false);}
  };

  const reset=()=>{setView("empty");setIssueType("");setSubject("");setMessage("");setDraft("");setMessages([]);setTicket(null);setError("");};

  return <>
    <button className={open?"support-launcher is-open":"support-launcher"} onClick={()=>open?setOpen(false):openChat()} aria-label={open?"Close support":"Open support"}>
      {open?<X size={20}/>:<MessageCircle size={20}/>}<span>Support</span><i aria-hidden="true"/>
    </button>
    {open&&<section className="support-panel" aria-label="RemotePath Support">
      <header className="support-header">
        <div className="support-brand"><span className="support-avatar"><MessageCircle size={16}/></span><div><strong>RemotePath Support</strong><small>Here when you need us</small></div></div>
        <button className="support-close" onClick={()=>setOpen(false)} aria-label="Close support"><X size={17}/></button>
      </header>

      {view==="empty"&&<div className="support-body support-empty">
        <div className="support-welcome"><span className="support-welcome-icon"><CircleHelp size={22}/></span><span className="kicker">HOW CAN WE HELP?</span><h3>What can we help you with?</h3><p>Start a conversation or open a ticket and we’ll guide you from there.</p></div>
        {error&&<div className="auth-message auth-error">{error}</div>}
        <div className="support-actions">
          <button onClick={startChat} disabled={loading}><span><MessageCircle size={17}/></span><div><strong>{loading?"Loading…":"I need help"}</strong><small>Chat with support</small></div><ArrowRight size={15}/></button>
          <button onClick={()=>{setError("");setView("ticket")}}><span><FileText size={17}/></span><div><strong>Open a support ticket</strong><small>For issues that need follow-up</small></div><ArrowRight size={15}/></button>
          <button onClick={()=>{setIssueType("Report a concern");setError("");setView("ticket")}}><span><ShieldCheck size={17}/></span><div><strong>Report a concern</strong><small>Tell us about a problem</small></div><ArrowRight size={15}/></button>
        </div>
        <button className="support-faq" onClick={startChat}>Browse common questions <ArrowRight size={14}/></button>
      </div>}

      {view==="chat"&&<div className="support-body support-chat">
        <div className="support-chat-meta"><button onClick={()=>setView("empty")}><ArrowLeft size={14}/> Support home</button><span><i/> Available</span></div>
        {error&&<div className="auth-message auth-error">{error}</div>}
        <div className="support-messages">
          {messages.map((m,i)=><div className={m.from==="user"?"support-message user":"support-message"} key={m.id||i}><div>{m.text}</div><small>{m.time}</small></div>)}
          {messages.length===0&&<div className="support-message"><div>Hi there — how can we help today?</div><small>Just now</small></div>}
          {messages.length<=1&&<div className="support-suggestion"><span>Try asking about:</span><div><button onClick={()=>setDraft("I need help with my application.")}>My application</button><button onClick={()=>setDraft("I’m having trouble signing in.")}>Signing in</button><button onClick={()=>setDraft("I want to report a job.")}>Reporting a job</button></div></div>}
        </div>
        <div className="support-composer"><button aria-label="Add attachment" title="Attachments are coming later"><Plus size={17}/></button><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMessage()}} placeholder="Write a message..." aria-label="Write a message"/><button className="support-send" onClick={sendMessage} disabled={sending} aria-label="Send message"><Send size={16}/></button></div>
      </div>}

      {view==="ticket"&&<div className="support-body support-ticket">
        <div className="support-page-head"><button onClick={()=>setView("empty")}><ArrowLeft size={14}/> Back</button><span className="kicker">SUPPORT TICKET</span><h3>Tell us what happened.</h3><p>Give us enough detail to understand the issue. You can add attachments when support functionality is connected.</p></div>
        {error&&<div className="auth-message auth-error">{error}</div>}
        <label className="support-field"><span>Issue type <b>*</b></span><select value={issueType} onChange={e=>setIssueType(e.target.value)}><option value="">Choose an issue</option>{issueTypes.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="support-field"><span>Subject <b>*</b></span><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Give your issue a short title"/></label>
        <label className="support-field"><span>What happened? <b>*</b></span><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe the issue and what you were trying to do..."/></label>
        <button className="support-attachment" title="Attachments are coming later"><Plus size={15}/> Add attachment <small>Coming later</small></button>
        <Button className="support-submit" onClick={submitTicket} disabled={sending||!issueType||!subject.trim()||!message.trim()}>{sending?"Submitting…":"Submit ticket"} {!sending&&<ArrowRight size={15}/>}</Button>
      </div>}

      {view==="success"&&<div className="support-body support-success">
        <div className="support-success-icon"><Check size={24}/></div><span className="kicker">TICKET RECEIVED</span><h3>Your support request is in.</h3><p>We’ve captured the details. Your support ticket is now stored securely and can be followed up by the RemotePath team.</p><div className="support-ticket-preview"><span>Ticket</span><strong>#{ticket?.id}</strong><small>Status: {ticket?.status||"Open"}</small></div><div className="support-success-actions"><Button onClick={startChat}>Back to chat</Button><Button variant="outline" onClick={reset}>Start a new request</Button></div>
      </div>}

      {view==="closed"&&<div className="support-body support-success">
        <div className="support-success-icon"><Check size={24}/></div><span className="kicker">CONVERSATION CLOSED</span><h3>This conversation is closed.</h3><p>If you still need help, start a new conversation and we’ll take it from there.</p><Button onClick={reset}>Start a new conversation <ArrowRight size={15}/></Button>
      </div>}

      {view==="chat"&&<button className="support-close-conversation" onClick={()=>setView("closed")}>Close conversation</button>}
    </section>}
  </>;
}
function Notifications({go}){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const load=async()=>{setLoading(true);setError("");const {data:{user}}=await supabase.auth.getUser();if(!user){setItems([]);setLoading(false);return;}const {data,error}=await supabase.from("notifications").select("id,type,title,body,related_type,related_id,read_at,created_at").order("created_at",{ascending:false}).limit(100);if(error)setError(error.message);else setItems(data||[]);setLoading(false)};
  useEffect(()=>{load()},[]);
  const markRead=async id=>{const now=new Date().toISOString();setItems(p=>p.map(n=>n.id===id?{...n,read_at:n.read_at||now}:n));const {error}=await supabase.from("notifications").update({read_at:now}).eq("id",id);if(error)load()};
  const markAllRead=async()=>{const unread=items.some(n=>!n.read_at);if(!unread)return;setBusy(true);const {data:{user}}=await supabase.auth.getUser();if(user){const now=new Date().toISOString();const {error}=await supabase.from("notifications").update({read_at:now}).eq("user_id",user.id).is("read_at",null);if(error)setError(error.message);else setItems(p=>p.map(n=>({...n,read_at:n.read_at||now})));}setBusy(false)};
  const unread=items.filter(n=>!n.read_at).length;
  const iconFor=t=>t==="application"?<FileText size={17}/>:t==="interview"?<MessageCircle size={17}/>:t==="payout"?<WalletCards size={17}/>:t==="verification"?<ShieldCheck size={17}/>:t==="support"?<CircleHelp size={17}/>:<Bell size={17}/>;
  const openRelated=n=>{markRead(n.id);if(n.related_type==="application")go("applications");else if(n.related_type==="interview")go("interview");else if(n.related_type==="payout")go("payouts");else if(n.related_type==="verification")go("verification");else if(n.related_type==="support_ticket")go("dashboard")};
  return <div className="workspace notifications-page"><div className="workspace-head"><div><span className="kicker">YOUR NOTIFICATIONS</span><h1>Stay in the loop.</h1><p>Important updates about your applications, interviews, payouts and account.</p></div><Button variant="outline" onClick={markAllRead} disabled={busy||unread===0}>{busy?"Updating…":"Mark all as read"}</Button></div><section className="panel notifications-panel"><div className="notifications-toolbar"><strong>{unread?unread+" unread":"All caught up"}</strong><span>{items.length} total notifications</span></div>{loading&&<div className="empty-state"><h3>Loading notifications…</h3><p>Fetching your latest account updates.</p></div>}{!loading&&error&&<div className="empty-state"><h3>We couldn’t load notifications</h3><p>{error}</p><Button variant="outline" onClick={load}>Try again</Button></div>}{!loading&&!error&&items.length===0&&<div className="empty-state"><Bell size={24}/><h3>No notifications yet</h3><p>When something important happens on RemotePath, you’ll see it here.</p><Button onClick={()=>go("jobs")}>Explore jobs <ArrowRight size={15}/></Button></div>}{!loading&&!error&&items.length>0&&<div className="notification-list">{items.map(n=><button key={n.id} className={`notification-row ${n.read_at?"read":"unread"}`} onClick={()=>openRelated(n)}><span className="notification-icon">{iconFor(n.type)}</span><span className="notification-copy"><strong>{n.title}</strong><span>{n.body}</span><small>{relativePosted(n.created_at)}</small></span>{!n.read_at&&<i aria-label="Unread"/>}<ChevronRight size={16}/></button>)}</div>}</section></div>;
}

function AccessRestricted({status,go}){return <div className="verification-page"><div className="verification-complete"><div className="verification-complete-icon"><ShieldCheck size={28}/></div><span className="kicker">ACCOUNT ACCESS</span><h1>{status==="suspended"?"Your account is suspended.":"Your account is temporarily restricted."}</h1><p>{status==="suspended"?"Your RemotePath account is currently suspended. Please contact Support if you believe this was a mistake.":"Some account features are temporarily restricted. Please contact Support for assistance."}</p><Button onClick={()=>go("dashboard")}>Contact support <ArrowRight size={15}/></Button></div></div>}
function App(){
  const routeFromLocation=()=>{const hash=window.location.hash.replace("#/","");if(hash)return hash;const path=window.location.pathname.replace(/^\/+|\/+$/g,"");return path===PRIVATE_ADMIN_ROUTE?"admin":"home"};
  const initial=routeFromLocation;
  const [screen,setScreen]=useState(initial); const [param,setParam]=useState(""); const [toast,setToast]=useState("");
  const [session,setSession]=useState(null); const [role,setRole]=useState("user"); const [accountStatus,setAccountStatus]=useState("active");
  const [authReady,setAuthReady]=useState(false);
  const go=(next,value="")=>{setParam(String(value||""));window.location.hash=`/${next}`;setScreen(next);window.scrollTo(0,0)};
  useEffect(()=>{
    let mounted=true;
    const loadSession=async()=>{
      const {data}=await supabase.auth.getSession();
      if(!mounted)return;
      setSession(data.session);
      if(data.session){
        const {data:profile}=await supabase.from("profiles").select("role,account_status").eq("id",data.session.user.id).maybeSingle();
        if(mounted)setRole(profile?.role||"user"); setAccountStatus(profile?.account_status||"active");
      }else {setRole("user");setAccountStatus("active");}
      setAuthReady(true);
    };
    loadSession();
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,nextSession)=>{
      setSession(nextSession);
      if(nextSession){
        supabase.from("profiles").select("role").eq("id",nextSession.user.id).maybeSingle().then(({data:profile})=>{
          if(mounted)setRole(profile?.role||"user");
        });
      }else setRole("user");
      setAuthReady(true);
    });
    return()=>{mounted=false;subscription.unsubscribe()};
  },[]);
  useEffect(()=>{
    const h=()=>{setScreen(routeFromLocation())};
    window.addEventListener("hashchange",h);return()=>window.removeEventListener("hashchange",h)
  },[]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),2800);return()=>clearTimeout(t)}},[toast]);
  const protectedScreens=["dashboard","jobs","saved","applications","interview","profile","payouts","verification","settings","employer","postjob","candidates","admin","admin-applications","admin-verification","admin-members","admin-support","admin-studio","notifications","onboarding"];
  useEffect(()=>{
    if(!authReady)return;
    if(!session&&protectedScreens.includes(screen)&&screen!=="admin"){go("login")}
    if(session&&(screen==="login"||screen==="signup"||screen==="verify"))go("dashboard");
    if(session&&accountStatus!=="active"&&role!=="admin"&&role!=="super_admin"&&screen!=="restricted"&&screen!=="support")go("restricted");
    if(session&&["employer","postjob","candidates"].includes(screen)){go("dashboard")}
    const adminScreens=["admin","admin-applications","admin-verification","admin-members","admin-support","admin-studio"];
    const memberScreens=["dashboard","jobs","saved","applications","application","interview","profile","payouts","verification","settings","notifications","onboarding"];
    if(session&&adminScreens.includes(screen)&&role!=="admin"&&role!=="super_admin"){go("dashboard")}
    if(session&&["admin","super_admin"].includes(role)&&memberScreens.includes(screen)){go("admin")}
  },[authReady,session,screen]);
  if(!authReady)return <div style={{minHeight:"100vh",background:"#f8f6f0"}}/>;
  // Keep the private admin route expression build-safe.
  let page;
  if(screen==="home") page=<Home go={go}/>; else if(screen==="restricted") page=<AccessRestricted status={accountStatus} go={go}/>; else if(screen==="jobs") page=<Jobs go={go} initialQuery={param}/>; else if(screen==="job") page=<JobDetail go={go} id={param}/>; else if(screen==="login") page=<Auth go={go} mode="login"/>; else if(screen==="signup") page=<Auth go={go} mode="signup"/>; else if(screen==="verify") page=<VerifyEmail go={go}/>; else if(screen==="onboarding") page=<Onboarding go={go}/>; else if(screen==="verification") page=<Verification go={go}/>; else if(screen==="payouts") page=<AppShell go={go} screen={screen}><Payouts go={go}/></AppShell>; else if(screen==="application") page=<ApplicationFlow go={go} id={param}/>; else if(screen==="interview") page=<Interview go={go}/>; else if(screen==="employer") page=<AppShell go={go} screen={screen}><Employer go={go}/></AppShell>; else if(screen==="postjob") page=<PostJob go={go}/>; else if(screen==="candidates") page=<AppShell go={go} screen={screen}><Candidates go={go}/></AppShell>; else if(screen==="admin") page=session&&["admin","super_admin"].includes(role)?<AppShell go={go} screen={screen}><Admin go={go}/></AppShell>:<AdminAuth go={go}/>; else if(screen==="admin-applications") page=<AppShell go={go} screen={screen}><AdminApplications go={go}/></AppShell>; else if(screen==="admin-verification") page=<AppShell go={go} screen={screen}><AdminVerification go={go}/></AppShell>; else if(screen==="admin-members") page=<AppShell go={go} screen={screen}><AdminMembers go={go}/></AppShell>; else if(screen==="admin-support") page=<AppShell go={go} screen={screen}><AdminSupport go={go}/></AppShell>; else if(screen==="admin-studio") page=<AppShell go={go} screen={screen}><AdminStudio go={go} role={role}/></AppShell>; else if(screen==="notifications") page=<AppShell go={go} screen={screen}><Notifications go={go}/></AppShell>; else if(screen==="profile") page=<AppShell go={go} screen={screen}><Profile go={go}/></AppShell>; else if(screen==="saved") page=<AppShell go={go} screen={screen}><Saved go={go}/></AppShell>; else if(screen==="applications") page=<AppShell go={go} screen={screen}><Applications go={go}/></AppShell>; else if(screen==="settings") page=<AppShell go={go} screen={screen}><Settings go={go}/></AppShell>; else page=<AppShell go={go} screen="dashboard"><Dashboard go={go}/></AppShell>;
  return <>{page}{!(session&&["admin","super_admin"].includes(role))&&<SupportWidget/>}{toast&&<Toast message={toast} onClose={()=>setToast("")}/>}</>;
}
export default App;