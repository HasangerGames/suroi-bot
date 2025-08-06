import { useMainPlayer } from "discord-player";
import { type ChatInputCommandInteraction, EmbedBuilder, type GuildMember, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";

const numberFormat = Intl.NumberFormat("en", { notation: "compact" });

export default new Command({
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Starts playing a track. Must be in a voice channel to use.")
        .addStringOption(option => option
            .setName("query")
            .setDescription("The search query")
            .setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const channel = (interaction.member as GuildMember)?.voice.channel;
        if (!channel) return interaction.reply({ content: "You are not connected to a voice channel!", flags: [MessageFlags.Ephemeral] });

        await interaction.deferReply();

        try {
            const player = useMainPlayer();
            const query = interaction.options.getString("query", true);
            const { track } = await player.play(channel, query, {
                nodeOptions: {
                    metadata: interaction
                }
            });

            // const embed = new EmbedBuilder()
            //     .setTitle("🔍 Search Results")
            //     .setDescription(test.tracks.map(t => `${t.cleanTitle}`).join("\n"))
            //     .setTimestamp();

            const embed = new EmbedBuilder()
                .setTitle("▶️ Now Playing")
                .setDescription(`**${track.cleanTitle}**`)
                .setThumbnail(track.thumbnail)
                .setFields(
                    { name: "Channel", value: track.author, inline: true },
                    { name: "Duration", value: `\`${track.duration}\``, inline: true },
                    { name: "Views", value: `\`${numberFormat.format(track.views)}\``, inline: true },
                    { name: "Link", value: track.url }
                )
                .setTimestamp();

            interaction.followUp({ embeds: [embed] });
        } catch (e) {
            console.error(e);
        }
    }
});
