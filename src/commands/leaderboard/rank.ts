import { type ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { prisma, standardNumberFormat } from "../../utils/misc";
import { getLevelInfoForXp, getRank } from "../../utils/xp";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("View a user's rank and XP on the server leaderboard")
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user to show rank info for (defaults to you)")
        ),
    cooldown: 2000,
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user") ?? interaction.user;

        const userData = await prisma.user.findUnique({ where: { userId: user.id } });
        if (!userData) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Unknown user")
                .setDescription("That user is not on the leaderboard. They must send a message first.")
                .setColor(Colors.Red);
            await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            return;
        }

        const xp = userData.xp;
        const rank = await getRank(xp) + 1;

        const { level, relativeXp, xpForNextLevel } = getLevelInfoForXp(userData.xp);

        const embed = new EmbedBuilder()
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`### 🏆 Leaderboard Stats for <@${user.id}>`)
            .addFields(
                { name: "Rank", value: `#${rank}`, inline: true },
                { name: "Level", value: level.toString(), inline: true },
                { name: "XP", value: `${standardNumberFormat.format(relativeXp)} / ${standardNumberFormat.format(xpForNextLevel)}`, inline: true },
                { name: "Total XP", value: standardNumberFormat.format(xp), inline: true },
                { name: "XP to Next Level", value: standardNumberFormat.format(xpForNextLevel - relativeXp), inline: true }
            )
            .setColor(Colors.Blue);
        await interaction.reply({ embeds: [embed] });
    }
});
