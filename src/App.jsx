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

const jobs = [
  {id:1,company:"NovaTech",logo:"N",title:"Senior Product Designer",location:"Worldwide",salary:"$80k–$120k / year",type:"Full-time",posted:"2h ago",tags:["Product Design","Figma","UX Research"],verified:true},
  {id:2,company:"Summit Digital",logo:"S",title:"Frontend Developer",location:"Worldwide",salary:"$70k–$95k / year",type:"Full-time",posted:"4h ago",tags:["React","TypeScript","Tailwind"],verified:true},
  {id:3,company:"BrightPath",logo:"B",title:"Marketing Specialist",location:"Europe · Remote",salary:"$50k–$70k / year",type:"Part-time",posted:"6h ago",tags:["SEO","Content","Social Media"],verified:true},
  {id:4,company:"CloudWave",logo:"C",title:"Customer Success Manager",location:"Worldwide",salary:"$60k–$85k / year",type:"Full-time",posted:"8h ago",tags:["Communication","CRM","Customer Support"],verified:true},
  {id:5,company:"VectorCare",logo:"V",title:"Data Entry Specialist",location:"Worldwide",salary:"$40k–$55k / year",type:"Full-time",posted:"10h ago",tags:["Excel","Data Entry","Attention to Detail"],verified:true},
  {id:6,company:"OrbitAI",logo:"O",title:"AI Content Strategist",location:"North America",salary:"$65k–$90k / year",type:"Full-time",posted:"1d ago",tags:["AI","Strategy","Writing"],verified:true}
];

const registrationCountries = [
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇩🇪","Germany"],["🇫🇷","France"],
  ["🇳🇱","Netherlands"],["🇮🇪","Ireland"],["🇸🇪","Sweden"],["🇩🇰","Denmark"],["🇳🇴","Norway"],
  ["🇫🇮","Finland"],["🇧🇪","Belgium"],["🇨🇭","Switzerland"],["🇦🇹","Austria"],["🇵🇱","Poland"]
];

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
  return <article className={`job-card ${compact?"compact":""}`} onClick={()=>onOpen?.(job.id)}>
    <div className="job-card-top"><div className="company-avatar">{job.logo}</div><button className={`icon-btn ${saved?"is-saved":""}`} onClick={e=>{e.stopPropagation();setSaved(!saved)}} aria-label="Save job"><Bookmark size={17} fill={saved?"currentColor":"none"}/></button></div>
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
  const [query,setQuery]=useState("");
  const [where,setWhere]=useState("Anywhere");
  return <div>
    <PublicNav go={go}/>
    <main>
      <section className="hero">
        <div className="hero-copy">
          <Badge tone="green"><span className="dot"/> Trusted by 2,500+ companies worldwide</Badge>
          <h1>Work that fits <em>your life.</em></h1>
          <p>Discover verified remote opportunities from trusted companies around the world. Build your career on your terms.</p>
          <form className="hero-search" onSubmit={e=>{e.preventDefault();go("jobs",query)}}>
            <div><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Job title, skill or company"/></div>
            <div><MapPin size={18}/><select value={where} onChange={e=>setWhere(e.target.value)}><option>Anywhere</option><option>North America</option><option>Europe</option><option>Africa</option><option>Asia-Pacific</option></select><ChevronDown size={15}/></div>
            <Button type="submit">Search Jobs <ArrowRight size={16}/></Button>
          </form>
          <div className="popular"><span>Popular:</span>{["Remote","Design","Development","Marketing","Customer Support","Data Entry"].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div>
        </div>
        <div className="hero-media">
          <div className="hero-photo"><div className="hero-photo-copy"><span className="kicker">REMOTE WORK, REIMAGINED</span><strong>Find work that moves with you.</strong><small>Verified opportunities, built for the way you want to work.</small></div></div>
          <div className="floating-card rating"><div className="avatar-stack"><Avatar letter="S" size="xs"/><Avatar letter="M" size="xs"/><Avatar letter="J" size="xs"/></div><div><strong>50,000+</strong><small>professionals finding work</small></div></div>
          <div className="floating-card quote"><Sparkles size={16}/><span><strong>Better opportunities.</strong><small>Built around your life.</small></span></div>
        </div>
      </section>
      <section className="metric-strip"><Metric icon={Users} value="50,000+" label="Active job seekers"/><Metric icon={BriefcaseBusiness} value="3,200+" label="Trusted companies"/><Metric icon={Globe2} value="120+" label="Countries"/><Metric icon={ShieldCheck} value="98%" label="Satisfaction rate"/></section>
      <section className="content-section">
        <SectionTitle kicker="FEATURED JOBS" title="Top remote opportunities" text="Explore popular remote jobs, handpicked for you." action="View all jobs" onAction={()=>go("jobs")}/>
        <div className="job-grid">{jobs.slice(0,4).map(j=><JobCard key={j.id} job={j} onOpen={id=>go("job",id)}/>)}</div>
      </section>
      <section className="category-row"><div><span className="kicker">BROWSE BY CATEGORY</span><h2>Find your next direction.</h2></div><div className="category-list">{["Design","Development","Marketing","Customer Support","Sales","Data Entry","Administration","Healthcare"].map((x,i)=><button key={x} onClick={()=>go("jobs",x)}><span>{["◈","</>","↗","◉","↗","▤","▥","+"][i]}</span>{x}<small>{1248-i*137} jobs</small></button>)}</div></section>
      <section className="how-section"><div className="mountain-art" aria-label="Professional remote worker"></div><div className="how-copy"><span className="kicker">HOW IT WORKS</span><h2>Get hired in <em>4 simple steps.</em></h2><p>Finding your next opportunity is easier than you think.</p><div className="how-steps">{[["01","Create your profile"],["02","Find the right jobs"],["03","Apply with ease"],["04","Get hired"]].map(([n,t])=><div key={n}><b>{n}</b><strong>{t}</strong><small>Simple, secure and built for you.</small></div>)}</div></div></section>
      <section className="trust-banner"><div><ShieldCheck size={25}/><div><strong>Trusted. Verified. Secure.</strong><span>We verify companies and job listings so you can focus on your next move.</span></div></div><Button variant="outline" onClick={()=>go("jobs")}>Explore opportunities <ArrowRight size={15}/></Button></section>
    </main>
    <Footer go={go}/>
  </div>
}

