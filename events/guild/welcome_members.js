const { Events, EmbedBuilder } = require("discord.js");
const { logger } = require("../../utils/logger");
const { LogError } = require("../../utils/LogError");

const WELCOME_CHANNEL_ID = "1482862210165510226";

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member, client) {
    try {
      if (!member || !member.guild) return;

      // fetch the channel (in case it is not cached)
      const channel = await client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
      if (!channel || !channel.isTextBased?.()) return;

      const embed = new EmbedBuilder()
        .setTitle(`Welcome to ${member.guild.name}!`)
        .setDescription(
          `Welcome ${member} to **${member.guild.name}**!\n` +
            `We're glad to have you here! Please check out the https://discord.com/channels/1392910932740538540/1392919246970818671 channel for important information and rules.\n` +
            `We are a discord bot support server for the discord bot Java Lava! We have a friendly community and staff team ready to help you with any questions or issues you may have regarding your bot development journey.\n` +
            `We don't offer support for other bots, but we encourage you to ask for help and share your projects with the community. We want to make sure you have a great experience here, so if you have any questions or need help, don't hesitate to ask the staff team or other members. Enjoy your stay!\n` +
            `Any questions about Java Lava? Ask in https://discord.com/channels/1392910932740538540/1403919624675921931\n` +
            `Want to give suggestions for Java Lava? Share them in https://discord.com/channels/1392910932740538540/1403919694540570726\n` +
            `Got any bug reports for Java Lava? Report them in https://discord.com/channels/1392910932740538540/1407745035025252575\n` +
            `Got a review of Java Lava? Share it in https://discord.com/channels/1392910932740538540/1439636653085032550 today!`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setColor("#00FF88")
        .setTimestamp();

      await channel.send({ content: `Welcome ${member}!`, embeds: [embed] });

      logger.info(`[Welcome] ${member.user.tag} joined ${member.guild.name}`);
    } catch (error) {
      try {
        LogError(error, client);
      } catch (_) {}
      logger.error("[Welcome] Error sending welcome message:", error);
    }
  },
};
