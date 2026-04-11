// ============================================================
//  API PROXY — todas las llamadas van al worker de Cloudflare
// ============================================================
// IMPORTANTE: Cambiar esta URL después de deployar el worker
const API_BASE = "https://fluentia-api.jlgonzalez-4ee.workers.dev";

// ============================================================
//  TEXT-TO-SPEECH — Aria speaks aloud
// ============================================================
const synth = window.speechSynthesis;
let ariaVoice = null;
let ttsEnabled = true;
let elevenLabsEnabled = false; // se activa si el worker tiene ElevenLabs configurado

// --- Browser voice — best available male voice ---
function loadVoices() {
  const voices = synth.getVoices();
  if (!voices.length) return;

  // Tier 1: Microsoft neural (Edge browser — sound very natural)
  const naturalKeywords = ["Natural", "Online", "Neural"];
  const naturalMale = voices.filter(v =>
    v.lang.startsWith("en") &&
    naturalKeywords.some(k => v.name.includes(k)) &&
    /guy|eric|roger|davis|christopher|andrew|brian|ryan|thomas/i.test(v.name)
  );
  if (naturalMale.length) { ariaVoice = naturalMale[0]; updateVoiceUI(true); return; }

  // Tier 2: any Microsoft/Google natural
  const anyNatural = voices.filter(v =>
    v.lang.startsWith("en") && naturalKeywords.some(k => v.name.includes(k))
  );
  if (anyNatural.length) { ariaVoice = anyNatural[0]; updateVoiceUI(true); return; }

  // Tier 3: macOS high-quality voices
  const macVoice = voices.find(v => ["Alex", "Daniel", "Fred", "Tom"].includes(v.name));
  if (macVoice) { ariaVoice = macVoice; updateVoiceUI(true); return; }

  // Tier 4: any English voice (will sound robotic — show warning)
  ariaVoice = voices.find(v => v.lang.startsWith("en-US"))
    || voices.find(v => v.lang.startsWith("en"))
    || voices[0] || null;
  updateVoiceUI(false);
}

function updateVoiceUI(isNatural) {
  const btn = document.getElementById("tts-toggle-btn");
  if (!btn || ttsEnabled === false) return;
  if (!isNatural && !elevenLabsKey) {
    btn.innerHTML = "⚠️ Voz robótica — usa Edge o ElevenLabs";
    btn.classList.add("warn");
  }
}

if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoices;
}
// Try immediately and also after a short delay (Chrome loads voices async)
loadVoices();
setTimeout(loadVoices, 500);

