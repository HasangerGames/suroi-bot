import { type ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { version } from "../../../package.json";
import { Command } from "../../utils/command";
import { Config } from "../../utils/config";

const embed = new EmbedBuilder()
    .setTitle(`❓ SuroiBot v${version} Information`)
    .setDescription(`GitHub: https://github.com/HasangerGames/suroi-bot
# Features
- **Leaderboard**: Compete with your fellow users for the top spot! Every 5 seconds, the first message you send will grant you **5** XP (50% chance of 1 XP for the counting channel).
- **Music**: Play music from YouTube in voice channels!
- **Fun**: Various fun commands and activities to keep you entertained.
  - **Counting** (<#${Config.countingChannelId}>): Count as high as you can! Each message in this channel must be a number one larger than the previous, and each user can only send one message at a time.
  - **Lobotoboard** (<#${Config.starboardChannelId}>): Messages that get at least 5 <:${Config.starboardEmojiName}:${Config.starboardEmojiId}> reactions will be sent here.
- **Suroi**: Check the status of the Suroi servers with a command. Handles in-game moderation.
- **Advanced Moderation**: Extensive case and logging system helps keep track of the following:
  - Warnings, timeouts, kicks, and bans
  - Edited and deleted messages and attachments
  - Members joining and leaving
  - Profile picture and nickname changes

# Command List
Commands marked with a ⚠️ can only be used by moderators.
## 🏆 Leaderboard
\`/rank\` - View a user's XP and their position on the leaderboard
\`/leaderboard\` - View the top 10 users on the leaderboard
\`/levelnotifs on\` - Enable notifications for leveling up
\`/levelnotifs off\` - Disable notifications for leveling up
\`/legacyleaderboard\` - Display the top 10 users on the first ever leaderboard
⚠️ \`/setxp\` - Manually set a user's XP

## 🎶 Music
\`/song play\` - Add the first YouTube result for a query to the queue
\`/song search\` - Get the first 5 YouTube results for a query and add one to the queue
\`/song queue\` - List the songs currently in the queue
\`/song nowplaying\` - Show details about the song currently playing
\`/song pause\` - Pause the current song
\`/song unpause\` - Unpause the current song
\`/song skip\` - Skip the current song
\`/song remove\` - Remove a song from the queue at the given index. Determine the index using \`/song queue\`

## 😃 Fun
\`/embed\` - Create a custom embed
\`/emoji random\` - Display a random emoji combination
\`/emoji combine\` - Combine two emoji. If a 2nd emoji isn't given, a random one will be picked
\`/emoji list\` - Get a list of supported emoji
\`/fact\` - Get a random fun fact
\`/image random\` - Show a random out of context image
\`/image search\` - Search for an out of context image
⚠️ \`/image upload\` - Upload an image to the list of out of context images
⚠️ \`/say\` - Make the bot say something, optionally replying to another message

## <:suroi:1132316337021141082> Suroi
\`/servers\` - Check the status of the Suroi servers and their player counts
\`/report info\` - Get information about a report ID
⚠️ \`/report warn\` - Warn a player
⚠️ \`/report tempban\` - Temporarily ban a player
⚠️ \`/report permaban\` - Permanently ban a player
⚠️ \`/report unban\` - Remove all punishments matching the given report ID and the associated IP address

## 🔨 Moderation
\`/case view\` - List a user's moderation cases, optionally a specific page
\`/case info\` - Get information about a specific case
⚠️ \`/case delete\` - Delete a case
⚠️ \`/warn\` - Warn a user
⚠️ \`/timeout add\` - Timeout a user
⚠️ \`/timeout remove\` - Remove a timeout from a user
⚠️ \`/kick\` - Kick a user
⚠️ \`/ban add\` - Ban a user
⚠️ \`/ban remove\` - Unban a user
⚠️ \`/purge\` - Purge messages from the current channel

## 🤖 Bot
\`/ping\` - Test the bot and API latency
⚠️ \`/restart\` - Restart the bot`)
    .setColor(Colors.Blue);

export default new Command({
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get information on the bot's various commands"),
    cooldown: 10000,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ embeds: [embed] });
    },
});