function Metric({icon:Icon,value,label}){return <div><Icon/><div><strong>{value}</strong><span>{label}</span></div></div>}
function SectionTitle({kicker,title,text,action,onAction}){return <div className="section-title"><div><span className="kicker">{kicker}</span><h2>{title}</h2><p>{text}</p></div>{action&&<button onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>}
function Footer({go}){return <footer className="footer"><div className="footer-grid"><div><Logo light/><p>Work. Anywhere.</p></div><div><h4>For Job Seekers</h4><button onClick={()=>go("jobs")}>Find Jobs</button><button>Career Resources</button><button>Help Center</button></div><div><h4>For Employers</h4><button onClick={()=>go("employer")}>Post a Job</button><button>Talent Solutions</button><button>Pricing</button></div><div><h4>Company</h4><button>About Us</button><button>Blog</button><button>Contact</button></div><div><h4>Stay in the loop</h4><p>Get the latest jobs and career tips.</p><div className="newsletter"><input placeholder="Your email address"/><button><ArrowRight size={15}/></button></div></div></div><div className="footer-bottom"><span>© 2026 RemotePath. All rights reserved.</span><div><span>Privacy Policy</span><span>Terms of Service</span><span>Cookies</span></div></div></footer>}

function Jobs({go,initialQuery=""}){
  const [query,setQuery]=useState(initialQuery); const [remote,setRemote]=useState("All"); const [sort,setSort]=useState("Most relevant"); const [mobileFilters,setMobileFilters]=useState(false);
  const filtered=useMemo(()=>jobs.filter(j=>(!query||(`${j.title} ${j.company} ${j.tags.join(" ")}`).toLowerCase().includes(query.toLowerCase()))&&(remote==="All"||j.location.includes(remote))),[query,remote]);
  return <div><PublicNav go={go}/><main className="jobs-page">
    <div className="jobs-heading"><div><span className="kicker">REMOTE JOB SEARCH</span><h1>Find work that <em>works for you.</em></h1><p>Verified roles from companies hiring across the world.</p></div><Badge tone="soft">{filtered.length} roles found</Badge></div>
    <div className="search-bar-wide"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search jobs, skills or companies"/><MapPin size={17}/><select value={remote} onChange={e=>setRemote(e.target.value)}><option>All</option><option>North America</option><option>Europe</option></select><Button>Search</Button></div>
    <button className="filter-mobile" onClick={()=>setMobileFilters(!mobileFilters)}><SlidersHorizontal size={16}/> Filters</button>
    <div className="results-layout">
      <aside className={mobileFilters?"filter-panel mobile-open":"filter-panel"}><div className="filter-head"><strong>Filters</strong><button>Clear all</button></div><FilterGroup title="Remote type" options={["Fully remote","Hybrid","On-site"]}/><FilterGroup title="Job type" options={["Full-time","Part-time","Contract","Freelance"]}/><FilterGroup title="Experience" options={["Entry level","Mid level","Senior level"]}/><FilterGroup title="Salary range" options={["$40k+","$60k+","$80k+","$100k+"]}/><FilterGroup title="Categories" options={["Design","Development","Marketing","Customer Support","Sales"]}/></aside>
      <section className="results"><div className="results-toolbar"><span>Showing <strong>{filtered.length}</strong> opportunities</span><label>Sort by <select value={sort} onChange={e=>setSort(e.target.value)}><option>Most relevant</option><option>Newest</option><option>Highest salary</option></select></label></div>{filtered.map(j=><JobRow key={j.id} job={j} go={go}/>)}{filtered.length===0&&<EmptyState title="No roles match that search" text="Try a broader keyword or clear a filter." action="Browse all jobs" onAction={()=>{setQuery("");setRemote("All")}}/>}</section>
    </div>
  </main></div>
}
function FilterGroup({title,options}){return <div className="filter-group"><strong>{title}</strong>{options.map((x,i)=><label key={x}><input type="checkbox" defaultChecked={i===0&&title==="Remote type"}/><span>{x}</span></label>)}</div>}
function JobRow({job,go}){const [saved,setSaved]=useState(false);return <article className="job-row" onClick={()=>go("job",job.id)}><div className={`company-avatar ${job.logo==="B"?"green":""}`}>{job.logo}</div><div className="job-row-main"><div className="company-line">{job.company}{job.verified&&<ShieldCheck size={13}/>}</div><h3>{job.title}</h3><div className="job-row-meta"><span>{job.type}</span><span>{job.location}</span><span>{job.salary}</span></div><div className="tag-row">{job.tags.map(t=><Badge key={t}>{t}</Badge>)}</div></div><div className="job-row-actions"><button className={`icon-btn ${saved?"is-saved":""}`} onClick={e=>{e.stopPropagation();setSaved(!saved)}}><Bookmark size={17} fill={saved?"currentColor":"none"}/></button><Button variant="soft" onClick={e=>{e.stopPropagation();go("application",job.id)}}>Apply</Button></div></article>}

function JobDetail({go,id=1}){
  const job=jobs.find(j=>j.id===Number(id))||jobs[0]; return <div><PublicNav go={go}/><main className="detail-page"><button className="back-link" onClick={()=>go("jobs")}><ArrowLeft size={15}/> Back to jobs</button><div className="detail-grid"><article className="detail-main"><div className="detail-company"><div className="company-avatar large">{job.logo}</div><div><div className="company-line">{job.company}<ShieldCheck size={14}/></div><span>Verified employer · Hiring globally</span></div></div><h1>{job.title}</h1><div className="detail-meta"><Badge tone="green">{job.type}</Badge><span><MapPin size={14}/>{job.location}</span><span><Clock3 size={14}/>Posted {job.posted}</span></div><div className="detail-actions"><Button onClick={()=>go("application",job.id)}>Apply now <ArrowRight size={16}/></Button><Button variant="outline"><Bookmark size={16}/> Save job</Button></div><DetailSection title="About the role"><p>We are looking for a thoughtful professional to join a distributed team and create meaningful work experiences. You will collaborate across time zones, own projects end-to-end and help shape a product used by people around the world.</p></DetailSection><DetailSection title="What you'll do"><ul><li>Design and iterate on user experiences with a cross-functional team.</li><li>Collaborate with product, engineering and research partners.</li><li>Communicate clearly and document decisions for a remote-first team.</li><li>Contribute to a culture of high-quality, thoughtful work.</li></ul></DetailSection><DetailSection title="What we're looking for"><ul><li>3+ years of relevant professional experience.</li><li>Strong portfolio showing process, outcomes and craft.</li><li>Excellent communication and collaboration skills.</li><li>Comfort working independently in a distributed environment.</li></ul></DetailSection><DetailSection title="Benefits"><div className="benefit-grid"><Badge tone="soft">Health coverage</Badge><Badge tone="soft">Flexible schedule</Badge><Badge tone="soft">Learning budget</Badge><Badge tone="soft">Remote-first</Badge></div></DetailSection></article><aside className="detail-side"><div className="apply-card"><span className="kicker">READY TO APPLY?</span><h3>Take the next step.</h3><p>Your profile and application can be completed in a few minutes.</p><Button onClick={()=>go("application",job.id)}>Apply for this role <ArrowRight size={15}/></Button><button className="save-side"><Bookmark size={15}/> Save for later</button></div><div className="company-card"><div className="company-avatar">{job.logo}</div><h3>{job.company}</h3><p>Building thoughtful products for a more connected world.</p><button>View company <ArrowRight size={14}/></button></div></aside></div></main></div>
}
function DetailSection({title,children}){return <section className="detail-section"><h2>{title}</h2>{children}</section>}

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
  const [fullName,setFullName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [agreed,setAgreed]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");

  const submit=async()=>{
    setError(""); setInfo("");
    if(!email.trim()||!password){setError("Please enter your email address and password.");return}
    if(!login&&fullName.trim().length<2){setError("Please enter your full name.");return}
    if(!login&&!agreed){setError("Please agree to the Terms of Service and Privacy Policy.");return}
    setLoading(true);
    try{
      if(login){
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(error)throw error;
        go("dashboard");
      }else{
        const {data,error}=await supabase.auth.signUp({
          email:email.trim(),
          password,
          options:{data:{full_name:fullName.trim(),account_type:"job_seeker"}}
        });
        if(error)throw error;
        if(data.session) go("dashboard");
        else setInfo("Your account was created. Email confirmation is currently enabled in Supabase, so you’ll need to confirm your email before signing in.");
      }
    }catch(err){
      setError(err?.message||"Something went wrong. Please try again.");
    }finally{setLoading(false)}
  };

  return <div className="auth-page"><div className="auth-art"><Logo light/><div><span className="kicker">REMOTE WORK, REIMAGINED</span><h1>Build a career that moves with you.</h1><p>One trusted place to discover opportunities, manage applications and grow your remote career.</p></div><small>© 2026 RemotePath</small></div><div className="auth-form-wrap"><button className="back-link" onClick={()=>go("home")}><ArrowLeft size={15}/> Back to home</button><div className="auth-card"><Logo/><h2>{login?"Welcome back":"Create your account"}</h2><p>{login?"Sign in to continue your remote journey.":"Start discovering better remote opportunities."}</p><div className="social-row"><Button variant="outline" disabled><GoogleLogo/> Continue with Gmail</Button></div><div className="or"><span>or</span></div>{!login&&<Field label="Full name" placeholder="Enter your full name" value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name"/>}<Field label="Email address" placeholder="you@example.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/><Field label="Password" placeholder={login?"Enter your password":"Create a password"} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={login?"current-password":"new-password"}/>{login&&<div className="forgot"><button type="button" onClick={()=>setInfo("Password recovery will be connected when the production email/domain setup is added.")}>Forgot password?</button></div>}{error&&<div className="auth-message auth-error" role="alert">{error}</div>}{info&&<div className="auth-message auth-info" role="status">{info}</div>}<Button className="full" onClick={submit} disabled={loading}>{loading?"Please wait…":login?"Sign in":"Create account"} {!loading&&<ArrowRight size={15}/>}</Button><label className="checkline"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I agree to the Terms of Service and Privacy Policy.</span></label><p className="auth-switch">{login?"Don't have an account?":"Already have an account?"} <button onClick={()=>go(login?"signup":"login")}>{login?"Create one":"Log in"}</button></p></div></div></div>
}

function Field({label,placeholder,type="text",value,onChange,autoComplete}){return <label className="field"><span>{label}</span><input type={type} placeholder={placeholder} value={value} onChange={onChange} autoComplete={autoComplete}/></label>}

function AppShell({go,screen,children}){
  const [mobile,setMobile]=useState(false);
  const [profile,setProfile]=useState(null);
  useEffect(()=>{
    let mounted=true;
    supabase.auth.getUser().then(async({data})=>{
      if(!data.user||!mounted)return;
      const {data:row}=await supabase.from("profiles").select("full_name,account_type").eq("id",data.user.id).maybeSingle();
      if(mounted)setProfile(row);
    });
    return()=>{mounted=false};
  },[]);
  const displayName=profile?.full_name||"RemotePath member";
  const letter=(displayName.trim()[0]||"R").toUpperCase();
  return <div className="app-shell"><aside className={mobile?"app-sidebar open":"app-sidebar"}><div className="side-top"><Logo/><button onClick={()=>setMobile(false)} className="mobile-close"><X/></button></div><div className="profile-mini"><Avatar letter={letter}/><div><strong>{displayName}</strong><small>{profile?.account_type==="employer"?"Employer":"Job seeker"}</small></div><ChevronDown size={14}/></div><nav>{navItems.map(([key,label,Icon])=><button className={screen===key?"active":""} key={key} onClick={()=>{go(key);setMobile(false)}}><Icon size={17}/>{label}</button>)}</nav><div className="side-bottom"><button onClick={()=>go("settings")}><SettingsIcon size={17}/>Settings</button><button onClick={async()=>{await supabase.auth.signOut();go("home")}}><ArrowLeft size={17}/>Sign out</button></div></aside><div className="app-main"><header className="app-topbar"><button className="mobile-menu" onClick={()=>setMobile(true)}><Menu/></button><div className="crumb">{screen==="dashboard"?"Dashboard":screen==="applications"?"Applications":screen==="interview"?"Interviews":"Workspace"}</div><div className="top-actions"><button><Bell size={18}/><i/></button><Avatar letter={letter} size="sm"/></div></header>{children}</div></div>
}

function Dashboard({go}){
 const [profile,setProfile]=useState(null);
 useEffect(()=>{
   let mounted=true;
   supabase.auth.getUser().then(async({data})=>{
     if(!data.user||!mounted)return;
     const {data:row}=await supabase.from("profiles").select("full_name,onboarding_completed").eq("id",data.user.id).maybeSingle();
     if(mounted)setProfile(row);
   });
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
   <div className="summary-grid"><Summary icon={FileText} value="12" label="Applications" change="+2 this week"/><Summary icon={MessageCircle} value="3" label="Interviews" change="+1 this week"/><Summary icon={Star} value="1" label="Offers" change="1 new"/><Summary icon={Bookmark} value="8" label="Saved jobs" change="3 closing soon"/></div>
   <div className="workspace-grid"><section className="panel"><PanelTitle title="Continue where you left off" action="View all" onAction={()=>go("applications")}/><div className="application-highlight"><div className="company-avatar">N</div><div><strong>Senior Product Designer</strong><span>NovaTech · Applied May 28, 2026</span><Badge tone="amber">Interview scheduled</Badge></div><Button variant="soft" onClick={()=>go("interview")}>View details</Button></div></section><section className="panel"><PanelTitle title="Recommended for you" action="View more" onAction={()=>go("jobs")}/><div className="mini-job-grid">{jobs.slice(1,4).map(j=><JobCard key={j.id} job={j} compact onOpen={id=>go("job",id)}/>)}</div></section></div>
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
  const [saved,setSaved]=useState(false);
  const [modalOpen,setModalOpen]=useState(false);
  const banks=payoutBanks[country]||[];
  const bankReady=!!bank&&name.trim().length>2&&account.trim().length>4;
  const paypalReady=paypalEmail.trim().includes("@")&&paypalName.trim().length>2;
  const cardReady=cardName.trim().length>2&&/^\d{4}$/.test(cardLast4.trim());
  const canSave=method==="bank"?bankReady:method==="paypal"?paypalReady:cardReady;
  const selectCountry=(value)=>{setCountry(value);setBank("");};
  const saveMethod=()=>{if(!canSave||!confirmed)return;setSaved(true);setModalOpen(false);};

  if(saved) return <div className="workspace"><div className="workspace-head"><div><span className="kicker">PAYOUT SETTINGS</span><h1>Payment method saved.</h1><p>Your payout details are ready for the payout functionality to be connected later.</p></div><Button variant="outline" onClick={()=>setSaved(false)}><PenLine size={15}/> Review details</Button></div><section className="payout-success"><div className="payout-success-icon"><Check size={24}/></div><div><span className="kicker">PRIMARY PAYOUT METHOD</span><h2>{method==="bank"?"Bank transfer":method==="paypal"?"PayPal":"Debit card"}</h2><p>{method==="bank"?bank+" · "+country+" · Account ending "+(account.slice(-4)||"••••"):method==="paypal"?paypalName+" · "+paypalEmail:cardName+" · Card ending "+cardLast4}</p><Badge tone="green">Ready for payouts</Badge></div></section><section className="payout-history panel"><PanelTitle title="Payout history" action="View all" onAction={()=>{}}/><div className="payout-empty"><WalletCards size={20}/><strong>No payouts yet</strong><span>Your payout history will appear here once you receive your first payout.</span></div></section></div>;

  return <div className="workspace">
    <div className="workspace-head"><div><span className="kicker">GET PAID</span><h1>Payouts</h1><p>Choose where you want your earnings sent and keep your payment details up to date.</p></div><Badge tone="soft"><ShieldCheck size={13}/> Secure payout details</Badge></div>
    <section className="payout-warning"><div className="payout-warning-icon"><CircleHelp size={19}/></div><div><strong>Take your time before you save.</strong><p>Make sure your name, bank or PayPal details are exactly correct. Incorrect payout information can cause a payment to fail or be sent to the wrong destination. Once saved, changes may be restricted and you may need to contact <button onClick={()=>go("home")}>Customer Care</button> to request an update.</p></div></section>
    <section className="payout-method-panel">
      <div className="payout-section-head"><div><span className="kicker">PAYOUT METHOD</span><h2>Where should we send your earnings?</h2><p>Select one method. You can change the method later according to the platform's payout rules.</p></div></div>
      <div className="payout-method-grid">
        <button className="payout-method-card" onClick={()=>{setMethod("bank");setModalOpen(true)}}><span className="payout-method-icon"><Landmark size={19}/></span><div><strong>Bank transfer</strong><small>Send earnings directly to your bank account.</small></div><i><ArrowRight size={13}/></i></button>
        <button className="payout-method-card" onClick={()=>{setMethod("paypal");setModalOpen(true)}}><span className="payout-method-icon paypal-mark">P</span><div><strong>PayPal</strong><small>Receive earnings through your PayPal account.</small></div><i><ArrowRight size={13}/></i></button>
        <button className="payout-method-card" onClick={()=>{setMethod("card");setModalOpen(true)}}><span className="payout-method-icon"><CreditCard size={19}/></span><div><strong>Debit card</strong><small>Receive earnings to an eligible debit card.</small></div><i><ArrowRight size={13}/></i></button>
      </div>
      {modalOpen&&<div className="payout-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><div className="payout-modal" role="dialog" aria-modal="true">
        <div className="payout-modal-head"><div><span className="kicker">PAYOUT METHOD</span><h2>{method==="bank"?"Bank transfer":method==="paypal"?"PayPal":"Debit card"}</h2><p>Enter the details required for this payout method.</p></div><button className="payout-modal-close" onClick={()=>setModalOpen(false)} aria-label="Close"><X size={18}/></button></div>
        {method==="bank"&&<div className="payout-form"><div className="payout-form-heading"><span className="kicker">BANK DETAILS</span><h3>Where should we send the bank transfer?</h3><p>Bank options are filtered by the country you select.</p></div><div className="payout-form-grid">
          <label className="field"><span>Bank country</span><select value={country} onChange={e=>selectCountry(e.target.value)}>{registrationCountries.map(([flag,c])=><option key={c} value={c}>{flag} {c}</option>)}</select></label>
          <label className="field"><span>Bank name</span><select value={bank} onChange={e=>setBank(e.target.value)}><option value="">Select your bank</option>{banks.map(b=><option key={b}>{b}</option>)}</select></label>
          <label className="field"><span>Account holder name</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Name on the bank account" autoComplete="name"/></label>
          <label className="field"><span>Account number / IBAN</span><input value={account} onChange={e=>setAccount(e.target.value)} placeholder="Enter your account details" autoComplete="off"/></label>
        </div><div className="payout-country-note"><Globe2 size={15}/><span>Some countries require additional details such as routing, sort code, transit/institution numbers, IBAN or BIC/SWIFT.</span></div></div>}
        {method==="paypal"&&<div className="payout-form"><div className="payout-form-heading"><span className="kicker">PAYPAL DETAILS</span><h3>Which PayPal account should receive your earnings?</h3><p>Make sure the email belongs to the correct PayPal account.</p></div><div className="payout-form-grid">
          <label className="field"><span>PayPal account name</span><input value={paypalName} onChange={e=>setPaypalName(e.target.value)} placeholder="Name on your PayPal account" autoComplete="name"/></label>
          <label className="field"><span>PayPal email</span><input type="email" value={paypalEmail} onChange={e=>setPaypalEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
        </div><div className="payout-country-note"><Mail size={15}/><span>PayPal receiving features can vary by country.</span></div></div>}
        {method==="card"&&<div className="payout-form"><div className="payout-form-heading"><span className="kicker">DEBIT CARD DETAILS</span><h3>Connect an eligible debit card securely.</h3><p>Your card details will be handled by the payout provider during the real integration.</p></div><div className="payout-form-grid">
          <label className="field"><span>Cardholder name</span><input value={cardName} onChange={e=>setCardName(e.target.value)} placeholder="Name on your debit card" autoComplete="cc-name"/></label>
          <label className="field"><span>Card ending</span><input value={cardLast4} onChange={e=>setCardLast4(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="Last 4 digits" inputMode="numeric" autoComplete="off"/></label>
        </div><div className="payout-country-note"><CreditCard size={15}/><span>Full card details and verification will be collected through a secure payment-provider interface later. RemotePath will not store CVV/security codes.</span></div></div>}
        <div className="payout-modal-warning"><CircleHelp size={16}/><span>Double-check your details. Changes may require Customer Care assistance after saving.</span></div>
        <div className="payout-confirm-row"><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I have checked these details carefully.</span></label><Button onClick={saveMethod} disabled={!canSave||!confirmed}>Save payout method <ArrowRight size={15}/></Button></div>
      </div></div>}
    </section>
    <section className="payout-history panel"><PanelTitle title="Payout history" action="View all" onAction={()=>{}}/><div className="payout-empty"><WalletCards size={20}/><strong>No payouts yet</strong><span>Your payout history will appear here once you receive your first payout.</span></div></section>
  </div>
}

function Saved({go}){return <div className="workspace"><div className="workspace-head"><div><span className="kicker">YOUR SHORTLIST</span><h1>Saved jobs</h1><p>Keep promising opportunities close at hand.</p></div><Button onClick={()=>go("jobs")}>Find more jobs <ArrowRight size={15}/></Button></div><div className="tabs"><button className="active">All saved <Badge>8</Badge></button><button>Closing soon <Badge tone="amber">3</Badge></button></div><div className="job-grid workspace-jobs">{jobs.map(j=><JobCard key={j.id} job={j} onOpen={id=>go("job",id)}/>)}</div></div>}

function Applications({go}){const apps=[["Senior Product Designer","NovaTech","Interview scheduled","amber"],["Frontend Developer","Summit Digital","Shortlisted","green"],["Marketing Specialist","BrightPath","Under review","soft"],["Customer Success Manager","CloudWave","Application sent","soft"]];return <div className="workspace"><div className="workspace-head"><div><span className="kicker">YOUR JOB SEARCH</span><h1>Applications</h1><p>Track every opportunity from application to offer.</p></div><Button onClick={()=>go("jobs")}>Find jobs <ArrowRight size={15}/></Button></div><div className="application-tabs"><button className="active">All <span>12</span></button><button>In progress <span>8</span></button><button>Interviews <span>3</span></button><button>Closed <span>4</span></button></div><div className="application-table"><div className="table-head"><span>Role</span><span>Status</span><span>Last updated</span><span/></div>{apps.map((a,i)=><div className="table-row" key={a[0]}><div className="role-cell"><div className="company-avatar">{jobs[i].logo}</div><div><strong>{a[0]}</strong><small>{a[1]} · Remote</small></div></div><Badge tone={a[3]}>{a[2]}</Badge><span>{i===0?"Today":i===1?"Yesterday":"3 days ago"}</span><button onClick={()=>i===0?go("interview"):go("job",jobs[i].id)}><MoreHorizontal size={17}/></button></div>)}</div></div>}

function ApplicationFlow({go,id=1}){const job=jobs.find(j=>j.id===Number(id))||jobs[0];const [step,setStep]=useState(1);const steps=["Profile","Resume","Questions","Review"];return <div className="flow-page"><header className="flow-header"><Logo/><button onClick={()=>go("job",job.id)}>Save and exit</button></header><div className="flow-wrap"><div className="flow-intro"><span className="kicker">APPLICATION</span><h1>Apply for {job.title}</h1><p>{job.company} · {job.location}</p></div><div className="progress">{steps.map((s,i)=><div key={s} className={step>=i+1?"done":""}><span>{step>i+1?<Check size={13}/>:i+1}</span><strong>{s}</strong></div>)}</div><div className="flow-card">{step===1&&<><h2>Your profile</h2><p>Tell the employer a little about you. This information will be included with your application.</p><Field label="Full name" placeholder="Alex Carter"/><Field label="Email address" placeholder="alex@example.com"/><Field label="Phone number" placeholder="+234 801 234 5678"/><Field label="Location" placeholder="Lagos, Nigeria"/></>}{step===2&&<><h2>Your resume</h2><p>Choose the resume you want to use for this application.</p><div className="resume-card"><FileText size={23}/><div><strong>Alex_Carter_Resume.pdf</strong><span>Updated 4 days ago · 1.8 MB</span></div><Badge tone="green"><Check size={12}/> Selected</Badge></div><Button variant="outline"><Plus size={15}/> Upload another resume</Button></>}{step===3&&<><h2>A few questions</h2><p>These questions are specific to {job.company}.</p><Field label="Why are you interested in this role?" placeholder="Tell us what makes this opportunity a good fit..."/><Field label="What is your availability to start?" placeholder="e.g. 2 weeks"/><label className="field"><span>Are you comfortable working remotely?</span><select><option>Yes</option><option>No</option></select></label></>}{step===4&&<><h2>Review your application</h2><p>Everything looks good? You can submit now or go back to edit.</p><div className="review-list"><ReviewItem label="Profile" value="Alex Carter · Lagos, Nigeria"/><ReviewItem label="Resume" value="Alex_Carter_Resume.pdf"/><ReviewItem label="Questions" value="2 answers completed"/></div><div className="notice"><ShieldCheck size={18}/><span>Your application is shared only with {job.company} for this role.</span></div></>}<div className="flow-actions"><Button variant="outline" onClick={()=>step>1&&setStep(step-1)} disabled={step===1}>Back</Button><Button onClick={()=>step<4?setStep(step+1):go("applications")}>{step<4?"Continue":"Submit application"} <ArrowRight size={15}/></Button></div></div></div></div>}
function ReviewItem({label,value}){return <div className="review-item"><span>{label}</span><strong>{value}</strong><Check size={15}/></div>}

function Interview({go}){return <div className="interview-page"><header className="flow-header"><Logo/><div><Badge tone="green"><span className="dot"/> Interview in progress</Badge></div><Avatar letter="A" size="sm"/></header><div className="interview-layout"><aside className="interview-side"><div><span className="kicker">NOVATECH</span><h2>Senior Product Designer</h2><p>Interview workspace</p></div><nav>{["Introduction","Portfolio","Product thinking","Collaboration","Final questions"].map((x,i)=><button className={i===1?"active":i<1?"done":""} key={x}><span>{i<1?<Check size={13}/>:i+1}</span>{x}{i<1&&<Check size={13}/>}</button>)}</nav><div className="interview-help"><CircleHelp size={17}/><span><strong>Need help?</strong>Review interview tips</span></div></aside><main className="interview-main"><div className="question-meta"><span>Question 2 of 5</span><div><span>Estimated 12 min left</span><div className="progress-line"><i style={{width:"40%"}}/></div></div></div><div className="question-card"><span className="kicker">PORTFOLIO</span><h1>Tell us about a project you’re particularly proud of.</h1><p>We’d love to understand your process, the problem you were solving and what changed because of your work.</p><textarea placeholder="Type your answer here..." maxLength={1500}/><div className="answer-footer"><span>0 / 1,500</span><Button variant="soft">Save draft</Button><Button onClick={()=>go("dashboard")}>Next question <ArrowRight size={15}/></Button></div></div></main></div></div>}

function Profile({go}){return <div className="workspace"><div className="workspace-head"><div><span className="kicker">YOUR PROFILE</span><h1>Profile & preferences</h1><p>Keep your professional story ready for every application.</p></div><Button onClick={()=>go("jobs")}>Preview jobs <ArrowRight size={15}/></Button></div><div className="profile-layout"><aside className="profile-card panel"><div className="profile-avatar"><Avatar letter="A" size="xl"/><button><PenLine size={14}/></button></div><h2>Alex Carter</h2><p>Product Designer</p><Badge tone="green">Profile 86% complete</Badge><div className="profile-links"><span><MapPin size={14}/>Lagos, Nigeria</span><span><Globe2 size={14}/>Open to worldwide</span></div></aside><section className="profile-editor panel"><PanelTitle title="About you"/><Field label="Professional headline" placeholder="Senior Product Designer"/><Field label="About" placeholder="A short introduction about your experience and the work you want to do."/><div className="two-fields"><Field label="Years of experience" placeholder="5"/><Field label="Availability" placeholder="Open to opportunities"/></div><PanelTitle title="Skills"/><div className="skill-editor">{["Product Design","Figma","UX Research","Design Systems","Prototyping"].map(x=><Badge key={x} tone="soft">{x} <X size={11}/></Badge>)}<button><Plus size={13}/> Add skill</button></div><Button>Save changes <Check size={15}/></Button></section></div></div>}

function Employer({go}){return <div className="workspace employer-workspace"><div className="workspace-head"><div><span className="kicker">EMPLOYER WORKSPACE</span><h1>Welcome back, Sarah <span>✦</span></h1><p>Here’s what’s happening with your hiring pipeline.</p></div><Button onClick={()=>go("postjob")}>Post a job <Plus size={15}/></Button></div><div className="summary-grid"><Summary icon={BriefcaseBusiness} value="8" label="Active jobs" change="+2 this month"/><Summary icon={Users} value="126" label="Applications" change="+18 this week"/><Summary icon={MessageCircle} value="14" label="Interviews" change="+4 scheduled"/><Summary icon={Star} value="6" label="Hires" change="+2 this month"/></div><div className="employer-grid"><section className="panel"><PanelTitle title="Recent applications" action="View all" onAction={()=>go("candidates")}/>{[["Alex Carter","Senior Product Designer","Interview"],["Jamie Wilson","Frontend Developer","Shortlisted"],["Taylor Kim","Marketing Specialist","Under review"]].map((a,i)=><div className="candidate-row" key={a[0]}><Avatar letter={a[0][0]}/><div><strong>{a[0]}</strong><span>{a[1]}</span></div><Badge tone={i===0?"green":i===1?"soft":"amber"}>{a[2]}</Badge></div>)}</section><section className="panel hiring-card"><span className="kicker">HIRING HEALTH</span><h2>Your pipeline is moving.</h2><p>Keep candidates informed and your next hire closer.</p><div className="pipeline"><span style={{width:"76%"}}/></div><div className="pipeline-meta"><span>76% response rate</span><span>Above average</span></div><Button variant="soft" onClick={()=>go("candidates")}>Review candidates <ArrowRight size={14}/></Button></section></div></div>}

function PostJob({go}){const [step,setStep]=useState(1);return <div className="flow-page employer-flow"><header className="flow-header"><Logo/><button onClick={()=>go("employer")}>Save and exit</button></header><div className="flow-wrap"><div className="flow-intro"><span className="kicker">EMPLOYER</span><h1>Post a new job</h1><p>Create a clear, compelling role for the right remote candidates.</p></div><div className="progress">{["Details","Requirements","Review"].map((s,i)=><div className={step>=i+1?"done":""} key={s}><span>{step>i+1?<Check size={13}/>:i+1}</span><strong>{s}</strong></div>)}</div><div className="flow-card">{step===1&&<><h2>Job details</h2><p>Start with the essentials candidates need to understand the opportunity.</p><Field label="Job title" placeholder="Senior Product Designer"/><div className="two-fields"><Field label="Job category" placeholder="Product Design"/><Field label="Employment type" placeholder="Full-time"/></div><div className="two-fields"><Field label="Work arrangement" placeholder="Fully remote"/><Field label="Salary range" placeholder="$80,000 – $120,000 / year"/></div></>}{step===2&&<><h2>Requirements</h2><p>Help the right candidates understand what success looks like.</p><Field label="Required experience" placeholder="3+ years in product design"/><Field label="Skills" placeholder="Figma, UX Research, Design Systems"/><Field label="Role description" placeholder="Describe responsibilities, team and impact..."/></>}{step===3&&<><h2>Review your job</h2><p>Preview how your role will appear to candidates.</p><div className="review-list"><ReviewItem label="Title" value="Senior Product Designer"/><ReviewItem label="Work arrangement" value="Fully remote · Worldwide"/><ReviewItem label="Salary" value="$80k – $120k / year"/><ReviewItem label="Requirements" value="3+ years · Figma · UX Research"/></div><div className="notice"><ShieldCheck size={18}/><span>Your listing will go through our verification review before publishing.</span></div></>}<div className="flow-actions"><Button variant="outline" onClick={()=>step>1&&setStep(step-1)}>Back</Button><Button onClick={()=>step<3?setStep(step+1):go("employer")}>{step<3?"Continue":"Submit for review"} <ArrowRight size={15}/></Button></div></div></div></div>}

function Candidates({go}){const candidates=[["Alex Carter","Senior Product Designer","Interview","green"],["Jamie Wilson","Frontend Developer","Shortlisted","soft"],["Taylor Kim","Marketing Specialist","Under review","amber"],["Morgan Lee","Customer Success Manager","Application","soft"]];return <div className="workspace"><div className="workspace-head"><div><span className="kicker">TALENT PIPELINE</span><h1>Candidates</h1><p>Keep every candidate and next step in view.</p></div><Button variant="outline"><Filter size={15}/> Filters</Button></div><div className="pipeline-tabs"><button className="active">All <span>126</span></button><button>New <span>28</span></button><button>Shortlisted <span>18</span></button><button>Interview <span>14</span></button><button>Hired <span>6</span></button></div><div className="candidate-table">{candidates.map((c,i)=><div className="candidate-row large" key={c[0]}><Avatar letter={c[0][0]}/><div><strong>{c[0]}</strong><span>{c[1]}</span></div><span>{i===0?"Today":"2 days ago"}</span><Badge tone={c[3]}>{c[2]}</Badge><button><MoreHorizontal size={17}/></button></div>)}</div></div>}

function Admin({go}){return <div className="workspace"><div className="workspace-head"><div><span className="kicker">PLATFORM OPERATIONS</span><h1>Admin overview</h1><p>Monitor trust, marketplace health and activity.</p></div><Button variant="outline"><SettingsIcon size={15}/> Admin settings</Button></div><div className="summary-grid"><Summary icon={BriefcaseBusiness} value="3,204" label="Active jobs" change="+84 this week"/><Summary icon={ShieldCheck} value="2,510" label="Verified companies" change="98.4% approved"/><Summary icon={Users} value="50,218" label="Job seekers" change="+6.2% this month"/><Summary icon={CircleHelp} value="18" label="Open reviews" change="5 urgent"/></div><div className="admin-grid"><section className="panel"><PanelTitle title="Verification queue" action="View queue"/>{["NovaTech · New company","Northstar Labs · Job review","CloudPeak · Company update","Lumen Health · Job review"].map((x,i)=><div className="review-row" key={x}><div><strong>{x}</strong><span>{i+1} item{i===0?"":"s"} waiting</span></div><Badge tone={i===0?"amber":"soft"}>{i===0?"Priority":"Review"}</Badge><button><ArrowRight size={15}/></button></div>)}</section><section className="panel"><span className="kicker">MARKETPLACE HEALTH</span><h2 className="admin-number">98.2%</h2><p className="muted">Successful application delivery</p><div className="health-bars">{[["Listings verified","94%"],["Profiles complete","78%"],["Employer response","82%"],["Support resolution","96%"]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><i><em style={{width:x[1]}}/></i></div>)}</div></section></div></div>}

function Settings({go}){return <div className="workspace"><div className="workspace-head"><div><span className="kicker">ACCOUNT</span><h1>Settings</h1><p>Manage your account, preferences and privacy.</p></div></div><div className="settings-layout"><aside className="settings-nav">{["Account","Notifications","Privacy","Security","Preferences"].map((x,i)=><button className={i===0?"active":""} key={x}>{x}</button>)}</aside><section className="panel settings-panel"><PanelTitle title="Account details"/><Field label="Email address" placeholder="alex@example.com"/><Field label="Display name" placeholder="Alex Carter"/><PanelTitle title="Job preferences"/><div className="toggle-row"><div><strong>Open to opportunities</strong><span>Let verified employers discover your profile.</span></div><button className="toggle on"><i/></button></div><div className="toggle-row"><div><strong>Weekly job digest</strong><span>Receive a curated email every Monday.</span></div><button className="toggle on"><i/></button></div><Button>Save changes <Check size={15}/></Button></section></div></div>}

function EmptyState({title,text,action,onAction}){return <div className="empty-state"><div><Search size={20}/></div><h3>{title}</h3><p>{text}</p>{action&&<Button variant="outline" onClick={onAction}>{action}</Button>}</div>}

function Verification({go}){
  const [step,setStep]=useState(1);
  const [submitted,setSubmitted]=useState(false);
  const [legalName,setLegalName]=useState("");
  const [dob,setDob]=useState("");
  const [address,setAddress]=useState("");
  const [identifier,setIdentifier]=useState("");
  const [documentType,setDocumentType]=useState("");
  const [frontFile,setFrontFile]=useState("");
  const [backFile,setBackFile]=useState("");
  const countries=registrationCountries.map(x=>x[1]);
  const [country,setCountry]=useState("United States");
  const identifierLabels={"United States":"Social Security Number (SSN)","Canada":"Social Insurance Number (SIN)","United Kingdom":"National Insurance number","Germany":"Government tax / identity number","France":"Government tax / identity number","Netherlands":"Government identity / tax number","Ireland":"Government identity / tax number","Sweden":"Government identity / tax number","Denmark":"Government identity / tax number","Norway":"Government identity / tax number","Finland":"Government identity / tax number","Belgium":"Government identity / tax number","Switzerland":"Government identity / tax number","Austria":"Government identity / tax number","Poland":"Government identity / tax number"};
  const docs=["Passport","Driver’s licence","National identity card","Residence permit"];
  const required=step===1?legalName.trim().length>2:step===2?!!dob:step===3?address.trim().length>5:step===4?identifier.trim().length>3:!!documentType&&!!frontFile&&!!backFile;
  const next=()=>{if(!required)return; if(step<5)setStep(v=>v+1); else setStep(6)};
  const back=()=>{if(step>1)setStep(v=>v-1);};
  if(submitted) return <div className="verification-page"><div className="verification-complete"><div className="verification-complete-icon"><Check size={28}/></div><span className="kicker">VERIFICATION RECEIVED</span><h1>Your verification is ready for review.</h1><p>This is the UI preview only. No government identifiers or identity documents are being uploaded or stored yet. The secure verification functionality will be connected later.</p><div className="verification-complete-note"><ShieldCheck size={17}/><span>When functionality is enabled, sensitive verification data will use dedicated security controls and a private document flow.</span></div><Button onClick={()=>go("dashboard")}>Back to dashboard <ArrowRight size={15}/></Button></div></div>;
  return <div className="verification-page">
    <header className="verification-topbar"><Logo/><button className="back-link" onClick={()=>go("dashboard")}><ArrowLeft size={15}/> Back to dashboard</button></header>
    <main className="verification-wrap">
      <div className="verification-intro"><Badge tone="green"><ShieldCheck size={13}/> Identity verification</Badge><h1>Build a verified profile.</h1><p>Use your legal details and a government-issued document so we can confirm that your account belongs to a real person.</p><div className="verification-security-note"><LockKeyhole size={16}/><span><strong>Security-first design.</strong> This screen is currently a UI prototype. Nothing below is sent to a server.</span></div></div>
      <div className="verification-progress"><span style={{width:`${step===6?100:(step/5)*100}%`}}/></div>
      <div className="verification-step-card">
        <div className="verification-step-meta"><span>STEP {step===6?5:step} <em>OF 5</em></span><Badge tone={step===6?"green":"soft"}>{step===6?"Review":"In progress"}</Badge></div>
        {step===1&&<><span className="kicker">LEGAL IDENTITY</span><h2>What is your full government name?</h2><p>Enter the name exactly as it appears on the government document you will use for verification.</p><label className="field"><span>Full legal name</span><input value={legalName} onChange={e=>setLegalName(e.target.value)} placeholder="e.g. Alex Carter" autoComplete="name"/></label></>}
        {step===2&&<><span className="kicker">DATE OF BIRTH</span><h2>When were you born?</h2><p>Your date of birth helps us distinguish your identity from other accounts.</p><label className="field"><span>Date of birth</span><input type="date" value={dob} onChange={e=>setDob(e.target.value)} autoComplete="bday"/></label></>}
        {step===3&&<><span className="kicker">RESIDENTIAL ADDRESS</span><h2>Where do you currently live?</h2><p>Use your current residential address. A PO box should only be used if the verification provider explicitly allows it.</p><label className="field"><span>Home address</span><textarea className="verification-textarea" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street address, city, region/state and postal code" rows="4" autoComplete="street-address"/></label></>}
        {step===4&&<><span className="kicker">GOVERNMENT IDENTIFIER</span><h2>Which country issued your identity details?</h2><p>Choose your country first so the verification flow can use the appropriate identifier label later. Do not enter a real number in this prototype.</p><label className="field"><span>Country</span><select value={country} onChange={e=>setCountry(e.target.value)}>{countries.map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>{identifierLabels[country]||"Government identifier"}</span><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Prototype field — not submitted" inputMode="text"/></label><div className="verification-sensitive-note"><LockKeyhole size={15}/><span>Later, this field should be handled through a secure verification service or protected server-side workflow rather than ordinary client-side storage.</span></div></>}
        {step===5&&<><span className="kicker">IDENTITY DOCUMENT</span><h2>Upload your government-issued ID.</h2><p>For the future live flow, users will be able to capture or upload the front and back of an accepted document.</p><label className="field"><span>Document type</span><select value={documentType} onChange={e=>setDocumentType(e.target.value)}><option value="">Choose a document</option>{docs.map(x=><option key={x}>{x}</option>)}</select></label><div className="document-upload-grid"><label className={frontFile?"document-upload selected":"document-upload"}><input type="file" accept="image/*,.pdf" onChange={e=>setFrontFile(e.target.files?.[0]?.name||"")}/><span className="document-upload-icon"><Plus size={18}/></span><strong>Front of document</strong><small>{frontFile||"Upload or capture front"}</small></label><label className={backFile?"document-upload selected":"document-upload"}><input type="file" accept="image/*,.pdf" onChange={e=>setBackFile(e.target.files?.[0]?.name||"")}/><span className="document-upload-icon"><Plus size={18}/></span><strong>Back of document</strong><small>{backFile||"Upload or capture back"}</small></label></div><div className="verification-sensitive-note"><ShieldCheck size={15}/><span>In the live version, documents belong in a private storage flow with strict access controls and short-lived access links.</span></div></>}
        {step===6&&<><span className="kicker">REVIEW</span><h2>Check your details before submitting.</h2><p>Review the information you entered. The live version will validate and securely process these details before a verification decision is made.</p><div className="verification-review-list"><div><span>Legal name</span><strong>{legalName||"Not provided"}</strong></div><div><span>Date of birth</span><strong>{dob||"Not provided"}</strong></div><div><span>Address</span><strong>{address||"Not provided"}</strong></div><div><span>Country</span><strong>{country}</strong></div><div><span>Government identifier</span><strong>{identifier?"Provided in prototype":"Not provided"}</strong></div><div><span>Identity document</span><strong>{documentType||"Not provided"} · Front + back selected</strong></div></div><div className="verification-sensitive-note"><LockKeyhole size={15}/><span>Prototype only: clicking the button below changes the screen locally and does not transmit or store this information.</span></div></>}
        <div className="verification-actions"><Button variant="outline" onClick={back} disabled={step===1}>Back</Button>{step<6?<Button onClick={next} disabled={!required}>Continue <ArrowRight size={15}/></Button>:<Button onClick={()=>setSubmitted(true)}>Submit for verification <ArrowRight size={15}/></Button>}</div>
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

  const openChat=()=>{setOpen(true);setView("empty")};
  const startChat=()=>{setView("chat");if(messages.length===0)setMessages([{from:"support",text:"Hi there — how can we help today?",time:"Just now"}])};
  const sendMessage=()=>{
    const text=draft.trim();
    if(!text)return;
    setMessages(v=>[...v,{from:"user",text,time:"Just now"}]);
    setDraft("");
  };
  const submitTicket=()=>{if(!issueType||!subject.trim()||!message.trim())return;setView("success")};
  const reset=()=>{setView("empty");setIssueType("");setSubject("");setMessage("");setDraft("");setMessages([])};
  const issueTypes=["Account & login","Job or application","Employer & hiring","Technical issue","Report a concern","Other"];

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
        <div className="support-actions">
          <button onClick={startChat}><span><MessageCircle size={17}/></span><div><strong>I need help</strong><small>Chat with support</small></div><ArrowRight size={15}/></button>
          <button onClick={()=>setView("ticket")}><span><FileText size={17}/></span><div><strong>Open a support ticket</strong><small>For issues that need follow-up</small></div><ArrowRight size={15}/></button>
          <button onClick={()=>setView("ticket")}><span><ShieldCheck size={17}/></span><div><strong>Report a concern</strong><small>Tell us about a problem</small></div><ArrowRight size={15}/></button>
        </div>
        <button className="support-faq" onClick={startChat}>Browse common questions <ArrowRight size={14}/></button>
      </div>}

      {view==="chat"&&<div className="support-body support-chat">
        <div className="support-chat-meta"><button onClick={()=>setView("empty")}><ArrowLeft size={14}/> Support home</button><span><i/> Available</span></div>
        <div className="support-messages">
          {messages.map((m,i)=><div className={m.from==="user"?"support-message user":"support-message"} key={i}><div>{m.text}</div><small>{m.time}</small></div>)}
          {messages.length===1&&<div className="support-suggestion"><span>Try asking about:</span><div><button onClick={()=>setDraft("I need help with my application.")}>My application</button><button onClick={()=>setDraft("I’m having trouble signing in.")}>Signing in</button><button onClick={()=>setDraft("I want to report a job.")}>Reporting a job</button></div></div>}
        </div>
        <div className="support-composer"><button aria-label="Add attachment" title="Attachments are coming later"><Plus size={17}/></button><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMessage()}} placeholder="Write a message..." aria-label="Write a message"/><button className="support-send" onClick={sendMessage} aria-label="Send message"><Send size={16}/></button></div>
      </div>}

      {view==="ticket"&&<div className="support-body support-ticket">
        <div className="support-page-head"><button onClick={()=>setView("empty")}><ArrowLeft size={14}/> Back</button><span className="kicker">SUPPORT TICKET</span><h3>Tell us what happened.</h3><p>Give us enough detail to understand the issue. You can add attachments when support functionality is connected.</p></div>
        <label className="support-field"><span>Issue type <b>*</b></span><select value={issueType} onChange={e=>setIssueType(e.target.value)}><option value="">Choose an issue</option>{issueTypes.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="support-field"><span>Subject <b>*</b></span><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Give your issue a short title"/></label>
        <label className="support-field"><span>What happened? <b>*</b></span><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe the issue and what you were trying to do..."/></label>
        <button className="support-attachment" title="Attachments are coming later"><Plus size={15}/> Add attachment <small>Coming later</small></button>
        <Button className="support-submit" onClick={submitTicket} disabled={!issueType||!subject.trim()||!message.trim()}>Submit ticket <ArrowRight size={15}/></Button>
      </div>}

      {view==="success"&&<div className="support-body support-success">
        <div className="support-success-icon"><Check size={24}/></div><span className="kicker">TICKET RECEIVED</span><h3>Your support request is in.</h3><p>We’ve captured the details. A ticket ID will appear here once support functionality is connected.</p><div className="support-ticket-preview"><span>Status</span><strong>Open</strong><small>Awaiting support</small></div><div className="support-success-actions"><Button onClick={()=>setView("chat")}>Back to chat</Button><Button variant="outline" onClick={reset}>Start a new request</Button></div>
      </div>}

      {view==="closed"&&<div className="support-body support-success">
        <div className="support-success-icon"><Check size={24}/></div><span className="kicker">CONVERSATION CLOSED</span><h3>This conversation is closed.</h3><p>If you still need help, start a new conversation and we’ll take it from there.</p><Button onClick={reset}>Start a new conversation <ArrowRight size={15}/></Button>
      </div>}

      {view==="chat"&&<button className="support-close-conversation" onClick={()=>setView("closed")}>Close conversation</button>}
    </section>}
  </>;
}

function App(){
  const initial=()=>window.location.hash.replace("#/","")||"home";
  const [screen,setScreen]=useState(initial); const [param,setParam]=useState(""); const [toast,setToast]=useState("");
  const [session,setSession]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const go=(next,value="")=>{setParam(String(value||""));window.location.hash=`/${next}`;setScreen(next);window.scrollTo(0,0)};
  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{if(mounted){setSession(data.session);setAuthReady(true)}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,nextSession)=>{
      setSession(nextSession);
      setAuthReady(true);
    });
    return()=>{mounted=false;subscription.unsubscribe()};
  },[]);
  useEffect(()=>{
    const h=()=>{const hash=window.location.hash.replace("#/","")||"home";setScreen(hash)};
    window.addEventListener("hashchange",h);return()=>window.removeEventListener("hashchange",h)
  },[]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),2800);return()=>clearTimeout(t)}},[toast]);
  const protectedScreens=["dashboard","jobs","saved","applications","interview","profile","payouts","verification","settings","employer","postjob","candidates","admin"];
  useEffect(()=>{
    if(!authReady)return;
    if(!session&&protectedScreens.includes(screen)){go("login")}
    if(session&&(screen==="login"||screen==="signup"||screen==="verify"))go("dashboard");
  },[authReady,session,screen]);
  if(!authReady)return <div style={{minHeight:"100vh",background:"#f8f6f0"}}/>;
  let page;
  if(screen==="home") page=<Home go={go}/>; else if(screen==="jobs") page=<Jobs go={go} initialQuery={param}/>; else if(screen==="job") page=<JobDetail go={go} id={param}/>; else if(screen==="login") page=<Auth go={go} mode="login"/>; else if(screen==="signup") page=<Auth go={go} mode="signup"/>; else if(screen==="verify") page=<VerifyEmail go={go}/>; else if(screen==="onboarding") page=<Onboarding go={go}/>; else if(screen==="verification") page=<Verification go={go}/>; else if(screen==="payouts") page=<AppShell go={go} screen={screen}><Payouts go={go}/></AppShell>; else if(screen==="application") page=<ApplicationFlow go={go} id={param}/>; else if(screen==="interview") page=<Interview go={go}/>; else if(screen==="employer") page=<AppShell go={go} screen={screen}><Employer go={go}/></AppShell>; else if(screen==="postjob") page=<PostJob go={go}/>; else if(screen==="candidates") page=<AppShell go={go} screen={screen}><Candidates go={go}/></AppShell>; else if(screen==="admin") page=<AppShell go={go} screen={screen}><Admin go={go}/></AppShell>; else if(screen==="profile") page=<AppShell go={go} screen={screen}><Profile go={go}/></AppShell>; else if(screen==="saved") page=<AppShell go={go} screen={screen}><Saved go={go}/></AppShell>; else if(screen==="applications") page=<AppShell go={go} screen={screen}><Applications go={go}/></AppShell>; else if(screen==="settings") page=<AppShell go={go} screen={screen}><Settings go={go}/></AppShell>; else page=<AppShell go={go} screen="dashboard"><Dashboard go={go}/></AppShell>;
  return <>{page}<SupportWidget/>{toast&&<Toast message={toast} onClose={()=>setToast("")}/>}</>;
}
export default App;