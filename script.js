/* =========================================================
   The extractive logic of AI — virtual exhibition
   Interactivity: overlays, page-dot nav, tabs, notes,
   3D rotatable globe with clickable location markers.
   ========================================================= */

import * as THREE from "three";
import Lenis from "lenis";

/* =========================================================
   Lenis — smooth momentum scroll on #scroller
   ========================================================= */
const scrollerEl = document.getElementById("scroller");
const lenis = new Lenis({
  wrapper: scrollerEl,
  content: scrollerEl.querySelector(".lenis-content"),
  duration: 1.15,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,   // native touch scroll on mobile
  touchMultiplier: 1.5,
  wheelMultiplier: 1.0,
  syncTouch: false,
  infinite: false
});
function lenisRaf(time) {
  lenis.raf(time);
  requestAnimationFrame(lenisRaf);
}
requestAnimationFrame(lenisRaf);
window.lenis = lenis;  // for debug / scroll-to from other scripts

// Lenis scroll tick: reading progress + title parallax exit
const titleWrapEl = document.querySelector(".title-wrap");
const prefersReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
lenis.on("scroll", ({ scroll }) => {
  updateReadingProgress();
  if (!prefersReduce && titleWrapEl && scroll < window.innerHeight * 1.2) {
    const p = scroll / window.innerHeight;
    titleWrapEl.style.transform = `translateY(${(scroll * 0.32).toFixed(1)}px)`;
    titleWrapEl.style.opacity = Math.max(0, 1 - p * 1.15).toFixed(3);
  }
});
window.addEventListener("load", updateReadingProgress);
window.addEventListener("resize", updateReadingProgress);

/* =========================================================
   Loading curtain — lifts on first paint
   ========================================================= */
window.addEventListener("load", () => {
  // Tiny delay so the line-fill animation gets to play before the lift
  setTimeout(() => document.body.classList.add("curtain-up"), 1100);
});
// Safety fallback if `load` is slow (heavy textures): lift after 2.5s anyway
setTimeout(() => document.body.classList.add("curtain-up"), 2500);

/* =========================================================
   Reading-progress line for the consequences section
   ========================================================= */
const readingProgress = document.getElementById("reading-progress");
function updateReadingProgress() {
  if (!readingProgress) return;
  const conseq = document.getElementById("page-consequences");
  if (!conseq) return;
  const rect = conseq.getBoundingClientRect();
  const sh   = conseq.offsetHeight;
  const vh   = window.innerHeight;
  const visible = rect.top < vh && rect.bottom > 0;
  readingProgress.classList.toggle("visible", visible);
  if (!visible) return;
  // 0 when section's top reaches viewport top, 1 when its bottom reaches viewport bottom
  const p = Math.max(0, Math.min(1, (vh - rect.top) / sh));
  readingProgress.style.setProperty("--p", p.toFixed(3));
}

/* =========================================================
   Experience layer — cursor, word reveals, scroll reveals
   ========================================================= */

/* --- Word split for [data-split] --- */
document.querySelectorAll("[data-split]").forEach(el => {
  const text = el.textContent.trim();
  el.textContent = "";
  text.split(/\s+/).forEach((w, i) => {
    const span = document.createElement("span");
    span.className = "word";
    span.style.setProperty("--i", i);
    span.textContent = w;
    el.appendChild(span);
    if (i < text.split(/\s+/).length - 1) el.appendChild(document.createTextNode(" "));
  });
});

/* --- [data-fade-in] simple delayed fade --- */
document.querySelectorAll("[data-fade-in]").forEach(el => {
  const d = parseFloat(el.dataset.fadeIn) || 0;
  el.style.setProperty("--d", d);
});

/* --- Scroll-reveal observer for [data-reveal] and [data-reveal-stagger] --- */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in-view");
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll("[data-reveal], [data-reveal-stagger]").forEach(el => {
  if (el.hasAttribute("data-reveal-stagger")) {
    [...el.children].forEach((c, i) => c.style.setProperty("--si", i));
  }
  revealObserver.observe(el);
});