function cleanForSpeech(text) {
  return text
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/[•\-*#]/g, "")
    .replace(/\n+/g, ". ")
    .trim();
}

function setSpeaking(on) {
  // Avatar en el header
  const wrap  = document.getElementById("aria-svg");
  const headerVideo = document.getElementById("aria-video");
  if (wrap) wrap.classList.toggle("speaking", on);
  if (headerVideo) {
    if (on) {
      headerVideo.playbackRate = 1;
      headerVideo.play().catch(() => {});
    } else {
      headerVideo.playbackRate = 0.4;
      setTimeout(() => { headerVideo.pause(); headerVideo.currentTime = 0; }, 600);
    }
  }

  // Video de fondo del chat — sincronización de movimiento
  const waBody   = document.getElementById("wa-body");
  const bgVideo  = document.getElementById("chat-bg-video");
  if (waBody) waBody.classList.toggle("speaking", on);
  if (bgVideo) {
    if (on) {
      bgVideo.playbackRate = 1;
      bgVideo.play().catch(() => {});
    } else {
      bgVideo.playbackRate = 0.5;
      setTimeout(() => { bgVideo.playbackRate = 1; }, 800);
    }
  }
}

// --- ElevenLabs TTS via proxy ---
async function speakElevenLabs(text) {
  setSpeaking(true);
  try {
    const res = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error("TTS error");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
    audio.onerror = () => setSpeaking(false);
    await audio.play();
  } catch {
    setSpeaking(false);
    speakBrowser(text);
  }
}

// --- Browser Web Speech API fallback ---
function speakBrowser(text) {
  synth.cancel();
  if (!synth) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice  = ariaVoice;
  utt.lang   = "en-US";
  utt.rate   = 0.9;
  utt.pitch  = 0.85;  // lower pitch = more masculine
  utt.volume = 1;
  utt.onstart = () => setSpeaking(true);
  utt.onend   = () => setSpeaking(false);
  utt.onerror = () => setSpeaking(false);
  synth.speak(utt);
}

// --- Main speak function ---
function ariaSpeak(text) {
  if (!ttsEnabled) return;
  const clean = cleanForSpeech(text);
  if (!clean) return;
  if (elevenLabsEnabled) {
    speakElevenLabs(clean);
  } else {
    speakBrowser(clean);
  }
}

// ============================================================
//  VOCABULARY DATA
// ============================================================
const vocabulary = [
  { word: "Achieve",     translation: "Lograr / Alcanzar",        category: "Verbo",      example: "She worked hard to achieve her goals." },
  { word: "Challenge",   translation: "Desafío / Reto",           category: "Sustantivo", example: "Learning English is a great challenge." },
  { word: "Improve",     translation: "Mejorar",                  category: "Verbo",      example: "Practice every day to improve your English." },
  { word: "Opportunity", translation: "Oportunidad",              category: "Sustantivo", example: "This is a great opportunity to learn." },
  { word: "Confident",   translation: "Seguro / Confiado",        category: "Adjetivo",   example: "She feels confident speaking English now." },
  { word: "Fluent",      translation: "Fluido / Con fluidez",     category: "Adjetivo",   example: "He became fluent after two years." },
  { word: "Vocabulary",  translation: "Vocabulario",              category: "Sustantivo", example: "Expand your vocabulary every day." },
  { word: "Pronounce",   translation: "Pronunciar",               category: "Verbo",      example: "How do you pronounce this word?" },
  { word: "Grammar",     translation: "Gramática",                category: "Sustantivo", example: "Good grammar helps you communicate clearly." },
  { word: "Persistence", translation: "Persistencia",             category: "Sustantivo", example: "Persistence is key to mastering English." },
  { word: "Brilliant",   translation: "Brillante / Genial",       category: "Adjetivo",   example: "That was a brilliant idea!" },
  { word: "Understand",  translation: "Entender / Comprender",    category: "Verbo",      example: "Do you understand the lesson?" },
  { word: "Practice",    translation: "Practicar / Práctica",     category: "Verbo",      example: "Practice makes perfect." },
  { word: "Encourage",   translation: "Animar / Alentar",         category: "Verbo",      example: "Teachers encourage students to speak up." },
  { word: "Mistake",     translation: "Error / Equivocación",     category: "Sustantivo", example: "Don't be afraid to make mistakes." },
];

// ============================================================
//  STATE
// ============================================================
let currentCard    = 0;
let masteredCards  = new Set();
let quizScore      = 0;
let quizTotal      = 0;
let chatHistory    = [];

// ============================================================
//  LEVEL TEST — Evaluación separada del chat
// ============================================================
let userLevel      = localStorage.getItem("tutor_level") || "";
let levelStep      = 0;
let levelAnswers   = [];
let levelHistory   = [];

function updateLevelUI() {
  const badge = document.getElementById("level-badge");
  const label = document.getElementById("level-label");
  const desc  = document.getElementById("level-desc");
  const startBtn = document.getElementById("start-level-btn");
  const resetBtn = document.getElementById("reset-level-btn");
  const statusEl = document.getElementById("tutor-status");

  if (userLevel) {
    const levelNames = { A1: "Principiante", A2: "Elemental", B1: "Intermedio", B2: "Intermedio Alto", C1: "Avanzado" };
    badge.textContent = userLevel;
    badge.classList.add("evaluated");
    label.textContent = `Nivel ${userLevel} — ${levelNames[userLevel] || ""}`;
    desc.textContent = "Ve al Chat IA para comenzar tus lecciones personalizadas.";
    startBtn.style.display = "none";
    resetBtn.style.display = "inline-flex";
    if (statusEl) statusEl.innerHTML = `<span class="status-dot"></span> en línea · Nivel ${userLevel}`;
  } else {
    badge.textContent = "?";
    badge.classList.remove("evaluated");
    label.textContent = "Sin evaluar";
    desc.textContent = "Haz el test para que George adapte las lecciones a tu nivel.";
    startBtn.style.display = "inline-flex";
    resetBtn.style.display = "none";
    if (statusEl) statusEl.innerHTML = `<span class="status-dot"></span> en línea · Tutor de Inglés IA`;
  }
}

function getChatSystemPrompt() {
  const levelStyle = {
    "A1": "Teach in Spanish with basic English words and phrases. Very simple. Always translate everything.",
    "A2": "Teach mostly in Spanish, introduce English sentences. Translate all English to Spanish.",
    "B1": "Teach in English with Spanish support for difficult concepts. Brief Spanish translations.",
    "B2": "Teach mostly in English. Only use Spanish for complex grammar explanations.",
    "C1": "Teach entirely in English. No Spanish unless the user asks."
  };

  if (!userLevel) {
    return `You are George, a natural and concise English tutor for Spanish speakers.

STRICT FORMAT RULES:
- NO emojis, NO bullet points, NO asterisks, NO special symbols, NO numbered lists.
- Write in plain conversational text only. Like a friend texting.
- 1-2 short sentences per language. Be direct and natural.
- English answer first, then [ES], then Spanish translation.
- Suggest the user to go to the Level tab to take the placement test for a personalized experience.`;
  }

  return `You are George, a friendly English tutor. The user's level is ${userLevel}.

TEACHING STYLE: ${levelStyle[userLevel] || levelStyle["B1"]}

STRICT FORMAT RULES:
- NO emojis, NO bullet points, NO asterisks, NO special symbols, NO numbered lists, NO markdown.
- Write in plain conversational text only. Like a friend texting naturally.
- Keep answers to 1-3 short sentences per language. Be direct.
- English first, then [ES], then Spanish translation.
- If the user makes an error, correct it naturally and explain why in one sentence.
- Adjust difficulty based on how the user responds.
- Be warm and encouraging but without emojis or symbols.`;
}

// ============================================================
//  TABS
// ============================================================
let chatGreeted = false;

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    if (tab === "chat") {
      const bgVideo = document.getElementById("chat-bg-video");
      const hdrVideo = document.getElementById("aria-video");
      if (bgVideo) bgVideo.play().catch(() => {});
      if (hdrVideo) hdrVideo.play().catch(() => {});
      if (!chatGreeted) {
        chatGreeted = true;
        setTimeout(() => {
          if (userLevel) {
            const greeting = `Welcome! Your level is ${userLevel}. Let's start your lesson. What would you like to learn today?\n[ES]\n¡Bienvenido! Tu nivel es ${userLevel}. Comencemos tu lección. ¿Qué te gustaría aprender hoy?`;
            addMessage(greeting, "bot");
            ariaSpeak(`Welcome! Your level is ${userLevel}. Let's start your lesson.`);
          } else {
            const msg = `Hi! I'm George, your English tutor. Go to the "Level" tab to take the placement test so I can personalize your lessons.\n[ES]\n¡Hola! Soy George, tu tutor de inglés. Ve a la pestaña "Level" para hacer el test de nivel y así personalizar tus lecciones.`;
            addMessage(msg, "bot");
            ariaSpeak("Hi! Go to the Level tab to take the placement test.");
          }
        }, 400);
      }
    }
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => {
      t.classList.remove("active");
      t.classList.add("hidden");
    });
    btn.classList.add("active");
    const el = document.getElementById(`tab-${tab}`);
    el.classList.remove("hidden");
    el.classList.add("active");
  });
});

