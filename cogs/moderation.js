import { logWarn, getWarns } from '../supabase.js';
import { success, error, info } from '../utils/embed.js';

export const name = 'moderation';

export async function execute(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!['warn', 'warns'].includes(interaction.commandName)) return;

    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ embeds: [error('Fehler', 'User nicht gefunden.')] });

    if (interaction.commandName === 'warn') {
      const reason = interaction.options.getString('grund') ?? 'Kein Grund';

      const { error } = await logWarn(
        interaction.guild.id,
        interaction.user.id,
        member.id,
        reason
      );

      if (error) return interaction.reply({ content: 'Fehler beim Loggen.', ephemeral: true });

      await interaction.reply({
        embeds: [success('Warnung', `${member} wurde gewarnt!\n**Grund:** ${reason}`)]
      });
      await member.send(`Du wurdest auf **${interaction.guild.name}** gewarnt: ${reason}`).catch(() => {});
    }

    if (interaction.commandName === 'warns') {
      const { data } = await getWarns(member.id, interaction.guild.id);
      if (!data?.length) {
        return interaction.reply({ embeds: [info('Sauber', `${member} hat keine Warnungen.`)] });
      }

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle(`Warnungen von ${member.displayName}`);

      data.forEach((log, i) => {
        embed.addFields({
          name: `Warnung #${i + 1}`,
          value: `**Grund:** ${log.reason}\n**Von:** <@${log.moderator_id}>\n**Datum:** <t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`,
        });
      });

      await interaction.reply({ embeds: [embed] });
    }
  });
}