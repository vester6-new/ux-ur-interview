"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

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
const interviewsCollection = collection(db, "interviews");

const FIELD_TYPES = [
  { value: "section", label: "Section", icon: "S", description: "Group questions or add intro copy." },
  { value: "shortText", label: "Short text", icon: "T", description: "One-line written answer." },
  { value: "longText", label: "Long text", icon: "P", description: "Longer written feedback." },
  { value: "rating", label: "Rating", icon: "1-10", description: "Slider score from low to high." },
  { value: "select", label: "Select", icon: "1", description: "Choose one option." },
  { value: "multiSelect", label: "Multi-select", icon: "N", description: "Choose multiple tags/options." },
  { value: "checkbox", label: "Checkbox", icon: "Y/N", description: "Simple yes/no confirmation." },
  { value: "emoji", label: "Emoji", icon: ":)", description: "Reaction scale with emoji." },
];

const DEFAULT_EMOJIS = [
  { value: "😤", label: "Frustrated" },
  { value: "😐", label: "Neutral" },
  { value: "🙂", label: "Okay" },
  { value: "😊", label: "Satisfied" },
  { value: "🤩", label: "Delighted" },
];

const DEFAULT_TAGS = ["Intuitive", "Confusing", "Precise", "Unreliable", "Fast", "Slow", "Clear feedback", "Missing feedback", "Overcorrected", "Hard to find"];

