type GmailMessage = {
  id: string
  threadId: string
  subject: string
  snippet: string
  from: string
  to: string
  date: string
  direction: "inbound" | "outbound"
}

export async function syncGmailMessages(
  _accessToken: string,
  _contactEmails: string[]
): Promise<GmailMessage[]> {
  console.log("[Gmail] Sync not implemented - requires OAuth2 setup")
  return []
}

export async function getGmailAuthUrl(_redirectUri: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return ""

  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${_redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/gmail.readonly&access_type=offline`
}
