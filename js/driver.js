class SmartDriver {
  constructor(config, onLog) {
    this.config = config;
    this.onLog = onLog;
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  async sendCommand(domain, service, entityId, payload = {}) {
    const mode = this.config.mode;

    // 1. DEMO MODE
    if (mode === "demo") {
      this.onLog(`[DEMO] ${domain}.${service} -> ${entityId} ${JSON.stringify(payload)}`);
      return { ok: true, simulated: true };
    }

    // 2. LOCAL HOME ASSISTANT REST API
    if (mode === "local") {
      try {
        const url = `${this.config.gatewayUrl.replace(/\/$/, "")}/api/services/${domain}/${service}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ entity_id: entityId, ...payload })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.onLog(`[LOCAL HA] ${domain}.${service} -> ${entityId} OK`);
        return { ok: true };
      } catch (err) {
        this.onLog(`[ERROR LOCAL] ${err.message}`);
        return { ok: false, error: err.message };
      }
    }

    // 3. CLOUD WSS BRIDGE (Hetzner VPS placeholder)
    if (mode === "cloud") {
      this.onLog(`[CLOUD WSS] Queued command for ${entityId}: ${service}`);
      return { ok: true, cloud: true };
    }
  }
}