// ============================================================
//  CHECK API HEALTH — verifica conexión al proxy
// ============================================================
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      const data = await res.json();
      elevenLabsEnabled = data.tts === true;
      return true;
    }
  } catch { }
  return false;
}

// ============================================================
//  TOAST
// ============================================================
function toast(msg, type = "default") {
  const colors = { default: "#7c6fff", success: "#4ade80", error: "#f87171" };
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  el.style.cssText = `
    position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(20px);
    background:${colors[type] || colors.default}22; color:#fff;
    border:1px solid ${colors[type] || colors.default}44;
    backdrop-filter:blur(12px);
    padding:12px 24px; border-radius:50px; font-size:0.875rem; font-weight:500;
    z-index:9999; white-space:nowrap;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
    font-family:inherit;
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = "translateX(-50%) translateY(0)"; el.style.opacity = "1"; });
  setTimeout(() => {
    el.style.transform = "translateX(-50%) translateY(10px)";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 2400);
}

// ============================================================
//  FLASHCARDS
// ============================================================
const flashcard       = document.getElementById("flashcard");
const cardWord        = document.getElementById("card-word");
const cardTranslation = document.getElementById("card-translation");
const cardCategory    = document.getElementById("card-category");
const cardExample     = document.getElementById("card-example");
const cardCounter     = document.getElementById("card-counter");
const progressBar     = document.getElementById("progress-bar");
const masteredCount   = document.getElementById("mastered-count");

function renderCard(animate = true) {
  if (animate) flashcard.classList.remove("flipped");

  const delay = animate ? 150 : 0;
  setTimeout(() => {
    const card = vocabulary[currentCard];
    cardWord.textContent        = card.word;
    cardTranslation.textContent = card.translation;
    cardCategory.textContent    = card.category;
    cardExample.textContent     = `"${card.example}"`;
    cardCounter.textContent     = `${currentCard + 1} / ${vocabulary.length}`;
    const pct = ((currentCard + 1) / vocabulary.length) * 100;
    progressBar.style.width     = `${pct}%`;
    masteredCount.textContent   = masteredCards.size;
  }, delay);
}

flashcard.addEventListener("click", () => {
  flashcard.classList.toggle("flipped");
  if (flashcard.classList.contains("flipped")) masteredCards.add(currentCard);
  masteredCount.textContent = masteredCards.size;
});

document.getElementById("next-card").addEventListener("click", () => {
  currentCard = (currentCard + 1) % vocabulary.length;
  renderCard();
});
document.getElementById("prev-card").addEventListener("click", () => {
  currentCard = (currentCard - 1 + vocabulary.length) % vocabulary.length;
  renderCard();
});

// Keyboard navigation
document.addEventListener("keydown", e => {
  const tab = document.querySelector(".tab.active")?.id;
  if (tab === "tab-flashcards") {
    if (e.key === "ArrowRight") document.getElementById("next-card").click();
    if (e.key === "ArrowLeft")  document.getElementById("prev-card").click();
    if (e.key === " ") { e.preventDefault(); flashcard.click(); }
  }
});

renderCard(false);

// ============================================================
//  QUIZ
// ============================================================
let currentQuizWord = null;

function loadQuestion() {
  const resultEl = document.getElementById("quiz-result");
  resultEl.className = "quiz-result hidden";

  const idx = Math.floor(Math.random() * vocabulary.length);
  currentQuizWord = vocabulary[idx];

  const qEl = document.getElementById("quiz-question");
  qEl.innerHTML = `¿Cuál es la traducción de <strong>"${currentQuizWord.word}"</strong>?`;

  // 4 options: 1 correct + 3 wrong
  const options = [currentQuizWord];
  const pool = vocabulary.filter((_, i) => i !== idx);
  while (options.length < 4) {
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (!options.includes(r)) options.push(r);
  }
  options.sort(() => Math.random() - 0.5);

  const container = document.getElementById("quiz-options");
  container.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt.translation;
    btn.addEventListener("click", () => checkAnswer(opt, btn));
    container.appendChild(btn);
  });
}

function checkAnswer(selected, btn) {
  quizTotal++;
  document.getElementById("quiz-total").textContent = quizTotal;

  document.querySelectorAll(".quiz-option").forEach(b => b.disabled = true);

  const resultEl = document.getElementById("quiz-result");
  resultEl.classList.remove("hidden");

  if (selected === currentQuizWord) {
    quizScore++;
    btn.classList.add("correct");
    resultEl.textContent = "¡Correcto! 🎉 Excelente trabajo.";
    resultEl.className   = "quiz-result correct";
  } else {
    btn.classList.add("wrong");
    document.querySelectorAll(".quiz-option").forEach(b => {
      if (b.textContent === currentQuizWord.translation) b.classList.add("correct");
    });
    resultEl.textContent = `Incorrecto — la respuesta era: ${currentQuizWord.translation}`;
    resultEl.className   = "quiz-result wrong";
  }

  document.getElementById("quiz-score").textContent = quizScore;
}

document.getElementById("next-question-btn").addEventListener("click", loadQuestion);
loadQuestion();

// ============================================================
//  CHAT
// ============================================================
const chatContainer = document.getElementById("chat-container");
const chatInput     = document.getElementById("chat-input");

function addMessage(text, role, typing = false) {
  const wrap = document.createElement("div");
  wrap.className = `chat-message ${role}${typing ? " typing" : ""}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (typing) {
    bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  } else if (role === "bot" && text.includes("[ES]")) {
    // Separar inglés y español
    const parts = text.split("[ES]");
    const enText = parts[0].trim();
    const esText = parts[1].trim();

    const enBlock = document.createElement("div");
    enBlock.className = "subtitle-en";
    enBlock.textContent = enText;

    const divider = document.createElement("div");
    divider.className = "subtitle-divider";

    const esBlock = document.createElement("div");
    esBlock.className = "subtitle-es";
    esBlock.textContent = esText;

    bubble.appendChild(enBlock);
    bubble.appendChild(divider);
    bubble.appendChild(esBlock);
  } else {
    bubble.textContent = text;
  }

  wrap.appendChild(bubble);
  chatContainer.appendChild(wrap);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return wrap;
}

