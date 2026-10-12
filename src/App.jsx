import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { cachedRequest, invalidateCachedRequest } from "./lib/queryCache";
import {
  ArrowLeft, ArrowRight, Bell, Bookmark, BriefcaseBusiness, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, CreditCard, FileText, Filter,
  Globe2, Heart, LayoutDashboard, Landmark, LockKeyhole, Mail, MapPin,
  Menu, MessageCircle, MoreHorizontal, PenLine, Phone, Plus, Search, Send,
  Settings as SettingsIcon, ShieldCheck, SlidersHorizontal, Sparkles, Star, UserRound,
  Users, WalletCards, X, Zap
} from "lucide-react";



function RemoteDateInput({value,onChange,placeholder="DD / MM / YYYY",className=""}){
  const raw=String(value||"");
  const iso=/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:"";
  const today=new Date().toISOString().slice(0,10);
  return <input
    type="date"
    className={"remote-date-input "+className}
    value={iso}
    max={today}
    onChange={e=>onChange(e.target.value)}
    aria-label="Date (day month year)"
  />;
}

function RemoteMonthYearInput({value,onChange,className=""}){
  const raw=String(value||"");
  const month=/^\d{4}-\d{2}$/.test(raw)?raw:"";
  return <input
    type="month"
    className={"remote-month-year-input "+className}
    value={month}
    onChange={e=>onChange(e.target.value)}
    aria-label="Month and year"
  />;
}

function RemoteTimeInput({value,onChange,placeholder="HH : MM",className=""}){
  const raw=String(value||"");
  const display=raw.match(/^(\\d{2}):(\\d{2})$/)?raw.slice(0,2)+" : "+raw.slice(3,5):raw;
  const handle=(input)=>{
    const digits=String(input||"").replace(/\\D/g,"").slice(0,4);
    const shown=digits.length>2?digits.slice(0,2)+" : "+digits.slice(2):digits;
    if(digits.length===4){
      const h=Number(digits.slice(0,2)),m=Number(digits.slice(2));
      if(h<=23&&m<=59){onChange(String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"));return;}
    }
    onChange(shown);
  };
  return <input className={"remote-time-input "+className} inputMode="numeric" autoComplete="off" value={display} maxLength={7} placeholder={placeholder} onChange={e=>handle(e.target.value)} aria-label="Time (hours and minutes)"/>;
}

function RemoteDateTimeInput({value,onChange,className=""}){
  const raw=String(value||"");
  const parts=raw.includes("T")?raw.split("T"):[raw,""];
  const datePart=parts[0],timePart=parts[1]||"";
  const updateDate=v=>onChange(v+(timePart?"T"+timePart:""));
  const updateTime=v=>onChange((datePart||"")+(datePart&&v?"T"+v:""));
  return <div className={"remote-datetime-input "+className}><RemoteDateInput value={datePart} onChange={updateDate} placeholder="DD / MM / YYYY"/><RemoteTimeInput value={timePart} onChange={updateTime} placeholder="HH : MM"/></div>;
}

function defaultFieldPlaceholder(type,label="",key=""){
  const text=(String(label||"")+" "+String(key||"")).trim().replace(/\s+/g," ").toLowerCase();
  if(type==="select"||type==="country")return "Select "+(label||"an option").toLowerCase();
  if(type==="file")return "Choose a file";
  if(type==="date")return "Select a date";
  if(type==="month_year")return "Select month and year";
  if(type==="time")return "Enter time (HH : MM)";
  if(type==="datetime-local")return "Select date and time";
  if(type==="coupon_number"||text.includes("coupon")||text.includes("card number")||text==="card")return "Enter 16-digit number";
  if(type==="verification_code_3"||text.includes("verification code"))return "Enter 3-digit code";
  if(type==="email"||text.includes("email"))return "you@example.com";
  if(type==="tel"||text.includes("phone")||text.includes("mobile"))return "Enter phone number";
  if(type==="url"||text.includes("website")||text.includes("url"))return "https://example.com";
  if(type==="password")return "Enter password";
  if(type==="number"||text.includes("amount")||text.includes("account number"))return "Enter a number";
  if(type==="textarea")return "Enter "+(label||"your response").toLowerCase();
  return "Enter "+(label||"your response").toLowerCase();
}

function isValidLegalName(value){
  const name=String(value||"").trim().replace(/\s+/g," ");
  if(name.length<3)return {valid:false,message:"Enter your full legal name."};
  if(name.length>100)return {valid:false,message:"Your name is too long."};
  if(!/^[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)+$/.test(name))return {valid:false,message:"Enter a real-looking first and last name using letters only."};
  if(/(.)\1{4,}/i.test(name)||(/^[A-Za-z]+$/.test(name)&&/^(test|testing|asdf|qwerty|admin|unknown|none|name)$/i.test(name.replace(/\s/g,""))))return {valid:false,message:"That does not look like a valid personal name."};
  return {valid:true,message:"Name format looks good."};
}

function validateResidentialAddress(country,address,region){
  const text=String(address||"").trim().replace(/\s+/g," ");
  const area=String(region||"").trim().replace(/\s+/g," ");
  if(area.length<2||!/^[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*$/.test(area))return {valid:false,message:"Enter a valid state, region or province."};
  if(text.length<12)return {valid:false,message:"Enter your complete residential address."};
  if(!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(text)||!/\d/.test(text))return {valid:false,message:"Include a street number and a street name in your address."};
  const postalRules={
    "United States":/\b\d{5}(?:-\d{4})?\b/,
    "Canada":/\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b/,
    "United Kingdom":/\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/i,
    "Germany":/\b\d{5}\b/,
    "France":/\b\d{5}\b/,
    "Netherlands":/\b\d{4} ?[A-Z]{2}\b/i,
    "Ireland":/\b[A-Z]\d{2} ?[A-Z0-9]{4}\b/i,
    "Sweden":/\b\d{3}[ -]?\d{2}\b/,
    "Denmark":/\b\d{4}\b/,
    "Norway":/\b\d{4}\b/,
    "Finland":/\b\d{5}\b/,
    "Belgium":/\b\d{4}\b/,
    "Switzerland":/\b\d{4}\b/,
    "Austria":/\b\d{4}\b/,
    "Poland":/\b\d{2}-?\d{3}\b/
  };
  const rule=postalRules[country];
  if(rule&&!rule.test(text))return {valid:false,message:"Include a valid postal or ZIP code for the selected country."};
  return {valid:true,message:"Address format looks complete."};
}

function requiredFieldValueComplete(field,value){
  if(field?.type==="checkbox")return value===true||value==="true";
  return String(value??"").trim().length>0;
}

function UniversalFieldInput({type,value,onChange,placeholder,min,max,step,label,keyName}){
  const fieldPlaceholder=placeholder||defaultFieldPlaceholder(type,label,keyName);
  if(type==="date") return <RemoteDateInput value={value} onChange={onChange} placeholder={fieldPlaceholder}/>;
  if(type==="month_year") return <RemoteMonthYearInput value={value} onChange={onChange}/>;
  if(type==="time") return <RemoteTimeInput value={value} onChange={onChange} placeholder={fieldPlaceholder}/>;
  if(type==="datetime-local") return <RemoteDateTimeInput value={value} onChange={onChange}/>;
  const isCoupon=type==="coupon_number",isCode=type==="verification_code_3";
  const clean=v=>isCoupon?formatCouponNumber(v):isCode?String(v??"").replace(/\D/g,"").slice(0,3):v;
  return <input type={["number","email","tel","url","password"].includes(type)?type:"text"} inputMode={isCoupon||isCode?"numeric":undefined} maxLength={isCoupon?19:isCode?3:undefined} value={clean(value)} placeholder={fieldPlaceholder} min={min} max={max} step={step} onChange={e=>onChange(clean(e.target.value))}/>;
}

const UNIVERSAL_FORM_TYPES = [
  {value:"text",label:"Text — letters, words or mixed text"},
  {value:"textarea",label:"Long text / paragraph"},
  {value:"number",label:"Number"},
  {value:"coupon_number",label:"Coupon / card-style number (16 digits)"},
  {value:"verification_code_3",label:"3-digit verification code"},
  {value:"email",label:"Email address"},
  {value:"tel",label:"Phone number"},
  {value:"url",label:"Website / URL"},
  {value:"password",label:"Password"},
  {value:"date",label:"Date"},
  {value:"month_year",label:"Month / year (MM/YY)"},
  {value:"time",label:"Time"},
  {value:"datetime-local",label:"Date & time"},
  {value:"select",label:"Dropdown / select"},
  {value:"radio",label:"Single choice"},
  {value:"checkbox",label:"Checkbox / agreement"},
  {value:"file",label:"File upload"},
  {value:"country",label:"Country"}
];

const formatCouponNumber=(value)=>String(value??"").replace(/\D/g,"").slice(0,16).replace(/(\d{4})(?=\d)/g,"$1 ");
const registrationCountries = [
  ["🇺🇸","United States"],["🇨🇦","Canada"],["🇬🇧","United Kingdom"],["🇩🇪","Germany"],["🇫🇷","France"],
  ["🇳🇱","Netherlands"],["🇮🇪","Ireland"],["🇨🇭","Switzerland"],["🇸🇪","Sweden"],["🇧🇪","Belgium"]
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
  ["applications","Applications",FileText],["interview","Interviews",MessageCircle],["job-workspace","Job Workspace",BriefcaseBusiness],["profile","Profile",UserRound],["payouts","Payouts",WalletCards],
  ["verification","Verification",ShieldCheck]
];

function Logo({light=false,go}){const content=<><span className="brand-mark" aria-hidden="true">↗</span><span>RemoteWay</span></>;return go?<button type="button" className={`brand ${light?"brand-light":""}`} onClick={()=>go("home")} aria-label="RemoteWay home" style={{border:0,background:"transparent",padding:0,cursor:"pointer",font:"inherit",color:"inherit",display:"inline-flex",alignItems:"center",textAlign:"left"}}>{content}</button>:<div className={`brand ${light?"brand-light":""}`}>{content}</div>}
function Button({children,variant="primary",className="",onClick,type="button",disabled=false}){return <button type={type} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>}
function Badge({children,tone="soft"}){return <span className={`badge badge-${tone}`}>{children}</span>}
function Avatar({letter="A",size="md"}){return <span className={`avatar avatar-${size}`}>{letter}</span>}
function Toast({message,onClose}){return <div className="toast"><Check size={16}/>{message}<button onClick={onClose}><X size={14}/></button></div>}

function CompanyLogo({job,large=false}){const [failed,setFailed]=useState(false);const src=job?.company_logo||"";return <div className={`company-avatar ${large?"large":""}`} aria-label={`${job?.company||job?.company_name||"Company"} logo`}>{src&&!failed?<img src={src} alt={`${job?.company||job?.company_name||"Company"} logo`} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"left center",borderRadius:"inherit",display:"block",background:"#fff"}} onError={()=>setFailed(true)}/>:<span>{(job?.company||job?.company_name||"R").trim().charAt(0).toUpperCase()}</span>}</div>}

function JobCard({job,onOpen,compact=false}){
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);  useEffect(()=>{let mounted=true;(async()=>{const {data:{session}}=await supabase.auth.getSession();const user=session?.user;if(!user)return;const {data,error}=await cachedRequest("private:saved-jobs:"+user.id,()=>supabase.from("saved_jobs").select("job_id").eq("user_id",user.id),10000);if(mounted&&!error)setSaved((data||[]).some(row=>String(row.job_id)===String(job.id)))})();
return()=>{mounted=false}},[job.id]);  const toggleSave=async e=>{e.stopPropagation();if(saving)return;setSaving(true);try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;if(saved){const {error}=await supabase.from("saved_jobs").delete().eq("user_id",user.id).eq("job_id",job.id);if(error)throw error;invalidateCachedRequest("private:saved-jobs:"+user.id);setSaved(false)}else{const {error}=await supabase.from("saved_jobs").insert({user_id:user.id,job_id:job.id});if(error)throw error;invalidateCachedRequest("private:saved-jobs:"+user.id);setSaved(true)}}catch(err){console.error(err)}finally{setSaving(false)}};
  return <article className={`job-card ${compact?"compact":""}`} onClick={()=>onOpen?.(job.id)}>
    <div className="job-card-top"><CompanyLogo job={job}/><button className={`icon-btn ${saved?"is-saved":""}`} onClick={toggleSave} aria-label="Save job"><Bookmark size={17} fill={saved?"currentColor":"none"}/></button></div>
    <div className="company-line">{job.company}{job.verified&&<ShieldCheck size={13}/>}</div>
    <h3>{job.title}</h3>
    <div className="job-facts"><span><MapPin size={13}/>{job.location}</span><strong>{job.salary}</strong><span>{job.type}</span></div>
    <div className="tag-row">{(job.tags||[]).map(t=><Badge key={t}>{t}</Badge>)}</div>
    <div className="job-card-bottom"><span><Clock3 size={13}/>{job.posted}</span><Button variant="ghost" className="apply-mini">View role <ArrowRight size={14}/></Button></div>
  </article>
}


function PublicInfoLayout({go,eyebrow,title,lead,children}) {
  return <div className="site"><PublicNav go={go}/><main style={{maxWidth:1180,margin:"0 auto",padding:"clamp(24px,5vw,64px) clamp(18px,4vw,36px) 70px"}}><div style={{maxWidth:790,marginBottom:34}}><span className="kicker">{eyebrow}</span><h1 style={{fontSize:"clamp(36px,5vw,58px)",lineHeight:1.08,letterSpacing:"-.04em",margin:"12px 0 18px"}}>{title}</h1><p style={{fontSize:17,lineHeight:1.8,color:"var(--muted,#6c7773)",margin:0}}>{lead}</p></div>{children}</main><Footer go={go}/></div>;
}
function CompaniesPage({go}) {
 const [jobs,setJobs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let live=true;(async()=>{const {data,error:e}=await cachedRequest("public:company-directory",()=>supabase.from("jobs").select("id,title,company_name,company_logo,category,location,job_type,created_at").eq("status","published").order("company_name",{ascending:true}),30000);if(!live)return;if(e)setError("We couldn't load company listings right now.");setJobs(data||[]);setLoading(false)})();return()=>{live=false}},[]);
 const companies=useMemo(()=>{const grouped=new Map();jobs.forEach(j=>{const key=(j.company_name||"Company").trim();if(!grouped.has(key))grouped.set(key,{name:key,logo:j.company_logo||"",jobs:[]});const row=grouped.get(key);if(!row.logo&&j.company_logo)row.logo=j.company_logo;row.jobs.push(j)});return [...grouped.values()]},[jobs]);
 return <PublicInfoLayout go={go} eyebrow="OUR COMPANY DIRECTORY" title="Explore companies hiring for remote work." lead="Browse the employers represented in RemoteWay’s currently published job listings. Open a company to see the opportunities listed under its name."><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}><strong>{loading?"Loading companies…":companies.length+" companies listed"}</strong><button className="btn btn-outline" onClick={()=>go("jobs")}>Browse all jobs <ArrowRight size={15}/></button></div>{error&&<div className="auth-message auth-error">{error}</div>}{loading?<div className="empty-state"><h3>Loading company directory…</h3></div>:companies.length===0?<EmptyState title="No published company listings yet" text="New company opportunities will appear here when jobs are published." action="Browse jobs" onAction={()=>go("jobs")}/>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,285px),1fr))",gap:16}}>{companies.map(company=><article key={company.name} className="panel" style={{padding:16,display:"flex",flexDirection:"column",gap:13,minWidth:0,overflow:"hidden",borderRadius:18}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:64,height:64,flex:"0 0 64px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",borderRadius:14,border:"1px solid var(--line,#e4e7e3)",background:"#fff",padding:7,boxSizing:"border-box"}}>{company.logo?<img src={company.logo} alt={company.name+" logo"} loading="lazy" decoding="async" style={{display:"block",width:"100%",height:"100%",objectFit:"contain",objectPosition:"center"}} onError={e=>{e.currentTarget.style.display="none"}}/>:<span style={{fontSize:25,fontWeight:750,color:"var(--green,#176653)"}}>{company.name.slice(0,1)}</span>}</div><div style={{minWidth:0,flex:1}}><h2 style={{fontSize:18,lineHeight:1.25,margin:"0 0 6px",overflowWrap:"anywhere"}}>{company.name}</h2><span style={{fontSize:13,color:"var(--muted,#6c7773)"}}>{company.jobs.length} published {company.jobs.length===1?"role":"roles"}</span></div></div><div style={{display:"grid",gap:9}}>{company.jobs.slice(0,3).map(job=><button key={job.id} onClick={()=>go("job",job.id)} style={{textAlign:"left",background:"var(--cream,#f8f6f0)",border:"1px solid var(--line,#e4e7e3)",borderRadius:12,padding:"12px",color:"inherit",cursor:"pointer",width:"100%",minWidth:0,boxSizing:"border-box"}}><strong style={{display:"block",fontSize:14,lineHeight:1.4,overflowWrap:"anywhere"}}>{job.title}</strong><span style={{display:"block",marginTop:5,fontSize:12,lineHeight:1.5,color:"var(--muted,#6c7773)",overflowWrap:"anywhere"}}>{job.category||"Remote role"} · {job.location||"Location varies"}</span></button>)}</div><button className="btn btn-soft" style={{marginTop:2,alignSelf:"stretch",justifyContent:"center",width:"100%",boxSizing:"border-box"}} onClick={()=>go("jobs",company.name)}>View company jobs <ArrowRight size={15}/></button></article>)}</div>}<p style={{marginTop:24,fontSize:13,lineHeight:1.7,color:"var(--muted,#6c7773)"}}>Listings on RemoteWay are managed by our platform team. A company appearing here means one or more listings currently name that company; it does not by itself mean RemoteWay is an official partner or that the employer has independently verified every listing.</p></PublicInfoLayout>;
}
function ResourcesPage({go}) {
 const resources=[
  {n:"01",title:"Build a remote-ready profile",text:"Describe your skills, experience, preferred work style and the roles you want. Keep your information accurate and current.",action:"Create your profile",route:"signup"},
  {n:"02",title:"Search with intention",text:"Use job titles, skills, categories and company names to narrow the listings to work that fits your experience.",action:"Explore open jobs",route:"jobs"},
  {n:"03",title:"Prepare a strong application",text:"Read each description carefully, tailor your CV and explain clearly how your experience matches the role.",action:"Browse opportunities",route:"jobs"},
  {n:"04",title:"Stay safe while job hunting",text:"Be cautious of requests for upfront fees, passwords, one-time codes or sensitive financial details. Verify an opportunity independently before sharing personal information.",action:"Read our privacy policy",route:"privacy"},
  {n:"05",title:"Track your applications",text:"Use your RemoteWay account to follow submitted applications and check any next steps or interview invitations shown to you.",action:"Sign in",route:"login"},
  {n:"06",title:"Need help?",text:"If something looks suspicious or you have trouble using the platform, sign in and contact support through your account when available.",action:"Get started",route:"signup"}
 ];
 return <PublicInfoLayout go={go} eyebrow="REMOTE CAREER RESOURCES" title="Practical guidance for your next move." lead="Straightforward tools and tips to help you search for remote work, prepare thoughtful applications and use RemoteWay more confidently."><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:16}}>{resources.map(item=><article className="panel" key={item.n} style={{padding:22,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:12}}><span className="kicker">{item.n} / GUIDE</span><h2 style={{fontSize:21,margin:0}}>{item.title}</h2><p style={{margin:0,lineHeight:1.75,color:"var(--muted,#6c7773)"}}>{item.text}</p><button className="btn btn-soft" style={{marginTop:"auto"}} onClick={()=>go(item.route)}>{item.action} <ArrowRight size={15}/></button></article>)}</div><section className="trust-banner" style={{marginTop:28}}><div><ShieldCheck size={24}/><div><strong>Take your time. Check the details.</strong><span>RemoteWay helps you discover listings, but you should always review the employer, role requirements and terms before applying.</span></div></div><button className="btn btn-outline" onClick={()=>go("jobs")}>Find jobs <ArrowRight size={15}/></button></section></PublicInfoLayout>;
}
function AboutPage({go}) {
 return <PublicInfoLayout go={go} eyebrow="ABOUT REMOTEWAY" title="Work should fit the life you’re building." lead="RemoteWay is a remote-work opportunity platform designed to help people discover job listings, organize their applications and take the next step in their careers."><section className="panel" style={{padding:"clamp(20px,4vw,34px)",marginBottom:18}}><span className="kicker">OUR PURPOSE</span><h2 style={{fontSize:28,margin:"10px 0"}}>Make the search feel simpler.</h2><p style={{lineHeight:1.85,color:"var(--muted,#6c7773)",maxWidth:820}}>Finding remote work can involve a lot of searching, comparing and follow-up. RemoteWay brings job discovery and candidate tools together in one place, so people can explore available roles, create a profile, apply and keep track of their progress.</p></section><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,240px),1fr))",gap:16,marginBottom:28}}>{[{title:"Discover",text:"Explore published remote-work listings by role, company and category."},{title:"Prepare",text:"Create a candidate profile and share relevant experience when applying."},{title:"Stay organized",text:"Use your account to review applications, interview steps and platform updates."}].map(x=><article className="panel" key={x.title} style={{padding:22}}><h3 style={{marginTop:0}}>{x.title}</h3><p style={{lineHeight:1.75,color:"var(--muted,#6c7773)",marginBottom:0}}>{x.text}</p></article>)}</div><section className="panel" style={{padding:"clamp(20px,4vw,32px)"}}><span className="kicker">A NOTE ON LISTINGS</span><h2 style={{fontSize:23,margin:"10px 0"}}>Use good judgment with every opportunity.</h2><p style={{lineHeight:1.8,color:"var(--muted,#6c7773)"}}>Roles shown on RemoteWay are managed through the platform and may be sourced from employers, recruiters or other job information sources. We aim to make listings useful, but we cannot guarantee hiring decisions, the accuracy of every third-party detail or that every employer is an official RemoteWay partner. Review each role carefully and never pay an upfront fee just to receive a job offer.</p><div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:18}}><button className="btn btn-primary" onClick={()=>go("jobs")}>Explore jobs <ArrowRight size={15}/></button><button className="btn btn-outline" onClick={()=>go("resources")}>Career resources</button></div></section></PublicInfoLayout>;
}

