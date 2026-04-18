// Top.gg vote webhook -> post to a Discord channel (discord.js v14)
const Topgg = require("@top-gg/sdk");
const express = require("express");
require("dotenv/config");

const { logger } = require("./utils/logger");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const VOTE_CHANNEL_ID = "1441800425992097895";
const PORT = Number(process.env.PORT || process.env.TOPGG_PORT || 3000);
const TOPGG_AUTH = process.env.TOPGG_WEBHOOK_AUTH; // must match top.gg "Webhook Authorization"
const TOPGG_BOT_ID = process.env.TOPGG_BOT_ID; // recommended (your bot id on Discord/top.gg)

if (!TOPGG_AUTH) throw new Error("Missing env TOPGG_WEBHOOK_AUTH");
if (!TOPGG_BOT_ID) logger.warn?.("TOPGG_BOT_ID is not set; using client.user.id when available.");

/**
 * Call this AFTER your Discord client is logged in.
 * Example: require("./top-gg")(client)
 */
module.exports = function registerTopGgWebhook(client) {
  if (!client) throw new Error("registerTopGgWebhook requires a discord.js client");

  const app = express();
  app.use(express.json());

  const webhook = new Topgg.Webhook(TOPGG_AUTH);

  // NOTE: the route path must match what you set as the webhook URL on top.gg
  // e.g. https://yourdomain.com/dblwebhook
  app.post(
    "/dblwebhook",
    webhook.listener(async (vote) => {
      try {
        logger.log(`User ${vote.user} just voted!`);

        const botId = vote.bot || TOPGG_BOT_ID || client.user?.id;
        const voteUrl = `https://top.gg/bot/${botId}/vote`;

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("New Vote!")
          .setDescription(`**<@${vote.user}> just upvoted Java Lava!**\n\nThanks for voting!`)
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Upvote Java Lava")
            .setURL(voteUrl)
        );

        const channel = await client.channels.fetch(VOTE_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          throw new Error(`Vote channel ${VOTE_CHANNEL_ID} not found or not text-based`);
        }

        await channel.send({ embeds: [embed], components: [row] });
      } catch (err) {
        // Throwing here tells top.gg to retry delivery
        logger.error?.(err);
        throw err;
      }
    })
  );

  app.get("/", (req, res) => res.status(200).send("OK"));

  app.listen(PORT, () => logger.log(`[top.gg] Webhook server listening on port ${PORT}`));
};