// ============================================================
//  SHARED — callClaude helper
// ============================================================
async function callClaude(messages, systemPrompt, maxTokens = 250) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  let reply = data.content[0].text;
  if (!reply.includes("[ES]")) {
    try {
      const trRes = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 200, system: "Translate the following English text to natural Spanish. Only output the translation, nothing else.", messages: [{ role: "user", content: reply }] })
      });
      if (trRes.ok) { const trData = await trRes.json(); reply = reply + "\n[ES]\n" + trData.content[0].text; }
    } catch { }
  }
  return reply;
}

// ============================================================
//  LEVEL TEST — lógica de la pestaña Level
// ============================================================
const levelMessages = document.getElementById("level-messages");
const levelInput    = document.getElementById("level-input");
const levelChat     = document.getElementById("level-chat");
const levelProgress = document.getElementById("level-progress");

const LEVEL_QUESTIONS = [
  "Hi! I'm George. Let's find your English level with 4 quick questions.\n\nQuestion 1: How would you introduce yourself in English? (Say your name, age, and what you do)\n[ES]\n¡Hola! Soy George. Vamos a descubrir tu nivel con 4 preguntas rápidas.\n\nPregunta 1: ¿Cómo te presentarías en inglés? (Di tu nombre, edad y a qué te dedicas)",
  "Question 2: Complete this sentence:\n\"Yesterday, I ___ (go) to the store and ___ (buy) some groceries.\"\nWrite the full sentence.\n[ES]\nPregunta 2: Completa esta oración:\n\"Yesterday, I ___ (go) to the store and ___ (buy) some groceries.\"\nEscribe la oración completa.",
  "Question 3: What does the word \"deadline\" mean? Can you use it in a sentence?\n[ES]\nPregunta 3: ¿Qué significa la palabra \"deadline\"? ¿Puedes usarla en una oración?",
  "Last question! Your friend says: \"I've been feeling under the weather lately.\" What does your friend mean? How would you respond?\n[ES]\nÚltima pregunta: Tu amigo dice: \"I've been feeling under the weather lately.\" ¿Qué quiere decir? ¿Cómo le responderías?"
];