function PublicNav({go}){
  const [open,setOpen]=useState(false);
  return <header className="public-nav">
    <Logo go={go}/>
    <nav className={open?"public-links open":"public-links"}>
      <button onClick={()=>go("jobs")}>Find Jobs</button><button onClick={()=>go("companies")}>Companies</button><button onClick={()=>go("resources")}>Resources</button><button onClick={()=>go("about")}>About</button>
    </nav>
    <div className="nav-actions"><button className="text-btn" onClick={()=>go("login")}>Log in</button><Button className="nav-cta" onClick={()=>go("signup")}>Get Started</Button><button className="menu-trigger" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div>
  </header>
}

function Home({go}){
  const [query,setQuery]=useState(""),[where,setWhere]=useState("Anywhere"),[cfg,setCfg]=useState(null),[sections,setSections]=useState({});
  useEffect(()=>{let mounted=true;(async()=>{const [{data},{data:secs}]=await cachedRequest("public:home-config",()=>Promise.all([supabase.from("site_settings").select("key,value").in("key",["brand","home_hero","home_metrics"]),supabase.from("site_sections").select("section_key,is_visible")]),30000);if(mounted){const m={};(data||[]).forEach(x=>m[x.key]=x.value);const vis={};(secs||[]).forEach(x=>vis[x.section_key]=x.is_visible);setCfg(m);setSections(vis)}})();return()=>{mounted=false}},[]);
  const hero=cfg?.home_hero||{badge:"Trusted by 2,500+ companies worldwide",title:"Work that fits your life.",description:"Discover verified remote opportunities from trusted companies around the world. Build your career on your terms.",search_button:"Search Jobs",popular:["Remote","Design","Development","Marketing","Customer Support","Data Entry"]};
  const metrics=cfg?.home_metrics?.items||[["50,000+","Active job seekers"],["3,200+","Trusted companies"],["120+","Countries"],["98%","Satisfaction rate"]];
  const section=(key)=>cfg?true:true;
  return <div className="site" style={{"--green":cfg?.brand?.accent||"#2f6b52","--green2":cfg?.brand?.accent||"#2f6b52","--cream":cfg?.brand?.background||"#f7f4ec","--surface":"#fff"}}>
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
function FeaturedJobs({go}){const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);useEffect(()=>{let mounted=true;(async()=>{const {data,error}=await cachedRequest("public:featured-jobs",()=>supabase.from("jobs").select("id,title,company_name,company_logo,verified,salary_min,salary_max,salary_currency,salary_period,location,job_type,tags,category,created_at,remote_type,experience_level").eq("status","published").order("created_at",{ascending:false}).limit(4),20000);if(!mounted)return;if(!error)setItems((data||[]).map(j=>({...j,company:j.company_name,logo:j.company_logo||j.company_name?.[0]||"R",type:j.job_type,posted:relativePosted(j.created_at),salary:formatSalary(j)})));setLoading(false)})();return()=>{mounted=false}},[]);if(loading)return <div className="empty-state"><h3>Loading featured jobs…</h3><p>Fetching the latest remote opportunities.</p></div>;if(items.length===0)return <EmptyState title="New opportunities are coming soon" text="Our team is preparing more roles from partner companies. Check back shortly." action="Browse all jobs" onAction={()=>go("jobs")}/>;return <div className="job-grid">{items.map(j=><JobCard key={j.id} job={j} onOpen={id=>go("job",id)}/>)}</div>}
function formatSalary(job){if(job.salary_min==null&&job.salary_max==null)return "Salary not disclosed";const currency=job.salary_currency||"USD";const symbol=currency==="USD"?"$":currency==="EUR"?"€":currency==="GBP"?"£":currency==="CAD"?"C$":currency+" ";const fmt=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);const period=job.salary_period==="hour"?"/hr":job.salary_period==="month"?"/mo":"/yr";if(job.salary_min!=null&&job.salary_max!=null)return symbol+fmt(job.salary_min)+"–"+symbol+fmt(job.salary_max)+" "+period;if(job.salary_min!=null)return symbol+fmt(job.salary_min)+"+ "+period;return "Up to "+symbol+fmt(job.salary_max)+" "+period}