/* --- Drifting-particle backdrop (canvas) --- */
function initParticleCanvas(canvas, opts = {}) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  const cfg = {
    count:    opts.count     ?? 70,
    color:    opts.color     ?? "255, 255, 255",
    alphaMin: opts.alphaMin  ?? 0.04,
    alphaMax: opts.alphaMax  ?? 0.28,
    sizeMin:  opts.sizeMin   ?? 0.5,
    sizeMax:  opts.sizeMax   ?? 1.4,
    rise:     opts.rise      ?? [0.02, 0.07]
  };
  let w = 0, h = 0, dots = [];
  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth || canvas.clientWidth || window.innerWidth;
    h = canvas.offsetHeight || canvas.clientHeight || window.innerHeight;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function makeDot() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.04,
      vy: -rand(cfg.rise[0], cfg.rise[1]),
      size: rand(cfg.sizeMin, cfg.sizeMax),
      alpha: rand(cfg.alphaMin, cfg.alphaMax),
      phase: Math.random() * Math.PI * 2,
      twinkle: Math.random() < 0.18
    };
  }
  resize();
  dots = Array.from({ length: cfg.count }, makeDot);
  window.addEventListener("resize", () => {
    resize();
    // re-seed positions so nothing stays mid-air after a big resize
    dots.forEach(d => { d.x = Math.random() * w; });
  });

  let t = 0;
  let running = true;
  function tick() {
    if (running) {
      t += 0.012;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.y < -4) { d.y = h + 4; d.x = Math.random() * w; }
        if (d.x < -4) d.x = w + 4;
        if (d.x > w + 4) d.x = -4;
        const a = d.alpha * (d.twinkle ? (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4 + d.phase))) : 1);
        ctx.fillStyle = `rgba(${cfg.color}, ${a})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
  return { pause: () => running = false, resume: () => running = true };
}

const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
const IS_SMALL = matchMedia("(max-width: 700px)").matches;

const titleCanvas   = document.querySelector("#page-title .bg-particles");
const conseqCanvas  = document.querySelector("#page-consequences .bg-particles");
const titleParticles = REDUCED_MOTION ? null : initParticleCanvas(titleCanvas, {
  count: IS_SMALL ? 35 : 80
});
const conseqParticles = REDUCED_MOTION ? null : initParticleCanvas(conseqCanvas, {
  count: IS_SMALL ? 25 : 55,
  alphaMin: 0.03,
  alphaMax: 0.2,
  rise: [0.015, 0.05]
});

/* Pause particle systems when their section is offscreen */
[[document.getElementById("page-title"), titleParticles],
 [document.getElementById("page-consequences"), conseqParticles]].forEach(([sec, system]) => {
  if (!sec || !system) return;
  new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting && e.intersectionRatio > 0.1 ? system.resume() : system.pause());
  }, { root: document.getElementById("scroller"), threshold: 0.1 }).observe(sec);
});

/* --- Custom cursor with lagging ring --- */
const cursorDot  = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");
if (cursorDot && cursorRing && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;
  document.addEventListener("pointermove", e => {
    mx = e.clientX; my = e.clientY;
    cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  document.addEventListener("pointerdown", () => cursorRing.classList.add("is-active"));
  document.addEventListener("pointerup",   () => cursorRing.classList.remove("is-active"));
  document.addEventListener("pointerover", e => {
    const t = e.target.closest("a, button, [data-overlay], .ai-box, .corner-btn, .tab, .dot, #globe-container");
    if (t) cursorRing.classList.add("is-active"); else cursorRing.classList.remove("is-active");
  });
  document.addEventListener("mouseleave", () => {
    cursorDot.classList.add("hidden"); cursorRing.classList.add("hidden");
  });
  document.addEventListener("mouseenter", () => {
    cursorDot.classList.remove("hidden"); cursorRing.classList.remove("hidden");
  });
  (function lerp() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    cursorRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(lerp);
  })();
}

/* --- Magnetic micro-interaction on small controls --- */
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !REDUCED_MOTION) {
  document.querySelectorAll(".corner-btn, .page-dots .dot").forEach(el => {
    const strength = 0.35;
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* --- Word-mask reveal for the cinematic quotes (consequences page) --- */
function maskSplitWords(el) {
  const text = el.textContent;
  el.textContent = "";
  el.classList.add("word-reveal");
  text.split(/\s+/).filter(Boolean).forEach((w, i) => {
    const outer = document.createElement("span");
    outer.className = "mw";
    const inner = document.createElement("span");
    inner.className = "mw-inner";
    inner.style.setProperty("--wd", (i * 0.016).toFixed(3) + "s");
    inner.textContent = w;
    outer.appendChild(inner);
    el.appendChild(outer);
    el.appendChild(document.createTextNode(" "));
  });
}
if (!REDUCED_MOTION) {
  const wordTargets = document.querySelectorAll(".consequences-wrap blockquote, .central-question");
  wordTargets.forEach(maskSplitWords);
  const wordObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("words-in");
        wordObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.25 });
  wordTargets.forEach(el => wordObserver.observe(el));
}

/* ---------- Overlay open/close ---------- */
const overlays = document.querySelectorAll(".overlay");

function openOverlay(id) {
  const ov = document.getElementById(id);
  if (!ov) return;
  ov.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeOverlay(ov) {
  ov.classList.remove("open");
  document.body.style.overflow = "";
}
function closeAllOverlays() {
  overlays.forEach(o => o.classList.remove("open"));
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-overlay]").forEach(btn => {
  btn.addEventListener("click", e => {
    e.stopPropagation();
    openOverlay(btn.dataset.overlay);
  });
});
overlays.forEach(ov => {
  ov.addEventListener("click", e => {
    if (e.target === ov) closeOverlay(ov);
  });
  const closeBtn = ov.querySelector(".overlay-close");
  if (closeBtn) closeBtn.addEventListener("click", () => closeOverlay(ov));
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAllOverlays();
});

/* ---------- Page-dot navigation (Lenis-driven) ---------- */
const scroller = document.getElementById("scroller");
const dots = document.querySelectorAll(".page-dots .dot");

dots.forEach(dot => {
  dot.addEventListener("click", () => {
    const target = document.getElementById(dot.dataset.target);
    if (target) lenis.scrollTo(target, { duration: 1.4, easing: t => 1 - Math.pow(1 - t, 3) });
  });
});

const pages = document.querySelectorAll(".page");
const pageObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
      const id = entry.target.id;
      dots.forEach(d => d.classList.toggle("active", d.dataset.target === id));
    }
  });
}, { root: scroller, threshold: [0.4, 0.6] });
pages.forEach(p => pageObserver.observe(p));

/* ---------- Sources tabs ---------- */
document.querySelectorAll(".sources-tabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const targetId = tab.dataset.tab;
    document.querySelectorAll(".sources-tabs .tab").forEach(t => {
      const active = t === tab;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".tab-panel").forEach(p => {
      p.classList.toggle("active", p.id === targetId);
    });
  });
});

/* =========================================================
   Visitor notes — Supabase backend
   Fill in SUPABASE_URL and SUPABASE_ANON_KEY below (see setup
   instructions). If left empty, notes fall back to localStorage
   so the form still works during development.
   ========================================================= */
const SUPABASE_URL      = "";   // e.g. "https://xxxxx.supabase.co"
const SUPABASE_ANON_KEY = "";   // anon/public key (safe to expose)
const NOTES_TABLE       = "notes";
const NOTES_LIMIT       = 50;

const noteForm  = document.getElementById("note-form");
const noteInput = document.getElementById("note-input");
const notesList = document.getElementById("notes-list");
const noteSubmitBtn = noteForm?.querySelector("button[type=submit]");

const useSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric"
  });
}

/* --- Supabase REST helpers (no SDK needed for our use case) --- */
async function supabaseGetNotes() {
  const url = `${SUPABASE_URL}/rest/v1/${NOTES_TABLE}?select=id,text,created_at&order=created_at.desc&limit=${NOTES_LIMIT}`;
  const r = await fetch(url, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!r.ok) throw new Error("GET failed " + r.status);
  return r.json();
}
async function supabasePostNote(text) {
  const url = `${SUPABASE_URL}/rest/v1/${NOTES_TABLE}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error("POST failed " + r.status);
  return r.json();
}