function addLevelMsg(text, role, typing = false) {
  const el = document.createElement("div");
  el.className = `level-msg ${role}${typing ? " typing" : ""}`;
  if (typing) {
    el.innerHTML = "<span></span><span></span><span></span>";
  } else if (text.includes("[ES]")) {
    const parts = text.split("[ES]");
    el.innerHTML = `<div style="margin-bottom:6px">${parts[0].trim().replace(/\n/g, "<br>")}</div><div style="border-top:1px solid rgba(74,222,128,0.2);padding-top:6px;color:#8fc9a3;font-style:italic;font-size:0.82rem">${parts[1].trim().replace(/\n/g, "<br>")}</div>`;
  } else {
    el.textContent = text;
  }
  levelMessages.appendChild(el);
  levelMessages.scrollTop = levelMessages.scrollHeight;
  return el;
}

function updateLevelProgress() {
  const fill = document.getElementById("level-progress-fill");
  const text = document.getElementById("level-progress-text");
  const pct = (levelStep / 4) * 100;
  fill.style.width = pct + "%";
  text.textContent = levelStep >= 4 ? "Evaluando resultado..." : `Pregunta ${levelStep + 1} de 4`;
}

document.getElementById("start-level-btn").addEventListener("click", () => {
  levelStep = 0;
  levelAnswers = [];
  levelHistory = [];
  levelMessages.innerHTML = "";
  levelChat.style.display = "block";
  levelProgress.style.display = "block";
  document.getElementById("start-level-btn").style.display = "none";
  document.getElementById("reset-level-btn").style.display = "none";
  updateLevelProgress();
  addLevelMsg(LEVEL_QUESTIONS[0], "bot");
});

