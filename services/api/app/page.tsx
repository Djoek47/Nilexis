const mono = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "0.875rem",
  background: "#f4f4f5",
  padding: "2px 8px",
  borderRadius: 6,
} as const;

const section = { marginTop: 28 } as const;

const h2 = {
  fontSize: "1rem",
  fontWeight: 600,
  marginBottom: 10,
  color: "#14532d",
} as const;

const ul = { margin: 0, paddingLeft: 20, lineHeight: 1.7 } as const;

export default function Home() {
  const lexisUrl = process.env.LEXIS_DASHBOARD_URL?.replace(/\/$/, "");

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "40px 24px 64px",
        color: "#18181b",
        lineHeight: 1.6,
      }}
    >
      <p style={{ fontSize: 13, color: "#71717a", marginBottom: 8 }}>
        Backend · JSON &amp; webhooks
      </p>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px", letterSpacing: -0.02 }}>
        Nelexis API
      </h1>
      <p style={{ margin: "0 0 16px", color: "#3f3f46" }}>
        This Vercel deployment is the <strong>HTTP API</strong> (telemetry ingestion, care,
        AI helpers, cron). It is <strong>not</strong> the operator dashboard and not the
        mobile app.
      </p>

      <div
        style={{
          padding: "14px 16px",
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          borderRadius: 10,
          fontSize: 14,
        }}
      >
        <strong style={{ color: "#065f46" }}>Where to work in the product</strong>
        <ul style={{ ...ul, marginTop: 8, marginBottom: 0 }}>
          <li>
            <strong>PC dashboard (Lexis):</strong> deploy{" "}
            <code style={mono}>apps/lexis-dashboard</code> as a <em>second</em> Vercel
            project, then open that URL (globe, tables, sign-in).
            {lexisUrl ? (
              <>
                {" "}
                <a
                  href={lexisUrl}
                  style={{ color: "#047857", fontWeight: 600 }}
                >
                  Open Lexis →
                </a>
              </>
            ) : (
              <>
                {" "}
                Optional: set <code style={mono}>LEXIS_DASHBOARD_URL</code> in this
                project&apos;s env to show a link here.
              </>
            )}
          </li>
          <li>
            <strong>Phone / tablet:</strong> Expo app in <code style={mono}>apps/mobile</code>
            .
          </li>
        </ul>
      </div>

      <section style={section}>
        <h2 style={h2}>Ingestion (service secret)</h2>
        <ul style={ul}>
          <li>
            <code style={mono}>POST /api/telemetry</code> —{" "}
            <code style={mono}>Authorization: Bearer &lt;TELEMETRY_SECRET&gt;</code>
          </li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Authenticated (Supabase user JWT)</h2>
        <ul style={ul}>
          <li>
            <code style={mono}>POST /api/ai/plant-health</code>
          </li>
          <li>
            <code style={mono}>POST /api/care/generate</code>
          </li>
          <li>
            <code style={mono}>GET /api/care/upcoming</code>
          </li>
          <li>
            <code style={mono}>POST /api/care/complete</code>
          </li>
          <li>
            <code style={mono}>POST /api/streaks/record-daily</code>
          </li>
          <li>
            <code style={mono}>POST /api/push/register</code>
          </li>
          <li>
            <code style={mono}>POST /api/automation/arduino-cloud/apply</code>
          </li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Scheduled (Vercel Cron)</h2>
        <p style={{ fontSize: 14, color: "#52525b", marginTop: 0, marginBottom: 8 }}>
          Secured with <code style={mono}>CRON_SECRET</code> — see{" "}
          <code style={mono}>vercel.json</code>.
        </p>
        <ul style={ul}>
          <li>
            <code style={mono}>GET /api/cron/care-digest</code>
          </li>
          <li>
            <code style={mono}>GET /api/cron/sensor-eval</code>
          </li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Docs</h2>
        <p style={{ margin: 0, fontSize: 14 }}>
          <a
            href="https://github.com/Djoek47/Nilexis/blob/main/services/api/README.md"
            style={{ color: "#15803d" }}
          >
            services/api/README.md
          </a>{" "}
          in the repo — deploy notes, env vars, and request shapes.
        </p>
      </section>
    </main>
  );
}
