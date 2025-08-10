import { CaseType } from "@prisma/client";
import { ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { EmbedColors, modActionPreCheck, prisma, sendModActionEmbeds } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a user")
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user to warn")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("reason")
            .setDescription("Reason for the warn")
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
    cooldown: 0,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        const data = await modActionPreCheck(interaction, "warn", "moderatable");
        if (!data) return;

        const { user, moderator } = data;
        const reason = interaction.options.getString("reason", true);

        const userCase = await prisma.case.create({
            data: {
                type: CaseType.WARNING,
                userId: user.id,
                moderatorId: moderator.id,
                reason
            }
        });

        sendModActionEmbeds(
            interaction,
            user,
            moderator,
            "warned in",
            "Warned",
            reason,
            [{ name: "Case ID", value: `\`${userCase.id}\``, inline: true }],
            EmbedColors.warning
        );
    }
});
