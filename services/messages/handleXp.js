module.exports = async ({ message, client }) => {
  const { author, guild } = message;
  if (!guild || author.bot) return;

  //   client.logger.info(`${author.username} sent a message in ${channel.id}`);
  //! code logic here
};
