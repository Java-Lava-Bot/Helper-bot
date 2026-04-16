const { EmbedBuilder } = require('discord.js');
const { logger } = require('./logger');

/**
 * Logs an error to a Discord channel
 * @param {Error|string} error - The error to log
 * @param {import('discord.js').Client} client - The Discord client
 * @param {string} context - Context of the error
 */
async function LogError(error, client, context = 'Unknown Context') {
    const errorChannelId = '1467251612958589009'; // Your error log channel ID
    
    if (!errorChannelId) {
        logger.error('No error channel ID configured!');
        return;
    }

    if (!client || !client.channels) {
        logger.error('Client or client.channels is null. Unable to fetch error channel.');
        return;
    }

    try {
        const errorChannel = await client.channels.fetch(errorChannelId).catch(() => null);
        
        if (!errorChannel) {
            logger.error('Could not fetch error logging channel!');
            return;
        }

        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ Error Detected ⚠️')
            .setDescription(`\`\`\`js\n${error.stack || error}\n\`\`\``)
            .addFields(
                { name: 'Context', value: context },
                { name: 'Timestamp', value: new Date().toISOString() },
                { name: 'Client User', value: `<@${client.user.id}>` }
            )
            .setTimestamp();

        await errorChannel.send({ embeds: [errorEmbed] });
    } catch (sendError) {
        logger.error('Failed to send error to logging channel:', sendError);
    }
}

module.exports = {LogError};