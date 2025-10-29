import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { addXP } from '../supabase.js';
import { success } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
  .setName('addxp')
  .setDescription('XP hinzufügen (Admin)')
  .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
  .addIntegerOption(opt => opt.setName('xp').setDescription('XP').setRequired(true).setMinValue(1))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('xp');

  const { error } = await addXP(target.id, interaction.guild.id, amount);
  if (error) {
    return interaction.reply({ content: 'Fehler beim Hinzufügen von XP.', ephemeral: true });
  }

  await interaction.reply({
    embeds: [success('XP hinzugefügt', `${amount} XP für <@${target.id}>`)]
  });
}