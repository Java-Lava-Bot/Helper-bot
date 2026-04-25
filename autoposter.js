const crypto = require("crypto");
const express = require("express");
require("dotenv/config");

const { logger } = require("./utils/logger");

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

function timingSafeEqual(a, b) {
  const ab = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function parseTopggSignature(sigHeader) {
  if (!sigHeader || typeof sigHeader !== "string") return null;
  const parts = sigHeader.split(",").map((p) => p.trim());
  const out = {};
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k && v) out[k] = v;
  }
  if (!out.t || !out.v1) return null;
  return { t: out.t, v1: out.v1 };
}

module.exports = function registerAutoposter(client) {
  if (!client) throw new Error("registerAutoposter(client) requires a discord.js Client");

  const TOPGG_SECRET = process.env.TOPGG_WEBHOOK_AUTH; // optional if you still use /topgg/vote
  const DISCORDS_WEBHOOK_SECRET = process.env.DISCORDS_WEBHOOK_SECRET;

  const app = express();

  // JSON body parsing (also keeps raw body for top.gg signature validation)
  app.use(
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  app.get("/", (req, res) => res.status(200).send("OK"));
  app.get("/topgg/vote", (req, res) => res.status(200).send("OK (POST only)"));

  // ✅ browser test route so you don't see "Cannot GET ..."
  app.get("/webhooks/discords/stats", (req, res) => res.status(200).send("OK (POST only)"));

  // ✅ your stats receiver endpoint
  app.post("/webhooks/discords/stats", (req, res) => {
    try {
      const { bot_id, servers, secret } = req.body || {};

      if (!DISCORDS_WEBHOOK_SECRET) {
        logger?.error?.("[discords webhook] Missing DISCORDS_WEBHOOK_SECRET env var");
        return res.status(500).json({ status: "failed", message: "server_misconfigured" });
      }

      if (!secret || secret !== DISCORDS_WEBHOOK_SECRET) {
        return res.status(401).json({ status: "failed", message: "unauthorized" });
      }

      if (!bot_id || typeof servers !== "number") {
        return res.status(400).json({ status: "failed", message: "incomplete_request" });
      }

      logger?.info?.(`[discords webhook] Received stats bot_id=${bot_id} servers=${servers}`);
      return res.status(200).json({ status: "success" });
    } catch (err) {
      logger?.error?.(err);
      return res.sendStatus(500);
    }
  });

  // (optional) keep your top.gg handler only if you need it
  app.post("/topgg/vote", async (req, res) => {
    try {
      if (!TOPGG_SECRET) return res.status(500).send("Missing TOPGG_WEBHOOK_AUTH");

      const sigHeader = req.get("x-topgg-signature");
      const parsed = parseTopggSignature(sigHeader);
      if (!parsed) return res.sendStatus(401);

      const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), "utf8");
      const signedPayload = Buffer.concat([Buffer.from(`${parsed.t}.`, "utf8"), raw]);
      const expected = crypto.createHmac("sha256", TOPGG_SECRET).update(signedPayload).digest("hex");

      if (!timingSafeEqual(expected, parsed.v1)) return res.sendStatus(401);

      return res.sendStatus(200);
    } catch (err) {
      logger?.error?.(err);
      return res.sendStatus(500);
    }
  });

  app.listen(PORT, () => {
    logger?.info?.(`[autoposter] Listening on port ${PORT}`);
  });
};