function Metric({icon:Icon,value,label}){return <div><Icon/><div><strong>{value}</strong><span>{label}</span></div></div>}
function SectionTitle({kicker,title,text,action,onAction}){return <div className="section-title"><div><span className="kicker">{kicker}</span><h2>{title}</h2><p>{text}</p></div>{action&&<button onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>}

function PartnerLogoStrip({location="footer"}){
  const partners=[
    {name:"Persona",logo:"https://withpersona.com/favicon.ico",url:"https://withpersona.com/"},
    {name:"Okta",logo:"https://cdn.simpleicons.org/okta",url:"https://www.okta.com/"},
    {name:"Clerk",logo:"https://cdn.simpleicons.org/clerk",url:"https://clerk.com/"}
  ];
  return <div className={`partner-logo-strip partner-logo-strip-${location}`} aria-label="Identity and account security services">
    <span className="partner-strip-label">Site protected by</span>
    <div className="partner-logo-list">{partners.map(p=><a className="partner-logo-item" href={p.url} key={p.name} target="_blank" rel="noreferrer" aria-label={p.name} title={p.name}>
      <img src={p.logo} alt="" loading="lazy" decoding="async" onError={e=>{e.currentTarget.style.display="none"}}/><span>{p.name}</span>
    </a>)}</div>
  </div>;
}


const LEGAL_LAST_UPDATED = "9 October 2026";
const LEGAL_CONTENT = {
  privacy: {
    title: "Privacy Policy", intro: "Your trust matters. This policy explains how RemoteWay handles information when you browse opportunities, create an account, apply for work or use our support and account features.",
    sections: [
      ["1. Who this policy covers", "This policy applies to the RemoteWay website and related job-search, application, interview, account, support and payout features (together, the “Platform”). “RemoteWay”, “we”, “us” and “our” refer to the team operating the Platform. The legal name and contact details of the operating entity should be added here before public launch."],
      ["2. Information we may collect", "Depending on the features you use, we may collect account details such as your name, email address, country and profile information; career details such as your skills, CV, work history, preferences and applications; interview answers and related assessment records; messages, support requests and reports; and technical information such as device/browser details, log data and basic usage events. If an identity or payout feature requests verification information, we may also process the information you submit for that purpose. Only provide sensitive identity or financial details through an official RemoteWay flow when it is genuinely requested."],
      ["3. How we use information", "We use information to create and secure accounts; display and personalize job opportunities; process applications and interviews; communicate about applications, account activity and support; investigate suspected fraud or misuse; operate payout or verification features where available; maintain records and improve Platform reliability; and meet applicable legal obligations. We aim to use information for purposes connected to the feature you choose."],
      ["4. How information may be shared", "Information may be shared with a hiring company or its authorized hiring team when you apply or participate in its recruitment process; with service providers that help operate hosting, authentication, communications, security, analytics or payment-related features; with support or compliance personnel who need access to resolve an issue; and with authorities or other parties where disclosure is required by law or reasonably necessary to protect users, the Platform or legal rights. We do not sell personal information to advertisers. A recipient may process information under its own privacy notice."],
      ["5. Retention and security", "We keep information for as long as reasonably necessary for the purposes described in this policy, including account operation, recruitment records, dispute handling, security and legal obligations. Retention periods can differ by record type and local requirements. We use reasonable administrative, technical and organizational safeguards, but no website or storage system can be guaranteed completely secure. Please use a unique password and tell us promptly if you suspect unauthorized account access."],
      ["6. International processing", "Remote work and service providers may involve processing in countries other than your own. Where applicable, we take steps intended to provide an appropriate level of protection for international transfers and comply with relevant data-protection requirements."],
      ["7. Your choices and rights", "Depending on where you live, you may have rights to access, correct, delete, restrict or object to certain processing of your personal information, request a portable copy, or withdraw consent where processing relies on consent. You may also close your account, subject to records we are required or permitted to retain. Contact RemoteWay through the Platform’s Support or Contact option to make a request. We may need to verify your identity before acting."],
      ["8. Cookies and similar technologies", "The Platform may use essential storage or cookies to keep the site working, maintain sessions, remember preferences, protect accounts and understand reliability. If optional analytics or advertising technologies are introduced, we will provide any notices and choices required by applicable law. See the Cookie Policy for more information."],
      ["9. Children", "The Platform is intended for people legally able to seek work and enter into the relevant agreements. It is not designed for children, and we do not knowingly invite children to submit personal information."],
      ["10. Changes and contact", "We may update this policy as the Platform changes or legal requirements evolve. We will update the date above and, where appropriate, provide an in-Platform notice. For privacy questions or requests, use the Support or Contact option on RemoteWay. Before launch, RemoteWay should publish the operator’s legal name, privacy contact and any legally required representative details."]
    ]
  },
  terms: {
    title: "Terms of Service", intro: "These Terms govern your access to and use of RemoteWay. Please read them carefully. By creating an account, checking the acceptance box during registration, or using features where these Terms are presented, you agree to the Terms that apply to your use.",
    sections: [
      ["1. About RemoteWay", "RemoteWay is a platform designed to help people discover remote-work opportunities and manage related profiles, applications, interviews and communications. Features may change over time. The legal name, registered address and operator details must be inserted before public launch."],
      ["2. Eligibility and your account", "You must be legally able to use the Platform and provide accurate, current information. Keep your login credentials confidential, use your own account and promptly notify us through Support if you suspect unauthorized access. You are responsible for activity carried out through your account except where applicable law says otherwise."],
      ["3. Job listings and hiring decisions", "Listings may be provided by employers, recruiters, partners or other sources. We may review or remove listings, but we cannot guarantee every listing, employer, offer, salary, working condition or communication is accurate, current or legitimate. RemoteWay does not promise that you will receive an interview, job offer, income or employment. Hiring companies make their own recruitment decisions and may have separate terms, screening criteria and privacy practices."],
      ["4. Safe job seeking and prohibited conduct", "Do not use the Platform to impersonate another person, misrepresent qualifications, submit false documents, scrape or disrupt the service, bypass security, send spam, harass others, upload unlawful or infringing content, or facilitate fraud. Be cautious if anyone asks you to pay to secure a job, buy equipment from a specified seller, transfer money, disclose a password or provide sensitive information outside an official and clearly explained process. Report suspicious activity through Support."],
      ["5. Profiles, applications and interviews", "You are responsible for the accuracy and appropriateness of the information you submit. When you apply, relevant application and profile information may be shared with the hiring team for recruitment. Interview questions and answers may be recorded or reviewed for recruitment and assessment purposes as explained by the relevant flow. Do not include information you are not authorized to share."],
      ["6. Payouts and financial features", "If payout, rewards or withdrawal features are made available, their availability, eligibility, calculation, processing times, verification requirements, limits, provider fees and supported countries may vary and may be described in additional feature-specific rules. A displayed amount is not a guarantee of payment or employment income. Requests may be delayed, reviewed, rejected or reversed where permitted by applicable rules, fraud checks or provider requirements. Never submit payment-card details, banking credentials or government identifiers unless an official RemoteWay flow clearly requires them for a stated purpose."],
      ["7. Third-party services and links", "The Platform may link to or rely on third-party websites and services. Those services are controlled by their own providers and terms. RemoteWay is not responsible for third-party content, availability, policies or actions, except to the extent applicable law does not permit that limitation."],
      ["8. Intellectual property and feedback", "The Platform’s branding, design, software and original content are owned by or licensed to the relevant rights holder and may not be copied, republished, reverse engineered or commercially exploited without permission, except as permitted by law. You retain rights you have in your own submissions, while allowing RemoteWay to host, process and display them as needed to provide the features you choose and operate the Platform."],
      ["9. Suspension and termination", "We may restrict, suspend or terminate access where reasonably necessary to protect users, investigate suspected fraud, enforce these Terms, respond to legal requirements or maintain Platform security. Where appropriate and lawful, we will explain the reason and provide a way to contact Support. You may stop using the Platform and request account closure, subject to lawful retention obligations."],
      ["10. Disclaimers and liability", "To the extent permitted by applicable law, the Platform is provided on an “as available” basis and we do not guarantee uninterrupted operation, error-free content or a particular recruitment outcome. Nothing in these Terms excludes a consumer right, remedy or liability that cannot lawfully be excluded. To the extent permitted by law, RemoteWay is not liable for indirect or consequential loss arising from third-party hiring decisions, fraudulent third-party conduct or temporary service interruption. Any additional limitation must be reviewed for enforceability in the jurisdictions where RemoteWay operates."],
      ["11. Changes to these Terms", "We may update these Terms to reflect new features, security needs or legal requirements. We will update the date above and provide notice where appropriate. If a change requires renewed consent by law, we will request it before applying the change to you."],
      ["12. Governing law and contact", "These Terms are subject to applicable law. The governing law, dispute forum, legal operator name and registered address must be completed after RemoteWay confirms its operating entity and launch jurisdictions. Please contact us through the Platform’s Support or Contact option with questions."]
    ]
  },
  cookies: {
    title: "Cookie Policy", intro: "RemoteWay uses cookies and similar technologies only as needed to provide and improve the experience, subject to the choices and requirements that apply in your location.",
    sections: [
      ["1. What cookies are", "Cookies are small files stored by a browser. Similar technologies may include local storage, session storage, pixels or software that remembers settings or helps measure service reliability."],
      ["2. How we may use them", "Essential technologies may support sign-in sessions, account security, navigation and core site functions. Preference technologies may remember choices. If analytics or marketing technologies are enabled in the future, they may help us understand general usage or campaign performance, and we will provide consent or opt-out choices where required."],
      ["3. Your controls", "You can review or clear cookies and site storage through your browser settings. Blocking essential technologies may prevent sign-in or other parts of RemoteWay from working correctly. Browser controls do not always stop every similar technology."],
      ["4. Third-party technologies", "Some features may depend on service providers, such as authentication, hosting, communications or payment services. Their technologies may be governed by their own policies. We will update this policy if the Platform’s use of optional technologies changes materially."],
      ["5. Updates and contact", "We may update this policy as features change. For questions about cookies or privacy, contact RemoteWay through the Platform’s Support or Contact option."]
    ]
  }
};
function LegalPage({go,type="terms"}) {
  const legal=LEGAL_CONTENT[type]||LEGAL_CONTENT.terms;
  return <div className="legal-page">
    <header className="legal-header"><button className="legal-back" onClick={()=>go("home")}><ArrowLeft size={16}/> Back to RemoteWay</button><Logo/><span className="kicker">CLEAR. FAIR. REMOTE-READY.</span></header>
    <main className="legal-main"><div className="legal-intro"><span className="kicker">REMOTEWAY · LEGAL</span><h1>{legal.title}</h1><p>{legal.intro}</p><small>Last updated: {LEGAL_LAST_UPDATED}</small></div>
      <div className="legal-layout"><nav className="legal-toc" aria-label="Legal pages">{[["privacy","Privacy Policy"],["terms","Terms of Service"],["cookies","Cookie Policy"]].map(([key,label])=><button key={key} className={type===key?"active":""} onClick={()=>go(key)}>{label}<ChevronRight size={14}/></button>)}</nav>
      <article className="legal-document">{legal.sections.map(([heading,body])=><section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<div className="legal-contact"><ShieldCheck size={18}/><div><strong>Your next step matters.</strong><p>Questions about these terms or your information? Contact RemoteWay through Support or Contact in the Platform.</p></div></div></article></div>
      <div className="legal-bottom-links"><button onClick={()=>go("privacy")}>Privacy Policy</button><button onClick={()=>go("terms")}>Terms of Service</button><button onClick={()=>go("cookies")}>Cookie Policy</button></div>
      <p className="legal-review-note">These are launch-draft terms, not a substitute for advice from a qualified lawyer. RemoteWay should confirm its legal operating entity, contact details, governing law, data-retention practices and country-specific obligations before publishing.</p>
    </main><footer className="legal-footer"><Logo light/><span>© 2026 RemoteWay. Work. Anywhere.</span></footer>
  </div>;
}

function Footer({go}){return <footer className="footer"><div className="footer-grid"><div><Logo light/><p>Work. Anywhere.</p></div><div><h4>For Job Seekers</h4><button onClick={()=>go("jobs")}>Find Jobs</button><button onClick={()=>go("privacy")}>Privacy & safety</button><button onClick={()=>go("terms")}>Terms of Service</button></div><div><h4>For Companies</h4><span className="footer-copy">Interested in a listing? Contact the RemoteWay team.</span><button onClick={()=>go("companies")}>Browse companies</button><button onClick={()=>go("terms")}>Partner terms</button><button onClick={()=>go("privacy")}>Data & privacy</button></div><div><h4>Company</h4><button onClick={()=>go("about")}>About RemoteWay</button><button onClick={()=>go("resources")}>Career resources</button><button onClick={()=>go("cookies")}>Cookie Policy</button><button onClick={()=>go("terms")}>Terms & Conditions</button><div className="footer-contact"><h4>Contact our team</h4><p className="footer-copy">Speak with us or send a message.</p><div className="footer-contact-list">{[{number:"+1 669 214 7825",digits:"16692147825"},{number:"+1 702 775 6514",digits:"17027756514"}].map(c=><div className="footer-contact-row" key={c.digits}><span className="footer-contact-number">{c.number}</span><span className="footer-contact-actions"><a href={"tel:+"+c.digits} aria-label={"Call "+c.number}>Call</a><span aria-hidden="true">·</span><a href={"sms:+"+c.digits} aria-label={"Message "+c.number}>Message</a></span></div>)}</div></div></div><div><h4>Stay in the loop</h4><p>Get the latest jobs and career tips.</p><div className="newsletter"><input placeholder="Your email address"/><button><ArrowRight size={15}/></button></div></div></div><PartnerLogoStrip location="footer"/><div className="footer-bottom"><span>© 2026 RemoteWay. All rights reserved.</span><div><button onClick={()=>go("privacy")}>Privacy Policy</button><button onClick={()=>go("terms")}>Terms of Service</button><button onClick={()=>go("cookies")}>Cookies</button></div></div></footer>}

function Jobs({go,initialQuery="",member=false}){
  const [query,setQuery]=useState(initialQuery);
  const [remote,setRemote]=useState("All");
  const [sort,setSort]=useState("Most relevant");
  const [mobileFilters,setMobileFilters]=useState(false);
  const [jobsData,setJobsData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const hasLoaded=useRef(false);
  useEffect(()=>{
    let mounted=true;
    let requestId=0;
    const load=async()=>{
      const current=++requestId;
      if(!hasLoaded.current)setLoading(true);
      setError("");
      try{
        const {data,error:fetchError}=await cachedRequest("public:jobs:"+remote,()=>{
          let request=supabase.from("jobs").select("id,title,company_name,company_logo,verified,salary_min,salary_max,salary_currency,salary_period,location,job_type,tags,category,created_at,remote_type,experience_level").eq("status","published");
          if(remote!=="All")request=request.ilike("location","%"+remote+"%");
          return request.order("created_at",{ascending:false});
        },20000);
        if(!mounted||current!==requestId)return;
        if(fetchError){
          setError(fetchError.message);
        }else{
          setJobsData((data||[]).map(j=>({...j,company:j.company_name,logo:j.company_logo||j.company_name?.[0]||"R",type:j.job_type,posted:relativePosted(j.created_at),salary:formatSalary(j)})));
          setError("");
        }
      }catch(err){
        if(mounted&&current===requestId)setError(err?.message||"We couldn't load jobs. Please try again.");
      }finally{
        if(mounted&&current===requestId){hasLoaded.current=true;setLoading(false)}
      }
    };
    const refresh=()=>{if(document.visibilityState==="visible")load()};
    load();
    window.addEventListener("pageshow",refresh);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",refresh);
    return()=>{mounted=false;requestId++;window.removeEventListener("pageshow",refresh);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh)};
  },[remote]);
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

  const queueBulkEmail=async()=>{
    const selectedTargets=filtered.filter(r=>selectedIds.includes(r.id));
    const targets=[...new Map(selectedTargets.map(r=>[r.user_id,r])).values()];
    if(!targets.length){setBulkMessage("Select at least one candidate first.");return}
    if(!bulkSubject.trim()||!bulkBody.trim()){setBulkMessage("Enter an email subject and message.");return}
    setQueueing(true);setBulkMessage("");
    try{
      const {data,error:queueError}=await supabase.functions.invoke("queue-admin-broadcast",{body:{candidate_ids:targets.map(r=>r.user_id),subject:bulkSubject.trim(),body:bulkBody.trim()}});
      if(queueError)throw queueError;
      if(data?.error)throw new Error(data.error);
      const count=Number(data?.queued||0);
      setBulkMessage("Queued "+count+" email(s) for delivery. "+(data?.skipped?data.skipped+" selected candidate(s) were skipped because no deliverable email was available.":"The delivery worker will process the queue automatically."));
      setSelectedIds([]);
    }catch(e){setBulkMessage("Could not queue the emails: "+(e?.message||"Please try again."))}
    finally{setQueueing(false)}
  };
  const selectAllFiltered=()=>setSelectedIds(filtered.map(r=>r.id));
  const selectPassedFiltered=()=>setSelectedIds(filtered.filter(r=>results.some(x=>x.application_id===r.id&&x.passed)).map(r=>r.id));
  const toggleCandidate=id=>setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const statusTone=s=>s==="submitted"?"green":s==="reviewing"||s==="interview"?"amber":s==="hired"?"green":"soft";

  return <div className="workspace admin-workspace">
    <div className="workspace-head"><div><span className="kicker">PLATFORM OPERATIONS</span><h1>Application management</h1><p>Review incoming applications from candidates who applied to your partner-company jobs.</p></div><Button variant="outline" onClick={load}><ArrowRight size={15}/> Refresh</Button></div>
    <section className="admin-control-note"><ShieldCheck size={18}/><div><strong>Admin-only candidate pipeline</strong><span>Candidate information is visible only to authorized RemoteWay administrators. Partner companies do not access this workspace.</span></div></section>
    {error&&<div className="auth-message auth-error" role="alert">{error}</div>}
    <section className="panel">
      <div className="application-admin-filters">
        <label className="field"><span>Search candidates</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, job or company"/></label>
        <label className="field"><span>Job</span><select value={jobId} onChange={e=>setJobId(e.target.value)}><option value="All">All jobs</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title} · {j.company_name}</option>)}</select></label>
        <label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="interview">Interview</option><option value="rejected">Rejected</option><option value="hired">Hired</option><option value="withdrawn">Withdrawn</option></select></label>
      </div>
    </section>
    <section className="panel admin-bulk-email">
      <div className="admin-bulk-head"><div><span className="kicker">CANDIDATE OUTREACH</span><h2>Bulk email</h2><p>Select candidates below, including candidates who passed the interview assessment, then prepare one message for the selected group.</p></div><Badge tone="soft">{selectedIds.length} selected</Badge></div>
      <div className="admin-bulk-actions"><Button variant="outline" onClick={selectAllFiltered}>Select all filtered</Button><Button variant="outline" onClick={selectPassedFiltered}>Select candidates who passed</Button><Button variant="ghost" onClick={()=>setSelectedIds([])}>Clear selection</Button></div>
      <label className="field"><span>Email subject</span><input value={bulkSubject} onChange={e=>setBulkSubject(e.target.value)} placeholder="Email subject"/></label>
      <label className="field"><span>Email message</span><textarea rows={4} value={bulkBody} onChange={e=>setBulkBody(e.target.value)} placeholder="Write the message for selected candidates"/></label>
      {bulkMessage&&<div className={bulkMessage.startsWith("Queued")?"notice":"auth-message auth-error"} role="status">{bulkMessage}</div>}
      <Button onClick={queueBulkEmail} disabled={queueing||selectedIds.length===0}>{queueing?"Queuing emails…":"Queue email to selected candidates"} <Send size={15}/></Button>
      <p className="admin-email-disclaimer">Broadcasts are queued securely for selected applicants and processed automatically by RemoteWay’s email worker. Delivery still depends on valid Resend credentials and a verified sender domain.</p>
    </section>
    <div className="pipeline-tabs">
      {["All","submitted","reviewing","interview","hired"].map(x=><button key={x} className={status===x?"active":""} onClick={()=>setStatus(x)}>{x==="All"?"All":x[0].toUpperCase()+x.slice(1)} <span>{x==="All"?rows.length:rows.filter(r=>r.status===x).length}</span></button>)}
    </div>
    {loading?<div className="empty-state"><h3>Loading applications…</h3><p>Fetching the latest candidate submissions.</p></div>:filtered.length===0?<EmptyState title="No applications match these filters" text="New candidate applications will appear here when job seekers submit their applications." action="Clear filters" onAction={()=>{setQuery("");setJobId("All");setStatus("All")}}/>:<section className="panel"><div className="candidate-table">{filtered.map(r=>{const result=results.find(x=>x.application_id===r.id);return <div className="admin-application-row-wrap" key={r.id}><input type="checkbox" aria-label={"Select "+(r.profiles?.full_name||"candidate")} checked={selectedIds.includes(r.id)} onChange={()=>toggleCandidate(r.id)}/><button type="button" className="candidate-row large admin-application-row" onClick={()=>openApplication(r)}><Avatar letter={(r.profiles?.full_name||"C")[0].toUpperCase()}/><div><strong>{r.profiles?.full_name||"Candidate"}</strong><span>{r.jobs?.title||"Job application"} · {r.jobs?.company_name||"Partner company"}</span></div><span>{r.profiles?.country||"Country not set"}</span><span>{r.submitted_at?new Date(r.submitted_at).toLocaleDateString():new Date(r.created_at).toLocaleDateString()}</span><span>{result?result.score+"/"+result.total_questions+" correct":"Not taken"}</span><Badge tone={statusTone(r.status)}>{r.status}</Badge><span className="candidate-action"><ArrowRight size={15}/></span></button></div>})}</div></section>}
    {selected&&<div className="payout-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="payout-modal admin-application-modal" role="dialog" aria-modal="true">
      <div className="payout-modal-head"><div><span className="kicker">APPLICATION #{selected.id}</span><h2>{selected.profiles?.full_name||"Candidate"}</h2><p>{selected.jobs?.title||"Job application"} · {selected.jobs?.company_name||"Partner company"}</p></div><button className="payout-modal-close" onClick={()=>setSelected(null)}><X size={18}/></button></div>
      <div className="review-list">
        <ReviewItem label="Interview score" value={(results.find(x=>x.application_id===selected.id))?results.find(x=>x.application_id===selected.id).score+"/"+results.find(x=>x.application_id===selected.id).total_questions+" correct": "Not completed yet"}/>
        <ReviewItem label="Assessment outcome" value={(results.find(x=>x.application_id===selected.id))?(results.find(x=>x.application_id===selected.id).passed?"Met preliminary threshold":"Below preliminary threshold"):"Pending review"}/>
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
  const [identityRecord,setIdentityRecord]=useState(null);
  const [identityLoading,setIdentityLoading]=useState(false);

  const load=async()=>{
    setLoading(true);setError("");
    try{
      const {data,error:e}=await supabase.from("verification_profiles").select("id,user_id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason,profiles(full_name)").order("updated_at",{ascending:false});
      if(e)throw e;
      setItems(data||[]);
    }catch(e){setError(e?.message||"Verification cases could not be loaded. Please refresh.");}
    finally{setLoading(false);}
  };

  useEffect(()=>{load()},[]);

  const updateStatus=async(item,status)=>{
    setError("");
    setSaving(String(item.id));
    try{
      if(status==="verified"){
        const [documentsRes,identityRes]=await Promise.all([
          supabase.from("verification_documents").select("id,side,status,storage_path").eq("verification_id",item.id),
          supabase.from("demo_identity_records").select("id").eq("verification_id",item.id).maybeSingle()
        ]);
        if(documentsRes.error||identityRes.error)throw (documentsRes.error||identityRes.error);
        const docs=documentsRes.data||[];
        const hasFront=docs.some(d=>d.side==="front"&&d.status==="submitted"&&d.storage_path);
        const hasBack=docs.some(d=>d.side==="back"&&d.status==="submitted"&&d.storage_path);
        if(item.status!=="pending"||!item.submitted_at||!hasFront||!hasBack||!identityRes.data)
          throw new Error("This case cannot be approved yet. The member must submit all required identity fields and both document sides before admin review.");
      }
      const payload={status};
      if(status==="verified")payload.verified_at=new Date().toISOString();
      if(status==="in_progress")payload.verified_at=null;
      if(status==="needs_attention")payload.needs_attention_reason="Manual review required";
      if(status==="rejected")payload.needs_attention_reason="Verification could not be completed";
      const {data,error:e}=await supabase.from("verification_profiles").update(payload).eq("id",item.id).select("id,user_id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason,profiles(full_name)").single();
      if(e)throw e;
      setItems(prev=>prev.map(x=>x.id===item.id?data:x));
    }catch(e){setError(e?.message||"Verification status could not be updated.");}
    finally{setSaving("");}
  };

  const openDocuments=async(item)=>{
    setSelectedCandidate(item);setDocuments([]);setSelectedDocument(null);setIdentityRecord(null);
    setDocumentsLoading(true);setIdentityLoading(true);setError("");
    try{
      const [docsResult,identityResult]=await Promise.all([
        supabase.from("verification_documents").select("id,verification_id,document_type,side,storage_path,status,mime_type,created_at").eq("verification_id",item.id).order("side"),
        supabase.from("demo_identity_records").select("id,verification_id,user_id,legal_name,date_of_birth,residential_address,country,government_identifier,created_at,updated_at").eq("verification_id",item.id).maybeSingle()
      ]);
      if(docsResult.error)throw docsResult.error;
      if(identityResult.error)throw identityResult.error;
      const resolved=await Promise.all((docsResult.data||[]).filter(doc=>doc.storage_path).map(async doc=>{
        const {data:signed,error:signedError}=await supabase.storage.from("verification-demo").createSignedUrl(doc.storage_path,300);
        if(signedError)throw signedError;
        return {...doc,signedUrl:signed?.signedUrl||""};
      }));
      setDocuments(resolved);setIdentityRecord(identityResult.data||null);
    }catch(e){setError(e?.message||"Could not load the verification record.");}
    finally{setDocumentsLoading(false);setIdentityLoading(false);}
  };
  const closeDocuments=()=>{setSelectedCandidate(null);setDocuments([]);setSelectedDocument(null);setIdentityRecord(null)};

  return <div className="workspace">
    <div className="workspace-head"><div><span className="kicker">ADMIN · IDENTITY</span><h1>Verification review</h1><p>Review verification workflow status and, when demo uploads are enabled, securely preview submitted identity documents.</p></div><Badge tone="soft"><ShieldCheck size={13}/> Restricted admin view</Badge></div>
    <div className="admin-control-note"><ShieldCheck size={18}/><div><strong>Privacy-first review</strong><span>Raw documents remain in the private demo bucket. Preview links are short-lived and available only to authorized administrators.</span></div></div>
    {error&&<div className="auth-message auth-error">{error}</div>}
    <section className="panel admin-verification-panel">
      {loading?<div className="empty-state"><h3>Loading verification cases…</h3><p>Fetching the latest secure status records.</p></div>:items.length===0?<EmptyState title="No verification cases yet" text="Candidates will appear here after they start the identity verification flow."/>:
      <div className="admin-verification-list">{items.map(item=><div className="admin-verification-row" key={item.id}>
        <div className="company-avatar"><ShieldCheck size={16}/></div>
        <div className="admin-verification-main"><strong>{item.profiles?.full_name||"RemoteWay member"}</strong><span>{item.country||"Country not selected"} · {item.document_type||"Document not selected"}</span><small>{item.submitted_at?"Submitted "+new Date(item.submitted_at).toLocaleString():"Submission not complete"}</small></div>
        <Badge tone={item.status==="verified"?"green":item.status==="needs_attention"?"warning":"soft"}>{item.status==="pending"?"Pending review":item.status.replaceAll("_"," ")}</Badge>
        <div className="admin-verification-actions"><button className="btn btn-soft" onClick={()=>openDocuments(item)}>View documents <ArrowRight size={14}/></button><label className="admin-status"><span>Status</span><select value={item.status} disabled={saving===String(item.id)} onChange={e=>updateStatus(item,e.target.value)}><option value="required">Required</option><option value="in_progress">In progress</option><option value="pending">Pending review</option><option value="verified">Verified</option><option value="needs_attention">Needs attention</option><option value="rejected">Rejected</option></select></label></div>
      </div>)}</div>}
    </section>

    {selectedCandidate&&<div className="payout-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeDocuments()}}>
      <section className="payout-modal admin-verification-doc-modal" role="dialog" aria-modal="true">
        <div className="payout-modal-head"><div><span className="kicker">VERIFICATION RECORD</span><h2>{selectedCandidate.profiles?.full_name||"RemoteWay member"}</h2><p>{selectedCandidate.document_type||"Identity document"} · {selectedCandidate.status.replaceAll("_"," ")} · Restricted admin view</p></div><button className="payout-modal-close" onClick={closeDocuments}><X size={18}/></button></div><div className="admin-verification-summary"><h3>Verification summary</h3><p>Country: {selectedCandidate.country||"Not provided"} · Started: {selectedCandidate.started_at?new Date(selectedCandidate.started_at).toLocaleString():"Not provided"} · Submitted: {selectedCandidate.submitted_at?new Date(selectedCandidate.submitted_at).toLocaleString():"Not submitted"} · Verified: {selectedCandidate.verified_at?new Date(selectedCandidate.verified_at).toLocaleString():"Not verified"}</p><p>Review status: {selectedCandidate.status==="pending"?"Awaiting administrator decision":selectedCandidate.status.replaceAll("_"," ")} · Submission timestamp: {selectedCandidate.submitted_at?new Date(selectedCandidate.submitted_at).toLocaleString():"Not submitted"}</p></div><section className="admin-verification-section"><h3>Protected identity data</h3>{identityLoading?<p>Loading identity data…</p>:identityRecord?<div style={{display:"grid",gap:8}}>{[["Legal name",identityRecord.legal_name],["Date of birth",identityRecord.date_of_birth],["Residential address",identityRecord.residential_address],["Country",identityRecord.country],["Government identifier",identityRecord.government_identifier],["Saved",identityRecord.created_at?new Date(identityRecord.created_at).toLocaleString():"Not provided"]].map(([label,value])=><div key={label} style={{display:"grid",gridTemplateColumns:"minmax(120px,180px) minmax(0,1fr)",gap:10,overflowWrap:"anywhere"}}><span>{label}</span><strong style={{fontWeight:500}}>{value||"Not provided"}</strong></div>)}</div>:<p>No protected identity record has been submitted.</p>}</section><section className="admin-verification-section admin-verification-documents-section"><h3>Submitted identity documents</h3>
        {documentsLoading?<div className="empty-state"><h3>Loading secure previews…</h3><p>Generating short-lived document links.</p></div>:documents.length===0?<div className="empty-state"><FileText size={24}/><h3>No uploaded documents found</h3><p>This verification case has no demo files available for preview.</p></div>:<div className="admin-verification-doc-grid">
          {documents.map(doc=><button type="button" className="admin-verification-doc-card" key={doc.id} onClick={()=>setSelectedDocument(doc)}>
            <span className="admin-verification-doc-thumb">{doc.signedUrl&&/\.(jpe?g|png|webp)$/i.test(doc.storage_path||"")?<img src={doc.signedUrl} alt={doc.side+" of identity document"}/>:<FileText size={26}/>}</span>
            <span><strong>{doc.side==="front"?"Front":"Back"} of document</strong><small>{doc.storage_path?.split("/").pop()||"Uploaded document"}</small></span>
            <ArrowRight size={15}/>
          </button>)}
        </div>}
        <div className="verification-preview-note"><LockKeyhole size={15}/><span>Preview links expire automatically. The storage bucket remains private and documents are never made public.</span></div>
        </section>
      </section>
    </div>}

    {selectedDocument?.signedUrl&&<div className="payout-modal-backdrop verification-preview-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedDocument(null)}}>
      <section className="verification-document-viewer" role="dialog" aria-modal="true">
        <div className="verification-document-viewer-head"><div><span className="kicker">{selectedDocument.side==="front"?"FRONT":"BACK"} OF DOCUMENT</span><strong>{selectedCandidate?.profiles?.full_name||"RemoteWay member"}</strong></div><button className="payout-modal-close" onClick={()=>setSelectedDocument(null)}><X size={18}/></button></div>
        <div className="verification-document-viewer-body">{(selectedDocument.mime_type?.startsWith("image/")||/\.(jpe?g|png|webp)$/i.test(selectedDocument.storage_path||""))?<img src={selectedDocument.signedUrl} alt={selectedDocument.side+" of identity document"}/>:<iframe title="Secure identity document preview" src={selectedDocument.signedUrl}/>}</div>
      </section>
    </div>}
  </div>;
}
function AdminMembers({go}){
  const [rows,setRows]=useState([]);
  const memberStats=useMemo(()=>{const cutoff=Date.now()-86400000;return {total:rows.length,last24:rows.filter(x=>x.created_at&&new Date(x.created_at).getTime()>=cutoff).length,active:rows.filter(x=>x.account_status==="active").length}},[rows]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [saving,setSaving]=useState("");
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState(null);
  const [details,setDetails]=useState(null);
  const [detailLoading,setDetailLoading]=useState(false);
  const [detailError,setDetailError]=useState("");
  const [fileBusy,setFileBusy]=useState("");
  const [editing,setEditing]=useState(false);
  const [editDraft,setEditDraft]=useState({});
  const [removing,setRemoving]=useState("");
  const load=async()=>{
    setLoading(true);setError("");
    const {data,error:e}=await supabase.from("profiles").select("id,full_name,country,experience,adaptive_answer,work_type,goal,interest_areas,role,account_type,account_status,onboarding_completed,avatar_url,created_at,updated_at,settings").order("created_at",{ascending:false});
    if(e)setError(e.message);
    setRows(data||[]);setLoading(false);
  };
  useEffect(()=>{load()},[]);
  const openDetails=async(row)=>{
    setSelected(row);setDetails(null);setDetailError("");setDetailLoading(true);
    const userId=row.id;
    const requests=[
      ["applications",supabase.from("applications").select("id,job_id,status,cover_note,answers,submitted_at,created_at,updated_at,resume_id").eq("user_id",userId).order("created_at",{ascending:false})],
      ["resumes",supabase.from("resumes").select("id,file_name,storage_path,file_size,mime_type,created_at").eq("user_id",userId).order("created_at",{ascending:false})],
      ["savedJobs",supabase.from("saved_jobs").select("job_id,created_at").eq("user_id",userId).order("created_at",{ascending:false})],
      ["interviews",supabase.from("interviews").select("id,application_id,title,company_name,status,scheduled_at,duration_minutes,started_at,completed_at,score,total_questions,passed,created_at").eq("candidate_id",userId).order("created_at",{ascending:false})],
      ["tickets",supabase.from("support_tickets").select("id,issue_type,subject,status,created_at,updated_at").eq("user_id",userId).order("created_at",{ascending:false})],
      ["verification",supabase.from("verification_profiles").select("id,status,country,document_type,provider,started_at,submitted_at,verified_at,needs_attention_reason,created_at,updated_at").eq("user_id",userId).order("created_at",{ascending:false})],
      ["payouts",supabase.from("payouts").select("id,amount,currency,status,provider_reference,failure_reason,created_at,updated_at").eq("user_id",userId).order("created_at",{ascending:false})],
      ["payoutMethods",supabase.from("payout_methods").select("id,method_type,is_default,bank_country,bank_name,account_holder_name,account_last4,paypal_name,paypal_email,cardholder_name,card_last4,status,created_at,updated_at").eq("user_id",userId).order("created_at",{ascending:false})],
      ["notifications",supabase.from("notifications").select("id,type,title,body,read_at,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(30)],
      ["identity",supabase.from("demo_identity_records").select("id,verification_id,legal_name,date_of_birth,residential_address,country,created_at,updated_at").eq("user_id",userId).order("created_at",{ascending:false})],
      ["supportMessages",supabase.from("support_messages").select("id,ticket_id,sender_type,body,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(50)]
    ];
    const results=await Promise.all(requests.map(async([key,request])=>({key,...(await request)})));
    const loaded={};
    const failed=[];
    for(const result of results){loaded[result.key]=result.data||[];if(result.error)failed.push(result.key);}
    setDetails(loaded);
    if(failed.length)setDetailError("Some sections could not be loaded due to database access rules: "+failed.join(", ")+". Other available details are shown below.");
    setDetailLoading(false);
  };
  const changeStatus=async(row,status)=>{
    if(row.account_status===status)return;
    setSaving(row.id);setError("");
    const {data:{user}}=await supabase.auth.getUser();
    const {data,error:e}=await supabase.from("profiles").update({account_status:status}).eq("id",row.id).select("id,full_name,country,experience,adaptive_answer,work_type,goal,interest_areas,role,account_type,account_status,onboarding_completed,avatar_url,created_at,updated_at,settings").single();
    if(e)setError(e.message);
    else{
      setRows(prev=>prev.map(x=>x.id===row.id?data:x));
      if(selected?.id===row.id)setSelected(data);
      await supabase.from("admin_audit_logs").insert({admin_user_id:user.id,action:"account_status_changed",target_type:"profile",target_id:row.id,details:{from:row.account_status,to:status}});
    }
    setSaving("");
  };
  const beginEdit=()=>{setEditDraft({full_name:selected?.full_name||"",country:selected?.country||"",experience:selected?.experience||"",work_type:selected?.work_type||"",goal:selected?.goal||"",adaptive_answer:selected?.adaptive_answer||"",interest_areas:Array.isArray(selected?.interest_areas)?selected.interest_areas.join(", "):selected?.interest_areas||""});setEditing(true);setError("");};
  const saveMemberEdit=async()=>{
    if(!selected||!editing)return;
    const full_name=String(editDraft.full_name||"").trim();
    if(!full_name){setError("Full name is required.");return;}
    setSaving(selected.id);setError("");
    try{
      const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;
      const patch={full_name,country:String(editDraft.country||"").trim()||null,experience:String(editDraft.experience||"").trim()||null,work_type:String(editDraft.work_type||"").trim()||null,goal:String(editDraft.goal||"").trim()||null,adaptive_answer:String(editDraft.adaptive_answer||"").trim()||null,interest_areas:String(editDraft.interest_areas||"").split(",").map(x=>x.trim()).filter(Boolean)};
      const {data,error:e}=await supabase.from("profiles").update(patch).eq("id",selected.id).select("id,full_name,country,experience,adaptive_answer,work_type,goal,interest_areas,role,account_type,account_status,onboarding_completed,avatar_url,created_at,updated_at,settings").single();
      if(e)throw e;
      setRows(prev=>prev.map(x=>x.id===data.id?data:x));setSelected(data);setEditing(false);
      if(user)await supabase.from("admin_audit_logs").insert({admin_user_id:user.id,action:"member_profile_edited",target_type:"profile",target_id:data.id,details:{fields:Object.keys(patch)}});
    }catch(e){setError(e?.message||"Member details could not be saved.");}finally{setSaving("");}
  };
  const removeMemberSafely=async(row)=>{
    if(!row||row.role==="admin"||row.role==="super_admin"){setError("Administrator accounts are protected from member removal.");return;}
    const confirmed=window.confirm("Remove "+(row.full_name||"this member")+" from active access? This safely suspends the account and preserves its history; it does not permanently erase records.");
    if(!confirmed)return;
    setRemoving(row.id);setError("");
    try{
      const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;
      const {data,error:e}=await supabase.from("profiles").update({account_status:"suspended"}).eq("id",row.id).eq("role","user").select("id,full_name,country,experience,adaptive_answer,work_type,goal,interest_areas,role,account_type,account_status,onboarding_completed,avatar_url,created_at,updated_at,settings").single();
      if(e)throw e;
      setRows(prev=>prev.map(x=>x.id===row.id?data:x));if(selected?.id===row.id){setSelected(data);setEditing(false);}
      if(user)await supabase.from("admin_audit_logs").insert({admin_user_id:user.id,action:"member_removed_suspended",target_type:"profile",target_id:row.id,details:{from:row.account_status,to:"suspended"}});
    }catch(e){setError(e?.message||"The member could not be removed.");}finally{setRemoving("");}
  };
  const openResume=async(file)=>{
    setFileBusy(file.id);setDetailError("");
    try{
      const {data,error:e}=await supabase.storage.from("resumes").createSignedUrl(file.storage_path,300);
      if(e)throw e;
      if(!data?.signedUrl)throw new Error("A secure file link could not be created.");
      window.open(data.signedUrl,"_blank","noopener,noreferrer");
    }catch(e){setDetailError(e?.message||"Could not open this private file.");}
    finally{setFileBusy("");}
  };
  const fmtDate=value=>value?new Date(value).toLocaleString():"—";
  const showValue=value=>value===null||value===undefined||value===""?"Not provided":Array.isArray(value)?(value.length?value.join(", "):"None selected"):typeof value==="object"?JSON.stringify(value):String(value);
  const section=(title,items,fields,empty="No records found")=><section className="panel" style={{padding:18,marginTop:14}}><h3 style={{margin:"0 0 12px"}}>{title} <span style={{fontWeight:400,color:"var(--muted,#777)"}}>({items?.length||0})</span></h3>{!items?.length?<p style={{margin:0,color:"var(--muted,#777)"}}>{empty}</p>:<div style={{display:"grid",gap:10}}>{items.map((item,index)=><div key={item.id||item.job_id||index} style={{padding:"12px 0",borderTop:"1px solid var(--border,#e7e7e7)",overflowWrap:"anywhere"}}>{fields.map(([label,key])=><div key={key} style={{display:"grid",gridTemplateColumns:"minmax(100px, 160px) minmax(0,1fr)",gap:10,padding:"3px 0"}}><span style={{color:"var(--muted,#777)",fontSize:13}}>{label}</span><span style={{fontSize:13}}>{showValue(item[key])}</span></div>)}</div>)}</div>}</section>;
  const q=query.trim().toLowerCase();
  const filtered=rows.filter(r=>[r.full_name,r.country,r.account_type,r.role,r.account_status,r.id].filter(Boolean).join(" ").toLowerCase().includes(q));
  return <div className="workspace admin-workspace">
    <section className="studio-grid" style={{marginBottom:18}}><article className="panel" style={{padding:18}}><span className="kicker">TOTAL REGISTERED USERS</span><h2 style={{fontSize:30,margin:"8px 0"}}>{memberStats.total.toLocaleString()}</h2><span className="studio-muted">All member profiles</span></article><article className="panel" style={{padding:18}}><span className="kicker">NEW IN LAST 24 HOURS</span><h2 style={{fontSize:30,margin:"8px 0"}}>{memberStats.last24.toLocaleString()}</h2><span className="studio-muted">Accounts created in the last 24 hours</span></article><article className="panel" style={{padding:18}}><span className="kicker">ACTIVE ACCOUNTS</span><h2 style={{fontSize:30,margin:"8px 0"}}>{memberStats.active.toLocaleString()}</h2><span className="studio-muted">Accounts marked active</span></article></section>
    <div className="workspace-head"><div><span className="kicker">PLATFORM OPERATIONS</span><h1>Member management</h1><p>Open any member to review their available account, work, document and activity records in one place.</p></div><Button variant="outline" onClick={load}><ArrowRight size={15}/> Refresh</Button></div>
    <section className="admin-control-note"><ShieldCheck size={18}/><div><strong>Restricted administrative controls</strong><span>Private files use short-lived signed links. Passwords, authentication tokens and full payment card credentials are not displayed.</span></div></section>
    {error&&<div className="auth-message auth-error" role="alert">{error}</div>}
    <section className="panel"><div className="application-admin-filters"><label className="field"><span>Search members</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, country, ID, role or status"/></label></div></section>
    {loading?<div className="empty-state"><h3>Loading members…</h3><p>Fetching profile records from Supabase.</p></div>:filtered.length===0?<EmptyState title="No members found" text="Try a different search."/>:<section className="panel"><div className="admin-member-list">{filtered.map(row=><div className="admin-member-row" key={row.id}>
      <Avatar letter={(row.full_name||"M")[0].toUpperCase()}/>
      <div className="admin-member-main"><strong>{row.full_name||"Unnamed member"}</strong><span>{row.country||"Country not set"} · {row.account_type==="job_seeker"?"Job seeker":"Employer"} · {(row.role==="admin"||row.role==="super_admin")?"Administrator":"Member"}</span><small>{row.onboarding_completed?"Onboarding complete":"Onboarding incomplete"} · Joined {new Date(row.created_at).toLocaleDateString()}</small></div>
      <Button variant="outline" onClick={()=>openDetails(row)}><UserRound size={15}/> View profile</Button>
      <Badge tone={row.account_status==="active"?"green":row.account_status==="suspended"?"warning":"soft"}>{row.account_status}</Badge>
      {(row.role==="admin"||row.role==="super_admin")?<span className="admin-member-protected">Protected admin</span>:<label className="admin-status"><span>Access</span><select value={row.account_status} disabled={saving===row.id} onChange={e=>changeStatus(row,e.target.value)}><option value="active">Active</option><option value="restricted">Restricted</option><option value="suspended">Suspended</option></select></label>}
    </div>)}</div></section>}
    {selected&&<div role="dialog" aria-modal="true" aria-label={"Member profile: "+(selected.full_name||"Unnamed member")} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,25,22,.62)",display:"flex",justifyContent:"center",alignItems:"stretch",padding:"clamp(8px,2vw,24px)"}}>
      <div style={{background:"var(--surface,#fff)",color:"var(--text,#222)",borderRadius:18,width:"min(1100px,100%)",overflowY:"auto",padding:"clamp(16px,3vw,28px)",boxShadow:"0 24px 80px rgba(0,0,0,.24)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:20}}><div><span className="kicker">COMPLETE MEMBER RECORD</span><h2 style={{margin:"6px 0"}}>{selected.full_name||"Unnamed member"}</h2><p style={{margin:0,color:"var(--muted,#777)",overflowWrap:"anywhere"}}>{selected.id}</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>{selected.role==="admin"||selected.role==="super_admin"?<span className="admin-member-protected">Protected administrator</span>:<><Button variant="outline" onClick={beginEdit} disabled={editing}><PenLine size={15}/> Edit details</Button><Button variant="outline" onClick={()=>removeMemberSafely(selected)} disabled={removing===selected.id||selected.account_status==="suspended"}><X size={15}/>{removing===selected.id?"Removing…":"Remove member"}</Button></>}<Button variant="outline" onClick={()=>{setSelected(null);setDetails(null);setEditing(false)}}><X size={16}/> Close</Button></div></div>
        {detailLoading?<div className="empty-state"><h3>Loading member record…</h3><p>Collecting this member’s linked records.</p></div>:<React.Fragment>
          {detailError&&<div className="auth-message auth-error" role="alert">{detailError}</div>}
          {editing&&<section className="panel" style={{padding:18,marginBottom:14,border:"1px solid var(--accent,#2f6b52)"}}><h3 style={{margin:"0 0 14px"}}>Edit member details</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>{[["full_name","Full name"],["country","Country"],["experience","Experience"],["work_type","Work preference"],["goal","Work goal"],["adaptive_answer","Onboarding answer"],["interest_areas","Interest areas (comma-separated)"]].map(([key,label])=><label className="field" key={key}><span>{label}</span><input value={editDraft[key]??""} onChange={e=>setEditDraft(v=>({...v,[key]:e.target.value}))}/></label>)}</div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}><Button variant="outline" onClick={()=>setEditing(false)} disabled={saving===selected.id}>Cancel</Button><Button onClick={saveMemberEdit} disabled={saving===selected.id}>{saving===selected.id?"Saving…":"Save member details"}</Button></div></section>}
          <section className="panel" style={{padding:18}}><h3 style={{margin:"0 0 12px"}}>Account and work profile</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>{[["Full name",selected.full_name],["User ID",selected.id],["Country",selected.country],["Experience",selected.experience],["Account type",selected.account_type],["Role",selected.role],["Account status",selected.account_status],["Registered",fmtDate(selected.created_at)],["Last profile update",fmtDate(selected.updated_at)],["Onboarding",selected.onboarding_completed?"Complete":"Incomplete"],["Adaptive question",selected.adaptive_answer],["Work preference",selected.work_type],["Goal",selected.goal],["Interests",selected.interest_areas],["Settings",selected.settings]].map(([label,value])=><div key={label} style={{minWidth:0,overflowWrap:"anywhere"}}><small style={{display:"block",color:"var(--muted,#777)",marginBottom:4}}>{label}</small><strong style={{fontSize:14,fontWeight:500}}>{showValue(value)}</strong></div>)}</div></section>
          {section("Applications",details?.applications,[["Application ID","id"],["Job ID","job_id"],["Status","status"],["Submitted","submitted_at"],["Created","created_at"],["Resume ID","resume_id"],["Cover note","cover_note"],["Answers","answers"]])}
          <section className="panel" style={{padding:18,marginTop:14}}><h3 style={{margin:"0 0 12px"}}>Uploaded resumes ({details?.resumes?.length||0})</h3>{!details?.resumes?.length?<p style={{margin:0,color:"var(--muted,#777)"}}>No resumes found.</p>:details.resumes.map(file=><div key={file.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"12px 0",borderTop:"1px solid var(--border,#e7e7e7)",flexWrap:"wrap"}}><div style={{minWidth:0,overflowWrap:"anywhere"}}><strong>{file.file_name||"Resume file"}</strong><p style={{margin:"4px 0",fontSize:13,color:"var(--muted,#777)"}}>{file.mime_type||"Unknown type"} · {file.file_size?Math.round(file.file_size/1024)+" KB":"Size unavailable"} · {fmtDate(file.created_at)}</p></div><Button variant="outline" disabled={fileBusy===file.id} onClick={()=>openResume(file)}>{fileBusy===file.id?"Preparing…":"Open securely"}</Button></div>)}</section>
          {section("Interviews",details?.interviews,[["Interview","title"],["Company","company_name"],["Status","status"],["Scheduled","scheduled_at"],["Duration (minutes)","duration_minutes"],["Score","score"],["Total questions","total_questions"],["Passed","passed"],["Started","started_at"],["Completed","completed_at"]])}
          {section("Saved jobs",details?.savedJobs,[["Job ID","job_id"],["Saved","created_at"]])}
          {section("Verification status",details?.verification,[["Status","status"],["Country","country"],["Document type","document_type"],["Provider","provider"],["Started","started_at"],["Submitted","submitted_at"],["Verified","verified_at"],["Needs attention","needs_attention_reason"]])}
          {section("Identity details",details?.identity,[["Legal name","legal_name"],["Date of birth","date_of_birth"],["Country","country"],["Residential address","residential_address"],["Submitted","created_at"]])}
          {section("Payout methods (sensitive values masked)",details?.payoutMethods,[["Method","method_type"],["Status","status"],["Default method","is_default"],["Bank country","bank_country"],["Bank name","bank_name"],["Account holder","account_holder_name"],["Account ending","account_last4"],["PayPal name","paypal_name"],["PayPal email","paypal_email"],["Cardholder","cardholder_name"],["Card ending","card_last4"],["Added","created_at"]])}
          {section("Payout history",details?.payouts,[["Amount","amount"],["Currency","currency"],["Status","status"],["Reference","provider_reference"],["Failure reason","failure_reason"],["Created","created_at"],["Updated","updated_at"]])}
          {section("Support tickets",details?.tickets,[["Subject","subject"],["Issue type","issue_type"],["Status","status"],["Created","created_at"],["Updated","updated_at"]])}
          {section("Support messages",details?.supportMessages,[["Ticket ID","ticket_id"],["Sender type","sender_type"],["Message","body"],["Sent","created_at"]])}
          {section("Recent notifications",details?.notifications,[["Title","title"],["Type","type"],["Message","body"],["Read at","read_at"],["Created","created_at"]])}
        </React.Fragment>}
      </div>
    </div>}
  </div>;
}

function Settings({go}){
  const [tab,setTab]=useState("Account");
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
  const [userId,setUserId]=useState(""),[email,setEmail]=useState(""),[fullName,setFullName]=useState(""),[country,setCountry]=useState(""),[experience,setExperience]=useState("");
  const [prefs,setPrefs]=useState({email_notifications:true,application_updates:true,interview_reminders:true,weekly_digest:true,product_updates:false,open_to_opportunities:true,profile_discoverable:true});
  const [newPassword,setNewPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[passwordBusy,setPasswordBusy]=useState(false),[passwordMessage,setPasswordMessage]=useState("");
  useEffect(()=>{let mounted=true;(async()=>{
    try{
      const {data:{user},error:userError}=await supabase.auth.getUser();
      if(userError)throw userError;
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const {data:profile,error:profileError}=await supabase.from("profiles").select("id,full_name,country,experience,settings").eq("id",user.id).maybeSingle();
      if(profileError)throw profileError;
      if(!mounted)return;
      const metadataName=user.user_metadata?.full_name||user.user_metadata?.name||[user.user_metadata?.first_name,user.user_metadata?.last_name].filter(Boolean).join(" ");
      const accountName=profile?.full_name?.trim()||metadataName.trim()||"";
      let accountProfile=profile;
      if(accountName&&(!profile||profile.full_name?.trim()!==accountName)){
        const {data:upsertedProfile,error:upsertError}=await supabase.from("profiles").upsert({id:user.id,full_name:accountName,account_type:profile?.account_type||user.user_metadata?.account_type||"job_seeker"},{onConflict:"id"}).select("id,full_name,country,experience,settings").single();
        if(upsertError)throw upsertError;
        accountProfile=upsertedProfile;
      }
      setUserId(user.id);setEmail(user.email||"");setFullName(accountProfile?.full_name?.trim()||accountName);setCountry(accountProfile?.country||"");setExperience(accountProfile?.experience||"");
      const stored=accountProfile?.settings&&typeof accountProfile.settings==="object"?accountProfile.settings:{};
      setPrefs(current=>({...current,...stored}));
    }catch(e){if(mounted)setError(e?.message||"We couldn't load your account settings.")}finally{if(mounted)setLoading(false)}
  })();return()=>{mounted=false}},[]);
  const setPref=(key,value)=>setPrefs(p=>({...p,[key]:value}));
  const save=async()=>{
    setSaving(true);setSaved(false);setError("");
    try{
      const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error("Your session has expired. Please sign in again.");
      const {data,error:e}=await supabase.from("profiles").update({full_name:fullName.trim(),country:country||null,experience:experience||null,settings:prefs}).eq("id",user.id).select("id").maybeSingle();
      if(e)throw e;if(!data)throw new Error("Your settings weren't saved. Please refresh and sign in again.");
      setSaved(true);
    }catch(e){setError(e?.message||"We couldn't save your settings. Please try again.")}finally{setSaving(false)}
  };
  const changePassword=async()=>{
    setPasswordMessage("");setError("");
    if(newPassword.length<8){setPasswordMessage("Use at least 8 characters for your new password.");return}
    if(newPassword!==confirmPassword){setPasswordMessage("The passwords do not match.");return}
    setPasswordBusy(true);
    try{const {error:e}=await supabase.auth.updateUser({password:newPassword});if(e)throw e;setNewPassword("");setConfirmPassword("");setPasswordMessage("Your password has been updated.")}catch(e){setPasswordMessage(e?.message||"We couldn't update your password. Please try again.")}finally{setPasswordBusy(false)}
  };
  const toggle=(key,title,description)=><div className="toggle-row" key={key}><div><strong>{title}</strong><span>{description}</span></div><button type="button" role="switch" aria-checked={!!prefs[key]} className={"toggle "+(prefs[key]?"on":"")} onClick={()=>setPref(key,!prefs[key])}><i/></button></div>;
  if(loading)return <div className="workspace"><div className="workspace-head"><div><span className="kicker">ACCOUNT</span><h1>Settings</h1><p>Loading your account settings…</p></div></div></div>;
  return <div className="workspace"><div className="workspace-head"><div><span className="kicker">ACCOUNT</span><h1>Settings</h1><p>Manage your account, preferences and privacy.</p></div></div>
    {error&&<div className="auth-message auth-error">{error}</div>}{saved&&<div className="auth-message auth-success"><Check size={15}/> Your settings have been saved.</div>}
    <div className="settings-layout"><aside className="settings-nav" aria-label="Settings sections">{["Account","Notifications","Privacy","Security","Preferences"].map(x=><button type="button" className={tab===x?"active":""} key={x} onClick={()=>{setTab(x);setError("");setSaved(false);setPasswordMessage("")}}>{x}</button>)}</aside>
    <section className="panel settings-panel">
      {tab==="Account"&&<><PanelTitle title="Account details"/><label className="field"><span>Email address</span><input value={email} readOnly aria-readonly="true"/><small>Your sign-in email, provided by your authenticated account.</small></label><Field label="Display name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name"/><PanelTitle title="Account status"/><div className="settings-info-row"><span>Account ID</span><code>{userId||"Unavailable"}</code></div><p className="settings-help">Your email is shown from your signed-in account. Your display name is saved to your profile.</p><Button onClick={save} disabled={saving}>{saving?"Saving…":"Save changes"} {!saving&&<Check size={15}/>}</Button></>}
      {tab==="Notifications"&&<><PanelTitle title="Notification settings"/><p className="settings-help">Choose which account updates and job alerts you want to receive. Your choices are saved to your account.</p>{toggle("email_notifications","Email notifications","Receive important account updates by email.")}{toggle("application_updates","Application updates","Get notified when an application status changes.")}{toggle("interview_reminders","Interview reminders","Receive reminders about scheduled interviews.")}{toggle("weekly_digest","Weekly job digest","Receive a weekly roundup of relevant opportunities.")}{toggle("product_updates","Product news","Occasional RemoteWay tips and product announcements.")}<Button onClick={save} disabled={saving}>{saving?"Saving…":"Save notification settings"} {!saving&&<Check size={15}/>}</Button><Button variant="outline" onClick={()=>go("notifications")}>View notifications <ArrowRight size={14}/></Button></>}
      {tab==="Privacy"&&<><PanelTitle title="Privacy and visibility"/><p className="settings-help">Control how your candidate profile is used. These preferences are stored with your account.</p>{toggle("open_to_opportunities","Open to opportunities","Let the RemoteWay team know you are looking for remote work.")}{toggle("profile_discoverable","Profile discoverability","Allow your profile to be considered for suitable opportunities.")}<div className="notice"><LockKeyhole size={17}/><span>Your account details remain subject to RemoteWay’s access controls. These switches record your preferences; they do not replace database security rules.</span></div><Button onClick={save} disabled={saving}>{saving?"Saving…":"Save privacy settings"} {!saving&&<Check size={15}/>}</Button></>}
      {tab==="Security"&&<><PanelTitle title="Password and sign-in"/><p className="settings-help">Change the password for your current account. Use at least 8 characters.</p><Field label="New password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Enter a new password"/><Field label="Confirm new password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter the new password"/>{passwordMessage&&<div className={"auth-message "+(passwordMessage.includes("updated")?"auth-success":"auth-error")}>{passwordMessage}</div>}<Button onClick={changePassword} disabled={passwordBusy}>{passwordBusy?"Updating…":"Update password"} {!passwordBusy&&<LockKeyhole size={15}/>}</Button><div className="settings-info-row"><span>Signed-in email</span><strong>{email||"Unavailable"}</strong></div><p className="settings-help">For account safety, email changes are managed through the authentication provider and may require email confirmation.</p></>}
      {tab==="Preferences"&&<><PanelTitle title="Job preferences"/><p className="settings-help">These preferences help personalize the jobs and recommendations you see.</p><label className="field"><span>Country</span><select value={country} onChange={e=>setCountry(e.target.value)}><option value="">Select country</option>{registrationCountries.map(([flag,name])=><option key={name} value={name}>{flag} {name}</option>)}</select></label><label className="field"><span>Experience level</span><select value={experience} onChange={e=>setExperience(e.target.value)}><option value="">Select experience</option>{["No professional experience","Entry level","1–2 years","3–5 years","6–10 years","10+ years"].map(x=><option key={x} value={x}>{x}</option>)}</select></label><Button onClick={save} disabled={saving}>{saving?"Saving…":"Save preferences"} {!saving&&<Check size={15}/>}</Button></>}
    </section></div></div>;
}

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
  const [region,setRegion]=useState("");
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
  const docsByCountry={
    "United States":["Passport","State-issued driver’s licence or ID card","Permanent Resident Card (Green Card)","Employment Authorization Document (EAD)","Social Security card (only if specifically required)"],
    "Canada":["Passport","Provincial or territorial driver’s licence / photo ID","Permanent Resident Card","Canadian work or study permit","SIN confirmation letter or card (only if specifically required)"],
    "United Kingdom":["Passport","UK photocard driving licence","Biometric Residence Permit (where valid)","Home Office immigration status / right-to-work evidence"],
    "Germany":["Passport","German national identity card (Personalausweis)","Residence permit (Aufenthaltstitel)","EU/EEA national identity card"],
    "France":["Passport","French national identity card (Carte nationale d’identité)","Residence permit (Titre de séjour)","EU/EEA national identity card"],
    "Netherlands":["Passport","Dutch identity card","Dutch residence permit","EU/EEA national identity card"],
    "Ireland":["Passport","Irish driving licence","Irish Residence Permit (IRP)","EU/EEA national identity card","PPS documentation (only if specifically required)"],
    "Switzerland":["Passport","Swiss identity card","Swiss residence permit (B, C or L permit)","EU/EEA national identity card"],
    "Sweden":["Passport","Swedish national identity card","Swedish driving licence","Swedish residence permit"],
    "Belgium":["Passport","Belgian electronic identity card (eID)","Belgian residence card","EU/EEA national identity card"]
  };
  const docs=docsByCountry[country]||["Passport","National identity card","Driver’s licence","Residence permit"];
  const nameCheck=isValidLegalName(legalName);
  const addressCheck=validateResidentialAddress(country,address,region);
  const identifierCheck=validateGovernmentIdentifier(country,identifier);
  const today=new Date().toISOString().slice(0,10);
  const dobCheck=!!dob&&/^\d{4}-\d{2}-\d{2}$/.test(dob)&&dob<=today;
  const required=step===1?nameCheck.valid:step===2?dobCheck:step===3?!!country&&addressCheck.valid:step===4?identifierCheck.valid:docs.includes(documentType)&&!!frontFile&&!!backFile;

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){if(mounted)setLoading(false);return;}
      const [{data,error:e},{data:demoSetting},{data:identityDemoSetting}]=await Promise.all([
        supabase.from("verification_profiles").select("id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason").eq("user_id",user.id).maybeSingle(),
        supabase.from("site_settings").select("value").eq("key","verification_demo_uploads").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key","verification_demo_identity_storage").maybeSingle()
      ]);
      if(!mounted)return;
      if(e)setError(e.message);
      setDemoUploadsEnabled(demoSetting?.value?.enabled===true);
      setDemoIdentityStorageEnabled(identityDemoSetting?.value?.enabled===true);
      if(data){
        setExisting(data);
        setCountry(data.country||"United States");
        setDocumentType(data.document_type||"");
        if(data.status==="in_progress")setStep(1);
      }
      setLoading(false);
    })();
    return()=>{mounted=false};
  },[]);

  const validateStep=()=>{
    setError("");
    if(step===1){
      if(!nameCheck.valid){setError(nameCheck.message);return false;}
    }else if(step===2){
      if(!dobCheck){setError("Select a valid date of birth. The date cannot be in the future.");return false;}
    }else if(step===3){
      if(!country){setError("Select your country before continuing.");return false;}
      if(!addressCheck.valid){setError(addressCheck.message);return false;}
    }else if(step===4){
      if(!identifierCheck.valid){setIdentifierError(identifierCheck.message);setError(identifierCheck.message);return false;}
    }else if(step===5){
      if(!docs.includes(documentType)||!frontFile||!backFile){setError("Select a document type available for your country and both the front and back files before continuing.");return false;}
    }
    return true;
  };

  const nextStep=()=>{
    if(saving||!validateStep())return;
    if(step<5)setStep(v=>v+1);
  };

  const startVerification=async()=>{
    if(saving||!validateStep())return;
    setSaving(true);setError("");
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const finalIdentifierCheck=validateGovernmentIdentifier(country,identifier);
      if(!finalIdentifierCheck.valid)throw new Error(finalIdentifierCheck.message);
      const payload={user_id:user.id,status:"in_progress",country,document_type:documentType,started_at:existing?.started_at||new Date().toISOString()};
      let verification=existing;
      if(existing){
        const retrying=["needs_attention","rejected"].includes(existing.status);
        const {data,error:e}=await supabase.from("verification_profiles").update({country,document_type,started_at:payload.started_at,...(retrying?{status:"in_progress",submitted_at:null}: {})}).eq("id",existing.id).select("id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason").single();
        if(e)throw e;
        verification=data;
      }else{
        const {data,error:e}=await supabase.from("verification_profiles").insert(payload).select("id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason").single();
        if(e)throw e;
        verification=data;
      }
      {
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
      {
        const {error:identityError}=await supabase.from("demo_identity_records").upsert({
          verification_id:verification.id,
          user_id:user.id,
          legal_name:legalName.trim(),
          date_of_birth:dob,
          residential_address:(address.trim()+", "+region.trim()).trim().replace(/^, |, $/g,""),
          country,
          government_identifier:identifier.trim(),
          updated_at:new Date().toISOString()
        },{onConflict:"verification_id"});
        if(identityError)throw identityError;
      }
      const {data:pendingVerification,error:pendingError}=await supabase.from("verification_profiles").update({status:"pending",submitted_at:new Date().toISOString()}).eq("id",verification.id).select("id,status,country,document_type,provider,provider_reference,started_at,submitted_at,verified_at,needs_attention_reason").single();
      if(pendingError)throw pendingError;
      setExisting(pendingVerification);
      setSubmitted(true);
    }catch(err){setError(err?.message||"We couldn't start verification.");}
    finally{setSaving(false);}
  };

  const back=()=>{if(step>1)setStep(v=>v-1);};

  if(loading)return <div className="verification-page"><div className="verification-complete"><ShieldCheck size={28}/><span className="kicker">IDENTITY VERIFICATION</span><h1>Loading your verification status…</h1></div></div>;
  if(existing?.status==="pending")return <div className="verification-page"><div className="verification-complete"><div className="verification-complete-icon"><Clock3 size={28}/></div><span className="kicker">PENDING REVIEW</span><h1>Your verification is pending.</h1><p>Your required identity details and both document sides have been saved securely. The RemoteWay admin team will review your submission and update your status here.</p><div className="verification-complete-note"><ShieldCheck size={17}/><span>Your submission is saved. You do not need to submit it again while it is awaiting review.</span></div><Button onClick={()=>go("dashboard")}>Back to dashboard <ArrowRight size={15}/></Button></div></div>;
  if(existing?.status==="verified"&&existing?.verified_at)return <div className="verification-page"><div className="verification-complete"><div className="verification-complete-icon"><Check size={28}/></div><span className="kicker">VERIFIED</span><h1>Your identity is verified.</h1><p>Your verification status is securely recorded. In production, raw identity data will be handled by the verification provider; demo storage is clearly marked and can be switched off before launch.</p><Button onClick={()=>go("dashboard")}>Back to dashboard <ArrowRight size={15}/></Button></div></div>;
  if(submitted)return <div className="verification-page"><div className="verification-complete"><div className="verification-complete-icon"><Clock3 size={28}/></div><span className="kicker">PENDING REVIEW</span><h1>Your verification is pending.</h1><p>Your required identity details and both document sides have been uploaded and saved securely. An administrator will review the submission and update your status.</p><div className="verification-complete-note"><ShieldCheck size={17}/><span>Keep this page or return to your dashboard. Your submission has been saved and does not need to be repeated while it is pending.</span></div><Button onClick={()=>go("dashboard")}>Back to dashboard <ArrowRight size={15}/></Button></div></div>;
  return <div className="verification-page">
    <header className="verification-topbar"><Logo/><button className="back-link" onClick={()=>go("dashboard")}><ArrowLeft size={15}/> Back to dashboard</button></header>
    <main className="verification-wrap">
      <div className="verification-intro"><Badge tone="green"><ShieldCheck size={13}/> Identity verification</Badge><h1>Build a verified profile.</h1><p>Complete the guided identity flow. In demo mode, sensitive identity fields can be saved to a protected test record so we can verify the full workflow before connecting the production provider.</p><div className="verification-security-note"><LockKeyhole size={16}/><span><strong>Security-first design.</strong> RemoteWay stores verification status and minimal workflow metadata only.</span></div></div>
      {error&&<div className="auth-message auth-error" role="alert">{error}</div>}
      <div className="verification-progress"><span style={{width:`${(step/5)*100}%`}}/></div>
      <div className="verification-step-card">
        <div className="verification-step-meta"><span>STEP {step} <em>OF 5</em></span><Badge tone="soft">In progress</Badge></div>
        {step===1&&<><span className="kicker">LEGAL IDENTITY</span><h2>What is your full government name?</h2><p>Enter the name exactly as it appears on the document you will use. This required information is saved securely with your verification submission and can be reviewed by authorized administrators.</p><label className="field"><span>Full legal name</span><input value={legalName} onChange={e=>{setLegalName(e.target.value);setError("");}} placeholder="e.g. Alex Carter" autoComplete="name"/>{legalName&&<small className={nameCheck.valid?"verification-validation-success":"verification-validation-error"}>{nameCheck.valid?<><Check size={12}/>{nameCheck.message}</>:nameCheck.message}</small>}</label></>}
        {step===2&&<><span className="kicker">DATE OF BIRTH</span><h2>When were you born?</h2><p>Your date of birth is saved securely with your verification submission and can be reviewed by authorized administrators.</p><label className="field"><span>Date of birth</span><RemoteDateInput value={dob} onChange={value=>{setDob(value);setError("");}} placeholder="DD / MM / YYYY" className="verification-date-input"/>{dob&&!dobCheck&&<small className="verification-validation-error">Select a valid date of birth.</small>}{dob&&dobCheck&&<small className="verification-validation-success"><Check size={12}/>Date selected.</small>}</label></>}
        {step===3&&<><span className="kicker">RESIDENTIAL ADDRESS</span><h2>Where do you currently live?</h2><p>Enter your current residential address. Include the street, city, state/region and postal code so we can check that the format matches the country you selected.</p><label className="field"><span>Country <b className="required-mark">*</b></span><select value={country} onChange={e=>{setCountry(e.target.value);setDocumentType("");setError("");}}>{countries.map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>State / region / province <b className="required-mark">*</b></span><input value={region} onChange={e=>{setRegion(e.target.value);setError("");}} placeholder="e.g. California / Ontario / Bavaria" autoComplete="address-level1"/>{region&&!addressCheck.valid&&<small className="verification-validation-error">{addressCheck.message}</small>}</label><label className="field"><span>Home address <b className="required-mark">*</b></span><textarea className="verification-textarea" value={address} onChange={e=>{setAddress(e.target.value);setError("");}} placeholder="Street number and name, city, postal / ZIP code" rows="4" autoComplete="street-address"/>{address&&addressCheck.valid&&<small className="verification-validation-success"><Check size={12}/>{addressCheck.message}</small>}{address&&!addressCheck.valid&&region&&<small className="verification-validation-error">{addressCheck.message}</small>}</label></>}
        {step===4&&<><span className="kicker">GOVERNMENT IDENTIFIER</span><h2>Which country issued your identity details?</h2><p>Choose your country and enter the identifier. This required identifier is saved in the protected verification record for authorized administrator review.</p><label className="field"><span>Country</span><select value={country} onChange={e=>{setCountry(e.target.value);setIdentifier("");setIdentifierError("");setDocumentType("");setError("");}}>{countries.map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>{identifierLabels[country]||"Government identifier"}</span><input value={identifier} onChange={e=>{const value=e.target.value;setIdentifier(value);const check=validateGovernmentIdentifier(country,value);setIdentifierError(check.valid?"":check.message)}} placeholder="Enter the identifier" inputMode="text" spellCheck={false} aria-invalid={!!identifierError}/>{identifierError&&<small className="verification-validation-error">{identifierError}</small>}{!identifierError&&identifier.trim()&&<small className="verification-validation-success"><Check size={12}/>{identifierCheck.message}</small>}</label><div className="verification-sensitive-note"><LockKeyhole size={15}/><span>{demoIdentityStorageEnabled?"Your identifier is saved in a protected verification record and is visible only to you and authorized administrators.":"Your identifier will be stored with access controls for administrator review."}</span></div><PartnerLogoStrip location="verification"/></>}
        {step===5&&<><span className="kicker">IDENTITY DOCUMENT</span><h2>Select the document for your country.</h2><p>Available documents change based on your selected country. Tax or social-insurance documents such as SSN, SIN or PPS evidence are sensitive and should only be uploaded if an authorized verification process specifically requires them. {demoUploadsEnabled?"Your selected files upload to private Supabase Storage and are available to authorized administrators for review.":"Files remain local until a production verification provider is connected."}</p><label className="field"><span>Document type</span><select value={documentType} onChange={e=>setDocumentType(e.target.value)}><option value="">Choose a document</option>{docs.map(x=><option key={x}>{x}</option>)}</select></label><div className="document-upload-grid"><label className={frontFile?"document-upload selected":"document-upload"}><input type="file" accept="image/*,.pdf" onChange={e=>setFrontFile(e.target.files?.[0]||null)}/><span className="document-upload-icon"><Plus size={18}/></span><strong>Front of document</strong><small>{frontFile?.name||"Select front file"}</small></label><label className={backFile?"document-upload selected":"document-upload"}><input type="file" accept="image/*,.pdf" onChange={e=>setBackFile(e.target.files?.[0]||null)}/><span className="document-upload-icon"><Plus size={18}/></span><strong>Back of document</strong><small>{backFile?.name||"Select back file"}</small></label></div><div className="verification-sensitive-note"><ShieldCheck size={15}/><span>{demoUploadsEnabled?"Both files are saved to private Supabase Storage. Only the submitting member and authorized administrators can access them.":"Both document sides are required and will be uploaded to private Supabase Storage before the submission is accepted."}</span></div><PartnerLogoStrip location="verification"/></>}
        <div className="verification-actions"><Button variant="outline" onClick={back} disabled={step===1||saving}>Back</Button>{step<5?<Button onClick={nextStep} disabled={saving||!required}>{saving?"Checking…":"Continue"} <ArrowRight size={15}/></Button>:<Button onClick={startVerification} disabled={!required||saving}>{saving?"Starting…":"Start secure verification"} <ArrowRight size={15}/></Button>}</div>
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
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setTicket(null);setMessages([]);setLoading(false);setError("Please sign in to view your support conversations.");return;}
    const {data,error:e}=await supabase.from("support_tickets").select("id,issue_type,subject,status,created_at,updated_at").eq("user_id",user.id).in("status",["open","in_progress","waiting_on_user"]).order("updated_at",{ascending:false}).limit(1).maybeSingle();
    if(e){setError(e.message);setLoading(false);return;}
    if(data){setTicket(data);await loadTicket(data.id);setView("chat");}else{setTicket(null);setMessages([]);}
    setLoading(false);
  };

  useEffect(()=>{
    if(!open||!ticket?.id)return;
    const messagesChannel=supabase.channel("customer-support-messages-"+ticket.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages",filter:"ticket_id=eq."+ticket.id},payload=>{
      const row=payload.new;
      setMessages(prev=>prev.some(m=>m.id===row.id)?prev:[...prev,{id:row.id,from:row.sender_type==="user"?"user":"support",text:row.body,time:new Date(row.created_at).toLocaleString()}]);
    }).subscribe();
    const ticketChannel=supabase.channel("customer-support-ticket-"+ticket.id).on("postgres_changes",{event:"UPDATE",schema:"public",table:"support_tickets",filter:"id=eq."+ticket.id},payload=>{
      setTicket(prev=>prev?.id===payload.new.id?{...prev,...payload.new}:prev);
      if(["closed","resolved"].includes(payload.new.status))setView("closed");
    }).subscribe();
    return()=>{supabase.removeChannel(messagesChannel);supabase.removeChannel(ticketChannel)};
  },[open,ticket?.id]);

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
    {open&&<section className="support-panel" aria-label="RemoteWay Support">
      <header className="support-header">
        <div className="support-brand"><img className="support-avatar" src="/support-maya.jpg" alt="Maya K., RemoteWay support agent" /><div><strong>Maya K.</strong><small>RemoteWay Support · Here when you need us</small></div></div>
        <button className="support-close" onClick={()=>setOpen(false)} aria-label="Close support"><X size={17}/></button>
      </header>

      {view==="empty"&&<div className="support-body support-empty">
        <div className="support-welcome"><img className="support-agent-portrait" src="/support-maya.jpg" alt="Maya K., your RemoteWay support agent" /><span className="support-agent-name">Maya K.</span><span className="support-agent-role"><i/> RemoteWay Support · Here to help</span><span className="kicker">HOW CAN WE HELP?</span><h3>What can we help you with?</h3><p>Choose a support option below. Maya and the RemoteWay team are here to help.</p></div>
        {error&&<div className="auth-message auth-error">{error}</div>}
        <div className="support-actions">
          <button onClick={startChat} disabled={loading}><span><MessageCircle size={17}/></span><div><strong>{loading?"Loading…":"I need help"}</strong><small>Chat with support</small></div><ArrowRight size={15}/></button>
          <button onClick={()=>{setError("");setView("ticket")}}><span><FileText size={17}/></span><div><strong>Open a support ticket</strong><small>For issues that need follow-up</small></div><ArrowRight size={15}/></button>
          <button onClick={()=>{setIssueType("Report a concern");setError("");setView("ticket")}}><span><ShieldCheck size={17}/></span><div><strong>Report a concern</strong><small>Tell us about a problem</small></div><ArrowRight size={15}/></button>
        </div>
        <div className="support-direct"><strong>Contact us directly</strong><p>Call or text our team if you prefer.</p><div className="support-direct-list">{[{number:"+1 669 214 7825",digits:"16692147825"},{number:"+1 702 775 6514",digits:"17027756514"}].map(c=><div className="support-direct-row" key={c.digits}><span>{c.number}</span><div><a href={"tel:+"+c.digits} aria-label={"Call "+c.number}><Phone size={13}/> Call</a><a href={"sms:+"+c.digits} aria-label={"Message "+c.number}><MessageCircle size={13}/> Text</a></div></div>)}</div></div>
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
        <div className="support-success-icon"><Check size={24}/></div><span className="kicker">TICKET RECEIVED</span><h3>Your support request is in.</h3><p>We’ve captured the details. Your support ticket is now stored securely and can be followed up by the RemoteWay team.</p><div className="support-ticket-preview"><span>Ticket</span><strong>#{ticket?.id}</strong><small>Status: {ticket?.status||"Open"}</small></div><div className="support-success-actions"><Button onClick={startChat}>Back to chat</Button><Button variant="outline" onClick={reset}>Start a new request</Button></div>
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
  useEffect(()=>{let channel=null;let mounted=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();await load();if(!mounted||!user)return;channel=supabase.channel("user-notifications-"+user.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"user_id=eq."+user.id},payload=>{setItems(prev=>prev.some(n=>n.id===payload.new.id)?prev:[payload.new,...prev].slice(0,100))}).subscribe()})();return()=>{mounted=false;if(channel)supabase.removeChannel(channel)}},[]);
  const markRead=async id=>{const now=new Date().toISOString();setItems(p=>p.map(n=>n.id===id?{...n,read_at:n.read_at||now}:n));const {error}=await supabase.from("notifications").update({read_at:now}).eq("id",id);if(error)load()};
  const markAllRead=async()=>{const unread=items.some(n=>!n.read_at);if(!unread)return;setBusy(true);const {data:{user}}=await supabase.auth.getUser();if(user){const now=new Date().toISOString();const {error}=await supabase.from("notifications").update({read_at:now}).eq("user_id",user.id).is("read_at",null);if(error)setError(error.message);else setItems(p=>p.map(n=>({...n,read_at:n.read_at||now})));}setBusy(false)};
  const unread=items.filter(n=>!n.read_at).length;
  const iconFor=t=>t==="application"?<FileText size={17}/>:t==="interview"?<MessageCircle size={17}/>:t==="payout"?<WalletCards size={17}/>:t==="verification"?<ShieldCheck size={17}/>:t==="support"?<CircleHelp size={17}/>:<Bell size={17}/>;
  const openRelated=n=>{markRead(n.id);if(n.related_type==="application")go("applications");else if(n.related_type==="interview")go("interview");else if(n.related_type==="payout")go("payouts");else if(n.related_type==="verification")go("verification");else if(n.related_type==="support_ticket")go("dashboard")};
  return <div className="workspace notifications-page"><div className="workspace-head"><div><span className="kicker">YOUR NOTIFICATIONS</span><h1>Stay in the loop.</h1><p>Important updates about your applications, interviews, payouts and account.</p></div><Button variant="outline" onClick={markAllRead} disabled={busy||unread===0}>{busy?"Updating…":"Mark all as read"}</Button></div><section className="panel notifications-panel"><div className="notifications-toolbar"><strong>{unread?unread+" unread":"All caught up"}</strong><span>{items.length} total notifications</span></div>{loading&&<div className="empty-state"><h3>Loading notifications…</h3><p>Fetching your latest account updates.</p></div>}{!loading&&error&&<div className="empty-state"><h3>We couldn’t load notifications</h3><p>{error}</p><Button variant="outline" onClick={load}>Try again</Button></div>}{!loading&&!error&&items.length===0&&<div className="empty-state"><Bell size={24}/><h3>No notifications yet</h3><p>When something important happens on RemoteWay, you’ll see it here.</p><Button onClick={()=>go("jobs")}>Explore jobs <ArrowRight size={15}/></Button></div>}{!loading&&!error&&items.length>0&&<div className="notification-list">{items.map(n=><button key={n.id} className={`notification-row ${n.read_at?"read":"unread"}`} onClick={()=>openRelated(n)}><span className="notification-icon">{iconFor(n.type)}</span><span className="notification-copy"><strong>{n.title}</strong><span>{n.body}</span><small>{relativePosted(n.created_at)}</small></span>{!n.read_at&&<i aria-label="Unread"/>}<ChevronRight size={16}/></button>)}</div>}</section></div>;
}

