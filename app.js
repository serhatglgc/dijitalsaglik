/* =============================================
   DIJITAL YASAM RISK DEGERLENDIRMESI - APP.JS
   Pure JS, no dependencies, no backend needed.
   ============================================= */

'use strict';

// ─── State ────────────────────────────────────
const state = {
  currentStep: 0,   // 0 = intro, 1-8 = questions
  answers: {},      // { q1: val, q2: val, ... }
  totalSteps: 8,
};

// ─── DOM Refs ──────────────────────────────────
const screens = {
  intro:     document.getElementById('screen-intro'),
  questions: document.getElementById('screen-questions'),
  result:    document.getElementById('screen-result'),
};

// ─── Inject SVG gradient defs ──────────────────
(function injectSvgDefs() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'svg-defs');
  svg.innerHTML = `
    <defs>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4f9cf9"/>
        <stop offset="100%" stop-color="#a78bfa"/>
      </linearGradient>
    </defs>`;
  document.body.appendChild(svg);
})();

// ─── Particle background ───────────────────────
(function initParticles() {
  const container = document.getElementById('bgParticles');
  const colors    = ['#4f9cf9', '#a78bfa', '#22d3ee', '#34d399'];
  const count     = 18;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 3;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${Math.random() * 20 + 15}s;
      animation-delay: ${Math.random() * -20}s;
    `;
    container.appendChild(p);
  }
})();

// ─── Screen navigation ─────────────────────────
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (key === name) {
      el.classList.remove('exit-left');
      el.classList.add('active');
    } else {
      el.classList.remove('active');
      el.classList.add('exit-left');
    }
  });
}

function goToStep(step) {
  state.currentStep = step;

  if (step === 0) {
    showScreen('intro');
    return;
  }

  if (step > state.totalSteps) {
    calculateAndShowResult();
    return;
  }

  showScreen('questions');
  showQuestion(step);
  updateProgress(step);
}

function goBack() {
  if (state.currentStep <= 1) {
    showScreen('intro');
    state.currentStep = 0;
  } else {
    goToStep(state.currentStep - 1);
  }
}

// ─── Question logic ────────────────────────────
function showQuestion(step) {
  // Hide all cards
  document.querySelectorAll('.q-card').forEach(c => {
    c.classList.add('hidden');
    c.classList.remove('active-card');
  });

  const card = document.getElementById(`q${step}`);
  if (!card) return;
  card.classList.remove('hidden');

  // Trigger entrance animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => card.classList.add('active-card'));
  });

  // Restore previous answer if exists
  const prevAnswer = state.answers[`q${step}`];
  const inputEl    = document.getElementById(`q${step}-input`);

  if (inputEl && prevAnswer !== undefined) {
    // For number inputs
    if (inputEl.type !== 'hidden') {
      inputEl.value = prevAnswer;
    } else {
      // For choice grids, restore selected state
      const choiceGrid = document.getElementById(`q${step}-choices`);
      if (choiceGrid) {
        choiceGrid.querySelectorAll('.choice-btn').forEach(btn => {
          btn.classList.toggle('selected', parseFloat(btn.dataset.value) === prevAnswer);
        });
      }
    }
  }

  // Focus number input
  if (inputEl && inputEl.type === 'number') {
    setTimeout(() => inputEl.focus(), 350);
  }

  // Update next button text
  const nextBtnText = document.getElementById('nextBtnText');
  nextBtnText.textContent = (step === state.totalSteps) ? 'Sonuçları Gör' : 'Devam Et';
}

function updateProgress(step) {
  const pct = ((step - 1) / state.totalSteps) * 100;
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('progressLabel').textContent = `${step}/${state.totalSteps}`;
}

function selectChoice(questionId, value, btnEl) {
  const grid = btnEl.closest('.choice-grid') || btnEl.parentElement;
  grid.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  document.getElementById(`${questionId}-input`).value = value;
  state.answers[questionId] = value;
  document.getElementById('validationMsg').textContent = '';
}

function nextQuestion() {
  const step    = state.currentStep;
  const inputEl = document.getElementById(`q${step}-input`);
  let   value;

  if (inputEl.type === 'hidden') {
    value = parseFloat(inputEl.value);
    if (isNaN(value)) {
      showValidationError('Lütfen bir seçenek seçin.');
      return;
    }
  } else {
    value = parseFloat(inputEl.value);
    if (inputEl.value.trim() === '' || isNaN(value) || value < 0) {
      showValidationError('Lütfen geçerli bir değer girin.');
      return;
    }
  }

  state.answers[`q${step}`] = value;
  document.getElementById('validationMsg').textContent = '';
  goToStep(step + 1);
}

function showValidationError(msg) {
  const el = document.getElementById('validationMsg');
  el.textContent = msg;
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = '';
    el.style.color = '#f87171';
  });
}

// ─── Score calculation ─────────────────────────
/*
  Scoring model (each 0–10, weighted average):
  q1 – Phone screen time   (weight 2)
  q2 – PC screen time      (weight 1.5)
  q3 – Pre-sleep phone     (weight 1.5)
  q4 – Social media        (weight 2)
  q5 – Notifications       (weight 1)  [pre-scored 1/4/5/7]
  q6 – Sleep duration      (weight 2)
  q7 – Tech-free breaks    (weight 2)  [pre-scored 1/4/7/9]
  q8 – Digital detox       (weight 1)  [pre-scored 1/4/7/10]
*/
const SCORING = {
  q1: { // phone hours (lower = better)
    fn: (v) => clamp(10 - (v / 8) * 10, 0, 10),
    label: 'Telefon Ekran Süresi',
    icon: '📱',
  },
  q2: { // PC hours (lower = better, but work hours tolerated)
    fn: (v) => clamp(10 - (Math.max(v - 4, 0) / 6) * 10, 0, 10),
    label: 'Bilgisayar Süresi',
    icon: '💻',
  },
  q3: { // pre-sleep minutes (lower = better)
    fn: (v) => clamp(10 - (v / 120) * 10, 0, 10),
    label: 'Uyku Öncesi Ekran',
    icon: '🌙',
  },
  q4: { // social media hours (lower = better)
    fn: (v) => clamp(10 - (v / 5) * 10, 0, 10),
    label: 'Sosyal Medya',
    icon: '📲',
  },
  q5: { // notifications – pre-scored
    fn: (v) => v,
    label: 'Bildirim Yükü',
    icon: '🔔',
  },
  q6: { // sleep hours (7-9 ideal)
    fn: (v) => {
      if (v >= 7 && v <= 9) return 10;
      if (v >= 6 && v < 7)  return 7;
      if (v > 9 && v <= 10) return 8;
      if (v >= 5 && v < 6)  return 4;
      if (v > 10)            return 5;
      return clamp((v / 5) * 3, 0, 10);
    },
    label: 'Uyku Kalitesi',
    icon: '💤',
  },
  q7: { // tech-free breaks – pre-scored
    fn: (v) => v,
    label: 'Dijital Mola',
    icon: '🚶',
  },
  q8: { // digital detox – pre-scored
    fn: (v) => v,
    label: 'Dijital Detoks',
    icon: '🧘',
  },
};

const WEIGHTS = { q1: 2, q2: 1.5, q3: 1.5, q4: 2, q5: 1, q6: 2, q7: 2, q8: 1 };

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function calculateScore() {
  let totalWeight = 0;
  let totalScore  = 0;
  const breakdown = {};

  Object.keys(SCORING).forEach(key => {
    const raw   = state.answers[key] ?? 0;
    const score = parseFloat(SCORING[key].fn(raw).toFixed(1));
    const w     = WEIGHTS[key];
    totalScore  += score * w;
    totalWeight += w;
    breakdown[key] = { score, label: SCORING[key].label, icon: SCORING[key].icon };
  });

  const overall = parseFloat((totalScore / totalWeight).toFixed(1));
  return { overall, breakdown };
}

// ─── Tips engine ───────────────────────────────
function generateTips(breakdown, answers) {
  const tips = [];

  if (breakdown.q1.score < 6) {
    tips.push({ icon: '📱', text: 'Telefon ekran sürenizi azaltmak için gün içinde "odak modu" kullanın ve bildirimleri gruplandırın.' });
  }
  if (answers.q3 > 30) {
    tips.push({ icon: '🌙', text: 'Yatmadan en az 1 saat önce telefonu bırakın. Uyku kalitesi %27 artabilir.' });
  }
  if (breakdown.q4.score < 6) {
    tips.push({ icon: '📲', text: 'Sosyal medya uygulamalarına günlük süre sınırı koyun (örn. 45 dk). Cihaz ayarlarından kolayca yapabilirsiniz.' });
  }
  if (breakdown.q5.score < 5) {
    tips.push({ icon: '🔕', text: 'Gereksiz bildirimleri kapatın. Bildirimlerin %80\'i acil değildir; toplu kontrol saatleri belirleyin.' });
  }
  if (breakdown.q6.score < 7) {
    tips.push({ icon: '💤', text: 'Düzenli uyku saatleri belirleyin. 7–9 saatlik uyku bilişsel performansı ve dijital direnci artırır.' });
  }
  if (breakdown.q7.score < 6) {
    tips.push({ icon: '🌿', text: 'Gün içinde 20 dakikalık "dijital detoks molası" verin. Telefonsuz yürüyüş bile stres kortizolünü düşürür.' });
  }
  if (breakdown.q8.score < 7) {
    tips.push({ icon: '🧘', text: 'Hafta sonlarında en az yarım gün sosyal mediadan uzak kalmayı deneyin. Başlamak için ufak adımlar yeterli.' });
  }
  if (breakdown.q2.score < 5) {
    tips.push({ icon: '👁️', text: '20-20-20 kuralı uygulayın: Her 20 dakikada bir 20 saniye boyunca 20 feet (6m) uzağa bakın. Göz yorgunluğunu azaltır.' });
  }

  // Always add at least 2 positive tips if score is high
  if (tips.length === 0) {
    tips.push({ icon: '🏆', text: 'Harika! Dijital alışkanlıklarınız çok sağlıklı. Bunu sürdürün ve çevrenize örnek olun.' });
    tips.push({ icon: '✨', text: 'Dijital dengenizi korumak için günlük rutininize kısa meditasyon veya doğa yürüyüşleri ekleyin.' });
  }

  return tips.slice(0, 4);
}

// ─── Result screen ─────────────────────────────
function calculateAndShowResult() {
  const { overall, breakdown } = calculateScore();
  showScreen('result');

  // Animate score ring
  setTimeout(() => animateResult(overall, breakdown), 200);
}

function animateResult(score, breakdown) {
  // Score number count-up
  const numberEl = document.getElementById('scoreNumber');
  const duration = 1500;
  const start    = performance.now();

  function countUp(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    numberEl.textContent = (eased * score).toFixed(1);
    if (progress < 1) requestAnimationFrame(countUp);
    else numberEl.textContent = score.toFixed(1);
  }
  requestAnimationFrame(countUp);

  // Ring stroke
  const circumference = 502.65; // 2*pi*80
  const offset = circumference - (score / 10) * circumference;
  setTimeout(() => {
    document.getElementById('ringFill').style.strokeDashoffset = offset;
  }, 100);

  // Score label & color
  let riskClass, riskText, labelText, ringColor;
  if (score >= 7.5) {
    riskClass = 'risk-low';
    riskText  = '🟢 Düşük Risk — Dijital Yaşamınız Sağlıklı';
    labelText = 'Sağlıklı';
    ringColor = '#34d399';
  } else if (score >= 5) {
    riskClass = 'risk-medium';
    riskText  = '🟡 Orta Risk — İyileştirme Alanları Var';
    labelText = 'Orta Sağlıklı';
    ringColor = '#fbbf24';
  } else {
    riskClass = 'risk-high';
    riskText  = '🔴 Yüksek Risk — Dikkat Edilmesi Gerekiyor';
    labelText = 'Riskli';
    ringColor = '#f87171';
  }

  document.getElementById('scoreLabelText').textContent = labelText;

  const badge = document.getElementById('riskBadge');
  badge.textContent = riskText;
  badge.className   = `risk-badge ${riskClass}`;

  // Update ring color
  document.getElementById('ringFill').style.stroke = ringColor;

  // Breakdown bars
  const grid = document.getElementById('breakdownGrid');
  grid.innerHTML = '';

  Object.values(breakdown).forEach(({ score: s, label, icon }) => {
    const pct = (s / 10) * 100;
    let barColor = '#34d399';
    if (s < 7.5) barColor = '#fbbf24';
    if (s < 5)   barColor = '#f87171';

    const item = document.createElement('div');
    item.className = 'bd-item';
    item.innerHTML = `
      <span class="bd-icon">${icon}</span>
      <div class="bd-info">
        <div class="bd-label">
          <span>${label}</span>
          <span>${s.toFixed(1)}/10</span>
        </div>
        <div class="bd-bar-wrap">
          <div class="bd-bar" style="background:${barColor}; width:0%;" data-pct="${pct}"></div>
        </div>
      </div>`;
    grid.appendChild(item);
  });

  // Animate bars after a short delay
  setTimeout(() => {
    grid.querySelectorAll('.bd-bar').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 400);

  // Tips
  const tipsList = document.getElementById('tipsList');
  tipsList.innerHTML = '';
  const tips = generateTips(breakdown, state.answers);
  tips.forEach(({ icon, text }) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="tip-icon">${icon}</span><span>${text}</span>`;
    tipsList.appendChild(li);
  });

  // Confetti if high score
  if (score >= 7.5) {
    launchConfetti();
  }
}