document.getElementById("reset-level-btn").addEventListener("click", () => {
  userLevel = "";
  localStorage.removeItem("tutor_level");
  chatGreeted = false;
  chatHistory = [];
  chatContainer.innerHTML = "";
  updateLevelUI();
  document.getElementById("start-level-btn").click();
});

async function sendLevelAnswer(text) {
  text = text.trim();
  if (!text) return;
  levelInput.value = "";
  levelInput.disabled = true;

  addLevelMsg(text, "user");
  levelAnswers.push(text);
  levelStep++;
  updateLevelProgress();

  if (levelStep < 4) {
    // Mostrar siguiente pregunta con pequeña pausa
    const typingEl = addLevelMsg("", "bot", true);
    await new Promise(r => setTimeout(r, 600));
    typingEl.remove();
    addLevelMsg(LEVEL_QUESTIONS[levelStep], "bot");
    levelInput.disabled = false;
    levelInput.focus();
  } else {
    // Completó 4 preguntas — clasificar con IA
    const typingEl = addLevelMsg("", "bot", true);
    try {
      const classifyPrompt = `You are George, an English tutor. Analyze these 4 answers from a Spanish speaker and classify their English level.

ANSWERS:
Q1 (Introduction): ${levelAnswers[0]}
Q2 (Grammar - past tense): ${levelAnswers[1]}
Q3 (Vocabulary - "deadline"): ${levelAnswers[2]}
Q4 (Comprehension - "under the weather"): ${levelAnswers[3]}

TASK:
1. Classify as: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper-Intermediate), or C1 (Advanced).
2. Start your response with the level like: "Your level is B1!"
3. Explain briefly IN SPANISH why (2-3 sentences max about strengths and areas to improve).
4. End with an encouraging message about what they'll learn next in the Chat.

Format: English first, then [ES], then Spanish.`;

      const reply = await callClaude([{ role: "user", content: "Classify my level based on my test answers." }], classifyPrompt, 400);
      typingEl.remove();
      addLevelMsg(reply, "bot");

      // Extraer nivel
      const match = reply.match(/\b(A1|A2|B1|B2|C1)\b/);
      if (match) {
        userLevel = match[1];
        localStorage.setItem("tutor_level", userLevel);
        chatGreeted = false;
        chatHistory = [];
        chatContainer.innerHTML = "";
      }
      updateLevelUI();
      levelInput.disabled = false;

      // Ocultar input del level, mostrar botón de repetir
      setTimeout(() => {
        levelChat.querySelector(".level-input-area").style.display = "none";
        document.getElementById("reset-level-btn").style.display = "inline-flex";
      }, 500);

    } catch (err) {
      typingEl.remove();
      addLevelMsg(`Error: ${err.message}`, "bot");
      levelInput.disabled = false;
    }
  }
}

document.getElementById("level-send-btn").addEventListener("click", () => sendLevelAnswer(levelInput.value));
levelInput.addEventListener("keydown", e => { if (e.key === "Enter") sendLevelAnswer(levelInput.value); });

// ============================================================
//  CHAT — solo enseñanza (usa nivel de Level tab)
// ============================================================
async function sendMessage(text) {
  text = text.trim();
  if (!text) return;
  chatInput.value = "";

  addMessage(text, "user");
  chatHistory.push({ role: "user", content: text });


  const typingEl = addMessage("", "bot", true);
  const ariaSvg = document.getElementById("aria-svg");
  if (ariaSvg) ariaSvg.classList.add("speaking");

  try {
    const reply = await callClaude(chatHistory, getChatSystemPrompt(), 250);
    typingEl.remove();
    addMessage(reply, "bot");
    chatHistory.push({ role: "assistant", content: reply });
    const englishPart = reply.includes("[ES]") ? reply.split("[ES]")[0].trim() : reply;
    ariaSpeak(englishPart);
  } catch (err) {
    if (ariaSvg) ariaSvg.classList.remove("speaking");
    typingEl.remove();
    addMessage(`Error de conexión. Intenta de nuevo.`, "bot");
  }
}

