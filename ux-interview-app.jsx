"use client";

import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, getDocs, getFirestore, orderBy, query, serverTimestamp } from "firebase/firestore";

// ─── Storage helpers ───────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD0byY3-zsyo7NoMWumcUJk7mC_bgAIyXk",
  authDomain: "ux-ur-interview.firebaseapp.com",
  projectId: "ux-ur-interview",
  storageBucket: "ux-ur-interview.firebasestorage.app",
  messagingSenderId: "942807827099",
  appId: "1:942807827099:web:699e6536315f006061fc3e",
  measurementId: "G-79FHQPFCXR",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const responsesCollection = collection(db, "responses");

async function loadResponses() {
  try {
    const snapshot = await getDocs(query(responsesCollection, orderBy("ts", "desc")));
    return snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
  } catch(e) {
    console.error(e);
    return [];
  }
}
async function saveResponse(entry) {
  try {
    await addDoc(responsesCollection, {
      ...entry,
      createdAt: serverTimestamp(),
    });
    return loadResponses();
  } catch(e) { console.error(e); return []; }
}

// ─── Styles ────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;600;700&family=Roboto:wght@300;400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ur-navy:   #0a0f1e;
    --ur-dark:   #111827;
    --ur-card:   #161d2e;
    --ur-border: #1e2d45;
    --ur-blue:   #56a0d3;
    --ur-blue2:  #3a7cb5;
    --ur-white:  #f0f4f8;
    --ur-muted:  #8096b0;
    --ur-subtle: #243044;
    --ur-green:  #2ecc7a;
    --ur-orange: #e8773a;
    --radius:    4px;
  }

  html, body { background: var(--ur-navy); color: var(--ur-white); font-family: 'Roboto', sans-serif; font-size: 14px; line-height: 1.5; }
  .app { min-height: 100vh; }
  h1, h2, h3, .survey-title, .success-title, .dash-title, .stat-val, .slider-num { font-family: 'Red Hat Display', sans-serif; }

  /* ── HEADER ── */
  .brand-header {
    display: flex; align-items: center;
    padding: 0 32px; height: 72px;
    background: var(--ur-dark);
    border-bottom: 1px solid var(--ur-border);
    position: sticky; top: 0; z-index: 100;
  }
  .brand-logo { width: 210px; height: auto; display: block; }

  /* ── SURVEY ── */
  .survey-wrap { max-width: 680px; margin: 0 auto; padding: 56px 24px 100px; }

  .survey-title {
    font-size: clamp(28px, 5vw, 42px); font-weight: 700; line-height: 1.1;
    color: var(--ur-white); margin-bottom: 16px; letter-spacing: -0.02em;
  }
  .survey-title span { color: var(--ur-blue); }
  .survey-sub { font-size: 15px; color: var(--ur-muted); line-height: 1.7; margin-bottom: 48px; font-weight: 300; max-width: 520px; }

  hr.divider { border: none; border-top: 1px solid var(--ur-border); margin: 36px 0; }

  /* ── FIELDS ── */
  .field { margin-bottom: 32px; }
  .field-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--ur-muted); margin-bottom: 10px;
  }
  .field-label .req { color: var(--ur-blue); }

  .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  input[type=text], input[type=password], textarea {
    width: 100%; background: var(--ur-card); border: 1px solid var(--ur-border);
    border-radius: var(--radius); padding: 12px 16px;
    font-family: inherit; font-size: 14px; color: var(--ur-white);
    outline: none; transition: border .15s; resize: vertical;
  }
  input[type=text]::placeholder, input[type=password]::placeholder, textarea::placeholder { color: var(--ur-muted); }
  input[type=text]:focus, input[type=password]:focus, textarea:focus { border-color: var(--ur-blue); }
  textarea { min-height: 100px; }

  /* ── EMOJI ── */
  .emoji-row { display: flex; gap: 8px; }
  .emoji-btn {
    flex: 1; padding: 14px 8px; border-radius: var(--radius);
    border: 1px solid var(--ur-border); background: var(--ur-card);
    cursor: pointer; transition: all .15s; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  .emoji-btn:hover { border-color: var(--ur-blue); background: var(--ur-subtle); }
  .emoji-btn.selected { border-color: var(--ur-blue); background: rgba(86,160,211,.12); }
  .emoji-btn .em { font-size: 24px; }
  .emoji-btn .em-label { font-size: 9px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ur-muted); }
  .emoji-btn.selected .em-label { color: var(--ur-blue); }

  /* ── SLIDER ── */
  .slider-block { background: var(--ur-card); border: 1px solid var(--ur-border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 12px; }
  .slider-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
  .slider-name { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: var(--ur-white); }
  .slider-num {
    font-size: 28px; font-weight: 700; color: var(--ur-blue); letter-spacing: -0.02em;
    line-height: 1; min-width: 40px; text-align: right;
  }
  .slider-num small { font-size: 13px; font-weight: 400; color: var(--ur-muted); }

  .slider-control {
    position: relative; width: 100%; height: 28px; cursor: pointer;
    touch-action: none; user-select: none; outline: none;
  }
  .slider-track {
    position: absolute; left: 0; right: 0; top: 50%; height: 4px;
    transform: translateY(-50%); border-radius: 99px; background: var(--ur-subtle);
  }
  .slider-fill {
    position: absolute; left: 0; top: 0; height: 100%;
    border-radius: 99px; background: var(--ur-blue);
  }
  .slider-thumb {
    position: absolute; top: 50%; width: 18px; height: 18px;
    border-radius: 50%; background: var(--ur-blue); border: 2px solid var(--ur-dark);
    box-shadow: 0 0 0 3px rgba(86,160,211,.25);
    transform: translate(-50%, -50%);
  }
  .slider-control:focus-visible .slider-thumb { box-shadow: 0 0 0 5px rgba(86,160,211,.35); }
  .slider-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--ur-muted); margin-top: 10px; letter-spacing: 0.04em; }

  /* ── TAGS ── */
  .tag-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .tag-btn {
    padding: 7px 16px; border-radius: 2px; border: 1px solid var(--ur-border);
    background: var(--ur-card); font-family: inherit; font-size: 11px; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; color: var(--ur-muted);
    transition: all .15s;
  }
  .tag-btn:hover { border-color: var(--ur-blue); color: var(--ur-blue); }
  .tag-btn.selected { border-color: var(--ur-blue); background: rgba(86,160,211,.15); color: var(--ur-blue); }

  /* ── SUBMIT ── */
  .submit-btn {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    width: fit-content; padding: 16px 36px; border-radius: 999px;
    background: var(--ur-blue); color: white; border: none; font-family: inherit;
    font-size: 16px; font-weight: 700; letter-spacing: 0;
    cursor: pointer; transition: background .2s; margin: 8px auto 0;
  }
  .submit-btn:hover { background: var(--ur-blue2); }
  .submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }

  /* ── SUCCESS ── */
  .success-wrap { max-width: 480px; margin: 80px auto; padding: 0 24px; text-align: center; }
  .success-check {
    width: 72px; height: 72px; border-radius: 50%; border: 2px solid var(--ur-green);
    display: flex; align-items: center; justify-content: center; margin: 0 auto 28px;
    font-size: 28px;
  }
  .success-title { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 12px; }
  .success-sub { color: var(--ur-muted); font-size: 15px; line-height: 1.7; margin-bottom: 36px; }
  .retry-btn {
    padding: 12px 28px; border-radius: var(--radius);
    border: 1px solid var(--ur-border); background: transparent;
    font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--ur-muted); cursor: pointer; transition: all .2s;
  }
  .retry-btn:hover { border-color: var(--ur-blue); color: var(--ur-blue); }

  /* ── DASHBOARD ── */
  .dash-wrap { max-width: 1140px; margin: 0 auto; padding: 48px 24px 80px; }

  .dash-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
  .dash-title { font-size: 36px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  .dash-sub { color: var(--ur-muted); font-size: 13px; letter-spacing: 0.04em; }

  .export-btn {
    display: flex; align-items: center; gap: 8px; padding: 10px 20px;
    border-radius: var(--radius); border: 1px solid var(--ur-border);
    background: var(--ur-card); font-family: inherit; font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--ur-blue);
    cursor: pointer; transition: all .2s;
  }
  .export-btn:hover { border-color: var(--ur-blue); background: rgba(86,160,211,.1); }

  .login-wrap { max-width: 420px; margin: 80px auto; padding: 0 24px; }
  .login-card { background: var(--ur-card); border: 1px solid var(--ur-border); border-radius: var(--radius); padding: 28px; }
  .login-title { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }
  .login-sub { color: var(--ur-muted); font-size: 13px; line-height: 1.6; margin-bottom: 24px; }
  .login-error { color: var(--ur-orange); font-size: 12px; line-height: 1.5; margin: 12px 0 0; }

  /* stats */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1px; background: var(--ur-border); border: 1px solid var(--ur-border); border-radius: var(--radius); overflow: hidden; margin-bottom: 32px; }
  .stat-card { background: var(--ur-card); padding: 24px; }
  .stat-label { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ur-muted); margin-bottom: 12px; }
  .stat-val { font-size: 40px; font-weight: 700; letter-spacing: -0.03em; color: var(--ur-blue); line-height: 1; }
  .stat-val.white { color: var(--ur-white); }
  .stat-val.green { color: var(--ur-green); }
  .stat-val.orange { color: var(--ur-orange); }

  /* charts row */
  .charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .chart-card { background: var(--ur-card); border: 1px solid var(--ur-border); border-radius: var(--radius); padding: 24px; }
  .chart-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ur-muted); margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
  .chart-title::before { content:''; display:block; width:12px; height:2px; background: var(--ur-blue); }

  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .bar-key { font-size: 11px; color: var(--ur-muted); width: 100px; flex-shrink: 0; font-weight: 500; }
  .bar-track { flex: 1; height: 6px; background: var(--ur-subtle); border-radius: 99px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 99px; transition: width .7s cubic-bezier(.23,1,.32,1); }
  .bar-fill-blue { background: var(--ur-blue); }
  .bar-fill-green { background: var(--ur-green); }
  .bar-count { font-size: 11px; color: var(--ur-muted); width: 20px; text-align: right; flex-shrink: 0; }

  /* responses */
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ur-muted); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
  .section-title::after { content:''; flex:1; height:1px; background: var(--ur-border); }

  .response-card {
    background: var(--ur-card); border: 1px solid var(--ur-border); border-radius: var(--radius);
    padding: 20px 24px; margin-bottom: 8px; transition: border-color .15s;
    display: grid; grid-template-columns: auto 1fr; gap: 0 20px;
  }
  .response-card:hover { border-color: var(--ur-blue); }

  .r-left { display: flex; flex-direction: column; align-items: center; gap: 4px; padding-top: 2px; border-right: 1px solid var(--ur-border); padding-right: 20px; }
  .r-emoji { font-size: 28px; }
  .r-scores-col { display: flex; flex-direction: column; gap: 6px; }
  .r-score-mini { text-align: center; }
  .r-score-mini-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ur-muted); display: block; }
  .r-score-mini-val { font-size: 15px; font-weight: 700; color: var(--ur-blue); }

  .r-right { display: flex; flex-direction: column; gap: 8px; }
  .r-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .r-time { font-size: 10px; color: var(--ur-muted); margin-left: auto; font-variant-numeric: tabular-nums; }
  .r-tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .r-tag { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; background: rgba(86,160,211,.1); color: var(--ur-blue); border: 1px solid rgba(86,160,211,.2); padding: 3px 8px; border-radius: 2px; }
  .r-comment { font-size: 13px; color: var(--ur-muted); line-height: 1.65; padding-left: 12px; border-left: 2px solid var(--ur-border); }

  .empty-state { text-align: center; padding: 80px 24px; }
  .empty-icon { font-size: 40px; margin-bottom: 16px; opacity: .4; }
  .empty-text { color: var(--ur-muted); font-size: 14px; }

  @media (max-width: 600px) {
    .brand-header { padding: 0 16px; }
    .brand-logo { width: 170px; }
    .survey-wrap, .dash-wrap { padding: 36px 16px 80px; }
    .emoji-row { gap: 5px; }
    .input-row { grid-template-columns: 1fr; }
    .response-card { grid-template-columns: 1fr; }
    .r-left { flex-direction: row; border-right: none; border-bottom: 1px solid var(--ur-border); padding-right: 0; padding-bottom: 12px; margin-bottom: 12px; }
    .r-scores-col { flex-direction: row; gap: 16px; }
  }
