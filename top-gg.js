// Top.gg vote autoposter
const Topgg = require('@top-gg/sdk')
const express = require('express')
require('dotenv/config');
const { logger } = require("./utils/logger");
const { Client, GatewayIntentBits, Collection, Options, Events, PermissionsBitField, EmbedBuilder } = require("discord.js");

const app = express()
const webhook = new Topgg.Webhook(process.env.TOPGG_WEBHOOK_AUTH)

app.post('/dblwebhook', webhook.listener(vote => {
  logger.log(`User ${vote.user} just voted!`)
  await webhook.post({
    embeds: [
      new EmbedBuilder()
        .setTitle('New Vote!')
        .setDescription(`User <@${vote.user}> just voted for the bot!`)
        .setColor(0x00FF00)
        .setTimestamp()
    ]
  });
  })
  // Throw an error to ask Top.gg to retry the webhook after a few seconds.
)

app.listen(80)