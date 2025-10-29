import { SlashCommandBuilder } from 'discord.js';
import { getUser } from '../supabase.js';
import { info } from '../utils/embed.js';

export const data = new SlashCommandBuilder()
  .setName('level')
  .setDescription('Zeigt dein Level')
  .addUserOption(opt =>
    opt.setName('user').setDescription('Anderer User').setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const member = await interaction.guild.members.fetch(target.id);

  const { data, error } = await getUser(target.id, interaction.guild.id);
  if (error || !data) {
    return interaction.reply({
      embeds: [info('Neuling', `${member} ist neu – Level 1, 0 XP`)]
    });
  }

  const embed = info(
    `Level von ${member.displayName}`,
    `**Level:** ${data.level}\n**XP:** ${data.xp}`
  ).setThumbnail(member.displayAvatarURL());

  await interaction.reply({ embeds: [embed] });
}