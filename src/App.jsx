import React, { useState } from "react";
import {
  ArrowRight, Bookmark, Check, ChevronDown, ChevronRight, Clock3,
  Globe2, Heart, Menu, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Users, X
} from "lucide-react";

const jobs = [
  { company:"NovaTech", logo:"N", title:"Senior Product Designer", location:"Remote · Worldwide", salary:"$80k–$110k", tags:["Product Design","Figma","UX Research"], time:"2h ago", tone:"navy" },
  { company:"PixelForge", logo:"P", title:"Frontend Developer", location:"Remote · Full-time", salary:"$70k–$95k", tags:["React","TypeScript","Tailwind"], time:"4h ago", tone:"ink" },
  { company:"Lumen Labs", logo:"L", title:"Marketing Specialist", location:"Remote · Full-time", salary:"$50k–$70k", tags:["Content Marketing","SEO","Social Media"], time:"6h ago", tone:"olive" },
  { company:"OrbitAI", logo:"O", title:"Customer Success Manager", location:"Remote · Full-time", salary:"$60k–$85k", tags:["Communication","CRM","Problem Solving"], time:"8h ago", tone:"gold" }
];

function Logo(){ return <div className="brand"><span className="brand-mark">↗</span><span>RemotePath</span></div> }

function JobCard({job, featured=false}){
  const [saved,setSaved] = useState(false);
  return <article className={"job-card"+(featured?" featured":"")}>
    <div className="job-top">
      <div className={"company-logo "+job.tone}>{job.logo}</div>
      <button className={"icon-button"+(saved?" active":"")} onClick={()=>setSaved(!saved)} aria-label="Save job"><Bookmark size={17} fill={saved?"currentColor":"none"}/></button>
    </div>
    <div className="company-name">{job.company} <ShieldCheck size={14}/></div>
    <h3>{job.title}</h3>
    <div className="job-meta"><span>{job.location}</span><span>{job.salary}</span></div>
    <div className="tags">{job.tags.map(t=><span key={t}>{t}</span>)}</div>
    <div className="job-footer"><span className="posted"><Clock3 size={14}/>{job.time}</span><button className="apply-link">Apply <ArrowRight size={15}/></button></div>
  </article>
}

function App(){
  const [menu,setMenu]=useState(false);
  const [query,setQuery]=useState("");
  const [where,setWhere]=useState("Anywhere");
  const [toast,setToast]=useState(false);

  const doSearch = (e)=>{ e.preventDefault(); setToast(true); setTimeout(()=>setToast(false),2600); };

  return <div className="site">
    <header className="nav">
      <Logo/>
      <nav className={menu?"nav-links open":"nav-links"}>
        <a href="#jobs">Find Jobs</a><a href="#companies">Companies</a><a href="#resources">Resources</a><a href="#about">About</a>
      </nav>
      <div className="nav-actions"><button className="login">Log in</button><button className="primary small" onClick={()=>document.getElementById("jobs")?.scrollIntoView({behavior:"smooth"})}>Get Started</button><button className="menu-btn" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span></span> The better way to work remotely</div>
          <h1>Work that fits <em>your life.</em></h1>
          <p>Discover verified remote opportunities from trusted companies around the world. Build your career on your terms.</p>
          <form className="search-panel" onSubmit={doSearch}>
            <div className="search-field"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Job title, skill or keyword" aria-label="Job title, skill or keyword"/></div>
            <div className="search-field where"><Globe2 size={18}/><select value={where} onChange={e=>setWhere(e.target.value)} aria-label="Location"><option>Anywhere</option><option>North America</option><option>Europe</option><option>Africa</option><option>Asia-Pacific</option></select><ChevronDown size={15}/></div>
            <button className="primary search-btn">Search Jobs</button>
          </form>
          <div className="popular"><span>Popular:</span>{["Product Designer","Developer","Marketing","Customer Support","Data"].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div>
        </div>
        <div className="hero-visual">
          <div className="hero-image"></div>
          <div className="image-note note-one"><Sparkles size={15}/><span><strong>More freedom.</strong><br/>Better opportunities.</span></div>
          <div className="image-note note-two"><div className="mini-avatars"><i>A</i><i>M</i><i>J</i></div><div><strong>50,000+</strong><br/><small>people finding remote work</small></div></div>
        </div>
      </section>

      <section className="stats">
        <div><Users/><strong>50,000+</strong><span>Active job seekers</span></div>
        <div><ShieldCheck/><strong>3,200+</strong><span>Trusted companies</span></div>
        <div><Globe2/><strong>120+</strong><span>Countries</span></div>
        <div><Check/><strong>98%</strong><span>Satisfaction rate</span></div>
      </section>

      <section className="section jobs-section" id="jobs">
        <div className="section-head"><div><span className="kicker">CURATED FOR YOU</span><h2>Featured opportunities</h2><p>Handpicked roles from top companies, just for you.</p></div><a href="#all-jobs">View all jobs <ArrowRight size={16}/></a></div>
        <div className="job-grid">{jobs.map(j=><JobCard key={j.title} job={j}/>)}</div>
      </section>

      <section className="editorial">
        <div className="editorial-image"></div>
        <div className="editorial-copy"><span className="kicker">YOUR NEXT CHAPTER</span><h2>Your next opportunity is <em>closer than you think.</em></h2><p>Join a growing community of remote professionals and get access to jobs built around how you want to live and work.</p><button className="primary">Create your free account <ArrowRight size={16}/></button></div>
      </section>

      <section className="section how" id="resources">
        <div className="center-head"><span className="kicker">SIMPLE BY DESIGN</span><h2>How it works</h2><p>Get started in four simple steps and begin your remote journey today.</p></div>
        <div className="steps">
          {[["01","Create your profile","Tell us about your skills, experience and goals."],["02","Find the right jobs","Browse verified opportunities that match you."],["03","Apply with ease","Submit your application in just a few clicks."],["04","Get hired","Prepare for interviews and start your new role."]].map(([n,t,d],i)=><div className="step" key={n}><div className="step-number">{n}</div><h3>{t}</h3><p>{d}</p>{i<3&&<ChevronRight className="step-arrow"/>}</div>)}
        </div>
      </section>

      <section className="trust" id="companies">
        <div><ShieldCheck size={22}/><span><strong>Verified employers.</strong> Better opportunities, with more confidence.</span></div>
        <button className="outline">Explore companies <ArrowRight size={16}/></button>
      </section>

      <footer className="footer" id="about">
        <div className="footer-top"><div><Logo/><p>Work. Anywhere.</p></div><div><h4>For Job Seekers</h4><a>Find Jobs</a><a>Career Resources</a><a>Help Center</a></div><div><h4>For Employers</h4><a>Post a Job</a><a>Talent Solutions</a><a>Pricing</a></div><div><h4>Company</h4><a>About Us</a><a>Blog</a><a>Contact</a></div><div className="newsletter"><h4>Stay in the loop</h4><p>Get the latest jobs and career tips.</p><div><input placeholder="Your email address"/><button><ArrowRight size={16}/></button></div></div></div>
        <div className="footer-bottom"><span>© 2026 RemotePath. All rights reserved.</span><div><a>Privacy Policy</a><a>Terms of Service</a><a>Cookies</a></div></div>
      </footer>
    </main>
    {toast&&<div className="toast"><Check size={16}/> Search ready — results will connect to the jobs system in the next phase.</div>}
  </div>
}
export default App;
