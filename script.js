// Change this to your Render backend URL before deploying to Vercel.
const API_URL = "http://127.0.0.1:8000";

const REQUEST_TIMEOUT_MS = 60000; // Render free tier can take ~50s to wake up
const SLOW_HINT_MS = 6000;

// Validation rules. Field names match the FastAPI model exactly.
const NUMERIC_RULES = {
  age: { label: "Age", min: 10, max: 100, integer: true },
  avg_daily_usage_hours: { label: "Daily usage hours", min: 0, max: 24 },
  daily_unlocks: { label: "Daily unlocks", min: 0, integer: true },
  study_hours: { label: "Study hours", min: 0, max: 24 },
  physical_activity_hours: { label: "Physical activity hours", min: 0, max: 24 },
  sleep_hours_per_night: { label: "Sleep hours", min: 0, max: 24 },
};

const CHOICES = {
  gender: ["Male", "Female"],
  country: ["India", "USA", "UK", "Canada", "Australia", "Germany", "France", "Mexico", "Turkey", "Other"],
  academic_level: ["Undergraduate", "Graduate", "High School"],
  most_used_platform: ["Facebook", "LinkedIn", "Instagram", "Snapchat", "Twitter", "YouTube", "TikTok", "LINE", "KakaoTalk", "VKontakte", "WhatsApp", "WeChat"],
  purpose_of_use: ["Networking", "Education", "Entertainment", "News"],
  stress_level: ["Low", "Medium", "High", "Very High"],
};

const form = document.getElementById("predictForm");
const submitBtn = document.getElementById("submitBtn");
const btnLabel = document.getElementById("btnLabel");
const errorBox = document.getElementById("errorBox");
const formCard = document.getElementById("formCard");
const resultCard = document.getElementById("resultCard");
const scoreValue = document.getElementById("scoreValue");

function setFieldError(name, message) {
  const el = form.elements[name];
  const holder = el.closest(".field");
  holder.classList.toggle("invalid", Boolean(message));
  holder.querySelector(".err").textContent = message || "";
  el.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateForm() {
  let firstInvalid = null;
  const fail = (name, msg) => { setFieldError(name, msg); firstInvalid = firstInvalid || form.elements[name]; };

  for (const [name, rule] of Object.entries(NUMERIC_RULES)) {
    const raw = form.elements[name].value.trim();
    const value = Number(raw);
    const range = rule.max !== undefined ? `between ${rule.min} and ${rule.max}` : `${rule.min} or more`;
    if (raw === "" || Number.isNaN(value)) fail(name, `${rule.label} is required.`);
    else if (value < rule.min || (rule.max !== undefined && value > rule.max)) fail(name, `${rule.label} must be ${range}.`);
    else if (rule.integer && !Number.isInteger(value)) fail(name, `${rule.label} must be a whole number.`);
    else setFieldError(name, "");
  }
  for (const [name, allowed] of Object.entries(CHOICES)) {
    if (!allowed.includes(form.elements[name].value)) fail(name, "Please choose an option.");
    else setFieldError(name, "");
  }
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function collectFormData() {
  const f = form.elements;
  return {
    age: Number(f.age.value),
    gender: f.gender.value,
    country: f.country.value,
    academic_level: f.academic_level.value,
    most_used_platform: f.most_used_platform.value,
    purpose_of_use: f.purpose_of_use.value,
    avg_daily_usage_hours: Number(f.avg_daily_usage_hours.value),
    daily_unlocks: Number(f.daily_unlocks.value),
    study_hours: Number(f.study_hours.value),
    physical_activity_hours: Number(f.physical_activity_hours.value),
    sleep_hours_per_night: Number(f.sleep_hours_per_night.value),
    stress_level: f.stress_level.value,
  };
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function setLoadingState(isLoading, label) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("loading", isLoading);
  btnLabel.textContent = isLoading ? (label || "Analyzing...") : "Predict Mental Health Score";
}

async function predictMentalHealth(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(err.name === "AbortError"
      ? "The server took too long to respond. Please try again in a moment."
      : "Unable to connect to the prediction server. Please make sure the backend is running and try again.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 422) throw new Error("Some of your inputs were not accepted. Please check the values and try again.");
  if (response.status >= 500) throw new Error("The server hit a problem while making the prediction. Please try again later.");
  if (!response.ok) throw new Error("The request could not be completed. Please try again.");

  let data;
  try { data = await response.json(); } catch { data = null; }
  const score = data && Number(data.predicted_mental_health_score);
  if (data === null || data.predicted_mental_health_score === null || !Number.isFinite(score)) {
    throw new Error("The server sent an unexpected response. Please try again.");
  }
  return score;
}

function displayResult(score) {
  scoreValue.textContent = score.toFixed(2);
  formCard.hidden = true;
  resultCard.hidden = false;
  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  if (!validateForm()) return;

  setLoadingState(true);
  const slowTimer = setTimeout(() => setLoadingState(true, "Waking up the server..."), SLOW_HINT_MS);
  try {
    displayResult(await predictMentalHealth(collectFormData()));
  } catch (err) {
    showError(err.message);
  } finally {
    clearTimeout(slowTimer);
    setLoadingState(false);
  }
});

document.getElementById("againBtn").addEventListener("click", () => {
  resultCard.hidden = true;
  formCard.hidden = false;
  form.reset();
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Mobile navigation
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.addEventListener("click", () => { navLinks.classList.remove("open"); navToggle.setAttribute("aria-expanded", "false"); });
