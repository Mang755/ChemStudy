const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const progressState = {};
const YES_NO_VALUES = {
  yes: "\u0418\u04d9",
  no: "\u0416\u043e\u049b"
};

function clearLessonState(lessonId) {
  Object.keys(progressState).forEach((key) => {
    if (key.startsWith(`${lessonId}:`)) {
      delete progressState[key];
    }
  });

  const lessonData = (window.lessonContent || {})[lessonId];

  if (lessonData) {
    renderLessonPage(lessonId, lessonData);
  }
}

function showPage(pageId) {
  if ((window.lessonContent || {})[pageId]) {
    clearLessonState(pageId);
  }

  document.querySelectorAll(".page").forEach((page) => {
    page.style.display = "none";
  });

  const activePage = document.getElementById(pageId);

  if (!activePage) {
    return;
  }

  activePage.style.display = "block";

  window.dispatchEvent(
    new CustomEvent("chemstudy:pagechange", {
      detail: { pageId }
    })
  );

  if (pageId === "profile" && typeof window.renderTeacherProfile === "function") {
    window.renderTeacherProfile();
  }

  window.scrollTo(0, 0);
}

function saveProgressValue(key, value) {
  progressState[key] = value;
}

function getProgressValue(key) {
  return progressState[key];
}

function clearResult(target) {
  if (target) {
    target.querySelectorAll(".answer-feedback").forEach((item) => item.remove());
  }
}

function clearSummary(container) {
  const summary = container?.querySelector("[data-check-summary]");

  if (summary) {
    summary.textContent = "";
  }
}

function clearLessonProgress(lessonId) {
  clearLessonState(lessonId);
}

function getMatchingOptions(matching) {
  return [...matching]
    .map((item) => item.right)
    .sort((a, b) => a.localeCompare(b, "kk"));
}

function getMatchingAnswers(matching) {
  const options = getMatchingOptions(matching);

  return matching.map((item) => LETTERS[options.indexOf(item.right)]);
}

function setFeedback(target, ok, message) {
  if (!target) {
    return;
  }

  clearResult(target);
  const feedback = document.createElement("div");

  feedback.className = `answer-feedback ${ok ? "correct" : "incorrect"}`;
  feedback.textContent = message;
  target.appendChild(feedback);
}

function getTestAnswerLabel(test, answer) {
  const optionIndex = LETTERS.indexOf(answer);

  if (optionIndex === -1 || !test?.options?.[optionIndex]) {
    return answer;
  }

  return `${answer}. ${test.options[optionIndex]}`;
}

function getMatchingAnswerLabel(matching, answer) {
  const optionIndex = LETTERS.indexOf(answer);
  const options = getMatchingOptions(matching);

  if (optionIndex === -1 || !options[optionIndex]) {
    return answer;
  }

  return `${answer}. ${options[optionIndex]}`;
}

function updateChecklistFeedback(card, input) {
  if (!card || !input) {
    return;
  }

  if (input.checked) {
    setFeedback(card, true, "Белгіленді");
    return;
  }

  clearResult(card);
}

function renderYesNo(lessonId, items) {
  return items
    .map(
      (item, index) => `
        <li class="interactive-item">
          <div class="item-text">${item}</div>
          <div class="choice-row">
            <label class="choice-pill">
              <input type="radio" name="${lessonId}-yesno-${index}" data-progress-key="${lessonId}:yesno:${index}" value="${YES_NO_VALUES.yes}">
              <span>${YES_NO_VALUES.yes}</span>
            </label>
            <label class="choice-pill">
              <input type="radio" name="${lessonId}-yesno-${index}" data-progress-key="${lessonId}:yesno:${index}" value="${YES_NO_VALUES.no}">
              <span>${YES_NO_VALUES.no}</span>
            </label>
          </div>
        </li>
      `
    )
    .join("");
}