/* --- localStorage fallback (used when Supabase isn't configured) --- */
const LS_KEY = "jonna_visitor_notes_v2";
function localGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function localPost(text) {
  const arr = localGet();
  arr.unshift({ id: crypto.randomUUID?.() || String(Date.now()), text, created_at: new Date().toISOString() });
  localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, NOTES_LIMIT)));
  return Promise.resolve();
}

/* --- Render --- */
function renderNotes(notes) {
  notesList.innerHTML = "";
  if (!notes.length) {
    const li = document.createElement("li");
    li.className = "notes-empty";
    li.textContent = "Be the first to leave a thought.";
    notesList.appendChild(li);
    return;
  }
  for (const n of notes) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="note-date">${formatDate(n.created_at)}</span>${escapeHtml(n.text)}`;
    notesList.appendChild(li);
  }
}

async function loadAndRender() {
  try {
    const notes = useSupabase ? await supabaseGetNotes() : localGet();
    renderNotes(notes);
  } catch (e) {
    notesList.innerHTML = `<li class="notes-error">Could not load notes (${escapeHtml(e.message)}).</li>`;
  }
}

if (noteForm) {
  noteForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = noteInput.value.trim();
    if (!text) return;
    if (noteSubmitBtn) { noteSubmitBtn.disabled = true; noteSubmitBtn.textContent = "..."; }
    try {
      if (useSupabase) await supabasePostNote(text);
      else await localPost(text);
      noteInput.value = "";
      await loadAndRender();
    } catch (err) {
      alert("Could not post note: " + err.message);
    } finally {
      if (noteSubmitBtn) { noteSubmitBtn.disabled = false; noteSubmitBtn.textContent = "Post"; }
    }
  });
  loadAndRender();
}

/* =========================================================
   3D Globe — Three.js
   ========================================================= */

const PLACES = [
  {
    id: "silicon",
    title: "The place to be in the tech-sector",
    lat: 37.33, lon: -122.03,
    img: "assets/places/01-silicon-valley.jpeg",
    caption: "Abb. 1: Headquarters of Apple in the Silicon Valley, US",
    text: [
      "Silicon Valley in the US is the most known place of the whole tech-sector because of its relevance for the global economy and electronic data processing (EDP) infrastructure of the whole world. The headquarters of companies like Apple, Google, Meta and Lockheed Martin are located there. In the 1950s, more and more students and graduates from the university of Stanford began setting up small businesses in the local area. Gradually, new developments and products began to emerge. Today, Silicon Valley is renowned for its high concentration of innovative companies, start-ups, venture capitalists, research institutions and universities working in the fields of information technology, software, the internet, biotechnology, artificial intelligence and more. But it is also a place full of contradictions. A world in which young, talented and idealistic people are trying to shape the future, but also a world in which abuse of power, greed, sexism and surveillance prevail (cf. Handelsblatt, 2023)."
    ]
  },
  {
    id: "silverpeak",
    title: "Between old and new mining technics",
    lat: 37.75, lon: -117.63,
    img: "assets/places/02-silver-peak.jpeg",
    caption: "Abb. 2: Silver Peak mine in Nevada, US",
    text: [
      "In Silver Peak is the oldest mining in Nevada in the US. Historically being of interest because of its reserve of gold and silver, nowadays the focus lays on its gigantic underground lithium lake. Once gold was bringing the wealth to the city, now it’s the “grey gold”, the white lithium crystal. By pumping the lithium sole out of the ground, it gets evaporated in open green glimmer lakes. Mining is only that profitable because it does not cover its real cost like environmental damage, illness and death of workers as its strategically forgets its consequences in regard of the presentation of the technical development. Tech industry became the greater interest. After the market capitalization the five biggest companies opened offices in the city (Apple, Microsoft, Amazon, Meta and Google) and the tech boom brought fancy cars. One the other hand, it created one of the biggest quotes of homelessness and therefore, a big cliff between rich and poor just a few streets apart since the biggest benefits of extraction got incorporated by few (cf. Crawford, 2024, 32-36). So, the question of distance rises again:",
      { quote: "“In other words, those who profit from mining do so only because the costs must be sustained by others, those living and those not yet born. It is easy to put a price on precious metals, but what is the exact value of a wilderness, a clean stream, breathable air, the health of local communities?” (Crawford, 2021, 26)" },
      "Not far from the mine in Silver Peak, is the Tesla Gigafactory which is the biggest lithium battery factory in the world. Since Tesla is also the biggest consumer of lithium-ion battery for its cars and home charging stations, it consumes more than 28,000 t of Lithium hydroxide per year which is half of the world’s total demand (as of 2021). So, as Silver Peak is of great interest to the tech sector because of rechargeable batteries, the one who controls the mine, has the control of the national supply in the US. And therefore, holds a lot of power in its hands (cf. Crawford, 2024, 37)."
    ]
  },
  {
    id: "bolivia",
    title: "The violent side effects of extractivism",
    lat: -20.13, lon: -67.49,
    img: "assets/places/03-bolivia.jpeg",
    caption: "Abb. 3: Lithium reserves concentrated in the Uyuni salt flats, Bolivia",
    text: [
      "As Bolivia has the biggest lithium reserve of the world, it’s a place of permanent political tension. And since resources are becoming increasingly rare, the extraction of the 17 rare earth elements which is linked to regional and geopolitical violence like war, hunger and death, must be taken even more into account when talking about AI (cf. Crawford, 2024, 41)."
    ]
  },
  {
    id: "congo",
    title: "Funding conflicts, destruction and death",
    lat: -10.72, lon: 25.47,
    img: "assets/places/04-congo.jpeg",
    caption: "Abb. 4: cobalt and copper mine in Kolwezi, Democractic Republic of Congo",
    text: [
      "The profit generated by extraction is funding conflicts like the one in Congo and therefore the death and the displacement of millions of people. Because of different reasons like corruption there are no thorough checks for conflict-free status in mines, so the conflict as well as the conditions of work are catastrophic and resemble modern-day slavery. Congo is an example of the worst case of destructive extractivism. Even though most minerals don’t come from war zones, there is still human suffering and destroying of environment involved, like untold stories about rivers polluted by acid and depopulated landscapes and the extinction of plant and animal species that were once indispensable to the local ecosystem (cf. Crawford, 2024, 42f.)."
    ]
  },
  {
    id: "mongolia",
    title: "Sinking in the lake of toxic waste",
    lat: 41.77, lon: 109.97,
    img: "assets/places/05-mongolia.png",
    caption: "Abb. 5: Black sludge pours into the lake in Batau, Mongolia",
    text: [
      "In Batau in Mongolia the Bayan Obo mine which has one of the world’s biggest deposits of rare minerals, created a nine-kilometre big artificial lake made of black toxic sludge from more than 180 million tonnes of waste. Since according to estimates by Chinese Society of Rare Earths, refining one tone of these rare earths produces 75,000 litres of acidic water and one ton of radioactive waste (as of 2021). So, then 95% of rare minerals are coming from China, it is not only because the geological position of Mongolia and China, but also because of their ignorance in regard of the damage of the environment connected to the mining and degradation. The rare electronical, visual and magnetic function of rare minerals cannot yet be replaced with other materials. Therefore, the ratio between the used minerals and the toxic waste stays extremely unbalanced (cf. Crawford, 2024, 44f.)."
    ]
  },
  {
    id: "indonesia",
    title: "A landscape of ruins",
    lat: -2.30, lon: 106.13,
    img: "assets/places/06-indonesia.jpeg",
    caption: "Abb. 6: A sea tin miner in Bangka, Indonesia",
    text: [
      "Indonesia is worldwide second biggest producer of tin after China, with 90% used for semiconductors (as of 2021). On those small Indonesian islands, informal miners sit on makeshift rafts and use bamboo poles to scrape the seabed before diving down to suck up tin from the surface with giant vacuum tubes. They sell what they find to middlemen, who also collect minerals from authorized mines. These middlemen then mix everything together and sell it to companies. This process is not subject to any regulation and is therefore not governed by any formal safeguards for either the workers or the environment (cf. Crawford, 2024, 45).",
      { quote: "“As investigative journalist Kate Hodal reports, ‘Tin mining is a lucrative but destructive trade that has scarred the island’s landscape, bulldozed its farms and forests, killed off its fish stocks and coral reefs, and dented tourism to its pretty palm-lined beaches. The damage is best seen from the air, as pockets of lush forest huddle amid huge swaths of barren orange earth. Where not dominated by mines, this is pockmarked with graves, many holding the bodies of miners who have died over the centuries digging for tin.’ The mines are everywhere: in backyards, in the forest, by the side of the road, on the beaches. It is a landscape of ruin.” (Crawford, 2021, 38)" }
    ]
  },
  {
    id: "nsa",
    title: "The cost and value of water",
    lat: 40.43, lon: -111.93,
    img: "assets/places/07-nsa-utah.jpeg",
    caption: "Abb. 7: The NSA Data Center in Utah, US",
    text: [
      "The 100,000 square metre big facility in Bluffdale Utah is one of the biggest data center of the US belonging to the National Security Agency (NSA) and therefore, another example of the computerized world, in which water is a true cost. Data centers consume larger amounts of water to cool their processor chips to avoid overheating and potential damage. The water which is used to cool the data centres must be drinkable or distilled water. Otherwise, it could damage the system. It is estimated that U.S. data centers consume 449 million gallons of water per day and 163.7 billion gallons annually (as of 2021). And therefore, threatening freshwater supplies which is valuable for human life (cf. Yañez-Barnuevo, 2025). Furthermore, the history of water use in the United States is marked by conflicts and secret deals, where agreements reached are kept under wraps. Thus, it remains unclear whether the estimated consumption of the NSA data centre of nearly 6.5 million litres of water actually reflects the truth, or whether the figure is significantly higher, with water being sold at rates well below average in exchange for economic growth. Today, the geopolitics of water is deeply intertwined with the mechanisms and policies of data centers, data processing and energy. Since the data centers are as well as the mines usually located far away from urban centres, it’s creating the imagine that the cloud is something abstract and invisible, even though it is something material which influence the environment and the climate in a way that haven’t been fully researched and examined yet. This shows again the distance which is created between imagination and reality (cf. Crawford, 2024, 52f.)."
    ]
  },
  {
    id: "ghana",
    title: "Ecosystem and life cycle of AI",
    lat: 5.55, lon: -0.20,
    img: "assets/places/08-ghana.jpeg",
    caption: "Abb. 8: Disposal of waste in Ghana",
    text: [
      "The vast AI ecosystem relies on many forms of extraction: from the collection of data generated by our daily activities to different forms of exploitation of human workforce and natural resources around the world as well as a continuous enormous usage of energy along this cycle. All to build and maintain this massive global network and concentration of economical and geopolitical power of few. To reflect the radical drain of resources which took years to build inside of the world, and the extraction of the world’s geological history which only gets used for a glimpse of time, we must see technology as a geological process. After not even 5 years the average phone most of the time ends up in a waste disposal facility for electronic waste in for example Ghana or Pakistan (cf. Crawford, 2024, 39f.)."
    ]
  },
  {
    id: "maritime",
    title: "Logistics behind AI",
    lat: 25, lon: -40,
    img: "assets/places/09-maritime.png",
    caption: "Abb. 9: Maritime transport CO₂ emissions for the World and OECD",
    text: [
      "Since the elements which ultimately end up in IT equipment have passed through a large number of companies along the supply chain – from dozens of smelters who purchase their products from an unknown number of traders working with legal and illegal mines to thousands of component manufactures – , it is impossible to trace their origin, at least according to the manufacturer of the end product. The supply chain extends toward the capital, human work and resources of the world and demands a lot of them. The ignorance regarding the supply chain is a phenomenon inherent to capitalism, ranging from the way companies hide behind third-party providers and suppliers to the methods used to market and advertise goods to consumers. This is not only deniability, but also a form of self-deception and distancing (cf. Crawford, 2024, 42f.).",
      "Transporting minerals, fuel, hardware, labor and AI devices around the planet requires a global logistics infrastructure. For this logistics system, shipping containers are indispensable. These containers, made of carbon and steel, have seen explosive growth, transforming the planet into a single, massive factory with 3.1 % of annual global carbon dioxide emissions caused by cargo ships (as of 2021). In addition, containers are lost or fall overboard, which pollutes the environment even more. Also, the conditions faced by mariners leave little to be desired. Here, too, the most significant costs of global logistics are carried by the Earth’s atmosphere, the oceanic ecosystem, and low-wage workers. The picture that companies paint of artificial intelligence does not reflect the long-term costs, nor does it reflect the long history of the materials needed to build computing infrastructures, nor the energy required to operate them. Only by taking these hidden costs and these broader interconnections between stakeholders and systems into account can we understand what the shift toward increasing automation and usage of AI will mean. (cf. Crawford, 2024, 54f.)."
    ]
  }
];

/* lat/lon (degrees) -> 3D point on sphere of radius r */
function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -r * Math.sin(phi) * Math.cos(theta);
  const z =  r * Math.sin(phi) * Math.sin(theta);
  const y =  r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

const container = document.getElementById("globe-container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0, 7.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

/* Earth — photoreal-ish sphere with NASA Blue Marble + bump + specular maps */
const RADIUS = 2;

const texLoader = new THREE.TextureLoader();
texLoader.crossOrigin = "anonymous";

// Three.js example textures only ship at 2048 (except clouds @ 1024).
// We use them at full res; mobile gains come from lower segment counts below.
const dayMap    = texLoader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
const bumpMap   = texLoader.load("https://threejs.org/examples/textures/planets/earth_normal_2048.jpg");
const specMap   = texLoader.load("https://threejs.org/examples/textures/planets/earth_specular_2048.jpg");
const cloudsMap = texLoader.load("https://threejs.org/examples/textures/planets/earth_clouds_1024.png");
[dayMap, bumpMap, specMap, cloudsMap].forEach(t => { t.colorSpace = THREE.SRGBColorSpace; });

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(RADIUS, IS_SMALL ? 48 : 96, IS_SMALL ? 48 : 96),
  new THREE.MeshPhongMaterial({
    map: dayMap,
    bumpMap: bumpMap,
    bumpScale: 0.04,
    specularMap: specMap,
    specular: new THREE.Color(0x222233),
    shininess: 18
  })
);
scene.add(earth);

/* Thin layer of moving clouds */
const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(RADIUS * 1.008, IS_SMALL ? 32 : 64, IS_SMALL ? 32 : 64),
  new THREE.MeshPhongMaterial({
    map: cloudsMap,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  })
);
scene.add(clouds);

/* Soft atmospheric glow (back-side sphere with fresnel-like shader) */
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(RADIUS * 1.06, 64, 64),
  new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
        gl_FragColor = vec4(0.4, 0.7, 1.0, 1.0) * intensity;
      }`
  })
);
scene.add(atmosphere);

