# AgentMail autoresponder Worker

This Worker receives AgentMail `message.received` webhooks and replies from `chancedb@agentmail.to`, BCC'ing `i001962@gmail.com`.

## Where the AgentMail API key goes

The key belongs in a Cloudflare Worker **Secret** named `AGENTMAIL_API_KEY`. It is intentionally absent from `wrangler.jsonc` and source code.

From this directory, authenticate Wrangler and run:

```sh
npx wrangler login
npx wrangler deploy
npx wrangler secret put AGENTMAIL_API_KEY
```

The second command creates the Worker and prints its public `workers.dev` URL. The third command prompts for the key and publishes it as an encrypted secret. Alternatively, in the Cloudflare dashboard use **Workers & Pages → agentmail-autoresponder → Settings → Variables and Secrets → Add → Secret**, name it `AGENTMAIL_API_KEY`, then deploy the change.

For local development, put the key in `.dev.vars` beside `wrangler.jsonc`:

```dotenv
AGENTMAIL_API_KEY="your-agentmail-key"
```

Never commit `.dev.vars` or a real `.env` file.

After deployment, use the displayed `workers.dev` URL as the AgentMail webhook URL. Subscribe it to `message.received`.

`AGENTMAIL_WEBHOOK_SECRET` is optional. If configured as another Worker Secret, the endpoint requires `Authorization: Bearer <same value>` on webhook deliveries. AgentMail supports custom webhook headers, so this can be added when the webhook is registered.
