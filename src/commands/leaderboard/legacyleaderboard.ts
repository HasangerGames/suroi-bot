import { type ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { leaderboardMedal } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("legacyleaderboard")
        .setDescription("View the old server leaderboard"),
    cooldown: 2000,
    async execute(interaction: ChatInputCommandInteraction) {
        // yes I copied some of error's code
        // cry about it
        const presetTopUsers = [
            { username: "eiπ", level: 200 },
            { username: "Amyklae", level: 200 },
            { username: "Kenos", level: 200 },
            { username: "Croissant", level: 186 },
            { username: "Ash", level: 173 },
            { username: "Hasanger", level: 163 },
            { username: "Cyby", level: 161 },
            { username: "Viktor", level: 152 },
            { username: "Aff", level: 151 },
            { username: "Pengu", level: 142 },
        ];

        let leaderboardText = "";

        for (let i = 0; i < presetTopUsers.length; i++) {
            const user = presetTopUsers[i];
            if (!user) break;
            leaderboardText += `${i + 1}. ${leaderboardMedal(i)} **${user.username}** - Level **${user.level}**\n`;
        }

        const leaderboardEmbed = new EmbedBuilder()
            .setAuthor({
                iconURL: interaction.guild?.iconURL() ?? undefined,
                name: "Suroi"
            })
            .setTitle("🏆 Legacy Server Leaderboard")
            .setColor(Colors.Blue)
            .setDescription(leaderboardText);

        await interaction.reply({ embeds: [leaderboardEmbed] });
    }
});