/* Lighting */
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(5, 2, 5);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xb8c6ff, 0.6);
fill.position.set(-4, -1, -2);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xffffff, 0.75));

/* Markers — minimalist target style:
   small solid white dot + thin ring tangent to the sphere.
   Hover animates the ring/dot scale. No glow, no beams.            */
const markers = [];
const markerGroup = new THREE.Group();
scene.add(markerGroup);

PLACES.forEach(place => {
  const pos = latLonToVec3(place.lat, place.lon, RADIUS * 1.004);

  // Inner dot — raycast target
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  dot.position.copy(pos);
  dot.userData.place = place;
  markerGroup.add(dot);

  // Outer ring — thin, tangent to surface
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.04, 0.043, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    })
  );
  ring.position.copy(pos);
  ring.lookAt(new THREE.Vector3(0, 0, 0));
  markerGroup.add(ring);

  markers.push({ dot, ring, place, hoverT: 0 });
});

/* Drag to rotate */
const ROT = { x: 0.3, y: 0.0, auto: 0.0008 };
let dragging = false;
let last = { x: 0, y: 0 };

container.addEventListener("pointerdown", e => {
  dragging = true;
  last = { x: e.clientX, y: e.clientY };
  container.setPointerCapture(e.pointerId);
});
container.addEventListener("pointermove", e => {
  if (!dragging) return;
  const dx = e.clientX - last.x;
  const dy = e.clientY - last.y;
  ROT.y += dx * 0.005;
  ROT.x += dy * 0.005;
  ROT.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, ROT.x));
  last = { x: e.clientX, y: e.clientY };
});
container.addEventListener("pointerup", e => {
  dragging = false;
  try { container.releasePointerCapture(e.pointerId); } catch {}
});

