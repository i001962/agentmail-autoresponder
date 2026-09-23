interface Env {
  AGENTMAIL_API_KEY: string;
  AGENTMAIL_INBOX_ID: string;
  AGENTMAIL_BCC: string;
  AGENTMAIL_WEBHOOK_SECRET?: string;
}

interface AgentMailMessage {
  id?: string;
  message_id?: string;
  inbox_id?: string;
  from?: string | string[] | { address?: string }[];
  from_?: string | string[];
}

interface AgentMailWebhookPayload {
  event_type?: string;
  eventType?: string;
  message?: AgentMailMessage;
  data?: AgentMailMessage;
}

const REPLY_TEXT = `Your email has been received and is currently being processed.

---
Follow @closertoyes on X

Thank you,
The ChanceDB Agentic Team`;

function firstAddress(value: AgentMailMessage["from"] | AgentMailMessage["from_"]): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : first?.address;
  }
  return value;
}

function isSelfOrSystemAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized.includes("chancedb@agentmail.to") || normalized.includes("no-reply");
}

async function replyToMessage(env: Env, message: AgentMailMessage): Promise<void> {
  const messageId = message.id || message.message_id;
  const inboxId = message.inbox_id || env.AGENTMAIL_INBOX_ID;

  if (!messageId || !inboxId) {
    throw new Error("Webhook message is missing message_id or inbox_id");
  }

  const response = await fetch(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}/reply`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bcc: [env.AGENTMAIL_BCC],
        text: REPLY_TEXT,
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`AgentMail reply failed (${response.status}): ${details.slice(0, 500)}`);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (env.AGENTMAIL_WEBHOOK_SECRET) {
      const providedSecret = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (providedSecret !== env.AGENTMAIL_WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let payload: AgentMailWebhookPayload;
    try {
      payload = (await request.json()) as AgentMailWebhookPayload;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const eventType = payload.event_type || payload.eventType;
    const message = payload.message || payload.data;

    if (eventType === "message.received" && message) {
      const sender = firstAddress(message.from_ ?? message.from);
      if (sender && !isSelfOrSystemAddress(sender)) {
        ctx.waitUntil(replyToMessage(env, message));
      }
    }

    return Response.json({ received: true });
  },
};