function AccessRestricted({status,go}){return <div className="verification-page"><div className="verification-complete"><div className="verification-complete-icon"><ShieldCheck size={28}/></div><span className="kicker">ACCOUNT ACCESS</span><h1>{status==="suspended"?"Your account is suspended.":"Your account is temporarily restricted."}</h1><p>{status==="suspended"?"Your RemoteWay account is currently suspended. Please contact Support if you believe this was a mistake.":"Some account features are temporarily restricted. Please contact Support for assistance."}</p><Button onClick={()=>go("dashboard")}>Contact support <ArrowRight size={15}/></Button></div></div>}
function RemoteWayLoader(){
  return <div className="app-loader" role="status" aria-label="Loading RemoteWay">
    <div className="loader-logo"><span className="loader-mark"><span>R</span></span><span className="loader-word">RemoteWay</span></div>
    <div className="loader-track"><span/></div>
    <p>Preparing your workspace</p>
  </div>;
}


function JobWorkspace({go}){
  const [offers,setOffers]=useState([]);
  const [workspaceSettings,setWorkspaceSettings]=useState(DEFAULT_JOB_WORKSPACE_SETTINGS);
  const [candidateCountry,setCandidateCountry]=useState("");
  const [selectedId,setSelectedId]=useState(null);
  const [provider,setProvider]=useState("");
  const [connectionType,setConnectionType]=useState("");
  const [otherInfo,setOtherInfo]=useState("");
  const [customFieldValues,setCustomFieldValues]=useState({});
  const [editing,setEditing]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [workTasks,setWorkTasks]=useState([]);
  const [tasksLoading,setTasksLoading]=useState(false);
  const [taskError,setTaskError]=useState("");
  const [taskNotice,setTaskNotice]=useState("");
  const [taskResponses,setTaskResponses]=useState({});
  const [taskSubmitting,setTaskSubmitting]=useState(null);
  const [taskSummary,setTaskSummary]=useState({completed:0,score:null,earnings:0});
  const [weeklyEarned,setWeeklyEarned]=useState(0);
  const [availableBalance,setAvailableBalance]=useState(0);
  const [workdayNumber,setWorkdayNumber]=useState(0);
  const [isWorkday,setIsWorkday]=useState(true);
  const [workMessage,setWorkMessage]=useState("");
  const [workStartDate,setWorkStartDate]=useState("");

  const loadWorkTasks=async(applicationId)=>{
    if(!applicationId)return;
    setTasksLoading(true);setTaskError("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("remote-way-work",{body:{action:"get_tasks",application_id:applicationId}});
      if(invokeError)throw invokeError;
      if(data?.error)throw new Error(data.error);
      setWorkTasks(data?.tasks||[]);
      setTaskSummary(data?.daily_summary||{completed:0,score:null,earnings:0});
      setWeeklyEarned(Number(data?.weekly_earned||0));
      setAvailableBalance(Number(data?.available_balance||0));
      setWorkdayNumber(Number(data?.workday_number||0));
      setIsWorkday(data?.is_workday!==false);
      setWorkStartDate(data?.start_date||"");
      setWorkMessage(data?.message||"");
    }catch(err){setTaskError(err?.message||"We couldn't load your work tasks. Please try again.");}
    finally{setTasksLoading(false);}
  };
  const submitWorkTask=async(task)=>{
    const response=String(taskResponses[task.id]||"").trim();
    if(!response){setTaskError("Write your response before submitting the task.");return;}
    setTaskSubmitting(task.id);setTaskError("");setTaskNotice("");
    try{
      const {data,error:invokeError}=await supabase.functions.invoke("remote-way-work",{body:{action:"submit_task",assignment_id:task.id,response}});
      if(invokeError)throw invokeError;
      if(data?.error)throw new Error(data.error);
      const g=data?.grade||{};
      setTaskNotice((data?.task_title||task.template?.title||"Task")+" graded: "+String(g.grade_band||"review").replace(/^./,x=>x.toUpperCase())+". Reward approved: $"+Number(g.reward_amount||0).toFixed(2)+".");
      setTaskResponses(prev=>({...prev,[task.id]:""}));
      await loadWorkTasks(selected?.id);
    }catch(err){setTaskError(err?.message||"We couldn't submit this task. Please try again.");}
    finally{setTaskSubmitting(null);}
  };

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){if(mounted){setLoading(false);go("login")}return}
      const [{data:profileRow},{data:workspaceSettingRow}]=await Promise.all([supabase.from("profiles").select("country").eq("id",user.id).maybeSingle(),supabase.from("site_settings").select("value").eq("key","job_workspace_settings").maybeSingle()]);
      if(mounted){setCandidateCountry(profileRow?.country||"");const mergedSettings={...DEFAULT_JOB_WORKSPACE_SETTINGS,...(workspaceSettingRow?.value||{})};mergedSettings.form_fields=normalizeWorkspaceFields(mergedSettings.form_fields);mergedSettings.provider_options_by_country=mergedSettings.provider_options_by_country||DEFAULT_ISP_OPTIONS_BY_COUNTRY;setWorkspaceSettings(mergedSettings)}
      const {data:accessRows,error:accessError}=await supabase.from("job_workspace_access").select("application_id,candidate_id,job_id,created_at").eq("candidate_id",user.id).order("created_at",{ascending:false});
      if(accessError){if(mounted){setError(accessError.message);setLoading(false)}return}
      if(!accessRows?.length){if(mounted){setOffers([]);setLoading(false)}return}
      const ids=accessRows.map(row=>row.application_id);
      const [{data:applicationRows,error:applicationError},{data:networkRowsData,error:networkError}]=await Promise.all([
        supabase.from("applications").select("id,job_id,status,created_at,jobs(id,title,company_name,company_logo,description,location,job_type,responsibilities,requirements,benefits)").in("id",ids).eq("user_id",user.id).eq("status","hired"),
        supabase.from("job_network_profiles").select("application_id,provider_name,connection_type,other_network_information,submitted_at").eq("candidate_id",user.id).in("application_id",ids)
      ]);
      if(!mounted)return;
      if(applicationError||networkError){setError((applicationError||networkError).message);setLoading(false);return}
      const networkMap={};(networkRowsData||[]).forEach(row=>{networkMap[row.application_id]=row});
      const rows=(applicationRows||[]).filter(row=>accessRows.some(a=>a.application_id===row.id)).map(row=>({...row,network:networkMap[row.id]||null}));
      setOffers(rows);setSelectedId(rows[0]?.id||null);setLoading(false);
    })();
    return()=>{mounted=false};
  },[]);

  const selected=offers.find(row=>String(row.id)===String(selectedId))||offers[0]||null;
  useEffect(()=>{
    if(selected?.network&&!editing)loadWorkTasks(selected.id);
    else {setWorkTasks([]);setTaskSummary({completed:0,score:null,earnings:0});setWeeklyEarned(0);}
  },[selected?.id,selected?.network?.submitted_at,editing]);

  useEffect(()=>{
    setProvider(selected?.network?.provider_name||"");
    setConnectionType(selected?.network?.connection_type||"");
    const storedOther=selected?.network?.other_network_information||"";let parsedOther={};let cleanOther=storedOther;try{const parsed=JSON.parse(storedOther);if(parsed&&parsed.__remoteWayOnboarding){parsedOther=parsed.values||{};cleanOther=parsed.other||""}}catch{}setCustomFieldValues(parsedOther);setOtherInfo(parsedOther.model||cleanOther);
    setEditing(false);
    setNotice("");
  },[selected?.id,selected?.network?.submitted_at]);

  const submitNetwork=async()=>{
    if(!selected)return;
    const requiredFields=(workspaceSettings.form_fields||[]).filter(field=>field.enabled!==false&&field.required);for(const field of requiredFields){const value=field.id==="provider"?provider:field.id==="device"?connectionType:field.id==="model"?otherInfo:customFieldValues[field.key];if(!String(value??"").trim()){setError("Please complete: "+(field.label||field.key));return}}
    setSaving(true);setError("");setNotice("");
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Your session has expired. Please sign in again.");
      const configuredFields=(workspaceSettings.form_fields||[]).filter(field=>field.enabled!==false);for(const field of configuredFields){if(field.required&&!["provider","device","model"].includes(field.id)&&!String(customFieldValues[field.key]??"").trim())throw new Error("Please complete: "+(field.label||field.key));}const extraValues={...customFieldValues};configuredFields.forEach(field=>{if(field.type==="password")delete extraValues[field.key];else if(field.id==="provider")extraValues[field.key]=provider.trim();else if(field.id==="device")extraValues[field.key]=connectionType.trim();else if(field.id==="model")extraValues[field.key]=otherInfo.trim()});const payload={application_id:selected.id,candidate_id:user.id,job_id:selected.job_id,provider_name:provider.trim(),connection_type:connectionType.trim(),other_network_information:JSON.stringify({__remoteWayOnboarding:true,other:otherInfo.trim(),values:extraValues}),submitted_at:new Date().toISOString()};
      const {data,error:saveError}=await supabase.from("job_network_profiles").upsert(payload,{onConflict:"application_id"}).select("application_id,provider_name,connection_type,other_network_information,submitted_at").single();
      if(saveError)throw saveError;
      setOffers(prev=>prev.map(row=>row.id===selected.id?{...row,network:data}:row));
      setEditing(false);setNotice("Network information saved. Your job workspace is now available.");
    }catch(err){setError(err?.message||"We couldn't save your network information. Please try again.")}
    finally{setSaving(false)}
  };

  if(loading)return <div className="interview-page"><header className="flow-header"><button className="flow-back" onClick={()=>go("dashboard")}><ArrowLeft size={15}/> Main dashboard</button><Logo/><Badge tone="soft">Job Workspace</Badge></header><div className="interview-empty"><Clock3 size={24}/><h2>Preparing your Job Workspace…</h2><p>Checking your job offer and onboarding status.</p></div></div>;

  return <div className="interview-page">
    <header className="flow-header"><button className="flow-back" onClick={()=>go("dashboard")}><ArrowLeft size={15}/> Main dashboard</button><Logo/><Badge tone="soft">Job Workspace</Badge></header>
    <div className="flow-wrap">
      <div className="flow-intro"><span className="kicker">REMOTEWAY · JOB WORKSPACE</span><h1>{workspaceSettings.workspace_title||"Your next chapter starts here."}</h1><p>{workspaceSettings.workspace_description||"This dedicated workspace is separate from your main dashboard and is available only for jobs you have been selected for."}</p></div>
      {error&&<div className="form-error" role="alert">{error}</div>}
      {offers.length>1&&<div className="flow-card" style={{marginBottom:18}}><label className="field"><span>Select your job offer</span><select value={selected?.id||""} onChange={e=>setSelectedId(Number(e.target.value))}>{offers.map(row=><option key={row.id} value={row.id}>{row.jobs?.title||"Selected job"} · {row.jobs?.company_name||"RemoteWay"}</option>)}</select></label></div>}
      {!selected?<div className="flow-card"><div className="interview-empty"><BriefcaseBusiness size={30}/><h2>Your Job Workspace is not available yet</h2><p>When RemoteWay selects you for a role and confirms your job offer, your job-specific workspace will appear here. Completing an interview alone does not activate job access.</p><Button onClick={()=>go("applications")}>View applications <ArrowRight size={15}/></Button></div></div>:
      <div className="workspace-grid" style={{alignItems:"start"}}>
        <section className="flow-card">
          <span className="kicker">SELECTED POSITION</span>
          <div style={{display:"flex",gap:14,alignItems:"center",margin:"14px 0 18px"}}>
            <div className="company-avatar">{selected.jobs?.company_name?.[0]||"R"}</div>
            <div><h2 style={{margin:"0 0 5px"}}>{selected.jobs?.title||"Your selected role"}</h2><p style={{margin:0}}>{selected.jobs?.company_name||"RemoteWay partner"}{selected.jobs?.location?" · "+selected.jobs.location:""}</p></div>
          </div>
          <div className="verification-status"><span><i/>{selected.network?"Network information submitted":"Network information required"}</span><small>{selected.network?"Your onboarding details have been saved.":"Complete this step before entering your job workspace."}</small></div>
          {!selected.network||editing?<div style={{marginTop:24}}>
            <h2>{workspaceSettings.title||"Set up your network information"}</h2>
            <p>{workspaceSettings.description||"Tell us which internet or mobile network you use and share other important network provider information so we can assess your connectivity and arrange the appropriate working tools."}</p>
            <p style={{marginTop:-6,marginBottom:16,color:"var(--muted,#68756e)",fontSize:14,lineHeight:1.6}}>We use the information you submit here to prepare the network setup and working tools you’ll need for your selected role. Please make sure your details are accurate.</p>
            <p className="studio-muted" style={{marginTop:-6,marginBottom:16}}>Country on your profile: <strong>{candidateCountry||"Not set"}</strong>. Your ISP options are based on this country.</p>
            {(workspaceSettings.form_fields||[{id:"provider",key:"provider",label:workspaceSettings.provider_label||"Internet or mobile network provider",type:"text",placeholder:workspaceSettings.provider_placeholder||"e.g. MTN, Airtel, fibre provider",required:true},{id:"connection",key:"connection",label:workspaceSettings.connection_label||"Connection type",type:"text",placeholder:workspaceSettings.connection_placeholder||"e.g. 4G, 5G, fibre, broadband",required:true},{id:"other",key:"other",label:workspaceSettings.other_label||"Other important network provider information",type:"textarea",placeholder:workspaceSettings.other_placeholder||"",required:false}]).filter(field=>field.enabled!==false).map(field=><label className="field" key={field.id}><span>{field.label||"Untitled field"}{field.required?" *":""}</span>{field.id==="provider"?<select value={provider} onChange={e=>setProvider(e.target.value)} required={!!field.required}><option value="">{field.placeholder||"Choose your internet provider"}</option>{countryIspOptions(candidateCountry,workspaceSettings).map(o=><option key={o} value={o}>{o}</option>)}</select>:field.id==="device"?<input type="text" placeholder={field.placeholder||""} value={connectionType} onChange={e=>setConnectionType(e.target.value)} required={!!field.required}/>:field.id==="model"?<input type="text" placeholder={field.placeholder||""} value={otherInfo} onChange={e=>setOtherInfo(e.target.value)} required={!!field.required}/>:field.type==="textarea"?<textarea rows="3" placeholder={field.placeholder||""} value={customFieldValues[field.key]||""} onChange={e=>setCustomFieldValues(v=>({...v,[field.key]:e.target.value}))} required={!!field.required}/>:field.type==="select"||field.type==="radio"?<select value={customFieldValues[field.key]||""} onChange={e=>setCustomFieldValues(v=>({...v,[field.key]:e.target.value}))} required={!!field.required}><option value="">{field.placeholder||"Choose an option"}</option>{(field.options||[]).map(o=><option key={o}>{o}</option>)}</select>:field.type==="checkbox"?<input type="checkbox" checked={!!customFieldValues[field.key]} onChange={e=>setCustomFieldValues(v=>({...v,[field.key]:e.target.checked}))} required={!!field.required}/>:<input type={["email","password","number","tel","url","date"].includes(field.type)?field.type:"text"} autoComplete={field.type==="password"?"new-password":undefined} placeholder={field.placeholder||""} value={customFieldValues[field.key]||""} onChange={e=>setCustomFieldValues(v=>({...v,[field.key]:e.target.value}))} required={!!field.required}/ >}{(field.help_text||field.type==="password")&&<small>{field.type==="password"?"For security, password values are not saved when this form is submitted.":field.help_text}</small>}</label>)}
            <Button onClick={submitNetwork} disabled={saving}>{saving?"Saving information…":(workspaceSettings.submit_label||"Submit information")} <ArrowRight size={15}/></Button>
          </div>:<div style={{marginTop:22}}>
            <div className="verification-status"><span><Check size={15}/> Onboarding step complete</span><small>Submitted {new Date(selected.network.submitted_at).toLocaleString()}</small></div>
            <h2 style={{marginTop:24}}>Your job workspace</h2>
            <p>Your job-specific workspace is now unlocked. Job instructions, work resources, and tasks will appear here as they are made available for this role.</p>
            <div className="summary-grid" style={{marginTop:18}}><Summary icon={BriefcaseBusiness} value="Active" label="Job access" change="Selected position"/><Summary icon={Check} value="Complete" label="Network setup" change="Information received"/></div>
            {selected.jobs?.description&&<div style={{marginTop:22}}><h3>Role overview</h3><p style={{whiteSpace:"pre-wrap"}}>{selected.jobs.description}</p></div>}
            {Array.isArray(selected.jobs?.responsibilities)&&selected.jobs.responsibilities.length>0&&<div style={{marginTop:22}}><h3>Your responsibilities</h3><ul>{selected.jobs.responsibilities.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
            {Array.isArray(selected.jobs?.requirements)&&selected.jobs.requirements.length>0&&<div style={{marginTop:22}}><h3>Role requirements</h3><ul>{selected.jobs.requirements.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
            <div className="work-tasks-panel" style={{marginTop:24,border:"1px solid var(--line,#e2e8e4)",borderRadius:16,padding:18,background:"var(--panel,#fff)"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><div><span className="kicker">DAILY WORK</span><h2 style={{margin:"7px 0"}}>Your task programme</h2><p style={{margin:0}}>20 weekdays · Monday–Friday · Up to $200 per seven-day work period. Rewards depend on completion and quality; earnings are not guaranteed.</p></div><Button variant="outline" onClick={()=>go("payouts")}><WalletCards size={15}/> Earnings & payouts</Button></div>
              <div className="summary-grid" style={{marginTop:18}}><Summary icon={Clock3} value={workdayNumber>20?"20 / 20":(workdayNumber||0)+" / 20"} label="Workday" change={workStartDate?"Started "+new Date(workStartDate+"T00:00:00").toLocaleDateString():"Start date recording"}/><Summary icon={Check} value={taskSummary.completed} label="Graded today" change="Completed task submissions"/><Summary icon={Star} value={taskSummary.score===null?"—":taskSummary.score+"/100"} label="Today's score" change="Average automatic rubric score"/><Summary icon={WalletCards} value={"$"+Number(taskSummary.earnings||0).toFixed(2)} label="Earned today" change={"$"+Number(weeklyEarned||0).toFixed(2)+" of $200 this period"}/><Summary icon={WalletCards} value={"$"+Number(availableBalance||0).toFixed(2)} label="Available balance" change="Eligible closed work periods"/></div>
              {workMessage&&<div className="payout-country-note" style={{marginTop:14}}><Clock3 size={15}/><span>{workMessage}</span></div>}
              {taskError&&<div className="form-error" role="alert" style={{marginTop:14}}>{taskError}</div>}
              {taskNotice&&<div className="form-success" role="status" style={{marginTop:14}}>{taskNotice}</div>}
              {tasksLoading?<div className="empty-state" style={{padding:20}}><h3>Preparing today's work…</h3><p>Loading your assigned tasks and grading history.</p></div>:workTasks.length===0?<div className="empty-state" style={{padding:20}}><FileText size={22}/><h3>No task assigned yet</h3><p>{workMessage||"Your task programme will appear here after your work start date is recorded."}</p></div>:<div style={{display:"grid",gap:14,marginTop:18}}>{workTasks.map(task=><article key={task.id} className="panel" style={{padding:16,border:"1px solid var(--line,#e2e8e4)",boxShadow:"none"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><div><span className="kicker">DAY {task.template.day_number} · {new Date(task.assigned_date+"T00:00:00").toLocaleDateString()}</span><h3 style={{margin:"8px 0"}}>{task.template.title}</h3><p style={{margin:"0 0 10px",whiteSpace:"pre-wrap"}}>{task.template.instructions}</p><small>{task.template.estimated_minutes} min · Maximum reward ${Number(task.template.max_reward||0).toFixed(2)} · Practice simulation</small></div><Badge tone={task.submission?"green":task.status==="available"?"soft":"amber"}>{task.submission?task.submission.grade_band||task.submission.status:task.status}</Badge></div>
                {task.submission?<div style={{marginTop:14,padding:14,borderRadius:12,background:"var(--surface,#f6f8f6)"}}><div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:8}}><strong>Score: {task.submission.quality_score??0}/100</strong><strong>Reward: ${Number(task.submission.reward_amount||0).toFixed(2)}</strong><strong>Completion: {Number(task.submission.completion_percent||0)}%</strong></div><p style={{margin:0}}>{task.submission.feedback||"Your submission has been graded."}</p></div>:<div style={{marginTop:14}}><label className="field"><span>Your response *</span><textarea rows="6" value={taskResponses[task.id]||""} onChange={e=>setTaskResponses(prev=>({...prev,[task.id]:e.target.value}))} placeholder="Describe your steps, decision, quality check and next action. Use fictional data only." disabled={taskSubmitting===task.id||!isWorkday}/></label><div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Button onClick={()=>submitWorkTask(task)} disabled={taskSubmitting===task.id||!isWorkday||!String(taskResponses[task.id]||"").trim()}>{taskSubmitting===task.id?"Submitting & grading…":"Submit task for automatic grading"} <ArrowRight size={15}/></Button></div></div>}
              </article>)}</div>}
              <p style={{fontSize:12,color:"var(--muted,#68756e)",marginTop:16}}>Medical billing, payroll, bookkeeping and medical coding activities are synthetic training exercises. They are not official assignments from the companies named on job listings and must not contain real patient or customer information.</p>
            </div>
            <Button variant="soft" onClick={()=>{setError("");setNotice("");setEditing(true);setProvider(selected.network.provider_name||"");setConnectionType(selected.network.connection_type||"");setOtherInfo(selected.network.other_network_information||"")}}>Edit network information</Button>
          </div>}
          {notice&&<div className="form-success" role="status" style={{marginTop:16}}>{notice}</div>}
        </section>
        <aside className="flow-card"><span className="kicker">ONBOARDING CHECKLIST</span><h2 style={{marginTop:10}}>Ready to get started?</h2><div style={{display:"grid",gap:14,marginTop:18}}><div style={{display:"flex",gap:10,alignItems:"start"}}><Check size={18}/><div><strong>Job offer confirmed</strong><p>You're seeing this workspace because you've been selected for this role.</p></div></div><div style={{display:"flex",gap:10,alignItems:"start"}}>{selected.network?<Check size={18}/>:<Globe2 size={18}/>}<div><strong>Network information</strong><p>{selected.network?"Your provider information has been submitted.":"Required before entering your job workspace."}</p></div></div><div style={{display:"flex",gap:10,alignItems:"start"}}>{selected.network?<Zap size={18}/>:<LockKeyhole size={18}/>}<div><strong>Job tools and tasks</strong><p>{selected.network?"Workspace access is enabled. Work resources will appear here when configured.":"Unlocks after network information is submitted."}</p></div></div></div></aside>
      </div>}
    </div>
  </div>;
}

function App(){
  const routeFromLocation=()=>{const path=window.location.pathname.replace(/^\/+|\/+$/g,"");if(path==="support-desk")return "support-desk";if(path==="auth-callback")return "auth-callback";const hash=window.location.hash.replace("#/","");if(hash)return hash;if(path===PRIVATE_ADMIN_ROUTE){try{const saved=sessionStorage.getItem("remoteWayLastAdminScreen");if(["admin","admin-applications","admin-verification","admin-members","admin-support","admin-studio"].includes(saved))return saved;}catch{}return "admin"}return "home"};
  const initial=routeFromLocation;
  const [screen,setScreen]=useState(initial); const screenRef=useRef(initial); const [param,setParam]=useState(""); const [toast,setToast]=useState("");
  const [session,setSession]=useState(null); const interviewReturnRef=useRef("applications"); const [role,setRole]=useState("user"); const [accountStatus,setAccountStatus]=useState("active");
  const [authReady,setAuthReady]=useState(false); const [roleReady,setRoleReady]=useState(false); const [loaderVisible,setLoaderVisible]=useState(true);
  const go=(next,value="")=>{if(next==="interview"&&screenRef.current!=="interview")interviewReturnRef.current=screenRef.current==="home"?"jobs":screenRef.current;setParam(String(value||""));screenRef.current=next;try{const adminRoutes=["admin","admin-applications","admin-verification","admin-members","admin-support","admin-studio"];if(adminRoutes.includes(next))sessionStorage.setItem("remoteWayLastAdminScreen",next);else if(!["support-desk"].includes(next))sessionStorage.removeItem("remoteWayLastAdminScreen")}catch{}window.location.hash=`/${next}`;setScreen(next);window.scrollTo(0,0)};
  useEffect(()=>{
    let mounted=true;
    const loaderTimer=setTimeout(()=>{if(mounted)setLoaderVisible(false)},700);
    const loadSession=async()=>{
      const {data}=await supabase.auth.getSession();
      if(!mounted)return;
      setSession(data.session);
      if(data.session){
        const {data:profile}=await supabase.from("profiles").select("role,account_status").eq("id",data.session.user.id).maybeSingle();
        if(mounted){setRole(profile?.role||"user");setAccountStatus(profile?.account_status||"active");setRoleReady(true)}
      }else {setRole("user");setAccountStatus("active");}
      setAuthReady(true);
    };
    loadSession();
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,nextSession)=>{
      if(event==="PASSWORD_RECOVERY"){screenRef.current="reset-password";window.location.hash="/reset-password";setScreen("reset-password")}if(event==="SIGNED_IN"&&nextSession){const hour=new Date().getHours();const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";try{sessionStorage.setItem("remotePathLoginGreeting",greeting)}catch{}}
      if(event==="SIGNED_OUT"){try{sessionStorage.removeItem("remotePathLoginGreeting")}catch{}}
      setSession(nextSession);
      if(nextSession){
        // Resolve the user's role before protected-route guards run, so a refresh on an admin subpage
        // cannot briefly treat an administrator as a regular member and redirect them away.
        Promise.resolve().then(async()=>{
          const {data:profile}=await supabase.from("profiles").select("role,account_status").eq("id",nextSession.user.id).maybeSingle();
          if(!mounted)return;
          setRole(profile?.role||"user");setAccountStatus(profile?.account_status||"active");setRoleReady(true);setAuthReady(true);
        });
      }else {setRole("user");setAccountStatus("active");setRoleReady(true);setAuthReady(true)}
    });
    return()=>{mounted=false;clearTimeout(loaderTimer);subscription.unsubscribe()};
  },[]);
  useEffect(()=>{
    const h=()=>{const next=routeFromLocation();if(next==="jobs"&&screenRef.current==="job")setParam("");setScreen(next);screenRef.current=next};
    window.addEventListener("hashchange",h);return()=>window.removeEventListener("hashchange",h)
  },[]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),2800);return()=>clearTimeout(t)}},[toast]);
  const protectedScreens=["dashboard","jobs","saved","applications","application-confirmation","interview","job-workspace","profile","payouts","verification","settings","employer","postjob","candidates","admin","admin-applications","admin-verification","admin-members","admin-support","admin-studio","support-desk","notifications","onboarding"];
  useEffect(()=>{
    if(!authReady)return;
    const adminScreens=["admin","admin-applications","admin-verification","admin-members","admin-support","admin-studio","support-desk"];
    const memberScreens=["dashboard","jobs","saved","applications","application","application-confirmation","interview","job-workspace","profile","payouts","verification","settings","notifications","onboarding"];
    if(session&&screen==="home"){let pendingVerification=false;try{pendingVerification=!!sessionStorage.getItem("remotePathVerificationEmail");if(pendingVerification)sessionStorage.removeItem("remotePathVerificationEmail")}catch{}if(pendingVerification){go("onboarding");return;}}
    if(session&&adminScreens.includes(screen)&&!roleReady)return;
    if(session&&["admin","super_admin"].includes(role)&&screen==="admin"){let target="";try{target=sessionStorage.getItem("remotePathAfterLogin")||"";if(target==="support-desk")sessionStorage.removeItem("remotePathAfterLogin")}catch{}if(target==="support-desk"){go("support-desk");return;}}

    if(!session&&protectedScreens.includes(screen)&&screen!=="admin"){try{sessionStorage.setItem("remotePathAfterLogin",screen)}catch{}go(screen==="support-desk"?"admin":"login");return;}
    if(session&&accountStatus!=="active"&&role!=="admin"&&role!=="super_admin"&&screen!=="restricted"&&screen!=="support"){go("restricted");return;}
    if(session&&["employer","postjob","candidates"].includes(screen)){go("dashboard");return;}

    if(session&&adminScreens.includes(screen)&&role!=="admin"&&role!=="super_admin"){go("dashboard");return;}
    if(session&&["admin","super_admin"].includes(role)&&memberScreens.includes(screen)){go("admin");return;}

    if(session&&role!=="admin"&&role!=="super_admin"){
      (async()=>{
        const {data:profile}=await supabase.from("profiles").select("onboarding_completed").eq("id",session.user.id).maybeSingle();
        if(!profile)return;
        if(!profile.onboarding_completed&&screen!=="onboarding"&&memberScreens.includes(screen)){try{sessionStorage.setItem("remotePathAfterLogin",screen)}catch{}go("onboarding");return;}
        if(profile.onboarding_completed&&screen==="onboarding"){let target="";try{target=sessionStorage.getItem("remotePathAfterLogin")||"";sessionStorage.removeItem("remotePathAfterLogin")}catch{}go(target&&memberScreens.includes(target)?target:"dashboard");return;}
        if(screen==="login"||screen==="verify"){let target="";try{target=sessionStorage.getItem("remotePathAfterLogin")||"";sessionStorage.removeItem("remotePathAfterLogin")}catch{}if(target&&memberScreens.includes(target)){go(target);return;}go(profile.onboarding_completed?"dashboard":"onboarding");}
      })();
    }
  },[authReady,roleReady,session,screen,role,accountStatus]);
  if(!authReady||loaderVisible)return <RemoteWayLoader/>;
  // Keep the private admin route expression build-safe.
  let page;
  if(["privacy","terms","cookies"].includes(screen)) page=<LegalPage go={go} type={screen}/>; else if(screen==="companies") page=<CompaniesPage go={go}/>; else if(screen==="resources") page=<ResourcesPage go={go}/>; else if(screen==="about") page=<AboutPage go={go}/>; else if(screen==="home") page=<Home go={go}/>; else if(screen==="restricted") page=<AccessRestricted status={accountStatus} go={go}/>; else if(screen==="jobs") page=<Jobs go={go} initialQuery={param} member={!!session}/>; else if(screen==="job") page=<JobDetail go={go} id={param} member={!!session}/>; else if(screen==="login") page=<Auth go={go} mode="login"/>; else if(screen==="signup") page=<Auth go={go} mode="signup"/>; else if(screen==="auth-callback") page=<GoogleAuthCallback go={go}/>; else if(screen==="verify") page=<VerifyEmail go={go} email={param}/>; else if(screen==="reset-password") page=<ResetPassword go={go}/>; else if(screen==="onboarding") page=<Onboarding go={go}/>; else if(screen==="verification") page=<Verification go={go}/>; else if(screen==="payouts") page=<AppShell go={go} screen={screen}><Payouts go={go}/></AppShell>; else if(screen==="application") page=<ApplicationFlow go={go} id={param}/>; else if(screen==="application-confirmation") page=<ApplicationConfirmation go={go} id={param}/>; else if(screen==="interview") page=<Interview go={go} returnTo={interviewReturnRef.current}/>; else if(screen==="job-workspace") page=<JobWorkspace go={go}/>; else if(screen==="employer") page=<AppShell go={go} screen={screen}><Employer go={go}/></AppShell>; else if(screen==="postjob") page=<PostJob go={go}/>; else if(screen==="candidates") page=<AppShell go={go} screen={screen}><Candidates go={go}/></AppShell>; else if(screen==="admin") page=session&&["admin","super_admin"].includes(role)?<AppShell go={go} screen={screen}><Admin go={go}/></AppShell>:<AdminAuth go={go}/>; else if(screen==="admin-applications") page=<AppShell go={go} screen={screen}><AdminApplications go={go}/></AppShell>; else if(screen==="admin-verification") page=<AppShell go={go} screen={screen}><AdminVerification go={go}/></AppShell>; else if(screen==="admin-members") page=<AppShell go={go} screen={screen}><AdminMembers go={go}/></AppShell>; else if(screen==="admin-support") page=<AppShell go={go} screen={screen}><AdminSupport go={go}/></AppShell>; else if(screen==="support-desk") page=<AdminSupport go={go} standalone/>; else if(screen==="admin-studio") page=<AppShell go={go} screen={screen}><AdminStudio go={go} role={role}/></AppShell>; else if(screen==="notifications") page=<AppShell go={go} screen={screen}><Notifications go={go}/></AppShell>; else if(screen==="profile") page=<AppShell go={go} screen={screen}><Profile go={go}/></AppShell>; else if(screen==="saved") page=<AppShell go={go} screen={screen}><Saved go={go}/></AppShell>; else if(screen==="applications") page=<AppShell go={go} screen={screen}><Applications go={go}/></AppShell>; else if(screen==="settings") page=<AppShell go={go} screen={screen}><Settings go={go}/></AppShell>; else page=<AppShell go={go} screen="dashboard"><Dashboard go={go}/></AppShell>;
  return <>{page}{!(session&&["admin","super_admin"].includes(role))&&<SupportWidget/>}{toast&&<Toast message={toast} onClose={()=>setToast("")}/>}</>;
}
export default App;