/* Click marker → detect via raycaster, only if movement was small */
let clickStart = null;
container.addEventListener("pointerdown", e => { clickStart = { x: e.clientX, y: e.clientY }; });
container.addEventListener("pointerup", e => {
  if (!clickStart) return;
  const dx = e.clientX - clickStart.x;
  const dy = e.clientY - clickStart.y;
  if (Math.hypot(dx, dy) > 5) { clickStart = null; return; }
  clickStart = null;

  const rect = container.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(markers.map(m => m.dot), false);
  if (hits.length > 0) {
    openPlace(hits[0].object.userData.place);
  }
});

const globeTooltip = document.getElementById("globe-tooltip");
let hoveredMarker = null;
container.addEventListener("pointermove", e => {
  const rect = container.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(markers.map(m => m.dot), false);
  if (hits.length > 0) {
    const place = hits[0].object.userData.place;
    hoveredMarker = markers.find(m => m.place === place) || null;
    document.body.classList.add("marker-hover");
    if (globeTooltip) {
      globeTooltip.textContent = place.title;
      globeTooltip.style.left = e.clientX + "px";
      globeTooltip.style.top  = e.clientY + "px";
      globeTooltip.classList.add("visible");
    }
  } else {
    hoveredMarker = null;
    document.body.classList.remove("marker-hover");
    if (globeTooltip) globeTooltip.classList.remove("visible");
  }
});
container.addEventListener("pointerleave", () => {
  hoveredMarker = null;
  document.body.classList.remove("marker-hover");
  if (globeTooltip) globeTooltip.classList.remove("visible");
});

