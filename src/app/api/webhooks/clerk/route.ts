import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    switch (payload.type) {
      case "user.created":
        console.log("Clerk user created:", payload.data.id)
        break
      case "user.updated":
        console.log("Clerk user updated:", payload.data.id)
        break
      case "organization.created":
        console.log("Clerk org created:", payload.data.id)
        break
      default:
        console.log("Unhandled Clerk webhook:", payload.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Clerk webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
