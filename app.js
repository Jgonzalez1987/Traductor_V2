// ============================================================
//  TEXT-TO-SPEECH — Aria speaks aloud
// ============================================================
const synth = window.speechSynthesis;
let ariaVoice = null;
let ttsEnabled = true;
let elevenLabsKey = localStorage.getItem("elevenlabs_api_key") || "";

// ElevenLabs voice ID — "Adam" (natural male English voice)
const ELEVEN_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

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

// --- ElevenLabs TTS (natural AI voice) ---
async function speakElevenLabs(text) {
  setSpeaking(true);
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true }
      })
    });
    if (!res.ok) throw new Error("ElevenLabs error");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
    audio.onerror = () => setSpeaking(false);
    await audio.play();
  } catch {
    setSpeaking(false);
    speakBrowser(text); // fallback
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
  if (elevenLabsKey) {
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
let apiKey         = localStorage.getItem("claude_api_key") || "";
let chatHistory    = [];

// ============================================================
//  TABS
// ============================================================
let chatGreeted = false;

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    if (tab === "chat") {
      // Iniciar video de fondo al entrar al chat
      const bgVideo = document.getElementById("chat-bg-video");
      const hdrVideo = document.getElementById("aria-video");
      if (bgVideo) bgVideo.play().catch(() => {});
      if (hdrVideo) hdrVideo.play().catch(() => {});
      if (!chatGreeted) {
        chatGreeted = true;
        setTimeout(() => ariaSpeak("Hello! I'm George, your AI English tutor. How can I help you today?"), 600);
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
//  SETTINGS MODAL
// ============================================================
const modal    = document.getElementById("settings-modal");
const apiInput = document.getElementById("api-key-input");
const toggleBtn = document.getElementById("toggle-key-visibility");

const elevenInput  = document.getElementById("eleven-key-input");
const toggleEleven = document.getElementById("toggle-eleven-visibility");

document.getElementById("settings-btn").addEventListener("click", () => {
  apiInput.value    = apiKey;
  elevenInput.value = elevenLabsKey;
  modal.classList.remove("hidden");
});
document.getElementById("close-modal-btn").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

document.getElementById("save-key-btn").addEventListener("click", () => {
  apiKey = apiInput.value.trim();
  localStorage.setItem("claude_api_key", apiKey);
  elevenLabsKey = elevenInput.value.trim();
  localStorage.setItem("elevenlabs_api_key", elevenLabsKey);
  modal.classList.add("hidden");
  const voiceType = elevenLabsKey ? "🎙 Voz natural (ElevenLabs) activada ✓" : "API Keys guardadas ✓";
  toast(voiceType, "success");
});

toggleBtn.addEventListener("click", () => {
  apiInput.type = apiInput.type === "password" ? "text" : "password";
  toggleBtn.textContent = apiInput.type === "password" ? "👁" : "🙈";
});

toggleEleven.addEventListener("click", () => {
  elevenInput.type = elevenInput.type === "password" ? "text" : "password";
  toggleEleven.textContent = elevenInput.type === "password" ? "👁" : "🙈";
});

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

async function sendMessage(text) {
  text = text.trim();
  if (!text) return;
  chatInput.value = "";

  addMessage(text, "user");
  chatHistory.push({ role: "user", content: text });

  if (!apiKey) {
    addMessage("Para usar el Chat con IA necesitas configurar tu API Key de Claude. Haz clic en ⚙️ arriba a la derecha.", "bot");
    return;
  }

  const typingEl = addMessage("", "bot", true);

  // Start speaking animation on Aria
  const ariaSvg = document.getElementById("aria-svg");
  if (ariaSvg) ariaSvg.classList.add("speaking");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: `You are George, a concise English tutor for Spanish speakers.

RULES:
1. Answer ONLY what was asked. No extras, no lists, no alternatives unless requested.
2. Keep it to 1-2 sentences per language. Be direct.
3. Format: English answer first, then [ES], then Spanish translation.

Example — user asks "como se dice tengo hambre":
"I'm hungry" — that's how you say it naturally.
[ES]
"Tengo hambre" se dice "I'm hungry".

Another example — user writes bad English:
You wrote "I go yesterday" — it should be "I went yesterday" because it's past tense.
[ES]
Escribiste "I go yesterday" — debería ser "I went yesterday" porque es pasado.

NEVER give long lists or multiple options unless the user asks for them. Be short and precise.`,
        messages: chatHistory
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data  = await res.json();
    let reply = data.content[0].text;

    // Si el modelo no incluyó [ES], obtener traducción automática
    if (!reply.includes("[ES]")) {
      try {
        const trRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            system: "Translate the following English text to natural Spanish. Only output the translation, nothing else.",
            messages: [{ role: "user", content: reply }]
          })
        });
        if (trRes.ok) {
          const trData = await trRes.json();
          reply = reply + "\n[ES]\n" + trData.content[0].text;
        }
      } catch { /* usar respuesta sin traducción */ }
    }

    typingEl.remove();
    addMessage(reply, "bot");
    chatHistory.push({ role: "assistant", content: reply });
    // Solo leer la parte en inglés en voz alta
    const englishPart = reply.includes("[ES]") ? reply.split("[ES]")[0].trim() : reply;
    ariaSpeak(englishPart);

  } catch (err) {
    if (ariaSvg) ariaSvg.classList.remove("speaking");
    typingEl.remove();
    addMessage(`Error: ${err.message}. Verifica tu API Key en ⚙️.`, "bot");
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
