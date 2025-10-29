import { EmbedBuilder } from 'discord.js';

export const success = (title, desc) =>
  new EmbedBuilder().setColor('#57F287').setTitle(title).setDescription(desc);

export const error = (title, desc) =>
  new EmbedBuilder().setColor('#ED4245').setTitle(title).setDescription(desc);

export const info = (title, desc) =>
  new EmbedBuilder().setColor('#5865F2').setTitle(title).setDescription(desc);