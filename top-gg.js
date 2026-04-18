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

// broaden extraction so real vote events still work
function normalizeTopggEvent(body, fallbackBotId) {
  // New envelope format
  if (body && body.data) {
    const d = body.data;

    const userId =
      d?.user?.platform_id ||
      d?.user?.id ||
      d?.voter?.platform_id ||
      d?.voter?.id ||
      d?.member?.platform_id ||
      d?.member?.id;

    const botId =
      d?.project?.platform_id ||
      d?.project?.id ||
      d?.bot?.platform_id ||
      d?.bot?.id ||
      body?.bot ||
      fallbackBotId;

    return { eventType: body.type, userId, botId, raw: body };
  }

  // Old format: { user, bot, type }
  const userId = body?.user;
  const botId = body?.bot || fallbackBotId;
  return { eventType: body?.type, userId, botId, raw: body };
}

module.exports = function registerTopGgWebhook(client) {
  if (!client) throw new Error("registerTopGgWebhook(client) requires a discord.js Client");

  const TOPGG_SECRET = process.env.TOPGG_WEBHOOK_AUTH; // whs_...
  const TOPGG_BOT_ID = process.env.TOPGG_BOT_ID; // recommended
  const MANUAL_TEST_SECRET = process.env.MANUAL_VOTE_TEST_SECRET; // NEW: for manual testing

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

  // NEW: manual test endpoint (secure) to trigger the real vote embed on demand
  // Usage: POST /topgg/vote/manual-test
  // Headers: X-Test-Secret: <MANUAL_VOTE_TEST_SECRET>
  // Body: { "userId": "1163939796767473698", "botId": "1305190785536360519" }
  app.post("/topgg/vote/manual-test", async (req, res) => {
    try {
      const secret = req.get("x-test-secret");
      if (!MANUAL_TEST_SECRET || !secret || secret !== MANUAL_TEST_SECRET) {
        return res.sendStatus(401);
      }

      const userId = req.body?.userId;
      const botId = req.body?.botId || TOPGG_BOT_ID || client.user?.id;

      if (!userId) return res.status(400).send("Missing userId");
      if (!botId) return res.status(400).send("Missing botId");

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

      return res.status(200).send("OK (manual test posted)");
    } catch (err) {
      if (logger?.error) logger.error(err);
      else console.error(err);
      return res.sendStatus(500);
    }
  });

  app.post("/topgg/vote", async (req, res) => {
    try {
      // Verify signature (x-topgg-signature: t=...,v1=...)
      const sigHeader = req.get("x-topgg-signature");
      const parsed = parseTopggSignature(sigHeader);
      if (!parsed) {
        if (logger?.warn) logger.warn("[top.gg] Missing/invalid x-topgg-signature header");
        else console.warn("[top.gg] Missing/invalid x-topgg-signature header");
        return res.sendStatus(401);
      }

      const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), "utf8");
      const signedPayload = Buffer.concat([Buffer.from(`${parsed.t}.`, "utf8"), raw]);
      const expected = crypto.createHmac("sha256", TOPGG_SECRET).update(signedPayload).digest("hex");

      if (!timingSafeEqual(expected, parsed.v1)) {
        if (logger?.warn) logger.warn("[top.gg] Signature mismatch");
        else console.warn("[top.gg] Signature mismatch");
        return res.sendStatus(401);
      }

      // Verified payload
      const normalized = normalizeTopggEvent(req.body, TOPGG_BOT_ID || client.user?.id);

      if (logger?.info)
        logger.info(
          `[top.gg] VERIFIED (signature) type=${normalized.eventType} userId=${normalized.userId} botId=${normalized.botId}`
        );
      else console.log(`[top.gg] VERIFIED (signature)`, normalized);

      // webhook.test is NOT a vote
      if (normalized.eventType === "webhook.test") {
        return res.status(200).send("OK (test received)");
      }

      const userId = normalized.userId;
      const botId = normalized.botId;

      if (!userId) throw new Error("Missing user id in payload");
      if (!botId) throw new Error("Missing bot id in payload");

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