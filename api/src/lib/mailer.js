async function graphAccessToken() {
  const tenant = process.env.GRAPH_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET
  if (!tenant || !clientId || !clientSecret) return null
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
  })
  if (!response.ok) return null
  return (await response.json()).access_token
}

export async function sendAuthMail({ to, subject, title, text, buttonText, url }) {
  const token = await graphAccessToken()
  const sender = process.env.GRAPH_SENDER_EMAIL
  if (!token || !sender) {
    if (process.env.AUTH_DEV_RETURN_LINK === "true") return { sent: false, devUrl: url }
    throw new Error("Correo no configurado. Define GRAPH_* y GRAPH_SENDER_EMAIL en Azure.")
  }

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#111;color:#fff;padding:32px"><div style="max-width:560px;margin:auto;background:#1b1b1b;border:1px solid #333;padding:28px;border-radius:14px"><h2 style="margin-top:0">${title}</h2><p style="color:#ddd;line-height:1.5">${text}</p><p><a href="${url}" style="display:inline-block;background:#c8102e;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${buttonText}</a></p><p style="font-size:12px;color:#999">Si no solicitaste este correo, puedes ignorarlo.</p></div></body></html>`

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { subject, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: to } }] }, saveToSentItems: false }),
  })
  if (!response.ok) throw new Error("Microsoft Graph no pudo enviar el correo")
  return { sent: true }
}
