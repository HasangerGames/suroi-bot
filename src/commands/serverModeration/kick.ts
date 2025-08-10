import { CaseType } from "@prisma/client";
import { ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { EmbedColors, modActionPreCheck, prisma, sendModActionEmbeds } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a user")
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user to kick")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("reason")
            .setDescription("Reason for the kick")
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
    cooldown: 0,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        const data = await modActionPreCheck(interaction, "kick", "kickable");
        if (!data) return;

        const { member, user, moderator } = data;
        const reason = interaction.options.getString("reason", true);

        member.kick(reason);

        const userCase = await prisma.case.create({
            data: {
                type: CaseType.KICK,
                userId: user.id,
                moderatorId: moderator.id,
                reason
            }
        });

        sendModActionEmbeds(
            interaction,
            user,
            moderator,
            "kicked from",
            "Kicked",
            reason,
            [{ name: "Case ID", value: `\`${userCase.id}\``, inline: true }],
            EmbedColors.error
        );
    }
});
