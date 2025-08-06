import { Track, useMainPlayer } from "discord-player";
import { type APIEmbedField, type ChatInputCommandInteraction, EmbedBuilder, type GuildMember, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";

const numberFormat = Intl.NumberFormat("en", { notation: "compact" });

export default new Command({
    data: new SlashCommandBuilder()
        .setName("songsearch")
        .setDescription("Searches for a song on YouTube.")
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
            const { tracks } = await player.search(query);

            const embed = new EmbedBuilder()
                .setTitle(`🔍 Search Results for **${query}**`)
                .setFields(
                    tracks
                        .slice(0, 5)
                        .flatMap((track: Track): APIEmbedField[] => [
                            { name: track.cleanTitle, value: track.author },
                            { name: "Duration", value: `\`${track.duration}\``, inline: true },
                            { name: "Views", value: `\`${numberFormat.format(track.views)}\``, inline: true },
                            // { name: "\u200b", value: "\u200b" }
                        ])
                )
                .setThumbnail(tracks[0]?.thumbnail ?? null)
                .setTimestamp();

            interaction.followUp({ embeds: [embed] });
        } catch (e) {
            console.error(e);
        }
    }
});