document.getElementById("send-btn").addEventListener("click", () => sendMessage(chatInput.value));
chatInput.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) sendMessage(chatInput.value); });

// ============================================================
//  MICROPHONE — Web Speech API (works on mobile & desktop)
// ============================================================
const micBtn = document.getElementById("mic-btn");
let isListening = false;
let recognition = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    stopListening();
    chatInput.value = text;
    setTimeout(() => sendMessage(text), 150);
  };

  recognition.onerror = (e) => {
    stopListening();
    if (e.error === "no-speech") {
      chatInput.placeholder = "No te escuché, intenta de nuevo...";
    } else if (e.error === "not-allowed") {
      chatInput.placeholder = "Permite el acceso al micrófono";
    } else {
      chatInput.placeholder = "Error de micrófono, intenta de nuevo...";
    }
    setTimeout(() => { chatInput.placeholder = "Escribe un mensaje..."; }, 2500);
  };

  recognition.onend = () => {
    if (isListening) stopListening();
  };

  micBtn.style.opacity = "1";
  micBtn.title = "Hablar con George";
} else {
  micBtn.style.opacity = "0.4";
  micBtn.title = "Tu navegador no soporta reconocimiento de voz";
}

micBtn.addEventListener("click", () => {
  if (!recognition) {
    toast("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.", "default");
    return;
  }
  if (isListening) {
    recognition.abort();
    stopListening();
    return;
  }

  // Stop George speaking while user talks
  synth.cancel();

  // Always listen in English — it's an English learning app
  // User can still type in Spanish if needed
  recognition.lang = "en-US";

  isListening = true;
  micBtn.classList.add("listening");
  chatInput.value = "";
  chatInput.placeholder = "🎙 Escuchando...";
  recognition.start();
});

function stopListening() {
  isListening = false;
  micBtn.classList.remove("listening");
  chatInput.placeholder = "Escribe un mensaje...";
}

// TTS toggle
const ttsBtn = document.getElementById("tts-toggle-btn");
if (ttsBtn) {
  ttsBtn.addEventListener("click", () => {
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled) { synth.cancel(); }
    ttsBtn.textContent = ttsEnabled ? "🔊 Voz activada" : "🔇 Voz desactivada";
    ttsBtn.classList.toggle("muted", !ttsEnabled);
  });
}

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    chatInput.value = chip.textContent;
    chatInput.focus();
  });
});

// ============================================================
//  VIDEO BACKGROUND — forzar reproducción en mobile
// ============================================================
(function initBgVideo() {
  const bgVideo  = document.getElementById("chat-bg-video");
  const hdrVideo = document.getElementById("aria-video");

  function playVideos() {
    if (bgVideo)  bgVideo.play().catch(() => {});
    if (hdrVideo) hdrVideo.play().catch(() => {});
  }

  // Intentar autoplay inmediato
  playVideos();

  // Mobile requiere interacción del usuario — al primer toque, iniciar video
  function onFirstInteraction() {
    playVideos();
    document.removeEventListener("touchstart", onFirstInteraction);
    document.removeEventListener("click", onFirstInteraction);
  }
  document.addEventListener("touchstart", onFirstInteraction, { passive: true });
  document.addEventListener("click", onFirstInteraction);

  // Mantener auto-scroll al recibir mensajes
  const chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      });
    });
    observer.observe(chatContainer, { childList: true, subtree: true });
  }
})();

// Mostrar nivel guardado al cargar
updateLevelUI();