`;

const EMOJIS = [
  { v: "😤", label: "Frustrated" },
  { v: "😐", label: "Neutral" },
  { v: "🙂", label: "Okay" },
  { v: "😊", label: "Satisfied" },
  { v: "🤩", label: "Delighted" },
];

const TAGS = ["Intuitive","Confusing","Precise","Unreliable","Fast","Slow","Clear feedback","Missing feedback","Overcorrected","Hard to find"];

function ScoreSlider({ name, value, onChange, left, right }) {
  const trackRef = useRef(null);
  const pct = ((value - 1) / 9) * 100;

  const valueFromPointer = clientX => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(1 + ratio * 9);
  };

  const handlePointerMove = e => {
    e.preventDefault();
    onChange(valueFromPointer(e.clientX));
  };

  const handlePointerDown = e => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    handlePointerMove(e);
  };

  const handleKeyDown = e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(1, value - 1));
    }
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(10, value + 1));
    }
  };

  return (
    <div className="slider-block">
      <div className="slider-top">
        <span className="slider-name">{name}</span>
        <span className="slider-num">{value}<small>/10</small></span>
      </div>
      <div
        className="slider-control"
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={name}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={e => {
          if (e.currentTarget.hasPointerCapture?.(e.pointerId)) handlePointerMove(e);
        }}
      >
        <div className="slider-track">
          <div className="slider-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="slider-thumb" style={{ left: `${pct}%` }} />
      </div>
      <div className="slider-labels"><span>{left}</span><span>{right}</span></div>
    </div>
  );
}

function SurveyView({ onSubmitted }) {
  const [useCase, setUseCase] = useState("");
  const [currentMethod, setCurrentMethod] = useState("");
  const [emoji, setEmoji] = useState(null);
  const [usability, setUsability] = useState(7);
  const [control, setControl] = useState(7);
  const [feedback, setFeedback] = useState(7);
  const [tags, setTags] = useState([]);
  const [friction, setFriction] = useState("");
  const [makeItTen, setMakeItTen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const toggleTag = t => setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]);

  const reset = () => {
    setDone(false);
    setEmoji(null);
    setTags([]);
    setUseCase("");
    setCurrentMethod("");
    setUsability(7);
    setControl(7);
    setFeedback(7);
    setFriction("");
    setMakeItTen("");
  };

  const handleSubmit = async () => {
    if (!emoji) { alert("Please select your overall reaction."); return; }
    setSubmitting(true);
    const entry = {
      id: Date.now(),
      ts: new Date().toISOString(),
      useCase: useCase.trim(),
      currentMethod: currentMethod.trim(),
      emoji,
      usability,
      control,
      feedback,
      tags,
      friction: friction.trim(),
      makeItTen: makeItTen.trim(),
    };
    await saveResponse(entry);
    setSubmitting(false);
    setDone(true);
    onSubmitted?.();
  };

  if (done) return (
    <div className="success-wrap">
      <div className="success-check">✓</div>
      <h2 className="success-title">Response recorded</h2>
      <p className="success-sub">Thank you — your feedback has been saved and will inform the next iteration of this feature.</p>
      <button className="retry-btn" onClick={reset}>Submit another response</button>
    </div>
  );

  return (
    <div className="survey-wrap">
      <h1 className="survey-title">Share your feedback on the <span>new joystick feature</span></h1>
      <p className="survey-sub">Rate and comment on your experience. Your response is anonymous and directly shapes the next release.</p>

      <div className="field">
        <div className="field-label">Context before using joystick</div>
        <textarea placeholder="When would you use joystick?" value={useCase} onChange={e => setUseCase(e.target.value)} style={{ marginBottom: 12 }} />
        <textarea placeholder="What do you do today instead of using joystick?" value={currentMethod} onChange={e => setCurrentMethod(e.target.value)} />
      </div>

      <hr className="divider" />

      <div className="field">
        <div className="field-label">Overall reaction <span className="req">*</span></div>
        <div className="emoji-row">
          {EMOJIS.map(e => (
            <button key={e.v} className={"emoji-btn" + (emoji === e.v ? " selected" : "")} onClick={() => setEmoji(e.v)}>
              <span className="em">{e.v}</span>
              <span className="em-label">{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      <hr className="divider" />

      <div className="field-label" style={{ marginBottom: 12 }}>Performance ratings</div>
      <ScoreSlider name="Usability — how easy was it to use?" value={usability} onChange={setUsability} left="1 · Very difficult" right="10 · Effortless" />
      <ScoreSlider name="Control — did you feel in control?" value={control} onChange={setControl} left="1 · Not in control" right="10 · Full control" />
      <ScoreSlider name="Feedback — was it clear what happened?" value={feedback} onChange={setFeedback} left="1 · Unclear" right="10 · Very clear" />

      <hr className="divider" />

      <div className="field">
        <div className="field-label">Quick impressions</div>
        <div className="tag-row">
          {TAGS.map(t => (
            <button key={t} className={"tag-btn" + (tags.includes(t) ? " selected" : "")} onClick={() => toggleTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-label">Friction or lack of control <span style={{ color: "var(--ur-muted)" }}>(optional)</span></div>
        <textarea placeholder="Where did you feel friction, uncertainty, or lack of control?" value={friction} onChange={e => setFriction(e.target.value)} />
      </div>

      <div className="field">
        <div className="field-label">Make it a 10 <span style={{ color: "var(--ur-muted)" }}>(optional)</span></div>
        <textarea placeholder="What would need to change for this to become a 10/10 experience?" value={makeItTen} onChange={e => setMakeItTen(e.target.value)} />
      </div>

      <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
    </div>
  );
}

function DashboardLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError("Could not sign in. Check email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">Dashboard login</h2>
        <p className="login-sub">Sign in to view interview responses.</p>
        <div className="field">
          <div className="field-label">Email</div>
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="field">
          <div className="field-label">Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <button className="submit-btn" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  );
}

function DashboardView({ refreshKey }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setResponses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadResponses().then(r => { setResponses(r); setLoading(false); });
  }, [authLoading, authUser, refreshKey]);

  const avg = key => {
    const values = responses.map(r => r[key]).filter(v => typeof v === "number");
    return values.length ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : "—";
  };
  const scoreColor = v => +v >= 7 ? "green" : +v >= 5 ? "white" : "orange";

  const emojiCounts = EMOJIS.map(e => ({ ...e, count: responses.filter(r => r.emoji === e.v).length }));
  const tagCounts = TAGS.map(t => ({ t, count: responses.filter(r => r.tags?.includes(t)).length })).sort((a, b) => b.count - a.count);
  const maxEmoji = Math.max(1, ...emojiCounts.map(e => e.count));
  const maxTag = Math.max(1, ...tagCounts.map(t => t.count));

  const exportCSV = () => {
    const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = ["id","timestamp","use_case","current_method","emoji","usability","control","feedback","tags","friction","make_it_ten"];
    const rows = responses.map(r => [
      r.id,
      r.ts,
      r.useCase,
      r.currentMethod,
      r.emoji,
      r.usability,
      r.control,
      r.feedback,
      (r.tags||[]).join("|"),
      r.friction || [r.leastControl, r.frustration, r.comment].filter(Boolean).join(" "),
      r.makeItTen,
    ].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ux-responses.csv"; a.click();
  };

  if (authLoading) return <div style={{ padding: 80, textAlign: "center", color: "var(--ur-muted)" }}>Checking access...</div>;
  if (!authUser) return <DashboardLogin />;
  if (loading) return <div style={{ padding: 80, textAlign: "center", color: "var(--ur-muted)" }}>Loading...</div>;

  return (
    <div className="dash-wrap">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Research Dashboard</h2>
          <p className="dash-sub">{responses.length} response{responses.length !== 1 ? "s" : ""} · Firestore database</p>
        </div>
        {responses.length > 0 && (
          <button className="export-btn" onClick={exportCSV}>⬇ Export CSV</button>
        )}
        <button className="export-btn" onClick={() => signOut(auth)}>Sign out</button>
      </div>

      {responses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📡</div>
          <p className="empty-text">No responses yet — share the Survey tab with your testers.</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-label">Total responses</div><div className="stat-val white">{responses.length}</div></div>
            <div className="stat-card"><div className="stat-label">Avg usability</div><div className={"stat-val " + scoreColor(avg("usability"))}>{avg("usability")}</div></div>
            <div className="stat-card"><div className="stat-label">Avg control</div><div className={"stat-val " + scoreColor(avg("control"))}>{avg("control")}</div></div>
            <div className="stat-card"><div className="stat-label">Avg feedback</div><div className={"stat-val " + scoreColor(avg("feedback"))}>{avg("feedback")}</div></div>
          </div>

          <div className="charts-row">
            <div className="chart-card">
              <div className="chart-title">Emotional reactions</div>
              {emojiCounts.map(e => (
                <div className="bar-row" key={e.v}>
                  <div className="bar-key">{e.v} {e.label}</div>
                  <div className="bar-track"><div className="bar-fill bar-fill-blue" style={{ width: `${(e.count/maxEmoji)*100}%` }} /></div>
                  <div className="bar-count">{e.count}</div>
                </div>
              ))}
            </div>
            <div className="chart-card">
              <div className="chart-title">Tag frequency</div>
              {tagCounts.filter(t => t.count > 0).length === 0
                ? <p style={{ color: "var(--ur-muted)", fontSize: 12 }}>No tags selected yet.</p>
                : tagCounts.map(tc => (
                  <div className="bar-row" key={tc.t}>
                    <div className="bar-key">{tc.t}</div>
                    <div className="bar-track"><div className="bar-fill bar-fill-green" style={{ width: `${(tc.count/maxTag)*100}%` }} /></div>
                    <div className="bar-count">{tc.count}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="section-title">Individual responses</div>
          {responses.map(r => (
            <div className="response-card" key={r.id}>
              <div className="r-left">
                <div className="r-emoji">{r.emoji}</div>
                <div className="r-scores-col">
                  <div className="r-score-mini"><span className="r-score-mini-label">Use</span><span className="r-score-mini-val">{r.usability}</span></div>
                  {typeof r.usefulness === "number" && <div className="r-score-mini"><span className="r-score-mini-label">Value</span><span className="r-score-mini-val">{r.usefulness}</span></div>}
                  {typeof r.control === "number" && <div className="r-score-mini"><span className="r-score-mini-label">Ctrl</span><span className="r-score-mini-val">{r.control}</span></div>}
                  {typeof r.feedback === "number" && <div className="r-score-mini"><span className="r-score-mini-label">Fdbk</span><span className="r-score-mini-val">{r.feedback}</span></div>}
                  {typeof r.nps === "number" && <div className="r-score-mini"><span className="r-score-mini-label">NPS</span><span className="r-score-mini-val">{r.nps}</span></div>}
                </div>
              </div>
              <div className="r-right">
                <div className="r-top">
                  <span className="r-time">{new Date(r.ts).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                {r.tags?.length > 0 && <div className="r-tags">{r.tags.map(t => <span className="r-tag" key={t}>{t}</span>)}</div>}
                {r.useCase && <div className="r-comment"><strong>Use case:</strong> {r.useCase}</div>}
                {r.currentMethod && <div className="r-comment"><strong>Current method:</strong> {r.currentMethod}</div>}
                {(r.friction || r.leastControl || r.frustration || r.comment) && (
                  <div className="r-comment"><strong>Friction:</strong> {r.friction || [r.leastControl, r.frustration, r.comment].filter(Boolean).join(" ")}</div>
                )}
                {r.makeItTen && <div className="r-comment"><strong>Make it a 10:</strong> {r.makeItTen}</div>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function App({ view = "survey" }) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/*
        <header className="brand-header">
          <img className="brand-logo" src="/ur-teradyne-logo.svg" alt="Universal Robots, a Teradyne company" />
        </header>
        */}
        {view === "survey"
          ? <SurveyView onSubmitted={() => setRefreshKey(k => k+1)} />
          : <DashboardView refreshKey={refreshKey} />}
      </div>
    </>
  );
}
