const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const { logger } = require("../../../utils/logger");
const { LogError } = require("../../../utils/LogError");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("scheduled-messages")
    .setDescription("View all scheduled messages in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    try {
      // Fetch scheduled messages for the guild
      const scheduledMessages = await interaction.client.db.ScheduledMessage.find({
        GuildID: interaction.guild.id,
      });
      if (scheduledMessages.length === 0) {
        return interaction.reply({
          content: "There are no scheduled messages in this server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Create an embed to display the scheduled messages
      const embed = new EmbedBuilder()
        .setTitle("Scheduled Messages")
        .setDescription(
          scheduledMessages
            .map(
              (msg) =>
                `**ID:** ${msg._id}\n**Channel:** <#${msg.ChannelID}>\n**Content:** ${msg.Content}\n**Scheduled Time:** <t:${Math.floor(new Date(msg.ScheduledTime).getTime() / 1000)}:F>`
            )
            .join("\n\n")
        )
        .setColor("Blue")
        .setTimestamp();
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error(`Error executing /scheduled-messages: ${error}`);
      LogError(interaction.client, error, "Slash Command: /scheduled-messages");
      await interaction.reply({
        content: "An error occurred while fetching scheduled messages. Please try again later.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
