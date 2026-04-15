(() => {
  const config = Object.assign(
    {
      contactWhatsAppUrl:
        "https://wa.me/77054187927?text=%D0%A1%D3%99%D0%BB%D0%B5%D0%BC%D0%B5%D1%82%D1%81%D1%96%D0%B7%20%D0%B1%D0%B5%3F%20ChemStudy%20%D0%B1%D0%BE%D0%B9%D1%8B%D0%BD%D1%88%D0%B0%20%D1%81%D2%B1%D1%80%D0%B0%D2%93%D1%8B%D0%BC%20%D0%B1%D0%B0%D1%80%20%D0%B5%D0%B4%D1%96.",
      bookletUrl: "materials/booklet/kyzyrbek-mangaz-kitapsha.pdf",
      grade10KTJUrl: "materials/ktj/grade10-zhmb-ktj.docx"
    },
    window.ChemStudyAIConfig || {}
  );

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function show(pageId) {
    if (typeof window.showPage === "function") {
      window.showPage(pageId);
    }
  }

  function buildAction(action) {
    if (action.href) {
      return `<a class="chatbot-action" href="${action.href}" target="_blank" rel="noopener noreferrer">${escapeHtml(action.label)}</a>`;
    }

    return `<button class="chatbot-action" type="button" data-chatbot-page="${escapeHtml(action.pageId)}">${escapeHtml(action.label)}</button>`;
  }

  function appendMessage(root, role, text, actions = []) {
    const wrapper = document.createElement("div");

    wrapper.className = `chatbot-message ${role}`;
    wrapper.innerHTML = `
      <div class="chatbot-meta">${role === "user" ? "Сіз" : "ChemStudy"}</div>
      <div class="chatbot-bubble">${escapeHtml(text)}</div>
      ${actions.length ? `<div class="chatbot-actions">${actions.map(buildAction).join("")}</div>` : ""}
    `;

    root.appendChild(wrapper);
    root.scrollTop = root.scrollHeight;

    wrapper.querySelectorAll("[data-chatbot-page]").forEach((button) => {
      button.addEventListener("click", () => show(button.dataset.chatbotPage));
    });
  }

  function resolveResponse(input) {
    const text = normalize(input);

    if (!text) {
      return {
        text: "Сұрақ жазыңыз. Мысалы: 10-сынып КТЖ, §58 сабағы, галогендер, спирттер немесе PDF кітапша."
      };
    }

    if (text.includes("10-сынып") && (text.includes("ктж") || text.includes("қтж"))) {
      return {
        text: "10-сынып КТЖ файлы дайын. Оны осы жерден бірден ашуға болады.",
        actions: [{ href: config.grade10KTJUrl, label: "10-сынып КТЖ-ны ашу" }]
      };
    }

    if (text.includes("58") || text.includes("§58")) {
      return {
        text: "§58 сабағы XI тараудағы 2(II) топ элементтері бөліміне жатады.",
        actions: [{ pageId: "lesson58", label: "§58 сабағын ашу" }]
      };
    }

    if (text.includes("54") || text.includes("§54")) {
      return {
        text: "§54 сабағы галогендер тақырыбының алғашқы сабағы.",
        actions: [{ pageId: "lesson54", label: "§54 сабағын ашу" }]
      };
    }

    if (text.includes("галоген")) {
      return {
        text: "Галогендер тақырыбы X тарауда жинақталған.",
        actions: [{ pageId: "topic10", label: "X тарауды ашу" }]
      };
    }

    if (text.includes("аналит")) {
      return {
        text: "Аналитикалық әдістер IX тарауда берілген.",
        actions: [{ pageId: "topic9", label: "IX тарауды ашу" }]
      };
    }

    if (text.includes("органик")) {
      return {
        text: "Органикалық химияға кіріспе XII тарауда орналасқан.",
        actions: [{ pageId: "topic12", label: "XII тарауды ашу" }]
      };
    }

    if (text.includes("қанықпаған")) {
      return {
        text: "Қанықпаған көмірсутектер XIII тарауда орналасқан.",
        actions: [{ pageId: "topic13", label: "XIII тарауды ашу" }]
      };
    }

    if (text.includes("спирт")) {
      return {
        text: "Спирттер тақырыбы XV тарауда берілген.",
        actions: [{ pageId: "topic15", label: "XV тарауды ашу" }]
      };
    }

    if (text.includes("мұғалім") || text.includes("профиль")) {
      return {
        text: "Мұғалім профилі бөлімінде жылдам өту, файл сілтемелері және қысқа мәлімет сақталады.",
        actions: [{ pageId: "profile", label: "Мұғалім профилін ашу" }]
      };
    }

    if (text.includes("ресурс")) {
      return {
        text: "Қосымша платформалар мен пайдалы сілтемелер Ресурстар бөлімінде орналасқан.",
        actions: [{ pageId: "resources", label: "Ресурстарды ашу" }]
      };
    }

    if (text.includes("whatsapp") || text.includes("байланыс") || text.includes("жазу")) {
      return {
        text: "WhatsApp арқылы жылдам байланысқа шығуға болады.",
        actions: [{ href: config.contactWhatsAppUrl, label: "WhatsApp-қа өту" }]
      };
    }

    if (text.includes("pdf") || text.includes("кітапша")) {
      return {
        text: "Кітапша Word/PDF форматында ашуға дайын.",
        actions: [{ href: config.bookletUrl, label: "Кітапшаны ашу" }]
      };
    }

    if (text.includes("сынып")) {
      return {
        text: "Сыныптар бөлімінен 7, 8, 9, 10 және 11-сынып материалдарын ашуға болады.",
        actions: [{ pageId: "teacher", label: "Сыныптар бөлімі" }]
      };
    }

    return {
      text: "Мен сізге жылдам бағыт бере аламын: 10-сынып КТЖ, §54, §58, галогендер, аналитикалық әдістер, спирттер, ресурстар немесе WhatsApp деп жазыңыз."
    };
  }

  function initChatbot() {
    const page = document.getElementById("chatbot");
    const shell = page?.querySelector(".chatbot-shell");

    if (!page || !shell) {
      return;
    }

    page.querySelector("h2").textContent = "Чатбот";

    shell.innerHTML = `
      <div class="chatbot-header">
        <div>
          <h3>ChemStudy көмекшісі</h3>
          <p>Сұрақты жазыңыз немесе дайын батырмалардың бірін басыңыз.</p>
        </div>
        <span id="chatbotModeBadge" class="task-badge">Жергілікті режим</span>
      </div>
      <div class="chatbot-suggestions">
        <button class="chatbot-chip" type="button" data-prompt="10-сынып КТЖ">10-сынып КТЖ</button>
        <button class="chatbot-chip" type="button" data-prompt="§54 сабағы">§54 сабағы</button>
        <button class="chatbot-chip" type="button" data-prompt="§58 сабағы">§58 сабағы</button>
        <button class="chatbot-chip" type="button" data-prompt="Галогендер">Галогендер</button>
        <button class="chatbot-chip" type="button" data-prompt="Спирттер">Спирттер</button>
        <button class="chatbot-chip" type="button" data-prompt="WhatsApp">WhatsApp</button>
      </div>
      <div class="chatbot-window">
        <div id="chatbotMessages" class="chatbot-messages" aria-live="polite"></div>
        <form id="chatbotForm" class="chatbot-form">
          <input
            id="chatbotInput"
            class="chatbot-input"
            type="text"
            autocomplete="off"
            placeholder="Мысалы: 10-сынып КТЖ немесе §58 сабағы"
          >
          <button class="check-button" type="submit">Жіберу</button>
        </form>
      </div>
      <div class="chatbot-note">
        <strong>Не істей алады:</strong>
        <p>Тақырып бетін ашуға, сабаққа өтуді ұсынуға, файлды табуға және байланыс сілтемесін көрсетуге көмектеседі.</p>
      </div>
    `;

    const root = document.getElementById("chatbotMessages");
    const form = document.getElementById("chatbotForm");
    const input = document.getElementById("chatbotInput");

    if (!root || !form || !input) {
      return;
    }

    appendMessage(
      root,
      "assistant",
      "Сәлеметсіз бе! Мен ChemStudy бойынша жылдам бағыт беруге көмектесемін."
    );

    shell.querySelectorAll("[data-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        input.value = button.dataset.prompt || "";
        input.focus();
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const text = input.value.trim();
      appendMessage(root, "user", text || "...");

      const response = resolveResponse(text);
      appendMessage(root, "assistant", response.text, response.actions || []);

      input.value = "";
      input.focus();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatbot);
  } else {
    initChatbot();
  }
})();
