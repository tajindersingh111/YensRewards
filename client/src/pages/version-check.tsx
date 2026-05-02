import { useEffect, useState } from "react";

interface DiagInfo {
  viewportWidth: number;
  viewportHeight: number;
  screenWidth: number;
  screenHeight: number;
  dpr: number;
  ua: string;
  platform: string;
  isAndroid: boolean;
  isTablet: boolean;
  fontSize: string;
  htmlOverflow: string;
  bodyOverflow: string;
  rootHeight: string;
  innerWidth: number;
  innerHeight: number;
  colorScheme: string;
  online: boolean;
  language: string;
  cookiesEnabled: boolean;
}

export default function VersionCheck() {
  const [info, setInfo] = useState<DiagInfo | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const computed = window.getComputedStyle(html);
    const bodyComputed = window.getComputedStyle(body);

    const ua = navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const isTablet = window.innerWidth >= 768;

    setInfo({
      viewportWidth: window.visualViewport?.width ?? window.innerWidth,
      viewportHeight: window.visualViewport?.height ?? window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      dpr: window.devicePixelRatio,
      ua,
      platform: navigator.platform || "unknown",
      isAndroid,
      isTablet,
      fontSize: computed.fontSize,
      htmlOverflow: computed.overflow,
      bodyOverflow: bodyComputed.overflow,
      rootHeight: root ? window.getComputedStyle(root).height : "n/a",
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      online: navigator.onLine,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
    });
  }, []);

  const Row = ({ label, value, ok }: { label: string; value: string; ok?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #e5e7eb" }}>
      <span style={{ fontWeight: 600, color: "#374151", fontSize: 16 }}>{label}</span>
      <span style={{ color: ok === false ? "#dc2626" : ok === true ? "#16a34a" : "#1d4ed8", fontSize: 16, fontFamily: "monospace", fontWeight: 700, textAlign: "right", maxWidth: "60%", wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ background: "#1d4ed8", color: "white", padding: "20px 24px", borderRadius: 12, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>Yen's Diagnostic</div>
          <div style={{ fontSize: 16, opacity: 0.85, marginTop: 4 }}>v3.25.8 — Tablet Debug Page</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{new Date().toLocaleString()}</div>
        </div>

        {!info ? (
          <div style={{ background: "white", padding: 40, borderRadius: 12, textAlign: "center", fontSize: 20, color: "#6b7280" }}>
            Loading diagnostics...
          </div>
        ) : (
          <>
            <div style={{ background: info.isAndroid && info.isTablet ? "#dcfce7" : info.isAndroid ? "#fef3c7" : "#dbeafe", padding: "16px 20px", borderRadius: 10, marginBottom: 16, textAlign: "center", fontSize: 20, fontWeight: 700, color: "#1f2937" }}>
              {info.isAndroid && info.isTablet
                ? "Android Tablet detected — should work fine"
                : info.isAndroid
                ? "Android PHONE detected — check viewport width"
                : "Non-Android device"}
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: "8px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", padding: "10px 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Screen</div>
              <Row label="window.innerWidth" value={`${info.innerWidth}px`} ok={info.innerWidth >= 768} />
              <Row label="window.innerHeight" value={`${info.innerHeight}px`} />
              <Row label="visualViewport width" value={`${info.viewportWidth}px`} />
              <Row label="screen.width" value={`${info.screenWidth}px`} />
              <Row label="screen.height" value={`${info.screenHeight}px`} />
              <Row label="devicePixelRatio" value={`${info.dpr}x`} />
              <Row label="Physical px (W)" value={`${Math.round(info.screenWidth * info.dpr)}px`} />
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: "8px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", padding: "10px 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>CSS Applied</div>
              <Row label="html font-size" value={info.fontSize} ok={info.fontSize === "16px"} />
              <Row label="html overflow" value={info.htmlOverflow} ok={!info.htmlOverflow.includes("hidden") || info.htmlOverflow === "hidden visible"} />
              <Row label="body overflow" value={info.bodyOverflow} />
              <Row label="#root height" value={info.rootHeight} />
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: "8px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", padding: "10px 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Device</div>
              <Row label="isAndroid" value={String(info.isAndroid)} ok={true} />
              <Row label="isTablet (≥768px)" value={String(info.isTablet)} ok={info.isTablet} />
              <Row label="platform" value={info.platform} />
              <Row label="language" value={info.language} />
              <Row label="colorScheme" value={info.colorScheme} />
              <Row label="online" value={String(info.online)} ok={info.online} />
              <Row label="cookies" value={String(info.cookiesEnabled)} ok={info.cookiesEnabled} />
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: "8px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", padding: "10px 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>User Agent</div>
              <div style={{ fontSize: 13, color: "#1d4ed8", fontFamily: "monospace", wordBreak: "break-all", padding: "8px 0", lineHeight: 1.6 }}>
                {info.ua}
              </div>
            </div>

            <div style={{ background: "#fef3c7", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#92400e", marginBottom: 8 }}>
                Take a screenshot of this page and share it
              </div>
              <div style={{ fontSize: 14, color: "#78350f" }}>
                This will tell us exactly what your tablet reports and help fix the issue.
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "12px 0 30px" }}>
              <a href="/" style={{ background: "#1d4ed8", color: "white", padding: "14px 28px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 16 }}>
                Go to Home Page
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
