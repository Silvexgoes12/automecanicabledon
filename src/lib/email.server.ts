// Resend email helper via Lovable connector gateway.
// Gracefully no-ops when RESEND_API_KEY is not configured.

const GATEWAY = "https://connector-gateway.lovable.dev/resend";

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.warn("[email] Resend não configurado — pulando envio para", opts.to);
    return { skipped: true };
  }
  try {
    const r = await fetch(`${GATEWAY}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Suporte Bledon <onboarding@resend.dev>",
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error("[email] falha", r.status, txt);
      return { error: txt };
    }
    return await r.json();
  } catch (e: any) {
    console.error("[email] erro", e?.message);
    return { error: e?.message };
  }
}
