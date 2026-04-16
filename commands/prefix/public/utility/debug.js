const { EmbedBuilder, version: discordJsVersion, PermissionsBitField } = require('discord.js');
const process = require('process');
const { logger } = require('../../../../utils/logger');
const { LogError } = require('../../../../utils/LogError');
const { supportinvite } = require('../../../../utils/support-invite');

module.exports = {
    name: 'helper-debug',
    description: 'Check bot performance, latency, and memory usage.',
    aliases: ['hdebug', 'debughelper'],
    async execute(message, args) {
        try {
            // Check permissions
            if (!message.channel.permissionsFor(message.member).has(PermissionsBitField.Flags.ViewChannel)) {
                return message.reply('You do not have permission to use this command.');
            }

            const sentMessage = await message.reply('📊 Gathering debug information...');
            
            const ping = sentMessage.createdTimestamp - message.createdTimestamp;
            const memoryUsage = process.memoryUsage();
            const rssMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
            const heapMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

            const embed = new EmbedBuilder()
                .setTitle('📊 Bot Debug Info')
                .setColor('Blurple')
                .addFields(
                    { name: 'API Latency', value: `${message.client.ws.ping}ms`, inline: true },
                    { name: 'Response Time', value: `${ping}ms`, inline: true },
                    { name: 'Guilds Served', value: `${message.client.guilds.cache.size}`, inline: true },
                    { name: 'Memory (RSS)', value: `${rssMB} MB`, inline: true },
                    { name: 'Memory (Heap Used)', value: `${heapMB} MB`, inline: true },
                    { name: 'Discord.js Version', value: discordJsVersion, inline: true },
                    { name: 'Shard ID', value: `${message.guild?.shardId ?? 'N/A'}`, inline: true }
                )
                .setFooter({ text: 'If you experience lag, report this data to the support team.' })
                .setTimestamp();

            await sentMessage.edit({ content: null, embeds: [embed] });
        } catch (err) {
            if (err && err.code === 10062) return;
            try {
                await message.reply({ content: `An error occurred while running the command. Please report this to the support server ${supportinvite}` });
                logger.error(`[Stable Debug] Error executing command for ${message.author.tag}: ${err?.message ?? err}`, err);
                LogError(err, message, 'commands/prefix/public/utility/helper-debug.js');
            } catch (Err) {
                return;
            }
        }
    }
};