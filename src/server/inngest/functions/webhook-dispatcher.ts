import { inngest } from "../client"
import { prisma } from "@/lib/prisma"
import { createHmac } from "crypto"

export const webhookDispatcher = inngest.createFunction(
  { id: "webhook-dispatcher", name: "Webhook Dispatcher", retries: 3 },
  { event: "crm/webhook.dispatch" },
  async ({ event, step }) => {
    const { eventName, payload } = event.data as {
      eventName: string
      payload: Record<string, unknown>
    }

    const endpoints = await step.run("fetch-endpoints", async () => {
      return prisma.webhookEndpoint.findMany({
        where: {
          isActive: true,
          events: { has: eventName },
        },
      })
    })

    for (const endpoint of endpoints) {
      await step.run(`deliver-${endpoint.id}`, async () => {
        const body = JSON.stringify({
          event: eventName,
          timestamp: new Date().toISOString(),
          data: payload,
        })

        const signature = createHmac("sha256", endpoint.secret)
          .update(body)
          .digest("hex")

        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 10000)

          const response = await fetch(endpoint.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-Webhook-Event": eventName,
            },
            body,
            signal: controller.signal,
          })

          clearTimeout(timeout)

          await prisma.webhookDelivery.create({
            data: {
              endpointId: endpoint.id,
              event: eventName,
              payload: payload as never,
              statusCode: response.status,
              success: response.ok,
              responseBody: await response.text().catch(() => null),
            },
          })

          if (response.ok) {
            await prisma.webhookEndpoint.update({
              where: { id: endpoint.id },
              data: {
                lastDeliveredAt: new Date(),
                lastStatusCode: response.status,
                failureCount: 0,
              },
            })
          } else {
            const updated = await prisma.webhookEndpoint.update({
              where: { id: endpoint.id },
              data: {
                lastFailedAt: new Date(),
                lastStatusCode: response.status,
                failureCount: { increment: 1 },
              },
            })

            if (updated.failureCount >= 10) {
              await prisma.webhookEndpoint.update({
                where: { id: endpoint.id },
                data: { isActive: false },
              })
            }
          }
        } catch (error) {
          await prisma.webhookDelivery.create({
            data: {
              endpointId: endpoint.id,
              event: eventName,
              payload: payload as never,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          })

          await prisma.webhookEndpoint.update({
            where: { id: endpoint.id },
            data: {
              lastFailedAt: new Date(),
              failureCount: { increment: 1 },
            },
          })
        }
      })
    }

    return { delivered: endpoints.length }
  }
)
