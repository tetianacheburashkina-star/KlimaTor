document.addEventListener("DOMContentLoaded", () => {
  let config = loadConfig();
  let state = {
    targetTemp: 21.5,
    currentTemp: 21.0,
    humidity: 48,
    blindPos: 35,
    locked: true,
    lightOn: true,
    brightness: 75
  };

  const logList = document.getElementById("eventLogList");

  function addLog(msg) {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const li = document.createElement("li");
    li.textContent = `[${now}] ${msg}`;
    logList.prepend(li);
  }

  const driver = new SmartDriver(config, addLog);

  // --- I18N ---
  function applyLanguage(lang) {
    config.lang = lang;
    saveConfig(config);
    const dict = I18N[lang] || I18N.de;

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });

    renderLockUI();
  }

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
  });

  // --- CONNECTION BADGE & BRAND ---
  function renderHeader() {
    document.getElementById("brandTitle").textContent = config.brandName || "KlimaTor";
    const badge = document.getElementById("connectionBadge");
    const text = document.getElementById("connectionText");

    badge.className = "status-badge " + (config.mode === "demo" ? "demo" : "online");
    if (config.mode === "demo") text.textContent = "DEMO MODE";
    if (config.mode === "local") text.textContent = "LOCAL GATEWAY";
    if (config.mode === "cloud") text.textContent = "CLOUD WSS";
  }

  // --- CLIMATE ---
  const tempSlider = document.getElementById("tempSlider");
  const targetTempEl = document.getElementById("targetTemp");

  function updateTemp(val) {
    state.targetTemp = parseFloat(val);
    tempSlider.value = state.targetTemp;
    targetTempEl.textContent = state.targetTemp.toFixed(1);
    driver.sendCommand("climate", "set_temperature", "climate.living_room", { temperature: state.targetTemp });
  }

  tempSlider.addEventListener("input", (e) => {
    targetTempEl.textContent = parseFloat(e.target.value).toFixed(1);
  });
  tempSlider.addEventListener("change", (e) => updateTemp(e.target.value));

  document.querySelectorAll("[data-hmode]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-hmode]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const m = btn.dataset.hmode;
      document.getElementById("climateModeLabel").textContent = btn.textContent.split(" ")[0];
      if (m === "eco") updateTemp(18.0);
      if (m === "comfort") updateTemp(21.5);
      if (m === "night") updateTemp(19.0);
    });
  });

  // --- BLINDS ---
  const blindSlider = document.getElementById("blindSlider");
  const blindPercent = document.getElementById("blindPercent");
  const blindCurtain = document.getElementById("blindCurtain");

  function updateBlinds(pos) {
    state.blindPos = parseInt(pos, 10);
    blindSlider.value = state.blindPos;
    blindPercent.textContent = state.blindPos;
    blindCurtain.style.height = state.blindPos + "%";
    driver.sendCommand("cover", "set_cover_position", "cover.living_room", { position: state.blindPos });
  }

  blindSlider.addEventListener("input", (e) => {
    blindPercent.textContent = e.target.value;
    blindCurtain.style.height = e.target.value + "%";
  });
  blindSlider.addEventListener("change", (e) => updateBlinds(e.target.value));

  document.getElementById("blindOpenBtn").addEventListener("click", () => updateBlinds(0));
  document.getElementById("blindHalfBtn").addEventListener("click", () => updateBlinds(50));
  document.getElementById("blindCloseBtn").addEventListener("click", () => updateBlinds(100));

  // --- SECURITY & PIN ---
  const pinModal = document.getElementById("pinModal");
  const pinInput = document.getElementById("pinInput");
  const pinError = document.getElementById("pinError");

  function renderLockUI() {
    const dict = I18N[config.lang] || I18N.de;
    const badge = document.getElementById("lockStatusBadge");
    const icon = document.getElementById("lockIcon");
    const desc = document.getElementById("lockDesc");
    const btn = document.getElementById("toggleLockBtn");

    if (state.locked) {
      badge.textContent = dict.locked;
      badge.className = "badge-pill secure";
      icon.textContent = "🔒";
      desc.textContent = dict.lockProtected;
      btn.textContent = dict.unlockBtn;
      btn.className = "primary-btn danger";
    } else {
      badge.textContent = dict.unlocked;
      badge.className = "badge-pill unlocked";
      icon.textContent = "🔓";
      desc.textContent = dict.lockOpenDesc;
      btn.textContent = dict.lockBtn;
      btn.className = "primary-btn";
    }
  }

  document.getElementById("toggleLockBtn").addEventListener("click", () => {
    if (state.locked) {
      pinInput.value = "";
      pinError.classList.add("hidden");
      pinModal.classList.remove("hidden");
      pinInput.focus();
    } else {
      state.locked = true;
      renderLockUI();
      driver.sendCommand("lock", "lock", "lock.front_door");
    }
  });

  document.getElementById("confirmPinBtn").addEventListener("click", () => {
    if (pinInput.value === config.pinCode) {
      state.locked = false;
      pinModal.classList.add("hidden");
      renderLockUI();
      driver.sendCommand("lock", "unlock", "lock.front_door");
    } else {
      pinError.classList.remove("hidden");
    }
  });

  // --- LIGHTS & ENERGY ---
  const lightToggle = document.getElementById("lightToggle");
  const dimmerSlider = document.getElementById("dimmerSlider");

  function recalculateEnergy() {
    const baseWatts = 140; // fridge, router, standby
    const lightWatts = state.lightOn ? Math.round((state.brightness / 100) * 260) : 0;
    const totalWatts = baseWatts + lightWatts;
    const monthlyKwh = (totalWatts / 1000) * 24 * 30;
    const euro = monthlyKwh * config.tariff;

    document.getElementById("powerWatts").textContent = `${totalWatts} W`;
    document.getElementById("monthlyEuro").textContent = `${euro.toFixed(2)} €`;
  }

  lightToggle.addEventListener("change", (e) => {
    state.lightOn = e.target.checked;
    recalculateEnergy();
    driver.sendCommand("light", state.lightOn ? "turn_on" : "turn_off", "light.main");
  });

  dimmerSlider.addEventListener("input", (e) => {
    state.brightness = parseInt(e.target.value, 10);
    document.getElementById("dimmerVal").textContent = state.brightness + "%";
    recalculateEnergy();
  });

  dimmerSlider.addEventListener("change", () => {
    driver.sendCommand("light", "turn_on", "light.main", { brightness_pct: state.brightness });
  });

  // --- SCENARIOS ---
  document.querySelectorAll(".scenario-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const scene = btn.dataset.scene;
      if (scene === "home") {
        updateTemp(21.5);
        updateBlinds(20);
        state.lightOn = true;
        lightToggle.checked = true;
        recalculateEnergy();
        addLog("Scenario activated: HOME");
      } else if (scene === "away") {
        updateTemp(18.0);
        updateBlinds(100);
        state.lightOn = false;
        lightToggle.checked = false;
        state.locked = true;
        renderLockUI();
        recalculateEnergy();
        addLog("Scenario activated: AWAY (Eco + All Locked)");
      } else if (scene === "night") {
        updateTemp(19.0);
        updateBlinds(100);
        state.lightOn = false;
        lightToggle.checked = false;
        state.locked = true;
        renderLockUI();
        recalculateEnergy();
        addLog("Scenario activated: NIGHT");
      }
    });
  });

  // --- SETTINGS MODAL ---
  const settingsModal = document.getElementById("settingsModal");
  const cfgMode = document.getElementById("cfgMode");
  const gatewayFields = document.getElementById("gatewayFields");

  cfgMode.addEventListener("change", () => {
    gatewayFields.classList.toggle("hidden", cfgMode.value === "demo");
  });

  document.getElementById("openSettingsBtn").addEventListener("click", () => {
    document.getElementById("cfgBrandName").value = config.brandName;
    cfgMode.value = config.mode;
    document.getElementById("cfgUrl").value = config.gatewayUrl;
    document.getElementById("cfgToken").value = config.token;
    document.getElementById("cfgTariff").value = config.tariff;
    gatewayFields.classList.toggle("hidden", cfgMode.value === "demo");
    settingsModal.classList.remove("hidden");
  });

  document.getElementById("saveSettingsBtn").addEventListener("click", () => {
    config.brandName = document.getElementById("cfgBrandName").value.trim() || "KlimaTor";
    config.mode = cfgMode.value;
    config.gatewayUrl = document.getElementById("cfgUrl").value.trim();
    config.token = document.getElementById("cfgToken").value.trim();
    config.tariff = parseFloat(document.getElementById("cfgTariff").value) || 0.35;

    saveConfig(config);
    driver.updateConfig(config);
    renderHeader();
    recalculateEnergy();
    settingsModal.classList.add("hidden");
    addLog(`Configuration saved (Mode: ${config.mode.toUpperCase()})`);
  });

  document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.close).classList.add("hidden");
    });
  });

  document.getElementById("clearLogBtn").addEventListener("click", () => {
    logList.innerHTML = "";
  });

  // INIT
  renderHeader();
  applyLanguage(config.lang);
  recalculateEnergy();
  addLog("KlimaTor OS v0.1 initialized.");
});
