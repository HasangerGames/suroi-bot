import { CaseType } from "@prisma/client";
import { type ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { logModAction, modActionPreCheck, prisma } from "../../utils/misc";

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

        const callback = async() => await member.kick(reason);

        const caseData = await prisma.case.create({
            data: {
                type: CaseType.KICK,
                userId: user.id,
                moderatorId: moderator.id,
                reason
            }
        });

        await logModAction(
            interaction,
            user,
            moderator,
            caseData,
            callback
        );
    }
});
