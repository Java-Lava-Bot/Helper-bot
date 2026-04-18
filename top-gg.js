const Topgg = require("@top-gg/sdk");
const express = require("express");
require("dotenv/config");

const { logger } = require("./utils/logger");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const VOTE_CHANNEL_ID = "1441800425992097895";
const PORT = 8080;

module.exports = function registerTopGgWebhook(client) {
  if (!client) throw new Error("registerTopGgWebhook(client) requires a discord.js Client");

  const TOPGG_AUTH = process.env.TOPGG_WEBHOOK_AUTH;
  const TOPGG_BOT_ID = process.env.TOPGG_BOT_ID; // recommended

  if (!TOPGG_AUTH) throw new Error("Missing TOPGG_WEBHOOK_AUTH env var");

  const app = express();
  app.use(express.json());

  const webhook = new Topgg.Webhook(TOPGG_AUTH);

  app.get("/", (req, res) => res.status(200).send("OK"));

  // Optional: makes visiting the webhook URL in a browser return something useful
  app.get("/topgg/vote", (req, res) => res.status(200).send("OK (POST only)"));

  app.post(
    "/topgg/vote",
    // DEBUG: proves top.gg is hitting your endpoint + whether it sent an Authorization header
    (req, res, next) => {
      if (logger?.info)
        logger.info(`[top.gg] HIT /topgg/vote from ip=${req.ip} auth=${req.get("Authorization") ? "yes" : "no"}`);
      else
        console.log(`[top.gg] HIT /topgg/vote from ip=${req.ip} auth=${req.get("Authorization") ? "yes" : "no"}`);
      next();
    },
    webhook.listener(async (vote) => {
      try {
        // DEBUG: proves webhook signature/auth was verified and payload was parsed
        if (logger?.info) logger.info(`[top.gg] VERIFIED vote payload user=${vote.user} bot=${vote.bot} type=${vote.type}`);
        else console.log(`[top.gg] VERIFIED vote payload user=${vote.user} bot=${vote.bot} type=${vote.type}`);

        const botId = vote.bot || TOPGG_BOT_ID || client.user?.id;
        if (!botId) throw new Error("Unable to determine botId for vote URL");

        const voteUrl = `https://top.gg/bot/${botId}/vote`;

        if (logger?.info) logger.info(`User ${vote.user} just voted!`);
        else console.log(`User ${vote.user} just voted!`);

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`**<@${vote.user}> has upvoted Java Lava!**\n\nThanks for voting!`)
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Upvote Java Lava").setURL(voteUrl)
        );

        const channel = await client.channels.fetch(VOTE_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          throw new Error(`Channel ${VOTE_CHANNEL_ID} not found or not text-based`);
        }

        await channel.send({ embeds: [embed], components: [row] });
      } catch (err) {
        if (logger?.error) logger.error(err);
        else console.error(err);
        throw err; // important so top.gg retries on failures
      }
    })
  );

  // Error-handling middleware (must be AFTER routes)
  app.use((err, req, res, next) => {
    if (logger?.error) logger.error(`[top.gg] Express error: ${err?.message || err}`);
    else console.error("[top.gg] Express error:", err);
    res.status(500).send("Internal error");
  });

  app.listen(PORT, () => {
    if (logger?.info) logger.info(`[top.gg] Listening on port 8080 (POST /topgg/vote)`);
    else console.log(`[top.gg] Listening on port 8080 (POST /topgg/vote)`);
  });
};