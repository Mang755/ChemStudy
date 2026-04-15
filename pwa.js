(function () {
  const strip = document.getElementById("installStrip");
  const installButton = document.getElementById("installButton");
  const stepsButton = document.getElementById("installDismiss");
  const installMessage = document.getElementById("installMessage");
  const stepsList = document.getElementById("installSteps");
  const HOME_PAGE_ID = "home";

  if (!strip || !installButton || !stepsButton || !installMessage || !stepsList) {
    return;
  }

  let deferredPrompt = null;
  let stepsOpen = false;
  let currentPageId = HOME_PAGE_ID;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function isAndroid() {
    return /android/i.test(window.navigator.userAgent);
  }

  function getInstallState() {
    if (isStandalone()) {
      return {
        message: "ChemStudy осы құрылғыда қосымша ретінде орнатылған.",
        canPrompt: false,
        primaryLabel: "Орнатылған",
        steps: [
          "Қосымшаны енді басты экраннан тікелей ашуға болады.",
          "Жаңа өзгеріс көрінбесе, браузерден сайтты бір рет ашып жаңартыңыз."
        ]
      };
    }

    if (deferredPrompt) {
      return {
        message: "Орнату батырмасын бассаңыз, сайтты телефонға қосымша ретінде қоса аласыз.",
        canPrompt: true,
        primaryLabel: "Орнату",
        steps: [
          "Орнату батырмасын басыңыз.",
          "Шыққан терезеде рұқсат беріңіз.",
          "Қосымша басты экранға қосылады."
        ]
      };
    }

    if (isIOS()) {
      return {
        message: "iPhone немесе iPad-та орнату Safari мәзірі арқылы жасалады.",
        canPrompt: false,
        primaryLabel: "Орнату",
        steps: [
          "Сайтты Safari-де ашыңыз.",
          "Share батырмасын басыңыз.",
          "Add to Home Screen таңдаңыз.",
          "Add батырмасын басыңыз."
        ]
      };
    }

    if (isAndroid()) {
      return {
        message: "Android-та батырма шықпаса, браузер мәзірі арқылы орнатуға болады.",
        canPrompt: false,
        primaryLabel: "Орнату",
        steps: [
          "Сайтты Chrome браузерінде ашыңыз.",
          "Үш нүкте мәзірін басыңыз.",
          "Install app немесе Add to Home Screen таңдаңыз.",
          "Растаңыз."
        ]
      };
    }

    return {
      message: "Бұл құрылғыда орнату браузер мәзірі арқылы жасалады.",
      canPrompt: false,
      primaryLabel: "Орнату",
      steps: [
        "Браузер мәзірін ашыңыз.",
        "Install app немесе Add to Home Screen таңдаңыз."
      ]
    };
  }

  function renderSteps(steps) {
    stepsList.innerHTML = steps.map((step) => `<li>${step}</li>`).join("");
    stepsList.hidden = !stepsOpen;
    strip.classList.toggle("expanded", stepsOpen);
  }

  function refreshInstallState() {
    const state = getInstallState();
    const shouldShow = currentPageId === HOME_PAGE_ID && !isStandalone();

    if (!shouldShow) {
      strip.hidden = true;
      document.body.classList.toggle("app-installed", isStandalone());
      return;
    }

    installMessage.textContent = state.message;
    installButton.hidden = false;
    installButton.disabled = isStandalone();
    installButton.textContent = state.primaryLabel;
    stepsButton.textContent = stepsOpen ? "Жабу" : "Қадамдары";
    strip.hidden = false;
    renderSteps(state.steps);
    document.body.classList.toggle("app-installed", isStandalone());
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    refreshInstallState();
  });

  installButton.addEventListener("click", async () => {
    const state = getInstallState();

    if (!state.canPrompt || !deferredPrompt) {
      stepsOpen = true;
      refreshInstallState();
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    stepsOpen = false;
    refreshInstallState();
  });

  stepsButton.addEventListener("click", () => {
    stepsOpen = !stepsOpen;
    refreshInstallState();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    stepsOpen = false;
    refreshInstallState();
  });

  window.addEventListener("chemstudy:pagechange", (event) => {
    currentPageId = event?.detail?.pageId || HOME_PAGE_ID;
    refreshInstallState();
  });

  window.addEventListener("pageshow", refreshInstallState);
  refreshInstallState();
})();