const DEFAULT_FIELDS = [
  { id: "context", type: "section", label: "Context before using this feature", help: "Tell us where this feature fits into the workflow." },
  { id: "useCase", type: "longText", label: "When would you use this feature?", placeholder: "Describe the situation or workflow.", required: false },
  { id: "currentMethod", type: "longText", label: "What do you do today instead of using this feature?", placeholder: "Describe the current workaround.", required: false },
  { id: "reaction", type: "emoji", label: "Overall reaction", required: true, options: DEFAULT_EMOJIS },
  { id: "performance", type: "section", label: "Performance ratings" },
  { id: "usability", type: "rating", label: "Usability - how easy was it to use?", required: true, minLabel: "Very difficult", maxLabel: "Effortless" },
  { id: "control", type: "rating", label: "Control - did you feel in control?", required: true, minLabel: "Not in control", maxLabel: "Full control" },
  { id: "feedback", type: "rating", label: "Feedback - was it clear what happened?", required: true, minLabel: "Unclear", maxLabel: "Very clear" },
  { id: "tags", type: "multiSelect", label: "Quick impressions", required: false, options: DEFAULT_TAGS.map(value => ({ value, label: value })) },
  { id: "friction", type: "longText", label: "Friction or lack of control", placeholder: "Where did you feel friction, uncertainty, or lack of control?", required: false },
  { id: "makeItTen", type: "longText", label: "Make it a 10", placeholder: "What would need to change for this to become a 10/10 experience?", required: false },
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;600;700&family=Roboto:wght@300;400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ur-navy:#0a0f1e; --ur-dark:#111827; --ur-card:#161d2e; --ur-border:#1e2d45;
    --ur-blue:#56a0d3; --ur-blue2:#3a7cb5; --ur-white:#f0f4f8; --ur-muted:#8096b0;
    --ur-subtle:#243044; --ur-green:#2ecc7a; --ur-orange:#e8773a; --radius:4px;
  }
  html, body { background: var(--ur-navy); color: var(--ur-white); font-family: 'Roboto', sans-serif; font-size: 14px; line-height: 1.5; }
  button, input, textarea, select { font: inherit; }
  button { color: inherit; }
  .app { min-height: 100vh; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  h1, h2, h3, .survey-title, .success-title, .dash-title, .stat-val, .slider-num { font-family: 'Red Hat Display', sans-serif; }
  .survey-wrap { max-width: 680px; margin: 0 auto; padding: 56px 24px 100px; }
  .survey-title { font-size: clamp(28px, 5vw, 42px); font-weight: 700; line-height: 1.1; color: var(--ur-white); margin-bottom: 16px; letter-spacing: -0.02em; }
  .survey-title span { color: var(--ur-blue); }
  .survey-sub { font-size: 15px; color: var(--ur-muted); line-height: 1.7; margin-bottom: 40px; font-weight: 300; max-width: 560px; }
  hr.divider { border: none; border-top: 1px solid var(--ur-border); margin: 32px 0; }
  .field { margin-bottom: 28px; }
  .field-label { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ur-muted); margin-bottom: 10px; }
  .field-label .req { color: var(--ur-blue); }
  .field-help { color: var(--ur-muted); font-size: 12px; margin: -4px 0 10px; line-height: 1.6; }
  .input-row, .builder-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  input[type=text], input[type=password], textarea, select {
    width: 100%; background: var(--ur-card); border: 1px solid var(--ur-border); border-radius: var(--radius);
    padding: 12px 16px; color: var(--ur-white); outline: none; transition: border .15s, box-shadow .15s; resize: vertical;
  }
  input::placeholder, textarea::placeholder { color: var(--ur-muted); }
  input:focus, textarea:focus, select:focus { border-color: var(--ur-blue); }
  input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"] { border-color: var(--ur-orange); }
  button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, .slider-control:focus-visible, .interview-card:focus-visible {
    outline: 3px solid rgba(86,160,211,.75); outline-offset: 3px; box-shadow: 0 0 0 4px rgba(86,160,211,.18);
  }
  textarea { min-height: 100px; }
  select { appearance: none; }
  .emoji-row, .tag-row, .action-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .emoji-btn { flex: 1; min-width: 86px; padding: 14px 8px; border-radius: var(--radius); border: 1px solid var(--ur-border); background: var(--ur-card); cursor: pointer; transition: all .15s; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .emoji-btn:hover, .emoji-btn.selected, .tag-btn:hover, .tag-btn.selected { border-color: var(--ur-blue); background: rgba(86,160,211,.12); color: var(--ur-blue); }
  .emoji-btn .em { font-size: 24px; }
  .emoji-btn .em-label { font-size: 9px; font-weight: 600; letter-spacing: 0.02em; color: var(--ur-muted); }
  .tag-btn { padding: 7px 16px; border-radius: 2px; border: 1px solid var(--ur-border); background: var(--ur-card); font-size: 11px; font-weight: 600; letter-spacing: 0.02em; cursor: pointer; color: var(--ur-muted); transition: all .15s; }
  .slider-block { background: var(--ur-card); border: 1px solid var(--ur-border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 12px; }
  .slider-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; gap: 16px; }
  .slider-name { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: var(--ur-white); }
  .slider-num { font-size: 28px; font-weight: 700; color: var(--ur-blue); letter-spacing: -0.02em; line-height: 1; min-width: 40px; text-align: right; }
  .slider-num small { font-size: 13px; font-weight: 400; color: var(--ur-muted); }
  .slider-control { position: relative; width: 100%; height: 28px; cursor: pointer; touch-action: none; user-select: none; outline: none; }
  .slider-track { position: absolute; left: 0; right: 0; top: 50%; height: 4px; transform: translateY(-50%); border-radius: 99px; background: var(--ur-subtle); }
  .slider-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 99px; background: var(--ur-blue); }
  .slider-thumb { position: absolute; top: 50%; width: 18px; height: 18px; border-radius: 50%; background: var(--ur-blue); border: 2px solid var(--ur-dark); box-shadow: 0 0 0 3px rgba(86,160,211,.25); transform: translate(-50%, -50%); }
  .slider-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--ur-muted); margin-top: 10px; letter-spacing: 0.04em; }
  .submit-btn, .export-btn, .ghost-btn, .danger-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 999px; border: 1px solid transparent;
    font-size: 12px; font-weight: 700; letter-spacing: 0.01em; cursor: pointer; transition: all .2s; text-decoration: none;
  }
  .submit-btn { padding: 13px 30px; background: var(--ur-blue); color: white; margin: 8px auto 0; }
  .submit-btn:hover { background: var(--ur-blue2); }
  .submit-btn:disabled, .export-btn:disabled, .ghost-btn:disabled, .danger-btn:disabled { opacity: .45; cursor: not-allowed; }
  .export-btn, .ghost-btn { padding: 10px 4px; background: transparent; border-color: transparent; color: var(--ur-blue); }
  .export-btn:hover, .ghost-btn:hover { color: var(--ur-white); background: transparent; }
  .danger-btn { padding: 10px 4px; background: transparent; border-color: transparent; color: var(--ur-orange); }
  .danger-btn:hover { color: #ff9a63; }
  .success-wrap { max-width: 520px; margin: 80px auto; padding: 0 24px; text-align: center; }
  .success-title { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 12px; }
  .success-sub { color: var(--ur-muted); font-size: 15px; line-height: 1.7; margin-bottom: 36px; }
  .dash-wrap { max-width: 1140px; margin: 0 auto; padding: 48px 24px 80px; }
  .dash-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
  .dash-title { font-size: 36px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  .dash-sub { color: var(--ur-muted); font-size: 13px; letter-spacing: 0.04em; }
  .login-wrap { max-width: 420px; margin: 80px auto; padding: 0 24px; }
  .login-card, .chart-card, .interview-card, .builder-card { background: var(--ur-card); border: 1px solid var(--ur-border); border-radius: var(--radius); padding: 24px; }
  .login-title { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }
  .login-sub, .login-error { color: var(--ur-muted); font-size: 13px; line-height: 1.6; margin-bottom: 24px; }
  .login-error { color: var(--ur-orange); margin: 12px 0 0; }
  .interview-list { display: grid; gap: 12px; }
  .interview-card { display: grid; grid-template-columns: 1fr auto; gap: 18px; cursor: pointer; transition: border-color .15s; }
  .interview-card:hover { border-color: var(--ur-blue); }
  .interview-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
  .meta-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; color: var(--ur-muted); font-size: 12px; }
  .pill { border: 1px solid var(--ur-border); color: var(--ur-muted); border-radius: 999px; padding: 3px 9px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .pill.published { border-color: rgba(46,204,122,.5); color: var(--ur-green); }
  .pill.unpublished, .pill.draft { border-color: rgba(232,119,58,.5); color: var(--ur-orange); }
  .toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; color: var(--ur-muted); letter-spacing: .02em; cursor: pointer; }
  .toggle input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .toggle-track { width: 42px; height: 22px; border-radius: 999px; background: var(--ur-subtle); border: 1px solid var(--ur-border); position: relative; transition: all .2s; }
  .toggle-track::after { content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px; border-radius: 50%; background: var(--ur-muted); transition: all .2s; }
  .toggle input:checked + .toggle-track { background: rgba(46,204,122,.18); border-color: var(--ur-green); }
  .toggle input:checked + .toggle-track::after { transform: translateX(20px); background: var(--ur-green); }
  .toggle input:focus-visible + .toggle-track { outline: 3px solid rgba(86,160,211,.75); outline-offset: 3px; }
  .home-picker { display: inline-flex; align-items: center; gap: 8px; color: var(--ur-muted); font-size: 11px; font-weight: 700; letter-spacing: .02em; cursor: pointer; }
  .home-picker input { accent-color: var(--ur-blue); width: 16px; height: 16px; }
  .home-picker input:checked + span { color: var(--ur-blue); }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1px; background: var(--ur-border); border: 1px solid var(--ur-border); border-radius: var(--radius); overflow: hidden; margin-bottom: 32px; }
  .stat-card { background: var(--ur-card); padding: 24px; }
  .stat-label { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ur-muted); margin-bottom: 12px; }
  .stat-val { font-size: 40px; font-weight: 700; letter-spacing: -0.03em; color: var(--ur-blue); line-height: 1; }
  .stat-val.white { color: var(--ur-white); } .stat-val.green { color: var(--ur-green); } .stat-val.orange { color: var(--ur-orange); }
  .charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .chart-title, .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ur-muted); margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
  .chart-title::before { content:''; display:block; width:12px; height:2px; background: var(--ur-blue); }
  .section-title::after { content:''; flex:1; height:1px; background: var(--ur-border); }
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .bar-key { font-size: 11px; color: var(--ur-muted); width: 120px; flex-shrink: 0; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { flex: 1; height: 6px; background: var(--ur-subtle); border-radius: 99px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 99px; background: var(--ur-blue); }
  .bar-count { font-size: 11px; color: var(--ur-muted); width: 28px; text-align: right; flex-shrink: 0; }
  .response-card { background: var(--ur-card); border: 1px solid var(--ur-border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 8px; transition: border-color .15s; display: grid; grid-template-columns: auto 1fr; gap: 0 20px; }
  .response-card:hover { border-color: var(--ur-blue); }
  .r-left { display: flex; flex-direction: column; align-items: center; gap: 4px; padding-top: 2px; border-right: 1px solid var(--ur-border); padding-right: 20px; min-width: 58px; }
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
  .modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(4,7,14,.72); display: flex; align-items: flex-start; justify-content: center; padding: 36px 16px; overflow: auto; }
  .modal { width: min(940px, 100%); background: var(--ur-dark); border: 1px solid var(--ur-border); border-radius: var(--radius); box-shadow: 0 24px 80px rgba(0,0,0,.35); }
  .modal-header, .modal-footer { padding: 20px 24px; border-bottom: 1px solid var(--ur-border); display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .modal-footer { border-bottom: 0; border-top: 1px solid var(--ur-border); }
  .modal-body { padding: 24px; max-height: 72vh; overflow: auto; }
  .modal-title { font-size: 24px; font-weight: 700; }
  .builder-card { margin-bottom: 12px; }
  .builder-card.section-card { border-color: rgba(86,160,211,.45); }
  .builder-toolbar { display: flex; justify-content: center; margin-bottom: 18px; }
  .add-field-btn { min-width: 150px; }
  .builder-empty { border: 1px dashed var(--ur-border); background: rgba(86,160,211,.06); border-radius: var(--radius); padding: 32px; text-align: center; margin-top: 16px; }
  .builder-empty-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--ur-white); }
  .builder-empty-text { color: var(--ur-muted); font-size: 13px; line-height: 1.7; max-width: 520px; margin: 0 auto; }
  .field-picker { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-bottom: 18px; }
  .field-type-btn { display: grid; grid-template-columns: 42px 1fr; gap: 12px; align-items: center; text-align: left; padding: 14px; border-radius: var(--radius); border: 1px solid var(--ur-border); background: var(--ur-card); color: var(--ur-white); cursor: pointer; transition: border-color .15s, background .15s; }
  .field-type-btn:hover { border-color: var(--ur-blue); background: rgba(86,160,211,.08); }
  .field-type-icon { display: inline-flex; width: 42px; height: 42px; align-items: center; justify-content: center; border-radius: 999px; background: rgba(86,160,211,.12); color: var(--ur-blue); font-size: 12px; font-weight: 700; }
  .field-type-label { display: block; font-weight: 700; margin-bottom: 3px; }
  .field-type-desc { display: block; color: var(--ur-muted); font-size: 12px; line-height: 1.4; }
  .builder-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; flex-wrap: wrap; }
  .tiny-btn { padding: 6px 10px; border-radius: 999px; border: 1px solid var(--ur-border); background: transparent; color: var(--ur-muted); font-size: 10px; font-weight: 700; letter-spacing: .02em; cursor: pointer; }
  .tiny-btn:hover { color: var(--ur-blue); border-color: var(--ur-blue); }
  .checkbox-row { display: flex; align-items: center; gap: 8px; color: var(--ur-muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  @media (max-width: 700px) {
    .survey-wrap, .dash-wrap { padding: 36px 16px 80px; }
    .input-row, .builder-grid, .interview-card { grid-template-columns: 1fr; }
    .response-card { grid-template-columns: 1fr; }
    .r-left { flex-direction: row; border-right: none; border-bottom: 1px solid var(--ur-border); padding-right: 0; padding-bottom: 12px; margin-bottom: 12px; }
    .r-scores-col { flex-direction: row; gap: 16px; flex-wrap: wrap; }
  }
`;

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function createDefaultInterview(overrides = {}) {
  const name = overrides.name || "New feature interview";
  return {
    name,
    slug: overrides.slug || slugify(name),
    description: overrides.description || "Rate and comment on your experience. Your response is anonymous and directly shapes the next release.",
    status: overrides.status || "draft",
    rootActive: Boolean(overrides.rootActive),
    fields: overrides.fields ?? [],
  };
}

function cloneFields(fields) {
  return JSON.parse(JSON.stringify(fields || DEFAULT_FIELDS));
}

function optionLinesToOptions(value) {
  return String(value || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [rawValue, ...labelParts] = line.split("|");
      const optionValue = rawValue.trim();
      return { value: optionValue, label: (labelParts.join("|").trim() || optionValue) };
    });
}

function optionsToLines(options = []) {
  return options.map(option => option.label && option.label !== option.value ? `${option.value}|${option.label}` : option.value).join("\n");
}

function responsesCollection(interviewId) {
  return collection(db, "interviews", interviewId, "responses");
}

async function listInterviews() {
  const snapshot = await getDocs(query(interviewsCollection, orderBy("createdAt", "desc")));
  return snapshot.docs.map(item => ({ firestoreId: item.id, ...item.data() }));
}

async function findInterviewBySlug(slug, { publishedOnly = false } = {}) {
  const constraints = [where("slug", "==", slug), limit(1)];
  if (publishedOnly) constraints.unshift(where("status", "==", "published"));
  const snapshot = await getDocs(query(interviewsCollection, ...constraints));
  if (snapshot.empty) return null;
  const first = snapshot.docs[0];
  return { firestoreId: first.id, ...first.data() };
}

async function isSlugAvailable(slug, currentId) {
  const existing = await findInterviewBySlug(slug);
  return !existing || existing.firestoreId === currentId;
}

async function saveInterview(interview, currentId) {
  const payload = {
    name: interview.name.trim(),
    slug: slugify(interview.slug || interview.name),
    description: interview.description.trim(),
    status: interview.status || "draft",
    rootActive: Boolean(interview.rootActive),
    fields: cloneFields(interview.fields),
    updatedAt: serverTimestamp(),
  };

  if (currentId) {
    await updateDoc(doc(db, "interviews", currentId), payload);
    return currentId;
  }

  const created = await addDoc(interviewsCollection, {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return created.id;
}

async function updateInterviewStatus(interviewId, status) {
  await updateDoc(doc(db, "interviews", interviewId), { status, updatedAt: serverTimestamp() });
}

async function setRootInterview(interviewId) {
  const interviews = await listInterviews();
  await Promise.all(interviews.map(interview => updateDoc(doc(db, "interviews", interview.firestoreId), {
    rootActive: interview.firestoreId === interviewId,
    status: interview.firestoreId === interviewId ? "published" : interview.status,
    updatedAt: serverTimestamp(),
  })));
}

async function findRootInterview() {
  const snapshot = await getDocs(query(
    interviewsCollection,
    where("rootActive", "==", true),
    where("status", "==", "published"),
    limit(1)
  ));
  if (snapshot.empty) return null;
  const first = snapshot.docs[0];
  return { firestoreId: first.id, ...first.data() };
}

async function deleteInterview(interviewId) {
  await deleteDoc(doc(db, "interviews", interviewId));
}

async function loadResponses(interviewId) {
  const snapshot = await getDocs(query(responsesCollection(interviewId), orderBy("ts", "desc")));
  return snapshot.docs.map(item => ({ firestoreId: item.id, ...item.data() }));
}

async function saveResponse(interviewId, entry) {
  await addDoc(responsesCollection(interviewId), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

async function deleteResponse(interviewId, responseId) {
  await deleteDoc(doc(db, "interviews", interviewId, "responses", responseId));
}

function ScoreSlider({ name, value, onChange, left, right, describedBy }) {
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
        aria-describedby={describedBy}
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

function initialAnswers(fields) {
  return fields.reduce((answers, field) => {
    if (field.type === "rating") answers[field.id] = 7;
    if (field.type === "multiSelect") answers[field.id] = [];
    if (field.type === "checkbox") answers[field.id] = false;
    return answers;
  }, {});
}

function isEmptyAnswer(value) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0) || value === false;
}

function fieldOptions(field) {
  return Array.isArray(field?.options) ? field.options : [];
}

function isFieldVisible(field, answers) {
  const rule = field.condition;
  if (!rule?.fieldId || !rule.value) return true;
  const source = answers[rule.fieldId];
  if (rule.operator === "includes") return Array.isArray(source) && source.includes(rule.value);
  return source === rule.value;
}

function displayAnswer(value, field) {
  if (field?.type === "checkbox") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function renderFieldValue(field, answers) {
  return answers[field.id];
}

function FieldRenderer({ field, value, onChange, answers, readonly = false, invalid = false }) {
  if (!isFieldVisible(field, answers)) return null;
  const fieldDomId = `field-${field.id}`;
  const labelId = `${fieldDomId}-label`;
  const helpId = field.help ? `${fieldDomId}-help` : undefined;
  if (field.type === "section") {
    return (
      <>
        <hr className="divider" />
        <div className="field">
          <h2 className="field-label" id={labelId}>{field.label}</h2>
          {field.help && <p className="field-help" id={helpId}>{field.help}</p>}
        </div>
      </>
    );
  }

  const label = (
    <div className="field-label" id={labelId}>
      {field.label} {field.required && <span className="req">*</span>}
    </div>
  );

  if (field.type === "rating") {
    return (
      <ScoreSlider
        name={field.label}
        value={typeof value === "number" ? value : 7}
        onChange={onChange}
        left={`1 - ${field.minLabel || "Low"}`}
        right={`10 - ${field.maxLabel || "High"}`}
        describedBy={helpId}
      />
    );
  }

  if (field.type === "emoji") {
    return (
      <div className="field">
        {label}
        {field.help && <p className="field-help" id={helpId}>{field.help}</p>}
        <div className="emoji-row" role="group" aria-labelledby={labelId} aria-describedby={helpId} aria-invalid={invalid ? "true" : undefined}>
          {fieldOptions(field).map(option => (
            <button type="button" key={option.value} className={"emoji-btn" + (value === option.value ? " selected" : "")} onClick={() => onChange(option.value)} disabled={readonly} aria-pressed={value === option.value}>
              <span className="em" aria-hidden="true">{option.value}</span>
              <span className="em-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "multiSelect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="field">
        {label}
        {field.help && <p className="field-help" id={helpId}>{field.help}</p>}
        <div className="tag-row" role="group" aria-labelledby={labelId} aria-describedby={helpId} aria-invalid={invalid ? "true" : undefined}>
          {fieldOptions(field).map(option => (
            <button
              type="button"
              key={option.value}
              className={"tag-btn" + (selected.includes(option.value) ? " selected" : "")}
              onClick={() => onChange(selected.includes(option.value) ? selected.filter(item => item !== option.value) : [...selected, option.value])}
              disabled={readonly}
              aria-pressed={selected.includes(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="field">
        {label}
        {field.help && <p className="field-help" id={helpId}>{field.help}</p>}
        <select id={fieldDomId} value={value || ""} onChange={event => onChange(event.target.value)} disabled={readonly} aria-labelledby={labelId} aria-describedby={helpId} aria-invalid={invalid}>
          <option value="">Choose...</option>
          {fieldOptions(field).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="field">
        <label className="checkbox-row">
          <input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} disabled={readonly} aria-invalid={invalid} />
          {field.label} {field.required && <span className="req">*</span>}
        </label>
        {field.help && <p className="field-help" id={helpId}>{field.help}</p>}
      </div>
    );
  }

  const TextControl = field.type === "longText" ? "textarea" : "input";
  return (
    <div className="field">
      {label}
      {field.help && <p className="field-help">{field.help}</p>}
      <TextControl
        type="text"
        placeholder={field.placeholder || ""}
        value={value || ""}
        onChange={event => onChange(event.target.value)}
        disabled={readonly}
        id={fieldDomId}
        aria-labelledby={labelId}
        aria-describedby={helpId}
        aria-invalid={invalid}
      />
    </div>
  );
}

function PublicInterviewView({ slug, onSubmitted }) {
  const [interview, setInterview] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");
  const [missingFieldId, setMissingFieldId] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    findInterviewBySlug(slug, { publishedOnly: true })
      .then(found => {
        if (!active) return;
        setInterview(found);
        setAnswers(initialAnswers(found?.fields || []));
      })
      .catch(error => {
        console.error(error);
        if (active) setInterview(null);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (done) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [done]);

  const visibleFields = useMemo(() => (interview?.fields || []).filter(field => isFieldVisible(field, answers)), [interview, answers]);

  const handleSubmit = async () => {
    const missing = visibleFields.filter(field => field.required && field.type !== "section" && isEmptyAnswer(answers[field.id]));
    if (missing.length) {
      setMissingFieldId(missing[0].id);
      setFormError(`Please answer: ${missing[0].label}`);
      return;
    }

    setFormError("");
    setMissingFieldId("");
    setSubmitting(true);
    try {
      await saveResponse(interview.firestoreId, {
        id: Date.now(),
        ts: new Date().toISOString(),
        answers,
      });
      setDone(true);
      onSubmitted?.();
    } catch (error) {
      console.error(error);
      alert("Could not save your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="success-wrap"><p className="success-sub">Loading interview...</p></div>;
  if (!interview) {
    return (
      <div className="success-wrap">
        <h2 className="success-title">Interview unavailable</h2>
        <p className="success-sub">This interview is not published, has been closed, or the link is incorrect.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="success-wrap">
        <h2 className="success-title">Thank you</h2>
        <p className="success-sub">Your feedback has been saved and will inform the next iteration of this feature.</p>
      </div>
    );
  }

  return (
    <div className="survey-wrap">
      <h1 className="survey-title">Share your feedback on <span>{interview.name}</span></h1>
      {interview.description && <p className="survey-sub">{interview.description}</p>}
      {(interview.fields || []).map(field => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={answers[field.id]}
          answers={answers}
          invalid={missingFieldId === field.id}
          onChange={value => {
            if (missingFieldId === field.id) {
              setMissingFieldId("");
              setFormError("");
            }
            setAnswers(current => ({ ...current, [field.id]: value }));
          }}
        />
      ))}
      {formError && <p className="login-error" role="alert">{formError}</p>}
      <button className="submit-btn" type="button" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit feedback"}
      </button>
    </div>
  );
}

function RootInterviewView({ onSubmitted }) {
  const [interview, setInterview] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");
  const [missingFieldId, setMissingFieldId] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    findRootInterview()
      .then(found => {
        if (!active) return;
        setInterview(found);
        setAnswers(initialAnswers(found?.fields || []));
      })
      .catch(error => {
        console.error(error);
        if (active) setInterview(null);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (done) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [done]);

  const visibleFields = useMemo(() => (interview?.fields || []).filter(field => isFieldVisible(field, answers)), [interview, answers]);

  const handleSubmit = async () => {
    const missing = visibleFields.filter(field => field.required && field.type !== "section" && isEmptyAnswer(answers[field.id]));
    if (missing.length) {
      setMissingFieldId(missing[0].id);
      setFormError(`Please answer: ${missing[0].label}`);
      return;
    }

    setFormError("");
    setMissingFieldId("");
    setSubmitting(true);
    try {
      await saveResponse(interview.firestoreId, {
        id: Date.now(),
        ts: new Date().toISOString(),
        answers,
      });
      setDone(true);
      onSubmitted?.();
    } catch (error) {
      console.error(error);
      alert("Could not save your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="success-wrap"><p className="success-sub">Loading interview...</p></div>;
  if (!interview) return <LegacyHomeView />;
  if (done) {
    return (
      <div className="success-wrap">
        <h2 className="success-title">Thank you</h2>
        <p className="success-sub">Your feedback has been saved and will inform the next iteration of this feature.</p>
      </div>
    );
  }

  return (
    <div className="survey-wrap">
      <h1 className="survey-title">Share your feedback on <span>{interview.name}</span></h1>
      {interview.description && <p className="survey-sub">{interview.description}</p>}
      {(interview.fields || []).map(field => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={answers[field.id]}
          answers={answers}
          invalid={missingFieldId === field.id}
          onChange={value => {
            if (missingFieldId === field.id) {
              setMissingFieldId("");
              setFormError("");
            }
            setAnswers(current => ({ ...current, [field.id]: value }));
          }}
        />
      ))}
      {formError && <p className="login-error" role="alert">{formError}</p>}
      <button className="submit-btn" type="button" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit feedback"}
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
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" aria-label="Email" />
        </div>
        <div className="field">
          <div className="field-label">Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" aria-label="Password" />
        </div>
        <button className="submit-btn" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        {error && <p className="login-error" role="alert">{error}</p>}
      </form>
    </div>
  );
}

function useDashboardAuth() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  return { authUser, authLoading };
}

function FieldBuilder({ field, fields, onChange, onDelete, onMoveUp, onMoveDown }) {
  const optionTypes = ["select", "multiSelect", "emoji"];
  const conditionalTargets = fields.filter(item => item.id !== field.id && item.type !== "section");

  const patchField = patch => onChange({ ...field, ...patch });
  const patchCondition = patch => patchField({ condition: { ...(field.condition || {}), ...patch } });

  return (
    <div className={"builder-card" + (field.type === "section" ? " section-card" : "")}>
      <div className="builder-grid">
        <div>
          <div className="field-label">Field label</div>
          <input type="text" value={field.label || ""} onChange={event => patchField({ label: event.target.value })} aria-label="Field label" />
        </div>
        <div>
          <div className="field-label">Type</div>
          <select value={field.type} onChange={event => patchField({ type: event.target.value })} aria-label={`Field type for ${field.label || "question"}`}>
            {FIELD_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
      </div>

      <div className="builder-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">Field id</div>
          <input type="text" value={field.id || ""} onChange={event => patchField({ id: slugify(event.target.value) || field.id })} aria-label={`Field id for ${field.label || "question"}`} />
        </div>
        <div>
          <div className="field-label">Help / placeholder</div>
          <input
            type="text"
            value={field.type === "shortText" || field.type === "longText" ? field.placeholder || "" : field.help || ""}
            onChange={event => patchField(field.type === "shortText" || field.type === "longText" ? { placeholder: event.target.value } : { help: event.target.value })}
            aria-label={`Help text or placeholder for ${field.label || "question"}`}
          />
        </div>
      </div>

      {field.type !== "section" && (
        <div className="builder-grid" style={{ marginTop: 12 }}>
          <label className="checkbox-row">
            <input type="checkbox" checked={Boolean(field.required)} onChange={event => patchField({ required: event.target.checked })} />
            Required
          </label>
          <div>
            <div className="field-label">Show when</div>
            <div className="input-row">
              <select value={field.condition?.fieldId || ""} onChange={event => patchCondition({ fieldId: event.target.value })} aria-label={`Conditional source field for ${field.label || "question"}`}>
                <option value="">Always visible</option>
                {conditionalTargets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
              </select>
              <input type="text" value={field.condition?.value || ""} onChange={event => patchCondition({ value: event.target.value, operator: "includes" })} placeholder="Required value" aria-label={`Conditional required value for ${field.label || "question"}`} />
            </div>
          </div>
        </div>
      )}

      {field.type === "rating" && (
        <div className="builder-grid" style={{ marginTop: 12 }}>
          <div>
            <div className="field-label">Low label</div>
            <input type="text" value={field.minLabel || ""} onChange={event => patchField({ minLabel: event.target.value })} aria-label={`Low rating label for ${field.label || "rating"}`} />
          </div>
          <div>
            <div className="field-label">High label</div>
            <input type="text" value={field.maxLabel || ""} onChange={event => patchField({ maxLabel: event.target.value })} aria-label={`High rating label for ${field.label || "rating"}`} />
          </div>
        </div>
      )}

      {optionTypes.includes(field.type) && (
        <div style={{ marginTop: 12 }}>
          <div className="field-label">Options</div>
          <textarea
            value={optionsToLines(field.options)}
            onChange={event => patchField({ options: optionLinesToOptions(event.target.value) })}
            placeholder={"One per line. Use value|label for a custom label."}
            aria-label={`Options for ${field.label || "question"}`}
          />
        </div>
      )}

      <div className="builder-actions">
        <button type="button" className="tiny-btn" onClick={onMoveUp}>Move up</button>
        <button type="button" className="tiny-btn" onClick={onMoveDown}>Move down</button>
        <button type="button" className="tiny-btn" onClick={onDelete}>Remove</button>
      </div>
    </div>
  );
}

function InterviewModal({ initialInterview, currentId, onClose, onSaved }) {
  const [interview, setInterview] = useState(() => ({ ...createDefaultInterview(initialInterview), fields: cloneFields(initialInterview?.fields || DEFAULT_FIELDS) }));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(Boolean(currentId));
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const modalRef = useRef(null);
  const titleId = "interview-modal-title";

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const firstFocusable = modalRef.current?.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    firstFocusable?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  const handleDialogKeyDown = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(modalRef.current?.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") || []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const setField = (index, field) => {
    setInterview(current => ({
      ...current,
      fields: current.fields.map((item, itemIndex) => itemIndex === index ? field : item),
    }));
  };

  const addField = type => {
    const id = `${type}-${Date.now().toString(36)}`;
    const defaultsByType = {
      section: { id, type, label: "Feature context", help: "Introduce this part of the interview." },
      shortText: { id, type, label: "Short answer", placeholder: "Write a short answer.", required: false },
      longText: { id, type, label: "Long answer", placeholder: "Describe your experience with this feature.", required: false },
      rating: { id, type, label: "Rate this feature", minLabel: "Poor", maxLabel: "Excellent", required: false },
      select: { id, type, label: "Choose one option", required: false, options: optionLinesToOptions("Option 1\nOption 2\nOption 3") },
      multiSelect: { id, type, label: "Choose all that apply", required: false, options: optionLinesToOptions("Clear\nUseful\nConfusing\nSlow") },
      checkbox: { id, type, label: "I agree", help: "Use this for a yes/no confirmation.", required: false },
      emoji: { id, type, label: "Overall reaction", required: false, options: cloneFields(DEFAULT_EMOJIS) },
    };
    const base = defaultsByType[type] || { id, type, label: "New question", required: false };
    setInterview(current => ({ ...current, fields: [...current.fields, base] }));
    setShowFieldPicker(false);
  };

  const moveField = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= interview.fields.length) return;
    const fields = [...interview.fields];
    [fields[index], fields[nextIndex]] = [fields[nextIndex], fields[index]];
    setInterview(current => ({ ...current, fields }));
  };

  const handleSave = async () => {
    setError("");
    const slug = slugify(interview.slug || interview.name);
    if (!interview.name.trim() || !slug) {
      setError("Name and route slug are required.");
      return;
    }
    if (!interview.fields.some(field => field.type !== "section")) {
      setError("Add at least one question field.");
      return;
    }
    const fieldIds = interview.fields.map(field => field.id).filter(Boolean);
    if (fieldIds.length !== interview.fields.length || new Set(fieldIds).size !== fieldIds.length) {
      setError("Every field needs a unique field id.");
      return;
    }

    setSaving(true);
    try {
      const available = await isSlugAvailable(slug, currentId);
      if (!available) {
        setError("That route slug is already used by another interview.");
        return;
      }
      await saveInterview({ ...interview, slug }, currentId);
      onSaved();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save interview. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={modalRef} onKeyDown={handleDialogKeyDown}>
        <div className="modal-header">
          <div>
            <div className="modal-title" id={titleId}>{currentId ? "Edit interview" : "Add new interview"}</div>
            <p className="dash-sub">Step {step + 1} of 2 - {step === 0 ? "Basics and route" : "Fields and conditions"}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>Close</button>
        </div>

        <div className="modal-body">
          {step === 0 ? (
            <>
              <div className="builder-grid">
                <div>
                  <div className="field-label">Interview name</div>
                  <input
                    type="text"
                    value={interview.name}
                    onChange={event => setInterview(current => ({ ...current, name: event.target.value, slug: slugTouched ? current.slug : slugify(event.target.value) }))}
                    aria-label="Interview name"
                  />
                </div>
                <div>
                  <div className="field-label">Route slug</div>
                  <input
                    type="text"
                    value={interview.slug}
                    onChange={event => {
                      setSlugTouched(true);
                      setInterview(current => ({ ...current, slug: slugify(event.target.value) }));
                    }}
                    aria-label="Route slug"
                  />
                  <p className="field-help">Public route: /{slugify(interview.slug || interview.name)}</p>
                </div>
              </div>
              <div className="field" style={{ marginTop: 16 }}>
                <div className="field-label">Intro text</div>
                <textarea value={interview.description} onChange={event => setInterview(current => ({ ...current, description: event.target.value }))} aria-label="Intro text" />
              </div>
              <div className="field">
                <div className="field-label">Initial status</div>
                <select value={interview.status} onChange={event => setInterview(current => ({ ...current, status: event.target.value }))} aria-label="Initial status">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="builder-toolbar">
                <button type="button" className="submit-btn add-field-btn" onClick={() => setShowFieldPicker(current => !current)}>
                  {showFieldPicker ? "Close field types" : "+ Add field"}
                </button>
              </div>
              {showFieldPicker && (
                <div className="field-picker" aria-label="Choose field type">
                  {FIELD_TYPES.map(type => (
                    <button key={type.value} type="button" className="field-type-btn" onClick={() => addField(type.value)}>
                      <span className="field-type-icon" aria-hidden="true">{type.icon}</span>
                      <span>
                        <span className="field-type-label">{type.label}</span>
                        <span className="field-type-desc">{type.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {interview.fields.length === 0 ? (
                <div className="builder-empty">
                  <div className="builder-empty-title">Build this interview from scratch</div>
                  <p className="builder-empty-text">Use the add field button to choose the first question type. Start with a section if you want intro copy, then add text, rating, choice, checkbox, or emoji questions as needed.</p>
                </div>
              ) : (
                interview.fields.map((field, index) => (
                  <FieldBuilder
                    key={`${field.id}-${index}`}
                    field={field}
                    fields={interview.fields}
                    onChange={updated => setField(index, updated)}
                    onDelete={() => setInterview(current => ({ ...current, fields: current.fields.filter((_, itemIndex) => itemIndex !== index) }))}
                    onMoveUp={() => moveField(index, -1)}
                    onMoveDown={() => moveField(index, 1)}
                  />
                ))
              )}
            </>
          )}
          {error && <p className="login-error" role="alert">{error}</p>}
        </div>

        <div className="modal-footer">
          <button type="button" className="ghost-btn" onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0}>Back</button>
          <div className="action-row">
            {step === 0 && <button type="button" className="submit-btn" onClick={() => setStep(1)}>Next: fields</button>}
            {step === 1 && <button type="button" className="submit-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save interview"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function exportResponsesCsv(interview, responses) {
  const fields = (interview.fields || []).filter(field => field.type !== "section");
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = ["id", "timestamp", ...fields.map(field => field.label)];
  const rows = responses.map(response => [
    response.id,
    response.ts,
    ...fields.map(field => displayAnswer(renderFieldValue(field, response.answers || {}), field)),
  ].map(csvCell).join(","));
  const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${interview.slug || "interview"}-responses.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function summarizeCounts(title, counts) {
  const parts = counts.map(item => `${item.label}: ${item.count}`).join(", ");
  return parts ? `${title}. ${parts}.` : `${title}. No responses yet.`;
}

function DashboardView({ refreshKey }) {
  const { authUser, authLoading } = useDashboardAuth();
  const [interviews, setInterviews] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalInterview, setModalInterview] = useState(null);
  const [modalId, setModalId] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const items = await listInterviews();
      setInterviews(items);
      const countPairs = await Promise.all(items.map(async interview => {
        const responses = await loadResponses(interview.firestoreId);
        return [interview.firestoreId, responses.length];
      }));
      setCounts(Object.fromEntries(countPairs));
    } catch (error) {
      console.error(error);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setInterviews([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [authLoading, authUser, refreshKey]);

  const openModal = interview => {
    setModalInterview(interview || createDefaultInterview());
    setModalId(interview?.firestoreId || null);
  };

  const duplicateInterview = async interview => {
    const name = `${interview.name} copy`;
    let slug = slugify(`${interview.slug}-copy`);
    let counter = 2;
    while (!(await isSlugAvailable(slug))) {
      slug = slugify(`${interview.slug}-copy-${counter}`);
      counter += 1;
    }
    await saveInterview({ ...interview, name, slug, status: "draft", fields: cloneFields(interview.fields) });
    refresh();
  };

  const copyPublicLink = async interview => {
    const link = `${window.location.origin}/${interview.slug}`;
    await navigator.clipboard?.writeText(link);
    alert("Public link copied.");
  };

  const exportInterview = async interview => {
    const responses = await loadResponses(interview.firestoreId);
    exportResponsesCsv(interview, responses);
  };

  const handleSetRootInterview = async interview => {
    try {
      await setRootInterview(interview.firestoreId);
      await refresh();
    } catch (error) {
      console.error(error);
      alert("Could not set the root interview. Check Firestore rules and try again.");
    }
  };

  if (authLoading) return <div className="success-wrap"><p className="success-sub">Checking access...</p></div>;
  if (!authUser) return <DashboardLogin />;
  if (loading) return <div className="success-wrap"><p className="success-sub">Loading dashboard...</p></div>;

  return (
    <div className="dash-wrap">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Research Dashboard</h2>
          <p className="dash-sub">{interviews.length} interview{interviews.length !== 1 ? "s" : ""} - Firestore database</p>
        </div>
        <div className="action-row">
          <button type="button" className="submit-btn" onClick={() => openModal(null)}>Add new interview</button>
          <button type="button" className="export-btn" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      {interviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">📋</div>
          <p className="empty-text">No interviews yet. Create your first interview to start collecting responses.</p>
        </div>
      ) : (
        <div className="interview-list">
          {interviews.map(interview => (
            <div
              key={interview.firestoreId}
              className="interview-card"
              role="link"
              tabIndex={0}
              aria-label={`Open dashboard for ${interview.name}`}
              onClick={() => { window.location.href = `/dashboard/${interview.slug}`; }}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  window.location.href = `/dashboard/${interview.slug}`;
                }
              }}
            >
              <div>
                <h3 className="interview-title">{interview.name}</h3>
                <div className="meta-row">
                  <span className={`pill ${interview.status}`}>{interview.status}</span>
                  {interview.rootActive && <span className="pill published">Root active</span>}
                  <span>/{interview.slug}</span>
                  <span>{counts[interview.firestoreId] || 0} responses</span>
                  <span>{(interview.fields || []).filter(field => field.type !== "section").length} fields</span>
                </div>
              </div>
              <div className="action-row" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
                <label className="home-picker">
                  <input
                    type="radio"
                    name="rootInterview"
                    checked={Boolean(interview.rootActive)}
                    onChange={() => handleSetRootInterview(interview)}
                    aria-label={`Show ${interview.name} on the root page`}
                  />
                  <span>Root</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-checked={interview.status === "published"}
                    aria-label={`${interview.status === "published" ? "Unpublish" : "Publish"} ${interview.name}`}
                    checked={interview.status === "published"}
                    onChange={async event => {
                      await updateInterviewStatus(interview.firestoreId, event.target.checked ? "published" : "unpublished");
                      refresh();
                    }}
                  />
                  <span className="toggle-track" />
                  {interview.status === "published" ? "Published" : "Unpublished"}
                </label>
                <button type="button" className="ghost-btn" onClick={() => openModal(interview)}>Edit</button>
                <button type="button" className="ghost-btn" onClick={() => copyPublicLink(interview)}>Copy link</button>
                <button type="button" className="ghost-btn" onClick={() => duplicateInterview(interview)}>Duplicate</button>
                <button type="button" className="ghost-btn" onClick={() => exportInterview(interview)}>Export</button>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={async () => {
                    if (!window.confirm("Delete this interview? Existing responses under it will no longer be reachable from the dashboard.")) return;
                    await deleteInterview(interview.firestoreId);
                    refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalInterview && (
        <InterviewModal
          initialInterview={modalInterview}
          currentId={modalId}
          onClose={() => setModalInterview(null)}
          onSaved={() => {
            setModalInterview(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function InterviewDashboardView({ slug, refreshKey }) {
  const [responses, setResponses] = useState([]);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const { authUser, authLoading } = useDashboardAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setResponses([]);
      setInterview(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    findInterviewBySlug(slug)
      .then(async found => {
        setInterview(found);
        setResponses(found ? await loadResponses(found.firestoreId) : []);
      })
      .catch(error => {
        console.error(error);
        setInterview(null);
        setResponses([]);
      })
      .finally(() => setLoading(false));
  }, [authLoading, authUser, refreshKey, slug]);

  const fields = interview?.fields || [];
  const ratingFields = fields.filter(field => field.type === "rating");
  const emojiField = fields.find(field => field.type === "emoji");
  const tagField = fields.find(field => field.type === "multiSelect");
  const textFields = fields.filter(field => !["section", "rating", "emoji", "multiSelect"].includes(field.type));

  const avg = fieldId => {
    const values = responses.map(response => response.answers?.[fieldId]).filter(value => typeof value === "number");
    return values.length ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : "—";
  };
  const scoreColor = v => +v >= 7 ? "green" : +v >= 5 ? "white" : "orange";

  const emojiCounts = fieldOptions(emojiField).map(option => ({ ...option, count: responses.filter(response => response.answers?.[emojiField?.id] === option.value).length }));
  const tagCounts = fieldOptions(tagField).map(option => ({ ...option, count: responses.filter(response => response.answers?.[tagField?.id]?.includes(option.value)).length })).sort((a, b) => b.count - a.count);
  const maxEmoji = Math.max(1, ...emojiCounts.map(e => e.count));
  const maxTag = Math.max(1, ...tagCounts.map(t => t.count));

  const handleDelete = async response => {
    if (!response.firestoreId) return;
    const confirmed = window.confirm("Delete this response? This cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteResponse(interview.firestoreId, response.firestoreId);
      setResponses(current => current.filter(r => r.firestoreId !== response.firestoreId));
    } catch(e) {
      console.error(e);
      alert("Could not delete the response. Please try again.");
    }
  };

  if (authLoading) return <div className="success-wrap"><p className="success-sub">Checking access...</p></div>;
  if (!authUser) return <DashboardLogin />;
  if (loading) return <div className="success-wrap"><p className="success-sub">Loading interview...</p></div>;
  if (!interview) return <div className="success-wrap"><h2 className="success-title">Interview not found</h2><p className="success-sub">No interview exists for this dashboard route.</p><a className="ghost-btn" href="/dashboard">Back to dashboard</a></div>;

  return (
    <div className="dash-wrap">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">{interview.name}</h2>
          <p className="dash-sub">{responses.length} response{responses.length !== 1 ? "s" : ""} - /{interview.slug}</p>
        </div>
        <div className="action-row">
          <a className="ghost-btn" href="/dashboard">All interviews</a>
          {responses.length > 0 && <button className="export-btn" onClick={() => exportResponsesCsv(interview, responses)}>Export CSV</button>}
          <button className="export-btn" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">📡</div>
          <p className="empty-text">No responses yet. Share /{interview.slug} with your testers when it is published.</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-label">Total responses</div><div className="stat-val white">{responses.length}</div></div>
            {ratingFields.slice(0, 3).map(field => (
              <div className="stat-card" key={field.id}>
                <div className="stat-label">Avg {field.label}</div>
                <div className={"stat-val " + scoreColor(avg(field.id))}>{avg(field.id)}</div>
              </div>
            ))}
          </div>

          <div className="charts-row">
            {emojiField && (
              <div className="chart-card" role="img" aria-label={summarizeCounts(emojiField.label, emojiCounts)}>
                <div className="chart-title">{emojiField.label}</div>
                {emojiCounts.map(e => (
                  <div className="bar-row" key={e.value}>
                    <div className="bar-key">{e.value} {e.label}</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(e.count/maxEmoji)*100}%` }} /></div>
                    <div className="bar-count">{e.count}</div>
                  </div>
                ))}
              </div>
            )}
            {tagField && (
              <div className="chart-card" role="img" aria-label={summarizeCounts(tagField.label, tagCounts)}>
                <div className="chart-title">{tagField.label}</div>
                {tagCounts.filter(t => t.count > 0).length === 0
                  ? <p style={{ color: "var(--ur-muted)", fontSize: 12 }}>No tags selected yet.</p>
                  : tagCounts.map(tc => (
                    <div className="bar-row" key={tc.value}>
                      <div className="bar-key">{tc.label}</div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${(tc.count/maxTag)*100}%` }} /></div>
                      <div className="bar-count">{tc.count}</div>
                    </div>
                  ))}
              </div>
            )}
            {ratingFields.slice(3).map(field => {
              const average = avg(field.id);
              return (
                <div className="chart-card" key={field.id} role="img" aria-label={`${field.label}. Average score ${average} out of 10.`}>
                  <div className="chart-title">{field.label}</div>
                  <div className="bar-row">
                    <div className="bar-key">Average</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${Number(average || 0) * 10}%` }} /></div>
                    <div className="bar-count">{average}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section-title">Individual responses</div>
          {responses.map(response => {
            const answers = response.answers || {};
            return (
              <div className="response-card" key={response.firestoreId || response.id}>
                <div className="r-left">
                  {emojiField && <div className="r-emoji">{answers[emojiField.id]}</div>}
                  <div className="r-scores-col">
                    {ratingFields.map(field => (
                      <div className="r-score-mini" key={field.id}>
                        <span className="r-score-mini-label">{field.label.slice(0, 8)}</span>
                        <span className="r-score-mini-val">{answers[field.id]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="r-right">
                  <div className="r-top">
                    <span className="r-time">{new Date(response.ts).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  {tagField && Array.isArray(answers[tagField.id]) && answers[tagField.id].length > 0 && (
                    <div className="r-tags">{answers[tagField.id].map(tag => <span className="r-tag" key={tag}>{tag}</span>)}</div>
                  )}
                  {textFields.map(field => {
                    const value = displayAnswer(answers[field.id], field);
                    return value ? <div className="r-comment" key={field.id}><strong>{field.label}:</strong> {value}</div> : null;
                  })}
                  <button className="danger-btn" type="button" onClick={() => handleDelete(response)}>Delete response</button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function LegacyHomeView() {
  return (
    <div className="success-wrap">
      <h2 className="success-title">Interview links have moved</h2>
      <p className="success-sub">Use the dashboard to create or open a published interview link.</p>
      <a className="ghost-btn" href="/dashboard">Go to dashboard</a>
    </div>
  );
}

export default function App({ view = "survey", slug }) {
  const [refreshKey, setRefreshKey] = useState(0);
  let content = <RootInterviewView onSubmitted={() => setRefreshKey(k => k + 1)} />;
  if (view === "interview") content = <PublicInterviewView slug={slug} onSubmitted={() => setRefreshKey(k => k + 1)} />;
  if (view === "dashboard") content = <DashboardView refreshKey={refreshKey} />;
  if (view === "interviewDashboard") content = <InterviewDashboardView slug={slug} refreshKey={refreshKey} />;

  return (
    <>
      <style>{css}</style>
      <div className="app">{content}</div>
    </>
  );
}
