import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { success } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
  .setName('Test')
  .setDescription('Test (Admin)')
  .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const target = interaction.options.getUser('user');
  reply({
    embeds: [success('Test`)]
  });
}