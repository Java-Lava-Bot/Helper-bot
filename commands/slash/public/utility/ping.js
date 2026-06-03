const { SlashCommandBuilder } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("helper-ping")
    .setDescription("Replies with beta bot's latency!"),
  cooldown: "2s",
  async execute(interaction) {
    try {
      const start = Date.now();

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "Pinging..." });
      } else {
        await interaction.followUp({ content: "Pinging..." }).catch(() => {});
      }

      const botLatency = Date.now() - start;
      const apiLatency = Math.round(interaction.client.ws.ping);
      const content = `Pong!\nBot Latency: ${botLatency}ms\nAPI Latency: ${apiLatency}ms`;

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content }).catch(() => {});
      } else {
        await interaction.reply({ content }).catch(() => {});
      }
    } catch (err) {
      if (err && err.code === 10062) return;
      await interaction
        .followUp({ content: "An error occurred while executing the command.", flags: 64 })
        .catch(() => {});
      logger.error(
        `[Stable Ping] Error executing command for ${interaction.user.tag}: ${err?.message ?? err}`,
        err
      );
      await LogError(
        err,
        interaction.client,
        `[Stable Ping] Error executing command for ${interaction.user.tag}`
      );
    }
  },
};