// ============================================================
//  TRADUCTOR — Escucha en cualquier idioma, traduce al español
// ============================================================
(function initTraductor() {
  const trMicBtn     = document.getElementById("tr-mic-btn");
  const trStatus     = document.getElementById("tr-status");
  const trInterimEl  = document.getElementById("tr-interim");
  const trInterimWrap= document.getElementById("tr-interim-wrap");
  const trLog        = document.getElementById("tr-log");
  const trLangSelect = document.getElementById("tr-lang-select");
  const trClearBtn   = document.getElementById("tr-clear-btn");

  let trIsListening  = false;
  let trRecognition  = null;
  let trQueue        = [];
  let trTranslating  = false;

  // Build recognition instance
  if (SpeechRecognition) {
    trRecognition = new SpeechRecognition();
    trRecognition.continuous      = true;
    trRecognition.interimResults  = true;

    trRecognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (text) {
            trQueue.push(text);
            trInterimEl.textContent = "";
            processQueue();
          }
        } else {
          interim += r[0].transcript;
        }
      }
      if (interim) {
        trInterimWrap.classList.remove("hidden");
        trInterimEl.textContent = interim;
      }
    };

    trRecognition.onerror = (e) => {
      if (e.error === "no-speech") return; // silencio normal — ignorar
      if (e.error === "not-allowed") {
        trStatus.textContent = "Permite el acceso al micrófono en tu navegador";
        trStatus.classList.remove("active");
        stopTr();
        return;
      }
      // Otros errores: reintentar si sigue activo
    };

    // Auto-reiniciar para mantener escucha continua
    trRecognition.onend = () => {
      if (trIsListening) {
        try { trRecognition.start(); } catch (_) {}
      }
    };
  }

  // ---- Traducción via Claude proxy ----
  async function translateText(text) {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: "Translate the following text to Spanish. Output only the Spanish translation, nothing else. Preserve the original meaning and tone.",
        messages: [{ role: "user", content: text }]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.content[0].text.trim();
  }

  async function processQueue() {
    if (trTranslating || trQueue.length === 0) return;
    trTranslating = true;

    const original = trQueue.shift();
    const entry = addEntry(original);

    try {
      const translation = await translateText(original);
      finalizeEntry(entry, translation);
    } catch {
      finalizeEntry(entry, "— error al traducir —");
    }

    trTranslating = false;
    if (trQueue.length > 0) processQueue();
  }

  function addEntry(original) {
    const div = document.createElement("div");
    div.className = "tr-entry pending";
    div.innerHTML = `
      <div class="tr-original">${escapeHtml(original)}</div>
      <div class="tr-arrow">→</div>
      <div class="tr-translation translating">traduciendo...</div>
    `;
    trLog.insertBefore(div, trLog.firstChild);
    return div;
  }

  function finalizeEntry(entry, translation) {
    entry.classList.remove("pending");
    const el = entry.querySelector(".tr-translation");
    if (el) {
      el.textContent = translation;
      el.classList.remove("translating");
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ---- Controles ----
  function startTr() {
    if (!trRecognition) {
      toast("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.", "default");
      return;
    }
    trRecognition.lang = trLangSelect.value;
    trIsListening = true;
    trMicBtn.classList.add("listening");
    trStatus.textContent = "Escuchando — habla ahora";
    trStatus.classList.add("active");
    trInterimWrap.classList.add("hidden");
    trInterimEl.textContent = "";
    try { trRecognition.start(); } catch (_) {}
  }

  function stopTr() {
    trIsListening = false;
    trMicBtn.classList.remove("listening");
    trStatus.textContent = "Presiona el micrófono para comenzar";
    trStatus.classList.remove("active");
    trInterimWrap.classList.add("hidden");
    trInterimEl.textContent = "";
    try { trRecognition.stop(); } catch (_) {}
  }

  trMicBtn.addEventListener("click", () => {
    trIsListening ? stopTr() : startTr();
  });

  // Cambiar idioma mientras escucha → reiniciar reconocimiento
  trLangSelect.addEventListener("change", () => {
    if (trIsListening) {
      try { trRecognition.stop(); } catch (_) {}
      trRecognition.lang = trLangSelect.value;
      setTimeout(() => { try { trRecognition.start(); } catch (_) {} }, 200);
    }
  });

  trClearBtn.addEventListener("click", () => {
    trLog.innerHTML = "";
    trQueue = [];
    trInterimEl.textContent = "";
    trInterimWrap.classList.add("hidden");
  });

  // Detener escucha al cambiar de pestaña
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tab !== "traductor" && trIsListening) stopTr();
    });
  });
})();