// ─── Confetti ──────────────────────────────────
function launchConfetti() {
  const colors = ['#4f9cf9', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: -10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${Math.random() * 2 + 2}s;
        animation-delay: 0s;
        transform: rotate(${Math.random() * 360}deg);
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }, i * 40);
  }
}

// ─── Share ─────────────────────────────────────
function shareResult() {
  const { overall } = calculateScore();
  const text = `Dijital Yaşam Risk Değerlendirmemi tamamladım! 🌐\n\nPuanım: ${overall.toFixed(1)}/10\n\nSen de dene!`;

  if (navigator.share) {
    navigator.share({ title: 'Dijital Yaşam Puanım', text, url: window.location.href })
      .catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('shareBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>✅ Kopyalandı!</span>';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  });
}

// ─── Restart ───────────────────────────────────
function restart() {
  state.currentStep = 0;
  state.answers = {};

  // Clear all inputs
  document.querySelectorAll('.q-input').forEach(el => { el.value = ''; });
  document.querySelectorAll('input[type="hidden"]').forEach(el => { el.value = ''; });
  document.querySelectorAll('.choice-btn').forEach(el => el.classList.remove('selected'));
  document.getElementById('validationMsg').textContent = '';

  showScreen('intro');
}

// ─── Enter key support ─────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.currentStep > 0 && state.currentStep <= state.totalSteps) {
    nextQuestion();
  }
});

// ─── Init ──────────────────────────────────────
showScreen('intro');
