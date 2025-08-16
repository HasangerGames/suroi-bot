import { type ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { prisma } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("setxp")
        .setDescription("Set a user's XP")
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user to alter the XP of")
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName("xp")
            .setDescription("The XP value to set")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(2147483647)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    cooldown: 2000,
    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.options.getUser("user")?.id;
        if (!userId) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Unknown user")
                .setDescription("Could not find that user.")
                .setColor(Colors.Red);
            await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            return;
        }

        const xp = interaction.options.getInteger("xp", true);

        await prisma.user.upsert({
            where: { userId },
            create: { userId, xp },
            update: { xp }
        });

        await interaction.reply({ content: `Set XP of user <@${userId}> to ${xp}` });
    }
});
