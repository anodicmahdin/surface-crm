type SlackMessage = {
  text: string
  blocks?: unknown[]
  channel?: string
}

export async function sendSlackNotification(message: SlackMessage) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.log("[Slack] Skipping notification - no webhook URL:", message.text)
    return
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`)
    }
  } catch (error) {
    console.error("Slack notification failed:", error)
  }
}

export function buildLeadAssignedMessage(
  contactName: string,
  companyName: string | undefined,
  assignedTo: string,
  ruleName: string
) {
  return {
    text: `New lead assigned to ${assignedTo}: ${contactName} from ${companyName ?? "Unknown"}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New Lead Assigned* :incoming_envelope:\n*${contactName}* from ${companyName ?? "Unknown"}\nAssigned to *${assignedTo}* via rule _${ruleName}_`,
        },
      },
    ],
  }
}