/* Place overlay */
const placeOverlay = document.getElementById("overlay-place");
const placeTitle   = document.getElementById("place-title");
const placeBody    = document.getElementById("place-body");
const placeImg     = document.getElementById("place-img");
const placeCaption = document.getElementById("place-caption");

function openPlace(place) {
  placeTitle.textContent = place.title;
  placeBody.innerHTML = "";
  place.text.forEach(part => {
    if (typeof part === "string") {
      const p = document.createElement("p");
      p.textContent = part;
      placeBody.appendChild(p);
    } else if (part.quote) {
      const bq = document.createElement("blockquote");
      bq.textContent = part.quote;
      placeBody.appendChild(bq);
    }
  });
  placeImg.src = place.img;
  placeImg.alt = place.caption;
  placeImg.onerror = () => {
    placeImg.style.display = "none";
  };
  placeImg.style.display = "block";
  placeCaption.textContent = place.caption;
  openOverlay("overlay-place");
}

/* Pause rendering when the globe page is not visible */
let globeVisible = false;
const pageGlobe = document.getElementById("page-globe");
new IntersectionObserver(entries => {
  entries.forEach(e => {
    globeVisible = e.isIntersecting && e.intersectionRatio > 0.15;
    if (globeVisible) pageGlobe.classList.add("globe-in");
  });
}, { root: scroller, threshold: [0, 0.15, 0.5] }).observe(pageGlobe);

/* Animation loop */
let t = 0;
function animate() {
  if (globeVisible) {
    t += 0.016;
    if (!dragging) ROT.y += ROT.auto;
    scene.rotation.y = ROT.y;
    scene.rotation.x = ROT.x;
    clouds.rotation.y += 0.0004;

    markers.forEach(m => {
      // Smoothly lerp hoverT toward 1 (hovered) or 0 (idle)
      const target = m === hoveredMarker ? 1 : 0;
      m.hoverT += (target - m.hoverT) * 0.18;
      const s = 1 + m.hoverT * 0.6;
      m.ring.scale.set(s, s, s);
      m.ring.material.opacity = 0.55 + m.hoverT * 0.45;
      const ds = 1 + m.hoverT * 0.4;
      m.dot.scale.set(ds, ds, ds);
    });

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
animate();

/* Re-resize whenever the globe page becomes visible (snap-scroll quirk) */
new ResizeObserver(() => resize()).observe(pageGlobe);
