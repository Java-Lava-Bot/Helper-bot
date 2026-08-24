const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const {
  setupVoteReminder,
  removeVoteReminder,
  getConfig,
} = require("../../../../events/notifications/voteReminder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vote-reminder")
    .setDescription("Configure Directum vote reminders for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Set the channel (and optional role) for vote reminders.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to post vote confirmations and reminders in.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setDescription("Role to ping when it's time to vote again (optional).")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("View the current vote reminder configuration.")
    )
    .addSubcommand((sub) =>
      sub.setName("remove").setDescription("Disable vote reminders for this server.")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    try {
      if (sub === "setup") {
        const channel = interaction.options.getChannel("channel");
        const role = interaction.options.getRole("role");

        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (
          !permissions?.has(PermissionFlagsBits.SendMessages) ||
          !permissions?.has(PermissionFlagsBits.EmbedLinks)
        ) {
          return interaction.reply({
            content: `I need **Send Messages** and **Embed Links** permissions in ${channel} to post vote reminders there.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        await setupVoteReminder(interaction.guild.id, channel.id, role?.id ?? null);

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("✅ Vote Reminder Configured")
          .setDescription(
            `I'll watch for Directum vote confirmations and post reminders in ${channel}.` +
              (role ? `\nI'll ping ${role} when it's time to vote again.` : "")
          )
          .setFooter({
            text: "Run /vote once in that channel to kick off the first reminder cycle.",
          })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === "status") {
        const config = getConfig(interaction.guild.id);

        if (!config) {
          return interaction.reply({
            content:
              "Vote reminders aren't set up for this server yet. Run `/vote-reminder setup` to configure them.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setTitle("⏰ Vote Reminder Status")
          .addFields(
            { name: "Channel", value: `<#${config.channelId}>`, inline: true },
            {
              name: "Role",
              value: config.roleId ? `<@&${config.roleId}>` : "None set",
              inline: true,
            },
            {
              name: "Pending Reminder",
              value: config.timer ? "Yes, scheduled" : "No — run `/vote` to start the cycle",
              inline: true,
            }
          )
          .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      if (sub === "remove") {
        const config = getConfig(interaction.guild.id);

        if (!config) {
          return interaction.reply({
            content: "Vote reminders aren't set up for this server.",
            flags: MessageFlags.Ephemeral,
          });
        }

        await removeVoteReminder(interaction.guild.id);

        return interaction.reply({
          content: "Vote reminders have been disabled for this server.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      logger.error(`Error executing /vote-reminder ${sub}: ${error}`);
      LogError(error, interaction.client, "Slash Command: /vote-reminder");

      const payload = {
        content: "An error occurred while running this command. Please try again later.",
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  },
};
