import { Resend } from "resend"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "re_placeholder")
}

type SendEmailInput = {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export async function sendEmail(input: SendEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] Skipping send - no API key configured:", input.subject)
    return { id: "mock-" + Date.now(), success: true }
  }

  const { data, error } = await getResend().emails.send({
    from: input.from ?? "Surface CRM <noreply@surfacecrm.com>",
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
  })

  if (error) {
    throw new Error(`Email send failed: ${error.message}`)
  }

  return { id: data?.id, success: true }
}
