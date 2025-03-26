import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import { Manager } from "erela.js";

import config from "./config.mjs";

import dotenv from "dotenv";

import os from "os";

import process from "process";

import generateMusicCard from "./musiccard.mjs";

dotenv.config();

const PREFIX = "-";

const client = new Client({

  intents: [

    GatewayIntentBits.Guilds,

    GatewayIntentBits.GuildVoiceStates,

    GatewayIntentBits.GuildMessages,

    GatewayIntentBits.MessageContent,

  ],

});

const manager = new Manager({

  nodes: config.nodes,

  send(id, payload) {

    const guild = client.guilds.cache.get(id);

    if (guild?.shard) guild.shard.send(payload);

  },

});

const owners = process.env.OWNERS?.split(",") || [];

const emojis = {

  error: "<:x_cross:1340902071163162747>",

  success: "<:x_tick:1345069164154585173>",

  music: "<:x_music:1340901586838487156>",

  stop: "<:x_defen:1345073819152547942>",

  skip: "<:x_right:1340900718059716649>",

  pause: "<:x_pause:1340900569233227789>",

  resume: "<:x_play:1340900900868194367>",

  loop: "<:x_replit:1239384663257124975>",

};

client.once("ready", () => {

  console.log(`${client.user.tag} is online!`);

  manager.init(client.user.id);

});

client.on("raw", (d) => manager.updateVoiceState(d));

client.on("messageCreate", async (message) => {

  if (!message.guild || message.author.bot) return;

  const isOwner = owners.includes(message.author.id);

  const hasPrefix = message.content.startsWith(PREFIX);

  if (!isOwner && !hasPrefix) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);

  const command = args.shift()?.toLowerCase();

  const { channel } = message.member.voice;

  let player = manager.players.get(message.guild.id);

  switch (command) {

    case "play":

      if (!args.length) return sendEmbed(message, `${emojis.error} Error`, "Provide a song name or link!", "Grey");

      player = manager.create({

        guild: message.guild.id,

        voiceChannel: channel.id,

        textChannel: message.channel.id,

        selfDeafen: true,

      });

      if (player.state !== "CONNECTED") player.connect();

      const search = args.join(" ");

      const res = await manager.search(search, message.author);

      if (res.loadType === "NO_MATCHES") return sendEmbed(message, `${emojis.error} Error`, "No results found!", "Grey");

      player.queue.add(res.tracks[0]);

      sendEmbed(message, `${emojis.music} Added to Queue`, `**${res.tracks[0].title}**`, "Grey");

      if (!player.playing) player.play();

      break;

    case "stop":

      if (!player) return sendEmbed(message, `${emojis.error} Error`, "Nothing is playing!", "Grey");

      player.destroy();

      sendEmbed(message, `${emojis.stop} Stopped`, "Music has been stopped.", "Grey");

      break;

    case "pause":

      if (!player || player.paused) return sendEmbed(message, `${emojis.error} Error`, "No music is playing!", "Grey");

      player.pause(true);

      sendEmbed(message, `${emojis.pause} Paused`, "Music is paused.", "Grey");

      break;

    case "resume":

      if (!player || !player.paused) return sendEmbed(message, `${emojis.error} Error`, "Music is already playing!", "Grey");

      player.pause(false);

      sendEmbed(message, `${emojis.resume} Resumed`, "Music is resumed.", "Grey");

      break;

    case "next":

      if (!player || !player.queue.current) return sendEmbed(message, `${emojis.error} Error`, "No music to skip!", "Grey");

      player.stop();

      sendEmbed(message, `${emojis.skip} Skipped`, "Skipped to the next track.", "Grey");

      break;

    case "loop":

      if (!player) return sendEmbed(message, `${emojis.error} Error`, "No music is playing!", "Grey");

      player.setTrackRepeat(!player.trackRepeat);

      sendEmbed(message, `${emojis.loop} Loop`, `Loop is now **${player.trackRepeat ? "enabled" : "disabled"}**`, "Grey");

      break;

  }

});

manager.on("trackStart", async (player, track) => {

  const channel = client.channels.cache.get(player.textChannel);

  if (!channel) return;

  const imagePath = await generateMusicCard(track.title, track.requester.username, track.displayThumbnail("hqdefault"));

  const buttons = new ActionRowBuilder().addComponents(

    new ButtonBuilder().setCustomId("skip").setLabel("Skip").setStyle(ButtonStyle.Primary).setEmoji(emojis.skip),

    new ButtonBuilder().setCustomId("pause").setLabel("Pause").setStyle(ButtonStyle.Secondary).setEmoji(emojis.pause),

    new ButtonBuilder().setCustomId("resume").setLabel("Resume").setStyle(ButtonStyle.Success).setEmoji(emojis.resume),

    new ButtonBuilder().setCustomId("loop").setLabel("Loop").setStyle(ButtonStyle.Secondary).setEmoji(emojis.loop),

    new ButtonBuilder().setCustomId("stop").setLabel("Stop").setStyle(ButtonStyle.Danger).setEmoji(emojis.stop)

  );

  const message = await channel.send({ files: [imagePath], components: [buttons] });

  player.message = message; // Store message for later editing

});

manager.on("trackEnd", async (player, track) => {

  if (player.message) {

    try {

      await player.message.edit({ components: [] }); // Remove buttons

    } catch (error) {

      console.error("Failed to edit message:", error);

    }

  }

});

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton()) return;

  const player = manager.players.get(interaction.guildId);

  if (!player) return interaction.reply({ content: `${emojis.error} No music is playing!`, ephemeral: true });

  switch (interaction.customId) {

    case "skip":

      player.stop();

      await interaction.reply({ content: `${emojis.skip} Skipped!`, ephemeral: true });

      break;

    case "pause":

      player.pause(true);

      await interaction.reply({ content: `${emojis.pause} Music Paused!`, ephemeral: true });

      break;

    case "resume":

      player.pause(false);

      await interaction.reply({ content: `${emojis.resume} Music Resumed!`, ephemeral: true });

      break;

    case "loop":

      player.setTrackRepeat(!player.trackRepeat);

      await interaction.reply({ content: `${emojis.loop} Loop **${player.trackRepeat ? "Enabled" : "Disabled"}**`, ephemeral: true });

      break;

    case "stop":

      player.destroy();

      await interaction.reply({ content: `${emojis.stop} Music Stopped!`, ephemeral: true });

      break;

  }

});

client.login(process.env.BOT_TOKEN);

function sendEmbed(message, title, description, color) {

  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);

  message.channel.send({ embeds: [embed] });

}