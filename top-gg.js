const crypto = require("crypto");
const express = require("express");
require("dotenv/config");

const { logger } = require("./utils/logger");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const VOTE_CHANNEL_ID = "1441800425992097895";
const PORT = 8080;

function timingSafeEqual(a, b) {
  const ab = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Parses: "t=1776544835,v1=abcdef..."
 */
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

module.exports = function registerTopGgWebhook(client) {
  if (!client) throw new Error("registerTopGgWebhook(client) requires a discord.js Client");

  const TOPGG_SECRET = process.env.TOPGG_WEBHOOK_AUTH; // your whs_...
  const TOPGG_BOT_ID = process.env.TOPGG_BOT_ID; // recommended

  if (!TOPGG_SECRET) throw new Error("Missing TOPGG_WEBHOOK_AUTH env var");

  const app = express();

  // IMPORTANT: capture raw body for HMAC verification
  app.use(
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf; // Buffer
      },
    })
  );

  app.get("/", (req, res) => res.status(200).send("OK"));
  app.get("/topgg/vote", (req, res) => res.status(200).send("OK (POST only)"));

  app.post("/topgg/vote", async (req, res) => {
    try {
      // 1) Grab signature header
      const sigHeader = req.get("x-topgg-signature");
      const parsed = parseTopggSignature(sigHeader);

      if (!parsed) {
        if (logger?.warn) logger.warn("[top.gg] Missing/invalid x-topgg-signature header");
        else console.warn("[top.gg] Missing/invalid x-topgg-signature header");
        return res.sendStatus(401);
      }

      // 2) Compute expected HMAC
      // Assumption (based on the header format): HMAC-SHA256(secret, `${t}.${rawBody}`)
      const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), "utf8");
      const signedPayload = Buffer.concat([Buffer.from(`${parsed.t}.`, "utf8"), raw]);

      const expected = crypto.createHmac("sha256", TOPGG_SECRET).update(signedPayload).digest("hex");

      if (!timingSafeEqual(expected, parsed.v1)) {
        if (logger?.warn) logger.warn("[top.gg] Signature mismatch");
        else console.warn("[top.gg] Signature mismatch");
        return res.sendStatus(401);
      }

      // 3) Verified
      const vote = req.body;

      if (logger?.info) logger.info(`[top.gg] VERIFIED (signature) vote payload: ${JSON.stringify(vote)}`);
      else console.log("[top.gg] VERIFIED (signature) vote payload:", vote);

      const userId = vote?.user;
      const botId = vote?.bot || TOPGG_BOT_ID || client.user?.id;

      if (!userId) throw new Error("Missing vote.user in payload");
      if (!botId) throw new Error("Unable to determine botId for vote URL");

      const voteUrl = `https://top.gg/bot/${botId}/vote`;

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`**<@${userId}> has upvoted Java Lava!**\n\nThanks for voting!`)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Upvote Java Lava").setURL(voteUrl)
      );

      const channel = await client.channels.fetch(VOTE_CHANNEL_ID);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${VOTE_CHANNEL_ID} not found or not text-based`);
      }

      await channel.send({ embeds: [embed], components: [row] });

      return res.sendStatus(200);
    } catch (err) {
      if (logger?.error) logger.error(err);
      else console.error(err);
      return res.sendStatus(500);
    }
  });

  app.listen(PORT, () => {
    if (logger?.info) logger.info(`[top.gg] Listening on port 8080 (POST /topgg/vote)`);
    else console.log(`[top.gg] Listening on port 8080 (POST /topgg/vote)`);
  });
};