import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/server/services/audit"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-webhook-signature")
    const secret = process.env.WEBHOOK_SIGNING_SECRET

    if (secret && signature) {
      const expected = createHmac("sha256", secret).update(body).digest("hex")
      if (signature !== expected) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)

    const contact = await prisma.contact.create({
      data: {
        firstName: payload.firstName || payload.first_name || "Unknown",
        lastName: payload.lastName || payload.last_name || "Unknown",
        email: payload.email || null,
        phone: payload.phone || null,
        title: payload.title || payload.jobTitle || null,
        source: "inbound_form",
        customFields: payload.customFields || {},
      },
    })

    await logAudit({
      entityType: "contact",
      entityId: contact.id,
      action: "created",
      isSystemAction: true,
      newValue: { firstName: contact.firstName, lastName: contact.lastName, email: contact.email },
      metadata: { source: "inbound_webhook" },
    })

    return NextResponse.json({ success: true, contactId: contact.id }, { status: 200 })
  } catch (error) {
    console.error("Inbound webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
