import { CaseType } from "@prisma/client";
import { type ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { logModAction, modActionPreCheck, prisma } from "../../utils/misc";

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
        await interaction.deferReply();

        const data = await modActionPreCheck(interaction, "warn");
        if (!data) return;

        const { user, moderator } = data;
        const reason = interaction.options.getString("reason", true);

        const caseData = await prisma.case.create({
            data: {
                type: CaseType.WARNING,
                userId: user.id,
                moderatorId: moderator.id,
                reason
            }
        });

        await logModAction(
            interaction,
            user,
            moderator,
            caseData
        );
    }
});
