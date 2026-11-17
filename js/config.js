const DEFAULT_CONFIG = {
  brandName: "KlimaTor",
  mode: "demo", // demo | local | cloud
  gatewayUrl: "http://192.168.1.50:8123",
  token: "",
  tariff: 0.35,
  lang: "de",
  pinCode: "1234"
};

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("klimator_cfg"));
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  localStorage.setItem("klimator_cfg", JSON.stringify(cfg));
}
