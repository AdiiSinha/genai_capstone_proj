import React, { useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../auth";
import { createDraft, getJunkMail, getMail, getMailMessage, getProfile, getSentMail, sendMail } from "../../graph";
import { Title } from "../common/Title";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const OVERRIDES = "wdCommitmentOverrides";
const COMMITMENT_CACHE_PREFIX = "wdCommitmentCache:v4:";
const COMMITMENT_CACHE_TTL = 10 * 60 * 1000;

const clean = (v = "") => {
  const d = document.createElement("div"); d.innerHTML = String(v);
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
};
const fmt = v => { if (!v) return "Not specified"; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("en-IN", {day:"2-digit",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"}); };
const initials = s => String(s || "?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "?";
const relative = v => { if (!v) return "No deadline"; const n = new Date(v).getTime() - Date.now(); const m = Math.round(Math.abs(n)/60000); if(n<0)return m<60?`${m}m overdue`:m<1440?`${Math.round(m/60)}h overdue`:`${Math.round(m/1440)}d overdue`; return m<60?`in ${m}m`:m<1440?`in ${Math.round(m/60)}h`:`in ${Math.round(m/1440)}d`; };

function mailShape(m, direction) {
  const body = typeof m?.body === "string" ? m.body : m?.body?.content;
  const timestamp = m?.sentDateTime || m?.receivedDateTime || "";
  return { id:m?.id||"", direction, subject:m?.subject||"(No subject)", from:m?.from?.emailAddress||{}, toRecipients:m?.toRecipients||[], ccRecipients:m?.ccRecipients||[], timestamp, sentDateTime:direction === "sent" ? timestamp : "", receivedDateTime:direction === "received" ? timestamp : "", body:clean(body||m?.bodyPreview||"").slice(0,6500), webLink:m?.webLink||"", conversationId:m?.conversationId||"" };
}
function overrides(){ try{return JSON.parse(localStorage.getItem(OVERRIDES)||"{}")}catch{return{}} }
function withOverrides(list){const o=overrides();return list.map(x=>o[x.id]?{...x,...o[x.id]}:x)}
function withCommitmentType(list, type) { return (list || []).map(item => ({ ...item, commitmentType: item.commitmentType || type })); }

function commitmentCacheKey(account) {
  return `${COMMITMENT_CACHE_PREFIX}${account?.homeAccountId || account?.username || "default"}`;
}

function readCommitmentCache(account) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(commitmentCacheKey(account)) || "null");
    if (!cached || Date.now() - cached.cachedAt > COMMITMENT_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCommitmentCache(account, data) {
  try {
    sessionStorage.setItem(commitmentCacheKey(account), JSON.stringify({
      cachedAt: Date.now(),
      commitments: data.commitments || [],
      summary: data.summary || {},
      generatedAt: data.generatedAt || new Date().toISOString()
    }));
  } catch {
    // Storage may be unavailable or full; the live workflow still works.
  }
}

async function analyzeAI(sent, inbox, employee){
  const r=await fetch(`${API}/api/commitments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sent,inbox,employee,now:new Date().toISOString()})});
  const d=await r.json(); if(!r.ok)throw Error(d.detail||"Commitment AI failed"); return d;
}
async function draftAI(commitment){
  const r=await fetch(`${API}/api/commitments/draft`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({commitment})});
  const d=await r.json(); if(!r.ok)throw Error(d.detail||"Draft AI failed"); return d;
}

export function Commit({ask}){
  const {instance,accounts}=useMsal(); const account=accounts[0];
  const [items,setItems]=useState([]),[summary,setSummary]=useState({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[err,setErr]=useState(""),[last,setLast]=useState("");
  const [tab,setTab]=useState("all"),[q,setQ]=useState(""),[person,setPerson]=useState("all"),[project,setProject]=useState("all"),[selected,setSelected]=useState(null),[source,setSource]=useState(null),[draft,setDraft]=useState(null),[draftBusy,setDraftBusy]=useState(false),[toast,setToast]=useState("");
  const [toastSeconds, setToastSeconds] = useState(5);
  async function token(){try{return(await instance.acquireTokenSilent({scopes:loginRequest.scopes,account:instance.getActiveAccount()||account})).accessToken}catch{return(await instance.acquireTokenPopup({scopes:loginRequest.scopes})).accessToken}}
  useEffect(() => {
    if (!toast) return undefined;
    setToastSeconds(5);
    const timer = window.setInterval(() => {
      setToastSeconds(previous => {
        if (previous <= 1) {
          window.clearInterval(timer);
          setToast("");
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [toast]);
  async function run(force = false) {
  setBusy(true);
  setErr("");
 
  try {
    const t = await token();
 
    // ============================================
    // 1. LOAD REAL OUTLOOK DATA
    // ============================================
 
    const [s, i, j, p] = await Promise.all([
      getSentMail(t),
      getMail(t),
      getJunkMail(t),
      getProfile(t)
    ]);
 
    const rawSent = s.value || [];
    const rawInbox = [...(i.value || []), ...(j.value || [])];
 
    console.log("========================================");
    console.log("      COMMITMENT GRAPH DEBUG");
    console.log("========================================");
    console.log("Raw sent emails:", rawSent.length);
    console.log("Raw inbox emails:", rawInbox.length);
 
    // ============================================
    // 2. SHAPE THE LIST RESULTS
    // ============================================
 
    let sent = rawSent.map(x => mailShape(x, "sent"));
    let inbox = rawInbox.map(x => mailShape(x, "received"));
 
    console.log("FIRST SENT AFTER mailShape:");
    console.log(sent[0]);
 
    console.log("FIRST SENT BODY:");
    console.log(sent[0]?.body);
 
    console.log("FIRST INBOX AFTER mailShape:");
    console.log(inbox[0]);
 
    console.log("FIRST INBOX BODY:");
    console.log(inbox[0]?.body);
 
    // ============================================
    // 3. FETCH COMPLETE MESSAGE BODY IF MISSING
    // ============================================
 
    async function enrichMessages(list) {
      return Promise.all(
        list.map(async (mail) => {
 
          // If body already exists, keep it.
          if (mail.body && mail.body.trim()) {
            return mail;
          }
 
          // No body -> fetch the complete Graph message.
          if (!mail.id) {
            console.warn(
              "⚠️ Cannot fetch complete message: missing ID",
              mail
            );
            return mail;
          }
 
          try {
            console.log(
              "Fetching complete Graph message:",
              mail.id,
              mail.subject
            );
 
            const full = await getMailMessage(t, mail.id);
 
            const fullBody =
              typeof full?.body === "string"
                ? full.body
                : full?.body?.content;
 
            const cleanedBody = clean(
              fullBody || full?.bodyPreview || ""
            ).slice(0, 6500);
 
            console.log(
              "Complete message body length:",
              cleanedBody.length
            );
 
            if (cleanedBody) {
              return {
                ...mail,
 
                body: cleanedBody,
 
                subject:
                  full?.subject ||
                  mail.subject,
 
                from:
                  full?.from?.emailAddress ||
                  mail.from,
 
                toRecipients:
                  full?.toRecipients ||
                  mail.toRecipients,
 
                ccRecipients:
                  full?.ccRecipients ||
                  mail.ccRecipients,
 
                sentDateTime:
                  full?.sentDateTime ||
                  mail.sentDateTime,
 
                receivedDateTime:
                  full?.receivedDateTime ||
                  mail.receivedDateTime,
 
                webLink:
                  full?.webLink ||
                  mail.webLink,
 
                conversationId:
                  full?.conversationId ||
                  mail.conversationId
              };
            }
 
            console.warn(
              "⚠️ Complete Graph message also has no body:",
              mail.subject
            );
 
            return mail;
 
          } catch (e) {
 
            console.error(
              "❌ Failed to fetch complete message:",
              mail.subject,
              e
            );
 
            return mail;
          }
        })
      );
    }
 
    // Fetch complete bodies only where necessary.
    sent = await enrichMessages(sent);
    inbox = await enrichMessages(inbox);
 
    // ============================================
    // 4. FINAL BODY DEBUG
    // ============================================
 
    console.log("\n========================================");
    console.log("       FINAL COMMITMENT EMAIL DATA");
    console.log("========================================");
 
    console.log("Sent count:", sent.length);
    console.log("Inbox count:", inbox.length);
 
    sent.forEach((mail, index) => {
      console.log(
        `SENT ${index + 1}:`,
        mail.subject,
        "| body length:",
        mail.body?.length || 0,
        "| body:",
        mail.body
      );
    });
 
    inbox.forEach((mail, index) => {
      console.log(
        `INBOX ${index + 1}:`,
        mail.subject,
        "| body length:",
        mail.body?.length || 0,
        "| body:",
        mail.body
      );
    });
 
    console.log("========================================\n");
 
    // ============================================
    // 5. SEND REAL EMAIL CONTENT TO AI
    // ============================================
 
    console.log("Sending emails to Commitment AI...");
 
    const d = await analyzeAI(
      sent,
      inbox,
      p
    );
 
    // ============================================
    // 6. AI RESPONSE DEBUG
    // ============================================
 
    console.log("========================================");
    console.log("       COMMITMENT AI RESULT");
    console.log("========================================");
 
    console.log("AI response:", d);
    console.log(
      "AI commitments:",
      d?.commitments
    );
    console.log(
      "AI commitment count:",
      d?.commitments?.length || 0
    );
    console.log(
      "AI summary:",
      d?.summary
    );
 
    console.log("========================================\n");
 
    // ============================================
    // 7. UPDATE UI
    // ============================================
 
    const selfCommitments = withCommitmentType(d.commitments, "self");
    const receivedCommitments = withCommitmentType(d.receivedCommitments, "received");
    const list = withOverrides([
      ...selfCommitments,
      ...receivedCommitments
    ]);
 
    setItems(list);
    setSummary(d.summary || {});
    setLast(
      d.generatedAt ||
      new Date().toISOString()
    );
    writeCommitmentCache(account, {
      commitments: list,
      summary: d.summary || {},
      generatedAt: d.generatedAt
    });
 
    if (force) {
      setToast(
        "Commitments refreshed from real Outlook mail."
      );
    }
 
  } catch (e) {
 
    console.error(
      "❌ COMMITMENT ANALYSIS ERROR:",
      e
    );
 
    console.error(
      "Error message:",
      e?.message
    );
 
    setErr(
      e.message ||
      "Unable to analyze commitments."
    );
 
  } finally {
 
    setBusy(false);
    setLoading(false);
  }
}
 
  useEffect(() => {
    if (!account) return;

    const cached = readCommitmentCache(account);
    if (cached) {
      setItems(withOverrides((cached.commitments || []).map(item => ({
        ...item,
        commitmentType: item.commitmentType || "self"
      }))));
      setSummary(cached.summary || {});
      setLast(cached.generatedAt || "");
      setLoading(false);
      return;
    }

    run();
  }, [account?.homeAccountId]);
  const people=useMemo(()=>[...new Set(items.map(x=>x.recipientName).filter(Boolean))].sort(),[items]);
  const projects=useMemo(()=>[...new Set(items.map(x=>x.project).filter(Boolean))].sort(),[items]);
  const filtered=useMemo(()=>{const s=q.toLowerCase();return items.filter(x=>{if(tab==="self"&&x.commitmentType!=="self")return false;if(tab==="received"&&x.commitmentType!=="received")return false;if(tab==="active"&&x.status==="completed")return false;if(!["all","self","received","soon","active"].includes(tab)&&x.status!==tab)return false;if(tab==="soon"&&!['due_today','due_soon'].includes(x.status))return false;if(person!=="all"&&x.recipientName!==person)return false;if(project!=="all"&&x.project!==project)return false;return !s||[x.title,x.action,x.recipientName,x.project,x.originalQuote,x.sourceSubject].filter(Boolean).join(" ").toLowerCase().includes(s)})},[items,tab,q,person,project]);
  function selectKpi(filter) { setTab(tab === filter ? "all" : filter); }
  function complete(c){const o=overrides();o[c.id]={...(o[c.id]||{}),status:"completed",completionDetected:false,completionAt:new Date().toISOString(),completionEvidence:"Marked complete by employee."};localStorage.setItem(OVERRIDES,JSON.stringify(o));setItems(x=>{const next=x.map(y=>y.id===c.id?{...y,...o[c.id]}:y);const nextSummary={...summary,active:Math.max(0,(summary.active||0)-1),completed:(summary.completed||0)+1};setSummary(nextSummary);writeCommitmentCache(account,{commitments:next,summary:nextSummary,generatedAt:last});return next});setToast("Commitment marked complete.")}
  async function evidence(c){setSelected(c);setSource(null);try{const t=await token();setSource(await getMailMessage(t,c.sourceId))}catch(e){setToast(e.message)}}
  async function makeDraft(c){setDraftBusy(true);try{setDraft(await draftAI(c))}catch(e){setToast(e.message)}finally{setDraftBusy(false)}}
  async function saveDraft(){setDraftBusy(true);try{await createDraft(await token(),draft);setDraft(null);setToast("Follow-up saved to Outlook Drafts.")}catch(e){setToast(e.message)}finally{setDraftBusy(false)}}
  async function approve(){setDraftBusy(true);try{await sendMail(await token(),draft);setDraft(null);setToast("Follow-up sent after your approval.");run(true)}catch(e){setToast(e.message)}finally{setDraftBusy(false)}}
  const active=items.filter(x=>x.status!=="completed").length;
  return <div className="commitmentsAI">
    <style>{CSS}</style>
    <div className="cHead"><div><Title k="MEMORY & FOLLOW-UP" t="Your commitments"/><p>AI reads your real Outlook sent and received mail to discover promises, deadlines and completion evidence.</p></div><div className="cHeadActions"><span className="liveAI"><i/> LIVE GRAPH + AI</span><button onClick={()=>run(true)} disabled={busy}>↻ {busy?"Analyzing…":"Refresh"}</button></div></div>
    {err&&<div className="cError">⚠ <div><b>Commitment analysis failed</b><small>{err}</small></div><button onClick={()=>run(true)}>Retry</button></div>}
    <div className="cStats"><Stat n={active} t="Active" s="tracked promises" onClick={()=>selectKpi("active")} active={tab === "active"}/><Stat n={summary.dueToday||0} t="Due today" s="needs attention" a onClick={()=>selectKpi("due_today")} active={tab === "due_today"}/><Stat n={summary.overdue||0} t="Overdue" s="follow up now" r/><Stat n={summary.completed||0} t="Completed" s="AI verified" g/><Stat n={summary.noDeadline||0} t="No deadline" s="needs planning" v onClick={()=>selectKpi("no_deadline")} active={tab === "no_deadline"}/></div>
    {(summary.overdue||summary.dueToday)&&<div className="cAlert"><b>✦ AI attention</b><span>{(summary.overdue||0)+(summary.dueToday||0)} commitment{((summary.overdue||0)+(summary.dueToday||0))!==1?"s":""} may need action.</span><button onClick={()=>setTab(summary.overdue?"overdue":"due_today")}>Review →</button></div>}
    <div className="cToolbar"><div className="cTabs">{[["all","All",items.length],["self","Sent",items.filter(x=>x.commitmentType==="self").length],["received","Received",items.filter(x=>x.commitmentType==="received").length],["due_today","Due today",summary.dueToday||0],["due_soon","Due soon",items.filter(x=>x.status==="due_soon").length],["overdue","Overdue",summary.overdue||0],["completed","Completed",summary.completed||0]].map(([id,l,n])=><button className={tab===id?"on":""} onClick={()=>setTab(id)} key={id}>{l}<em>{n}</em></button>)}</div><label className="cSearch">⌕<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search commitments…"/></label><select value={person} onChange={e=>setPerson(e.target.value)}><option value="all">Everyone</option>{people.map(x=><option key={x}>{x}</option>)}</select><select value={project} onChange={e=>setProject(e.target.value)}><option value="all">All projects</option>{projects.map(x=><option key={x}>{x}</option>)}</select></div>
    {loading || busy ? <CommitmentLoading/> : <div className="cList">{filtered.length?filtered.map((c,i)=><Card key={c.id||i} c={c} i={i} complete={complete} evidence={evidence} draft={makeDraft} ask={ask}/>):<div className="cEmpty"><div>◎</div><h3>No commitments in this view</h3><p>Try another filter or refresh the AI analysis.</p></div>}</div>}
    <div className="cFoot">✦ {items.length} commitment{items.length===1?"":"s"} detected from authorized Outlook context{last?` · Last analyzed ${fmt(last)}`:""}. <b>Nothing is sent automatically.</b></div>
    {selected&&<Drawer c={selected} source={source} close={()=>{setSelected(null);setSource(null)}} ask={ask} draft={makeDraft}/>} 
    {draft&&<Draft d={draft} set={setDraft} close={()=>setDraft(null)} save={saveDraft} send={approve} busy={draftBusy}/>} 
    {toast&&<div className="cToast" role="status" aria-live="polite"><div className="cToastGlow"/><div className="cToastIcon">✦</div><div className="cToastBody"><strong>Commitments updated</strong><span>{toast}</span></div><button className="cToastClose" onClick={()=>setToast("")} aria-label={`Close notification, auto-closes in ${toastSeconds} seconds`}><span>{toastSeconds}</span><b>×</b></button><div className="cToastProgress" style={{"--toast-progress": `${toastSeconds * 20}%`}}/></div>}
  </div>
}
function Stat({n,t,s,a,r,g,v,onClick,active}){return <button type="button" className={`cStat ${a?"amber":r?"red":g?"green":v?"violet":"cyan"} ${active?"selected":""}`} onClick={onClick}><i/><span><b>{n}</b><strong>{t}</strong><small>{s}</small></span></button>}
function Loading(){return <div className="cList">{[1,2,3].map(x=><div className="cSkeleton" key={x}/>)}</div>}
function CommitmentLoading(){return <><style>{`.commitmentLoading{min-height:260px;display:grid;place-items:center;align-content:center;gap:10px;color:#9eb5c8;text-align:center}.commitmentLoading strong{font-size:13px;color:#dceefa}.commitmentLoading>span{font-size:9px;color:#6f879b}.commitmentLoader{display:flex;gap:7px}.commitmentLoader i{width:9px;height:9px;border-radius:50%;background:#5bdcff;box-shadow:0 0 14px #5bdcff;animation:commitmentPulse 1s ease-in-out infinite}.commitmentLoader i:nth-child(2){animation-delay:.16s}.commitmentLoader i:nth-child(3){animation-delay:.32s}@keyframes commitmentPulse{0%,100%{transform:scale(.55);opacity:.35}50%{transform:scale(1.2);opacity:1}}`}</style><div className="commitmentLoading"><div className="commitmentLoader"><i/><i/><i/></div><strong>Scanning your mail for commitments</strong><span>Checking sent, inbox, and junk messages...</span></div></>}
function Card({c,i,complete,evidence,draft,ask}){const done=c.status==="completed";const label={overdue:"OVERDUE",due_today:"DUE TODAY",due_soon:"DUE SOON",pending:"PENDING",no_deadline:"NO DEADLINE",completed:"COMPLETED"}[c.status]||"PENDING";return <article className={`cCard ${c.status}`} style={{animationDelay:`${i*50}ms`}}><div className="cAccent"/><div className="cTop"><div className="cOrb">{done?"✓":"◎"}</div><div className="cMain"><div className="cMeta"><span className={`badge ${c.status}`}>{label}</span><span>AI {c.confidence||0}%</span>{c.priority==="high"&&<b>HIGH PRIORITY</b>}</div><h3>{c.title||c.action}</h3><p>{c.action}</p><div className="facts"><span>👤 {c.recipientName||c.recipientEmail||"Recipient not identified"}</span>{c.project&&<span>◇ {c.project}</span>}<span>◷ {c.dueLabel||"No deadline"}</span>{c.dueAt&&<span>{relative(c.dueAt)}</span>}</div></div><button className="details" onClick={()=>evidence(c)}>Details →</button></div><div className="quote"><b>“</b><p>{c.originalQuote||"No source phrase returned."}</p><small>{fmt(c.promisedAt)} · {c.sourceSubject||"Email"}</small></div><div className="cBottom"><div className="who"><span>{initials(c.recipientName||c.recipientEmail)}</span><div><b>{c.recipientName||c.recipientEmail||"Unknown recipient"}</b><small>Promised via Outlook · {fmt(c.promisedAt)}</small></div></div><div className="actions">{c.sourceWebLink&&<a href={c.sourceWebLink} target="_blank" rel="noreferrer">Open email ↗</a>}{!done&&<button onClick={()=>complete(c)}>✓ Complete</button>}{!done&&<button onClick={()=>draft(c)}>✦ Draft follow-up</button>}<button className="ask" onClick={()=>ask(`Why was this commitment detected? Where did I promise it and what should I do next?\n\nCommitment: ${c.action}\nRecipient: ${c.recipientName||c.recipientEmail}\nDue: ${c.dueLabel}\nEvidence: ${c.originalQuote}`)}>Ask AI →</button></div></div>{c.completionDetected&&c.completionEvidence&&<div className="proof">✓ <div><b>AI detected completion evidence</b><p>“{c.completionEvidence}”</p><small>{c.completionSubject||"Later email"} · {c.completionAt?fmt(c.completionAt):""}</small></div></div>}{c.risk&&c.risk!=="none"&&!done&&<div className={`risk ${c.risk}`}>⚠ <b>{c.risk==="high"?"Needs attention":"Potential risk"}</b><span>{c.riskReason}</span></div>}</article>}
function Drawer({c,source,close,ask,draft}){return <div className="drawerBack" onClick={close}><aside className="drawer" onClick={e=>e.stopPropagation()}><button className="x" onClick={close}>×</button><small className="kicker">COMMITMENT EVIDENCE</small><h2>{c.title||c.action}</h2><p className="drawerAction">{c.action}</p><section><label>WHAT YOU PROMISED</label><blockquote>“{c.originalQuote}”</blockquote><small>AI confidence {c.confidence||0}% · {c.confidenceReason||"Semantic workplace commitment detected."}</small></section><section><label>WHO · WHEN · WHERE</label><div className="grid"><Info l="Promised to" v={c.recipientName||c.recipientEmail||"Not identified"}/><Info l="Deadline" v={c.dueLabel||"No deadline"}/><Info l="Promised on" v={fmt(c.promisedAt)}/><Info l="Project / topic" v={c.project||"Not identified"}/><Info l="Subject" v={c.sourceSubject||"Not available"}/><Info l="Source" v="Microsoft Outlook"/></div></section><section><label>ORIGINAL EMAIL</label>{source?<div className="email"><b>{source.subject||c.sourceSubject}</b><small>{source.from?.emailAddress?.name||source.from?.emailAddress?.address||"You"} → {(source.toRecipients||[]).map(x=>x.emailAddress?.name||x.emailAddress?.address).filter(Boolean).join(", ")}</small><small>{fmt(source.sentDateTime||source.receivedDateTime)}</small><p>{clean(source.body?.content||source.bodyPreview||"Email body unavailable.")}</p></div>:<div className="loadingEvidence">Loading original Graph message…</div>}</section>{c.completionDetected&&<section><label>COMPLETION DETECTION</label><div className="timeline"><b>Promise</b><span>{fmt(c.promisedAt)}</span><p>{c.originalQuote}</p><hr/><b>Completion evidence</b><span>{fmt(c.completionAt)}</span><p>{c.completionEvidence||"Later email evidence matched the promise."}</p></div></section>}<section><label>AI REASONING</label><div className="reason"><b>Detection</b><p>{c.confidenceReason||"The model found first-person commitment intent in the source email."}</p><b>Risk</b><p>{c.riskReason||"No additional risk signal."}</p></div></section><footer>{c.sourceWebLink&&<a href={c.sourceWebLink} target="_blank" rel="noreferrer">Open original email ↗</a>}<button onClick={()=>ask(`Explain this commitment using only the source evidence. Did I complete it?\n${c.originalQuote}`)}>Ask AI →</button>{c.status!=="completed"&&<button className="primary" onClick={()=>draft(c)}>Draft follow-up</button>}</footer></aside></div>}
function Info({l,v}){return <div className="info"><small>{l}</small><b>{v}</b></div>}
function Draft({d,set,close,save,send,busy}){return <div className="drawerBack"><div className="draft"><button className="x" onClick={close}>×</button><small className="kicker">HUMAN APPROVAL · AI DRAFT</small><h2>Follow up on commitment</h2><p>AI prepared this message from the detected commitment. Review it before saving or sending.</p><label>To<input value={d.to||""} onChange={e=>set({...d,to:e.target.value})}/></label><label>Subject<input value={d.subject||""} onChange={e=>set({...d,subject:e.target.value})}/></label><label>Message<textarea rows="11" value={d.body||""} onChange={e=>set({...d,body:e.target.value})}/></label><div className="approval">✓ Human approval required. Nothing is sent automatically.</div><footer><button onClick={close}>Cancel</button><button disabled={busy} onClick={save}>▣ Save Outlook draft</button><button className="primary" disabled={busy} onClick={send}>✦ Approve & Send</button></footer></div></div>}

const CSS=`
`;

export default Commit;
