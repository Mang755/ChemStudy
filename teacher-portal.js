(() => {
  const ACCOUNTS_KEY = "chemstudy.teacher.accounts.v2";
  const SESSION_KEY = "chemstudy.teacher.session.v2";
  const DB_NAME = "chemstudy-teacher-files-v1";
  const DB_STORE = "resources";
  const DEFAULT_PROFILE = {
    name: "Химия пәні мұғалімі",
    school: "",
    email: ""
  };
  const TYPE_LABELS = {
    qmj: "ҚМЖ",
    presentation: "Слайд",
    resource: "Қосымша материал"
  };
  const GRADE_LABELS = {
    general: "Жалпы бөлім",
    grade7: "7-сынып",
    grade8: "8-сынып",
    grade9: "9-сынып",
    grade10: "10-сынып",
    grade11: "11-сынып"
  };
  const QUICK_LINKS = [
    { pageId: "teacher", label: "Сыныптар" },
    { pageId: "resources", label: "Ресурстар" },
    { pageId: "grade10", label: "10-сынып" }
  ];
  const BOOKLET_URL = "materials/booklet/kyzyrbek-mangaz-kitapsha.pdf";
  const KTJ_URL = "materials/ktj/grade10-zhmb-ktj.docx";

  let flashState = null;
  const objectUrls = new Map();

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function formatDate(value) {
    if (!value) {
      return "Жаңа";
    }

    try {
      return new Intl.DateTimeFormat("kk-KZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch (error) {
      return String(value);
    }
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function showPage(pageId) {
    if (typeof window.showPage === "function") {
      window.showPage(pageId);
    }
  }

  function isMobileDevice() {
    return /iphone|ipad|ipod|android/i.test(window.navigator.userAgent || "");
  }

  function setFlash(type, text) {
    flashState = { type, text };
  }

  function consumeFlash() {
    const current = flashState;
    flashState = null;
    return current;
  }

  function loadAccounts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function getSessionEmail() {
    return normalizeEmail(localStorage.getItem(SESSION_KEY));
  }

  function setSessionEmail(email) {
    const normalized = normalizeEmail(email);

    if (!normalized) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    localStorage.setItem(SESSION_KEY, normalized);
  }

  function sanitizeProfile(profile) {
    if (!profile) {
      return null;
    }

    return {
      id: profile.id || "",
      name: profile.name || DEFAULT_PROFILE.name,
      school: profile.school || "",
      email: profile.email || "",
      createdAt: profile.createdAt || new Date().toISOString()
    };
  }

  function getLocalProfile() {
    const email = getSessionEmail();

    if (!email) {
      return null;
    }

    const account = loadAccounts().find((item) => normalizeEmail(item.email) === email);
    return sanitizeProfile(account);
  }

  function registerLocal(input) {
    const email = normalizeEmail(input.email);
    const password = String(input.password || "");
    const accounts = loadAccounts();

    if (!email) {
      throw new Error("Email енгізіңіз.");
    }

    if (password.length < 4) {
      throw new Error("Құпиясөз кемі 4 таңбадан тұрсын.");
    }

    if (accounts.some((item) => normalizeEmail(item.email) === email)) {
      throw new Error("Бұл email бойынша мұғалім бұрын тіркелген.");
    }

    const account = {
      name: String(input.name || "").trim() || DEFAULT_PROFILE.name,
      school: String(input.school || "").trim(),
      email,
      password,
      createdAt: new Date().toISOString()
    };

    saveAccounts([...accounts, account]);
    setSessionEmail(email);
    return sanitizeProfile(account);
  }

  function loginLocal(input) {
    const email = normalizeEmail(input.email);
    const password = String(input.password || "");
    const account = loadAccounts().find((item) => normalizeEmail(item.email) === email);

    if (!account || account.password !== password) {
      throw new Error("Email немесе құпиясөз қате.");
    }

    setSessionEmail(email);
    return sanitizeProfile(account);
  }

  function saveLocalProfile(input) {
    const email = getSessionEmail();

    if (!email) {
      throw new Error("Алдымен кабинетке кіріңіз.");
    }

    const nextAccounts = loadAccounts().map((item) =>
      normalizeEmail(item.email) === email
        ? {
            ...item,
            name: String(input.name || "").trim() || DEFAULT_PROFILE.name,
            school: String(input.school || "").trim()
          }
        : item
    );

    saveAccounts(nextAccounts);
    return getLocalProfile();
  }

  function signOutLocal() {
    setSessionEmail("");
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(DB_STORE)) {
          const store = db.createObjectStore(DB_STORE, { keyPath: "id" });
          store.createIndex("ownerEmail", "ownerEmail", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Файл қоймасы ашылмады."));
    });
  }

  async function loadLocalResources(ownerEmail) {
    const email = normalizeEmail(ownerEmail);

    if (!email) {
      return [];
    }

    const db = await openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const request = tx.objectStore(DB_STORE).getAll();

      request.onsuccess = () => {
        const items = (request.result || [])
          .filter((item) => normalizeEmail(item.ownerEmail) === email)
          .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

        resolve(items);
      };

      request.onerror = () => reject(request.error || new Error("Материалдар жүктелмеді."));
    });
  }

  async function saveLocalResource(resource) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const request = tx.objectStore(DB_STORE).put(resource);

      request.onsuccess = () => resolve(resource);
      request.onerror = () => reject(request.error || new Error("Материал сақталмады."));
    });
  }

  async function deleteLocalResource(id) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const request = tx.objectStore(DB_STORE).delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Материал өшірілмеді."));
    });
  }

  async function createLocalResource(input, profile) {
    if (!profile?.email) {
      throw new Error("Алдымен кабинетке кіріңіз.");
    }

    if (!input.title) {
      throw new Error("Материал атауын енгізіңіз.");
    }

    if (!(input.file instanceof File && input.file.size) && !input.externalLink) {
      throw new Error("Файл таңдаңыз немесе сілтеме енгізіңіз.");
    }

    return saveLocalResource({
      id: uid("resource"),
      ownerEmail: normalizeEmail(profile.email),
      createdBy: profile.name || DEFAULT_PROFILE.name,
      createdAt: new Date().toISOString(),
      gradeId: input.gradeId || "general",
      targetId: input.gradeId || "general",
      type: input.type || "resource",
      title: input.title,
      description: input.description || "",
      externalLink: input.externalLink || "",
      fileName: input.file instanceof File ? input.file.name : "",
      mimeType: input.file instanceof File ? input.file.type || "" : "",
      blob: input.file instanceof File ? input.file : null
    });
  }

  function getResourceHref(resource) {
    if (!resource) {
      return "";
    }

    if (resource.externalLink) {
      return resource.externalLink;
    }

    if (resource.fileUrl) {
      return resource.fileUrl;
    }

    if (objectUrls.has(resource.id)) {
      return objectUrls.get(resource.id);
    }

    if (resource.blob instanceof Blob) {
      const url = URL.createObjectURL(resource.blob);
      objectUrls.set(resource.id, url);
      return url;
    }

    return "";
  }

  function releaseResourceUrl(id) {
    if (!objectUrls.has(id)) {
      return;
    }

    URL.revokeObjectURL(objectUrls.get(id));
    objectUrls.delete(id);
  }

  async function buildState() {
    const cloudConfigured = Boolean(window.ChemStudyCloud?.isConfigured?.());

    if (cloudConfigured) {
      const cloudState = await window.ChemStudyCloud.init();
      const profile = sanitizeProfile(cloudState.profile);
      const signedIn = Boolean(cloudState.signedIn && profile);
      const resources = signedIn
        ? (cloudState.resources || []).filter(
            (item) =>
              (profile.id && item.createdById === profile.id) ||
              (profile.email && normalizeEmail(item.createdByEmail) === normalizeEmail(profile.email))
          )
        : [];

      return {
        mode: "cloud",
        cloudConfigured: true,
        signedIn,
        profile,
        resources
      };
    }

    const profile = getLocalProfile();
    const resources = profile ? await loadLocalResources(profile.email) : [];

    return {
      mode: "local",
      cloudConfigured: false,
      signedIn: Boolean(profile),
      profile,
      resources
    };
  }

  function renderFlash(message) {
    if (!message) {
      return "";
    }

    const text = String(message.text || "");
    if (/supabase|local-first|локал|браузердің ішінде/i.test(text)) {
      return "";
    }

    return `<div class="teacher-flash ${escapeHtml(message.type || "info")}">${escapeHtml(text)}</div>`;
  }

  function countResources(resources, type) {
    return (resources || []).filter((item) => item.type === type).length;
  }

  function renderResourceCard(resource) {
    const href = getResourceHref(resource);
    const canDownload = Boolean(resource.fileUrl || resource.blob instanceof Blob);
    const openLabel = resource.type === "presentation" ? "Слайдты ашу" : "Материалды ашу";
    const downloadLabel = resource.type === "presentation" ? "Слайдты жүктеу" : "Файлды жүктеу";

    return `
      <article class="teacher-resource-card" data-resource-id="${escapeHtml(resource.id)}">
        <div class="teacher-resource-head">
          <div class="teacher-chip-row">
            <span class="teacher-resource-badge">${escapeHtml(TYPE_LABELS[resource.type] || "Материал")}</span>
            <span class="teacher-note-chip">${escapeHtml(GRADE_LABELS[resource.gradeId] || "Жалпы бөлім")}</span>
          </div>
          <span class="teacher-resource-date">${escapeHtml(formatDate(resource.createdAt))}</span>
        </div>
        <h4>${escapeHtml(resource.title)}</h4>
        <p class="teacher-resource-text">${escapeHtml(resource.description || "Қысқаша сипаттама енгізілмеген.")}</p>
        <div class="teacher-resource-meta">
          <span>${escapeHtml(resource.fileName || (resource.externalLink ? "Сілтеме материалы" : "Файл"))}</span>
          <span>${escapeHtml(resource.createdBy || DEFAULT_PROFILE.name)}</span>
        </div>
        <div class="teacher-actions">
          ${href ? `<a class="back-button" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(openLabel)}</a>` : ""}
          ${canDownload ? `<button class="secondary-button" type="button" data-resource-download="${escapeHtml(resource.id)}">${escapeHtml(downloadLabel)}</button>` : ""}
          <button class="secondary-button" type="button" data-resource-delete="${escapeHtml(resource.id)}">Өшіру</button>
        </div>
      </article>
    `;
  }

  function renderGuest(section, state, message) {
    const modeLabel = "Жеке кабинет";
    const modeText = "Материалдарыңызды сақтап, кейін қайта аша аласыз.";

    section.innerHTML = `
      <h2>Мұғалім профилі</h2>
      <p class="section-intro">Мұғалім тіркеліп, материалдарын осы кабинетте сақтай алады.</p>
      ${renderFlash(message)}
      <div class="teacher-portal-shell">
        <section class="teacher-hero-card">
          <div class="teacher-mode-row">
            <span class="teacher-mode-badge">${escapeHtml(modeLabel)}</span>
          </div>
          <h3>Жеке мұғалім кабинеті</h3>
          <p>${escapeHtml(modeText)}</p>
          <div class="teacher-actions">
            <a class="back-button" href="${escapeHtml(BOOKLET_URL)}" target="_blank" rel="noopener noreferrer">Кітапшаны ашу</a>
            <a class="secondary-button" href="${escapeHtml(KTJ_URL)}" target="_blank" rel="noopener noreferrer">10-сынып КТЖ</a>
          </div>
          <div class="teacher-summary-grid">
            <div class="teacher-stat-card"><strong>ҚМЖ</strong><span>Файл не сілтеме</span></div>
            <div class="teacher-stat-card"><strong>Слайд</strong><span>Презентация қосу</span></div>
            <div class="teacher-stat-card"><strong>Кітапша</strong><span>Бірден ашылады</span></div>
            <div class="teacher-stat-card"><strong>Профиль</strong><span>Жеке кабинет</span></div>
          </div>
        </section>

        <div class="teacher-auth-grid">
          <section class="card teacher-auth-card">
            <h3>Мұғалім профилін тіркеу</h3>
            <form id="teacherRegisterForm" class="teacher-form">
              <label class="teacher-label">Аты-жөні
                <input class="teacher-input" type="text" name="name" placeholder="Мысалы: Айгерім Бекқызы">
              </label>
              <label class="teacher-label">Мектеп
                <input class="teacher-input" type="text" name="school" placeholder="Мектеп атауы">
              </label>
              <label class="teacher-label">Email
                <input class="teacher-input" type="email" name="email" placeholder="name@example.com">
              </label>
              <label class="teacher-label">Құпиясөз
                <input class="teacher-input" type="password" name="password" placeholder="Кемі 4 таңба">
              </label>
              <button class="check-button teacher-full-button" type="submit">Тіркелу</button>
            </form>
          </section>

          <section class="card teacher-auth-card">
            <h3>Кіру</h3>
            <form id="teacherLoginForm" class="teacher-form">
              <label class="teacher-label">Email
                <input class="teacher-input" type="email" name="email" placeholder="name@example.com">
              </label>
              <label class="teacher-label">Құпиясөз
                <input class="teacher-input" type="password" name="password" placeholder="Құпиясөз">
              </label>
              <button class="secondary-button teacher-full-button" type="submit">Кіру</button>
            </form>
          </section>
        </div>
      </div>
    `;

    section.querySelector("#teacherRegisterForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);

      try {
        if (state.cloudConfigured) {
          const result = await window.ChemStudyCloud.register({
            name: String(data.get("name") || "").trim(),
            school: String(data.get("school") || "").trim(),
            email: String(data.get("email") || "").trim(),
            password: String(data.get("password") || "")
          });

          setFlash(
            result.needsEmailConfirmation ? "info" : "success",
            result.needsEmailConfirmation ? "Email растауын тексеріңіз." : "Мұғалім профилі ашылды."
          );
        } else {
          registerLocal({
            name: data.get("name"),
            school: data.get("school"),
            email: data.get("email"),
            password: data.get("password")
          });

          setFlash("success", "Мұғалім профилі ашылды.");
        }
      } catch (error) {
        setFlash("error", error.message || "Тіркелу орындалмады.");
      }

      renderProfile();
    });

    section.querySelector("#teacherLoginForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);

      try {
        if (state.cloudConfigured) {
          await window.ChemStudyCloud.login({
            email: String(data.get("email") || "").trim(),
            password: String(data.get("password") || "")
          });
        } else {
          loginLocal({
            email: data.get("email"),
            password: data.get("password")
          });
        }

        setFlash("success", "Кабинетке кіру сәтті орындалды.");
      } catch (error) {
        setFlash("error", error.message || "Кіру орындалмады.");
      }

      renderProfile();
    });
  }

  function renderDashboard(section, state, message) {
    const profile = state.profile || DEFAULT_PROFILE;
    const resources = state.resources || [];
    const qmjCount = countResources(resources, "qmj");
    const presentationCount = countResources(resources, "presentation");
    const extraCount = countResources(resources, "resource");
    const modeLabel = "Кабинет";
    const modeText = "Материалдарыңыз сақталып тұрады.";

    section.innerHTML = `
      <h2>Мұғалім профилі</h2>
      <p class="section-intro">ҚМЖ, презентация және файлдарыңызды осы кабинетте сақтай аласыз.</p>
      ${renderFlash(message)}
      <div class="teacher-portal-shell">
        <section class="teacher-hero-card">
          <div class="teacher-mode-row">
            <span class="teacher-mode-badge">${escapeHtml(modeLabel)}</span>
            <span class="teacher-note-chip">${escapeHtml(profile.name || DEFAULT_PROFILE.name)}</span>
          </div>
          <h3>${escapeHtml(profile.name || DEFAULT_PROFILE.name)}</h3>
          <p>${escapeHtml(modeText)}</p>
          <div class="teacher-actions">
            ${QUICK_LINKS.map((item) => `<button class="secondary-button" type="button" data-profile-page="${escapeHtml(item.pageId)}">${escapeHtml(item.label)}</button>`).join("")}
            <a class="secondary-button" href="${escapeHtml(BOOKLET_URL)}" target="_blank" rel="noopener noreferrer">Кітапшаны ашу</a>
            <a class="secondary-button" href="${escapeHtml(KTJ_URL)}" target="_blank" rel="noopener noreferrer">10-сынып КТЖ</a>
          </div>
          <div class="teacher-summary-grid">
            <div class="teacher-stat-card"><strong>${resources.length}</strong><span>Барлық материал</span></div>
            <div class="teacher-stat-card"><strong>${qmjCount}</strong><span>ҚМЖ</span></div>
            <div class="teacher-stat-card"><strong>${presentationCount}</strong><span>Слайд</span></div>
            <div class="teacher-stat-card"><strong>${extraCount}</strong><span>Қосымша материал</span></div>
          </div>
        </section>

        <div class="teacher-panel-grid">
          <section class="card">
            <div class="teacher-section-top">
              <div>
                <h3>Профиль мәліметі</h3>
                <p class="teacher-help">Аты-жөніңіз бен мектебіңізді сақтаңыз.</p>
              </div>
              <button class="secondary-button" type="button" id="teacherLogoutButton">Шығу</button>
            </div>
            <form id="teacherProfileForm" class="teacher-form">
              <label class="teacher-label">Аты-жөні
                <input class="teacher-input" type="text" name="name" value="${escapeHtml(profile.name || DEFAULT_PROFILE.name)}">
              </label>
              <label class="teacher-label">Мектеп
                <input class="teacher-input" type="text" name="school" value="${escapeHtml(profile.school || "")}">
              </label>
              <label class="teacher-label">Email
                <input class="teacher-input" type="email" name="email" value="${escapeHtml(profile.email || "")}" readonly>
              </label>
              <button class="check-button teacher-full-button" type="submit">Профильді сақтау</button>
            </form>
          </section>

          <section class="card">
            <div class="teacher-section-top">
              <div>
                <h3>Материал жүктеу</h3>
                <p class="teacher-help">ҚМЖ, слайд не файл қосыңыз.</p>
              </div>
              <span class="teacher-note-chip">Сақталып тұрады</span>
            </div>
            <form id="teacherUploadForm" class="teacher-form">
              <div class="field-grid">
                <label class="teacher-label">Материал түрі
                  <select class="teacher-input teacher-select" name="type">
                    <option value="qmj">ҚМЖ</option>
                    <option value="presentation">Слайд</option>
                    <option value="resource">Қосымша материал</option>
                  </select>
                </label>
                <label class="teacher-label">Сынып
                  <select class="teacher-input teacher-select" name="gradeId">
                    <option value="general">Жалпы бөлім</option>
                    <option value="grade7">7-сынып</option>
                    <option value="grade8">8-сынып</option>
                    <option value="grade9">9-сынып</option>
                    <option value="grade10">10-сынып</option>
                    <option value="grade11">11-сынып</option>
                  </select>
                </label>
              </div>
              <label class="teacher-label">Материал атауы
                <input class="teacher-input" type="text" name="title" placeholder="Мысалы: §59 Табиғи карбонаттар ҚМЖ">
              </label>
              <label class="teacher-label">Қысқаша сипаттама
                <textarea class="teacher-input teacher-textarea" name="description" rows="4" placeholder="Бұл материал не үшін керек екенін қысқаша жазыңыз"></textarea>
              </label>
              <label class="teacher-label">Файл жүктеу
                <input class="teacher-input teacher-file" type="file" name="file" accept=".doc,.docx,.ppt,.pptx,.pdf,.png,.jpg,.jpeg">
              </label>
              <label class="teacher-label">Немесе сыртқы сілтеме
                <input class="teacher-input" type="url" name="externalLink" placeholder="Google Drive, Canva немесе Slides сілтемесі">
              </label>
              <button class="back-button teacher-full-button" type="submit">Кабинетке сақтау</button>
            </form>
          </section>
        </div>

        <section class="card">
          <div class="teacher-section-top">
            <div>
              <h3>Сақталған материалдар</h3>
              <p class="teacher-help">Әр мұғалім тек өз материалдарын осы бөлімде көреді.</p>
            </div>
            <span class="teacher-note-chip">${resources.length} материал</span>
          </div>
          ${resources.length ? `<div class="teacher-resource-grid">${resources.map(renderResourceCard).join("")}</div>` : `<p class="teacher-empty">Әзірге кабинетке ҚМЖ немесе слайд жүктелмеген.</p>`}
        </section>
      </div>
    `;

    section.querySelectorAll("[data-profile-page]").forEach((button) => {
      button.addEventListener("click", () => showPage(button.dataset.profilePage));
    });

    section.querySelector("#teacherProfileForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);

      try {
        if (state.cloudConfigured && typeof window.ChemStudyCloud?.saveProfile === "function") {
          await window.ChemStudyCloud.saveProfile({
            name: String(data.get("name") || "").trim(),
            school: String(data.get("school") || "").trim()
          });
        } else {
          saveLocalProfile({
            name: data.get("name"),
            school: data.get("school")
          });
        }

        setFlash("success", "Профиль сақталды.");
      } catch (error) {
        setFlash("error", error.message || "Профиль сақталмады.");
      }

      renderProfile();
    });

    section.querySelector("#teacherUploadForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const file = data.get("file");

      try {
        if (state.cloudConfigured) {
          await window.ChemStudyCloud.createResource({
            gradeId: String(data.get("gradeId") || "general"),
            targetId: String(data.get("gradeId") || "general"),
            type: String(data.get("type") || "resource"),
            title: String(data.get("title") || "").trim(),
            description: String(data.get("description") || "").trim(),
            externalLink: String(data.get("externalLink") || "").trim(),
            file: file instanceof File && file.size ? file : null,
            createdBy: profile.name || DEFAULT_PROFILE.name
          });
        } else {
          await createLocalResource(
            {
              gradeId: String(data.get("gradeId") || "general"),
              type: String(data.get("type") || "resource"),
              title: String(data.get("title") || "").trim(),
              description: String(data.get("description") || "").trim(),
              externalLink: String(data.get("externalLink") || "").trim(),
              file: file instanceof File && file.size ? file : null
            },
            profile
          );
        }

        setFlash("success", "Материал кабинетке сақталды.");
      } catch (error) {
        setFlash("error", error.message || "Материал сақталмады.");
      }

      renderProfile();
    });

    section.querySelector("#teacherLogoutButton")?.addEventListener("click", async () => {
      try {
        if (state.cloudConfigured) {
          await window.ChemStudyCloud.signOut();
        } else {
          signOutLocal();
        }

        setFlash("info", "Кабинеттен шықтыңыз.");
      } catch (error) {
        setFlash("error", error.message || "Шығу орындалмады.");
      }

      renderProfile();
    });

    section.querySelectorAll("[data-resource-download]").forEach((button) => {
      button.addEventListener("click", () => {
        const resource = resources.find((item) => item.id === button.dataset.resourceDownload);
        const href = getResourceHref(resource);

        if (!href) {
          setFlash("error", "Файл табылмады.");
          renderProfile();
          return;
        }

        if (isMobileDevice()) {
          window.open(href, "_blank", "noopener");
          return;
        }

        const link = document.createElement("a");
        link.href = href;
        link.download = resource.fileName || `${resource.title || "material"}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    });

    section.querySelectorAll("[data-resource-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const resource = resources.find((item) => item.id === button.dataset.resourceDelete);

        try {
          if (!resource) {
            throw new Error("Материал табылмады.");
          }

          releaseResourceUrl(resource.id);

          if (state.cloudConfigured) {
            await window.ChemStudyCloud.deleteResource(resource);
          } else {
            await deleteLocalResource(resource.id);
          }

          setFlash("success", "Материал өшірілді.");
        } catch (error) {
          setFlash("error", error.message || "Материал өшірілмеді.");
        }

        renderProfile();
      });
    });
  }

  async function renderProfile() {
    const section = document.getElementById("profile");

    if (!section) {
      return;
    }

    section.innerHTML = `
      <h2>Мұғалім профилі</h2>
      <div class="card">
        <p>Кабинет жүктеліп жатыр...</p>
      </div>
    `;

    const message = consumeFlash();

    try {
      const state = await buildState();

      if (state.signedIn) {
        renderDashboard(section, state, message);
      } else {
        renderGuest(section, state, message);
      }
    } catch (error) {
      section.innerHTML = `
        <h2>Мұғалім профилі</h2>
        <div class="teacher-flash error">${escapeHtml(error.message || "Кабинетті жүктеу кезінде қате болды.")}</div>
      `;
    }
  }

  window.addEventListener("beforeunload", () => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
  });

  window.renderTeacherProfile = renderProfile;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderProfile);
  } else {
    renderProfile();
  }
})();
