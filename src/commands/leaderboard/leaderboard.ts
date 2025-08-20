import { type ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { leaderboardMedal, prisma, standardNumberFormat } from "../../utils/misc";
import { getLevelForXp, getRank } from "../../utils/xp";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the server leaderboard"),
    cooldown: 5000,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const leaderboard = await prisma.user.findMany({
            orderBy: { xp: "desc" },
            take: 10
        });

        // Add the current user to the end of the leaderboard if they're not on it already
        const myId = interaction.user.id;
        if (!leaderboard.some(({ userId }) => userId === myId)) {
            const data = await prisma.user.findUnique({ where: { userId: myId } });
            if (data) leaderboard.push(data);
        }

        const leaderboardStr = (await Promise.all(leaderboard.map(async data => {
            const { userId, xp } = data;
            const name = (await interaction.guild?.members.fetch(userId))?.nickname ?? (await interaction.client.users.fetch(userId)).displayName;
            const leaderboardIndex = leaderboard.indexOf(data);
            const rank = leaderboardIndex < 10 ? leaderboardIndex : await getRank(xp);
            const divider = rank === 9 && leaderboard.length > 10 ? "\n━━━━━━━━━━━━━━━━━━━━━━━━━━" : "";
            return `${rank + 1}. ${leaderboardMedal(rank)} **${name}** • Level **${getLevelForXp(xp)}** • Total XP **${standardNumberFormat.format(xp)}**${divider}`
        }))).join("\n");

        const leaderboardCount = standardNumberFormat.format(await prisma.user.count());
        const memberCount = standardNumberFormat.format(interaction.guild?.memberCount ?? 0);

        const leaderboardEmbed = new EmbedBuilder()
            .setAuthor({
                iconURL: interaction.guild?.iconURL() ?? undefined,
                name: "Suroi"
            })
            .setTitle("🏆 Server Leaderboard")
            .setColor(Colors.Blue)
            .setDescription(leaderboardStr)
            .setFooter({ text: `Members on Leaderboard: ${leaderboardCount} • Total Members: ${memberCount}` });

        await interaction.followUp({ embeds: [leaderboardEmbed] });
    }
});
