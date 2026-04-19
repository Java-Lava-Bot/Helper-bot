module.exports = function registerTopGgWebhook(client) {
  if (!client) throw new Error("registerTopGgWebhook(client) requires a discord.js Client");

  const TOPGG_SECRET = process.env.TOPGG_WEBHOOK_AUTH; // whs_...
  const TOPGG_BOT_ID = process.env.TOPGG_BOT_ID; // recommended

  // ✅ ADD these env vars for your own stats webhook receiver
  const DISCORDS_WEBHOOK_SECRET = process.env.DISCORDS_WEBHOOK_SECRET;

  if (!TOPGG_SECRET) throw new Error("Missing TOPGG_WEBHOOK_AUTH env var");

  const app = express();

  // capture raw body for HMAC verification
  app.use(
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf; // Buffer
      },
    })
  );

  app.get("/", (req, res) => res.status(200).send("OK"));
  app.get("/topgg/vote", (req, res) => res.status(200).send("OK (POST only)"));

  // ✅ ADD THIS: your own endpoint that your bot can POST to
  // Set DISCORDS_WEBHOOK_URL to: https://jlhelper.discloud.app/webhooks/discords/stats
  app.post("/webhooks/discords/stats", (req, res) => {
    try {
      const { bot_id, servers, secret } = req.body || {};

      if (!DISCORDS_WEBHOOK_SECRET) {
        if (logger?.error) logger.error("[discords webhook] Missing DISCORDS_WEBHOOK_SECRET env var");
        else console.error("[discords webhook] Missing DISCORDS_WEBHOOK_SECRET env var");
        return res.status(500).json({ status: "failed", message: "server_misconfigured" });
      }

      if (!secret || secret !== DISCORDS_WEBHOOK_SECRET) {
        return res.status(401).json({ status: "failed", message: "unauthorized" });
      }

      if (!bot_id || typeof servers !== "number") {
        return res.status(400).json({ status: "failed", message: "incomplete_request" });
      }

      if (logger?.info)
        logger.info(`[discords webhook] Received stats bot_id=${bot_id} servers=${servers}`);
      else console.log(`[discords webhook] Received stats bot_id=${bot_id} servers=${servers}`);

      // For now: just acknowledge receipt.
      // (Optional next step: forward these stats to Discords.com from here.)
      return res.status(200).json({ status: "success" });
    } catch (err) {
      if (logger?.error) logger.error(err);
      else console.error(err);
      return res.sendStatus(500);
    }
  });

  app.post("/topgg/vote", async (req, res) => {
    // ... existing code unchanged ...
  });

  app.listen(PORT, () => {
    if (logger?.info) logger.info(`[top.gg] Listening on port 8080 (POST /topgg/vote)`);
    else console.log(`[top.gg] Listening on port 8080 (POST /topgg/vote)`);
  });
};