const STORAGE_KEY = "jpNotesLearningStatsV1";
const state = { data: null, questions: [], answers: [], index: 0, score: 0, mode: "practice", answered: false, pendingValue: null };

function byId(id) { return document.getElementById(id); }

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTextList(values, className) {
  if (!Array.isArray(values) || values.length === 0) return "";
  return `<ul class="${className}">${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function selectedQuestions() {
  const month = byId("monthSelect").value;
  let pool = state.data.questions.filter((question) => month === "all" || question.month === month);
  if (byId("modeSelect").value === "exam" && state.data.policy.exam_requires_high_confidence) {
    pool = pool.filter((question) => question.source_confidence === "HIGH");
  }
  const requested = byId("countSelect").value;
  return requested === "Unlimited Practice" ? pool : pool.slice(0, Number(requested));
}

function displayMonth(month) {
  const parts = month.match(/^(\d{4})-(\d{2})$/);
  return parts ? `${parts[1]} 年 ${Number(parts[2])} 月` : month;
}

function renderLearningPoints() {
  const month = byId("monthSelect").value;
  const months = month === "all" ? Object.keys(state.data.learning_points) : [month];
  const items = months.flatMap((key) => state.data.learning_points[key] || []);
  const cards = items.map((item, index) => {
    const examples = (item.examples || []).map((example) => `<li><span class="japanese">${escapeHtml(example.ja)}</span><span class="example-translation">${escapeHtml(example.zh_hant)}</span></li>`).join("");
    const confidence = item.confidence || "UNKNOWN";
    const status = item.content_status === "AI_GUESSED" ? "AI 猜測，請對照原筆記" : "已確認";
    return `<details class="learning-point" ${index === 0 ? "open" : ""}>
      <summary><span class="point-number">${String(index + 1).padStart(2, "0")}</span><span class="point-title">${escapeHtml(item.title || item.summary || "未命名重點")}</span><span class="badge badge-${confidence.toLowerCase()}">${escapeHtml(status)} · ${escapeHtml(confidence)}</span><span class="summary-chevron" aria-hidden="true">＋</span></summary>
      <div class="point-content">
      ${item.why_in_notes ? `<p><strong>這個重點：</strong>${escapeHtml(item.why_in_notes)}</p>` : ""}
      ${item.when_to_use ? `<p><strong>甚麼時候用：</strong>${escapeHtml(item.when_to_use)}</p>` : ""}
      ${item.form ? `<p class="form-line"><strong>句型：</strong><code>${escapeHtml(item.form)}</code></p>` : ""}
      ${item.meaning_zh_hant ? `<p><strong>意思：</strong>${escapeHtml(item.meaning_zh_hant)}</p>` : ""}
      ${examples ? `<div class="example-block"><strong>例句</strong><ul class="examples">${examples}</ul></div>` : ""}
      ${renderTextList(item.contrast, "contrast") ? `<div class="detail-block"><strong>比較一下</strong>${renderTextList(item.contrast, "contrast")}</div>` : ""}
      ${renderTextList(item.common_mistakes, "mistakes") ? `<div class="detail-block"><strong>容易出錯的地方</strong>${renderTextList(item.common_mistakes, "mistakes")}</div>` : ""}
      ${renderTextList(item.exam_focus, "exam-focus") ? `<div class="detail-block"><strong>考試會測</strong>${renderTextList(item.exam_focus, "exam-focus")}</div>` : ""}
      </div>
    </details>`;
  }).join("");
  byId("learningTitle").innerHTML = month === "all" ? "學習重點<span class=\"heading-period\">・</span>全部月份" : `學習重點<span class="heading-period">・</span>${escapeHtml(displayMonth(month))}`;
  byId("learningIntro").textContent = items.length ? "每個重點都有例句和常見錯誤，讀完可以接著練習。" : "這個月份暫時沒有已核准的學習重點。";
  byId("learningCount").textContent = `${items.length} 個重點`;
  byId("learningPointsContent").innerHTML = items.length ? `<div class="learning-points">${cards}</div>` : `<div class="empty-state">換一個月份看看，或先用上方的練習設定開始複習。</div>`;
}

function setProgress() {
  const current = state.index + 1;
  const total = state.questions.length;
  byId("questionCounter").textContent = `第 ${current} 題，共 ${total} 題`;
  const percent = Math.round((state.index / total) * 100);
  byId("progressFill").style.width = `${percent}%`;
  byId("progressTrack")?.setAttribute("aria-valuenow", String(percent));
  document.querySelector(".progress-track")?.setAttribute("aria-valuenow", String(percent));
}

function renderQuestion() {
  const question = state.questions[state.index];
  if (!question) return finishQuiz();
  state.answered = false;
  state.pendingValue = null;
  const options = question.type === "mcq" ? question.choices : (question.type === "true_false" ? ["true", "false"] : null);
  const choices = options ? `<div class="choices" role="group" aria-label="答案選項">${options.map((choice) => {
    const label = choice === "true" ? "正確" : choice === "false" ? "錯誤" : choice;
    return `<button class="choice" type="button" data-answer="${escapeHtml(choice)}">${escapeHtml(label)}<span class="choice-indicator" aria-hidden="true"></span></button>`;
  }).join("")}</div>` : `<label class="answer-label" for="answerInput">你的答案</label><input class="answer-input" id="answerInput" autocomplete="off" placeholder="在這裡輸入答案" />`;
  const handwritingNote = question.source_confidence === "MEDIUM" ? '<p class="question-warning"><span aria-hidden="true">✳</span> 這題來自較模糊的手寫筆記，請對照原筆記。</p>' : "";
  const example = question.example_ja ? `<p class="question-example"><span>例句</span><span class="japanese">${escapeHtml(question.example_ja)}</span></p>` : "";
  byId("questionArea").innerHTML = `<p class="question-prompt">${escapeHtml(question.prompt)}</p>${example}${handwritingNote}${choices}<p id="feedback" class="feedback" aria-live="polite"></p>`;
  document.querySelectorAll(".choice").forEach((button) => button.addEventListener("click", () => selectChoice(button)));
  byId("nextButton").disabled = true;
  byId("nextButton").innerHTML = `提交答案 <span aria-hidden="true">→</span>`;
  byId("quizHint").textContent = options ? "選擇一個答案，再按提交。" : "輸入答案後，按提交看看結果。";
  setProgress();
}

function selectChoice(button) {
  if (state.answered) return;
  document.querySelectorAll(".choice").forEach((choice) => choice.classList.remove("selected"));
  button.classList.add("selected");
  state.pendingValue = button.dataset.answer;
  byId("nextButton").disabled = false;
}

function answer(value) {
  if (state.answered) return;
  state.answered = true;
  const question = state.questions[state.index];
  const correct = String(value).trim() === String(question.answer).trim();
  if (correct) state.score += 1;
  state.answers.push({ question, value, correct });
  const feedback = byId("feedback");
  if (state.mode === "practice") {
    feedback.className = `feedback ${correct ? "feedback-correct" : "feedback-wrong"}`;
    feedback.innerHTML = `<strong>${correct ? "答對了！" : `正確答案：${escapeHtml(question.answer)}`}</strong>${question.explanation_zh_hant ? `<span>${escapeHtml(question.explanation_zh_hant)}</span>` : ""}`;
  } else {
    feedback.className = "feedback feedback-recorded";
    feedback.textContent = "答案已記錄，完成測驗後一起查看結果。";
  }
  document.querySelectorAll(".choice").forEach((button) => { button.disabled = true; });
  byId("nextButton").innerHTML = state.index + 1 === state.questions.length ? `看結果 <span aria-hidden="true">→</span>` : `下一題 <span aria-hidden="true">→</span>`;
  byId("quizHint").textContent = state.index + 1 === state.questions.length ? "完成了！按一下查看這次的成果。" : "準備好了就繼續下一題。";
}

function readStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { sessions: 0, correct: 0 };
  } catch {
    return { sessions: 0, correct: 0 };
  }
}

function renderStats() {
  const stats = readStats();
  byId("sessionsCount").innerHTML = `${Number(stats.sessions) || 0} <small>次</small>`;
  byId("correctCount").innerHTML = `${Number(stats.correct) || 0} <small>題</small>`;
}

function saveStats() {
  const previous = readStats();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: (Number(previous.sessions) || 0) + 1, correct: (Number(previous.correct) || 0) + state.score }));
  } catch { /* 學習不依賴瀏覽器儲存功能。 */ }
  renderStats();
}

function finishQuiz() {
  byId("quiz").hidden = true;
  byId("result").hidden = false;
  byId("resultTitle").textContent = state.score === state.questions.length ? "全對！太棒了！" : "做得好，完成練習！";
  const percentage = Math.round((state.score / state.questions.length) * 100);
  const review = state.answers.map(({ question, value, correct }, index) => `<li class="review-item ${correct ? "review-correct" : "review-wrong"}"><span class="review-index">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(question.prompt)}</strong><p>你的答案：${escapeHtml(value || "（未作答）")} <span aria-hidden="true">·</span> ${correct ? "答對" : `正確答案：${escapeHtml(question.answer)}`}</p>${!correct && question.explanation_zh_hant ? `<small>${escapeHtml(question.explanation_zh_hant)}</small>` : ""}${question.source_confidence === "MEDIUM" ? `<small class="review-warning">這題含有未確認手寫內容，請對照原筆記。</small>` : ""}</div><span class="review-mark" aria-hidden="true">${correct ? "✓" : "↻"}</span></li>`).join("");
  byId("resultArea").innerHTML = `<div class="score-summary"><strong>${state.score}<span>/${state.questions.length}</span></strong><div><b>答對 ${percentage}%</b><small>${percentage >= 80 ? "掌握得很好，繼續保持！" : "看過錯題解說後，再試一次會更熟悉。"}</small></div></div><h3 class="review-heading">逐題回顧 <span>${state.questions.length} 題</span></h3><ol class="review-list">${review}</ol>`;
  saveStats();
  byId("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

function start() {
  state.questions = selectedQuestions();
  state.index = 0;
  state.score = 0;
  state.answers = [];
  state.mode = byId("modeSelect").value;
  byId("result").hidden = true;
  byId("quiz").hidden = true;
  if (!state.questions.length) {
    byId("resultTitle").textContent = "暫時沒有可練習的題目";
    byId("resultArea").innerHTML = "<p class=\"empty-state\">換一個月份或選擇練習模式，就能看到更多題目。</p>";
    byId("result").hidden = false;
    return;
  }
  byId("quizTitle").textContent = state.mode === "exam" ? "模擬測驗" : "來試試看";
  byId("quizModeLabel").textContent = state.mode === "exam" ? "測驗模式 · 完成後看答案" : "練習模式 · 即時解說";
  byId("quiz").hidden = false;
  renderQuestion();
  byId("quiz").scrollIntoView({ behavior: "smooth", block: "start" });
}

function advance() {
  if (!state.answered) {
    const input = byId("answerInput");
    const value = input ? input.value.trim() : state.pendingValue;
    if (!value) {
      if (input) { input.focus(); input.classList.add("input-error"); }
      return;
    }
    answer(value);
    return;
  }
  state.index += 1;
  renderQuestion();
}

byId("startButton").addEventListener("click", start);
byId("againButton").addEventListener("click", start);
byId("nextButton").addEventListener("click", advance);
byId("exitQuizButton").addEventListener("click", () => { byId("quiz").hidden = true; byId("studySetup").scrollIntoView({ behavior: "smooth", block: "center" }); });
byId("monthSelect").addEventListener("change", renderLearningPoints);
byId("questionArea").addEventListener("keydown", (event) => { if (event.key === "Enter" && event.target.id === "answerInput") advance(); });

window.initializeLearningSite = (data) => {
  state.data = data;
  data.months.forEach((month) => byId("monthSelect").insertAdjacentHTML("beforeend", `<option value="${escapeHtml(month)}">${escapeHtml(displayMonth(month))}</option>`));
  renderLearningPoints();
  renderStats();
};