function renderMatching(lessonId, matching) {
  const options = getMatchingOptions(matching);

  return `
    <div class="matching-grid interactive-matching">
      <div class="match-column">
        <h4>Ұғымдар</h4>
        <ol class="task-list matching-task-list">
          ${matching
            .map(
              (item, index) => `
                <li class="match-input-row">
                  <span class="item-text">${item.left}</span>
                  <select class="match-select" data-progress-key="${lessonId}:matching:${index}">
                    <option value="">Таңдаңыз</option>
                    ${options
                      .map(
                        (option, optionIndex) => `
                          <option value="${LETTERS[optionIndex]}">${LETTERS[optionIndex]}. ${option}</option>
                        `
                      )
                      .join("")}
                  </select>
                </li>
              `
            )
            .join("")}
        </ol>
      </div>
      <div class="match-column">
        <h4>Сипаттамалар</h4>
        <ol class="task-list matching-list">
          ${options
            .map(
              (item, index) => `
                <li><span class="match-letter">${LETTERS[index]}.</span> ${item}</li>
              `
            )
            .join("")}
        </ol>
      </div>
    </div>
  `;
}
function renderTests(lessonId, tests) {
  return tests
    .map(
      (test, index) => `
        <article class="test-card">
          <h4>${index + 1}. ${test.question}</h4>
          <div class="option-grid">
            ${test.options
              .map(
                (option, optionIndex) => `
                  <label class="option-pill">
                    <input type="radio" name="${lessonId}-test-${index}" data-progress-key="${lessonId}:test:${index}" value="${LETTERS[optionIndex]}">
                    <span>${LETTERS[optionIndex]}. ${option}</span>
                  </label>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderExtraLinks(links) {
  if (!links?.length) {
    return "";
  }

  return `
    <section class="lesson-section">
      <div class="section-top">
        <h3>Тақырып материалдары</h3>
        <span class="task-badge">Файлдар</span>
      </div>
      <div class="topic-list">
        ${links
          .map(
            (link) => `
              <a class="topic-item" href="${link.href}" target="_blank" rel="noopener noreferrer">${link.label}</a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
function renderChecklist(items, lessonId, prefix) {
  return items
    .map(
      (item, index) => `
        <li class="interactive-item">
          <label class="check-row">
            <input type="checkbox" data-progress-key="${lessonId}:${prefix}:${index}">
            <span>${item}</span>
          </label>
        </li>
      `
    )
    .join("");
}

function renderGroups(lessonId, groups) {
  return groups
    .map(
      (group, index) => `
        <article class="group-card">
          <div class="group-header">
            <h4>${group.name}</h4>
            <label class="mini-check">
              <input type="checkbox" data-progress-key="${lessonId}:group:${index}">
              <span>Белгілеу</span>
            </label>
          </div>
          <p>${group.task}</p>
        </article>
      `
    )
    .join("");
}
function normalizeYesNoAnswer(answer) {
  const value = String(answer || "").trim();

  if (["??", YES_NO_VALUES.yes, "Yes", "yes", "true"].includes(value)) {
    return YES_NO_VALUES.yes;
  }

  if (["???", YES_NO_VALUES.no, "No", "no", "false"].includes(value)) {
    return YES_NO_VALUES.no;
  }

  return value;
}

function renderYesNo(lessonId, items) {
  return items
    .map(
      (item, index) => `
        <li class="interactive-item">
          <div class="item-text">${item}</div>
          <div class="choice-row">
            <label class="choice-pill">
              <input type="radio" name="${lessonId}-yesno-${index}" data-progress-key="${lessonId}:yesno:${index}" value="${YES_NO_VALUES.yes}">
              <span>${YES_NO_VALUES.yes}</span>
            </label>
            <label class="choice-pill">
              <input type="radio" name="${lessonId}-yesno-${index}" data-progress-key="${lessonId}:yesno:${index}" value="${YES_NO_VALUES.no}">
              <span>${YES_NO_VALUES.no}</span>
            </label>
          </div>
        </li>
      `
    )
    .join("");
}

function restoreProgress(container) {
  container.querySelectorAll("[data-progress-key]").forEach((input) => {
    const savedValue = getProgressValue(input.dataset.progressKey);

    if (savedValue === undefined) {
      return;
    }

    if (input.type === "radio") {
      input.checked = input.value === savedValue;
      return;
    }

    if (input.type === "checkbox") {
      input.checked = Boolean(savedValue);
      return;
    }

    input.value = savedValue;
  });
}

function bindProgress(container) {
  container.querySelectorAll("[data-progress-key]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.progressKey;
      const lessonId = container.dataset.lessonId;
      const card =
        input.closest(".interactive-item") ||
        input.closest(".test-card") ||
        input.closest(".match-input-row");

      if (input.type === "radio") {
        if (input.checked) {
          saveProgressValue(key, input.value);
        }
      } else if (input.type === "checkbox") {
        saveProgressValue(key, input.checked);
      } else {
        saveProgressValue(key, input.value);
      }

      clearSummary(container);
      if (key.includes(":problem:") || key.includes(":group:")) {
        updateChecklistFeedback(card, input);
      } else {
        clearResult(card);
      }

      if (lessonId) {
        checkLessonAnswers(lessonId, true);
      }
    });
  });
}

