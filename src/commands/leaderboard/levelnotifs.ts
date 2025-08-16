import { type ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { prisma } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("levelnotifs")
        .setDescription("Controls whether you receive a ping when leveling up")
        .addSubcommand(subcommand => subcommand
            .setName("on")
            .setDescription("Enables leveling notifications")
        )
        .addSubcommand(subcommand => subcommand
            .setName("off")
            .setDescription("Disables leveling notifications")
        ),
    cooldown: 2000,
    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const levelNotifs = {
            on: true,
            off: false
        }[interaction.options.getSubcommand()];

        await prisma.user.upsert({
            where: { userId },
            create: { userId, levelNotifs },
            update: { levelNotifs }
        });

        await interaction.reply({ content: `Leveling notifications ${levelNotifs ? "enabled" : "disabled"}.`, flags: [MessageFlags.Ephemeral] });
    }
});