function checkLessonAnswers(lessonId, liveMode = false) {
  const data = (window.lessonContent || {})[lessonId];
  const container = document.querySelector(`[data-lesson-id="${lessonId}"]`);

  if (!data?.answers || !container) {
    return;
  }

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  data.answers.yesNo.forEach((answer, index) => {
    const normalizedAnswer = normalizeYesNoAnswer(answer);
    const item = container
      .querySelector(`input[name="${lessonId}-yesno-${index}"]`)
      ?.closest(".interactive-item");
    const selected = container.querySelector(`input[name="${lessonId}-yesno-${index}"]:checked`);
    const value = selected?.value;

    if (!value) {
      unansweredCount += 1;
      if (!liveMode) {
        setFeedback(item, false, `Жауап таңдалмаған. Дұрыс жауап: ${normalizedAnswer}`);
      } else {
        clearResult(item);
      }
      return;
    }

    if (value === normalizedAnswer) {
      correctCount += 1;
      setFeedback(item, true, `Дұрыс. Жауабы: ${normalizedAnswer}`);
      return;
    }

    incorrectCount += 1;
    setFeedback(item, false, `Қате. Дұрыс жауап: ${normalizedAnswer}`);
  });

  getMatchingAnswers(data.matching).forEach((answer, index) => {
    const select = container.querySelector(`select[data-progress-key="${lessonId}:matching:${index}"]`);
    const item = select?.closest(".match-input-row");
    const value = select?.value;

    if (!value) {
      unansweredCount += 1;
      if (!liveMode) {
        setFeedback(item, false, `Жауап таңдалмаған. Дұрыс жауап: ${getMatchingAnswerLabel(data.matching, answer)}`);
      } else {
        clearResult(item);
      }
      return;
    }

    if (value === answer) {
      correctCount += 1;
      setFeedback(item, true, `Дұрыс. Жауабы: ${getMatchingAnswerLabel(data.matching, answer)}`);
      return;
    }

    incorrectCount += 1;
    setFeedback(item, false, `Қате. Дұрыс жауап: ${getMatchingAnswerLabel(data.matching, answer)}`);
  });

  data.answers.tests.forEach((answer, index) => {
    const item = container
      .querySelector(`input[name="${lessonId}-test-${index}"]`)
      ?.closest(".test-card");
    const selected = container.querySelector(`input[name="${lessonId}-test-${index}"]:checked`);
    const value = selected?.value;

    if (!value) {
      unansweredCount += 1;
      if (!liveMode) {
        setFeedback(item, false, `Жауап таңдалмаған. Дұрыс жауап: ${getTestAnswerLabel(data.tests[index], answer)}`);
      } else {
        clearResult(item);
      }
      return;
    }

    if (value === answer) {
      correctCount += 1;
      setFeedback(item, true, `Дұрыс. Жауабы: ${getTestAnswerLabel(data.tests[index], answer)}`);
      return;
    }

    incorrectCount += 1;
    setFeedback(item, false, `Қате. Дұрыс жауап: ${getTestAnswerLabel(data.tests[index], answer)}`);
  });

  const summary = container.querySelector("[data-check-summary]");

  if (summary) {
    summary.textContent = `Дұрыс: ${correctCount} | Қате: ${incorrectCount} | Жауап берілмеген: ${unansweredCount}`;
  }
}
function renderLessonPage(lessonId, data) {
  const container = document.querySelector(`[data-lesson-id="${lessonId}"]`);

  if (!container) {
    return;
  }

  if (!data) {
    container.innerHTML = `
      <div class="card">
        <p>Бұл бөлімге материал әлі енгізілмеген.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="lesson-hero">
      <h2>${data.title}</h2>
      <p>${data.intro}</p>
      <div class="lesson-note">
        Жауапты таңдаған сәтте нәтиже бірден көрінеді. Бұл бөлім сабақтағы бекіту жұмысын жүйелеуге көмектеседі.
      </div>
    </div>

    ${renderExtraLinks(data.extraLinks)}

    <section class="lesson-section">
      <div class="section-top">
        <h3>Иә/Жоқ тапсырмалары</h3>
        <span class="task-badge">Бір дұрыс жауап</span>
      </div>
      <p class="section-hint">Берілген пікірдің дұрыс немесе қате екенін белгілеңіз.</p>
      <ol class="task-list interactive-list">
        ${renderYesNo(lessonId, data.yesNo)}
      </ol>
    </section>

    <section class="lesson-section">
      <div class="section-top">
        <h3>Сәйкестендіру</h3>
        <span class="task-badge">Жұп құру</span>
      </div>
      <p class="section-hint">Екі бағандағы ұғымдар мен сипаттамаларды дұрыс байланыстырыңыз.</p>
      ${renderMatching(lessonId, data.matching)}
    </section>

    <section class="lesson-section">
      <div class="section-top">
        <h3>10 тест тапсырмасы</h3>
        <span class="task-badge">Көп нұсқалы</span>
      </div>
      <div class="test-list">
        ${renderTests(lessonId, data.tests)}
      </div>
    </section>

    <section class="lesson-section">
      <div class="section-top">
        <h3>Қысқаша тапсырмалар мен есептер</h3>
        <span class="task-badge">Белгілеу парағы</span>
      </div>
      <ol class="task-list interactive-list">
        ${renderChecklist(data.problems, lessonId, "problem")}
      </ol>
    </section>

    <section class="lesson-section">
      <div class="section-top">
        <h3>Топтық жұмыс</h3>
        <span class="task-badge">Үш бағыттағы тапсырма</span>
      </div>
      <p class="section-hint">Әр топ өз бағыты бойынша тапсырманы орындап, нәтижесін сыныппен бөлісе алады.</p>
      <div class="group-grid">
        ${renderGroups(lessonId, data.groups)}
      </div>
    </section>

    <div class="lesson-footer">
      <button class="check-button" onclick="checkLessonAnswers('${lessonId}')">Жалпы тексеру</button>
      <button class="back-button" onclick="showPage('${data.backTarget}')">${data.backLabel}</button>
      <button class="secondary-button" onclick="clearLessonProgress('${lessonId}')">Белгілерді тазарту</button>
      <div class="check-summary" data-check-summary></div>
    </div>
  `;

  restoreProgress(container);
  bindProgress(container);
}
const GRADE10_SECOND_PART_TOPICS = {
  topic9: {
    title: "IX тарау. Аналитикалық әдістер",
    lessons: ["lesson52", "lesson53", "lab9"]
  },
  topic10: {
    title: "X тарау. 17-топ элементтері",
    lessons: ["lesson54", "lesson55", "lesson56", "practice10"]
  },
  topic11: {
    title: "XI тарау. 2(II) топ элементтері",
    lessons: ["lesson57", "lesson58", "lesson59", "lab11", "practice11"]
  },
  topic12: {
    title: "XII тарау. Органикалық химияға кіріспе",
    lessons: ["lesson60", "lesson61", "lesson62", "lesson63", "lesson64", "lesson65", "lesson66", "lesson67", "lesson68", "lesson69", "lab12"]
  },
  topic13: {
    title: "XIII тарау. Қанықпаған көмірсутектер",
    lessons: ["lesson70", "lesson71", "lesson72", "lesson73", "lesson74", "lesson75", "lesson76", "lesson77", "lesson78", "lesson79", "lesson80", "lesson81", "lesson82", "lab13"]
  },
  topic14: {
    title: "XIV тарау. Галогеналкандар",
    lessons: ["lesson83", "lesson84", "lesson85"]
  },
  topic15: {
    title: "XV тарау. Спирттер",
    lessons: ["lesson86", "lesson87", "lesson88", "lab15", "lesson89", "lesson90"]
  }
};

Object.entries(window.ChemStudyTopicTitleOverrides || {}).forEach(([topicId, title]) => {
  if (GRADE10_SECOND_PART_TOPICS[topicId]) {
    GRADE10_SECOND_PART_TOPICS[topicId].title = title;
  }
});

Object.entries(window.ChemStudyTopicLessonOrder || {}).forEach(([topicId, lessons]) => {
  if (GRADE10_SECOND_PART_TOPICS[topicId]) {
    GRADE10_SECOND_PART_TOPICS[topicId].lessons = lessons;
  }
});

function dedupeTopicSections() {
  ["topic12"].forEach((id) => {
    const nodes = [...document.querySelectorAll(`[id="${id}"]`)];
    if (nodes.length > 1) {
      nodes.slice(0, -1).forEach((node) => node.remove());
    }
  });
}

function syncGrade10TopicMenu() {
  Object.entries(window.ChemStudyTopicTitleOverrides || {}).forEach(([topicId, title]) => {
    const item = document.querySelector(`#grade10 .topic-item[onclick="showPage('${topicId}')"]`);

    if (item) {
      item.textContent = title;
    }
  });
}

function ensureLessonPageContainers() {
  const host = document.querySelector("main.container");

  if (!host) {
    return;
  }

  Object.keys(window.lessonContent || {}).forEach((lessonId) => {
    if (document.querySelector(`[data-lesson-id="${lessonId}"]`)) {
      return;
    }

    const section = document.createElement("section");
    section.id = lessonId;
    section.className = "page lesson-page";
    section.style.display = "none";
    section.setAttribute("data-lesson-id", lessonId);
    host.appendChild(section);
  });
}

function renderSecondPartTopicPage(topicId, config) {
  const container = document.getElementById(topicId);

  if (!container) {
    return;
  }

  const lessonLinks = config.lessons
    .map((lessonId) => {
      const lesson = (window.lessonContent || {})[lessonId];
      if (!lesson) {
        return "";
      }

      return `<div class="topic-item" onclick="showPage('${lessonId}')">${lesson.title}</div>`;
    })
    .filter(Boolean)
    .join("");

  container.innerHTML = `
    <h2>${config.title}</h2>
    <div class="card">
      <p>Бұл бөлімде сабақтар, зертханалық жұмыстар, тесттер және топтық тапсырмалар бір жерге жинақталады.</p>
      <div class="topic-list">
        ${lessonLinks || '<div class="topic-item">Бұл бөлімге әлі сабақ материалдары жүктелмеген.</div>'}
      </div>
      <br>
      <button class="back-button" onclick="showPage('grade10')">10-сыныпқа оралу</button>
    </div>
  `;
}

function renderSecondPartTopicPages() {
  Object.entries(GRADE10_SECOND_PART_TOPICS).forEach(([topicId, config]) => {
    renderSecondPartTopicPage(topicId, config);
  });
}

function renderLessonPages() {
  Object.entries(window.lessonContent || {}).forEach(([lessonId, data]) => {
    renderLessonPage(lessonId, data);
  });
}

dedupeTopicSections();
syncGrade10TopicMenu();
ensureLessonPageContainers();
renderSecondPartTopicPages();
renderLessonPages();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("sw.js?v=20260415-6", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}

