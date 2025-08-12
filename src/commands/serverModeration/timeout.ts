import { CaseType } from "@prisma/client";
import { type ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { type CaseData, logModAction, modActionPreCheck, prisma } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Commands for managing timeouts")
        .addSubcommand(subcommand => subcommand
            .setName("add")
            .setDescription("Timeout a user")
            .addUserOption(option => option
                .setName("user")
                .setDescription("The user to timeout")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Reason for the timeout")
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName("duration")
                .setDescription("Duration of the timeout")
                .setRequired(true)
                .addChoices(
                    { name: "1 minute",   value: 60000 },
                    { name: "5 minutes",  value: 300000 },
                    { name: "10 minutes", value: 600000 },
                    { name: "30 minutes", value: 1800000 },
                    { name: "1 hour",     value: 3600000 },
                    { name: "2 hours",    value: 7200000 },
                    { name: "6 hours",    value: 21600000 },
                    { name: "12 hours",   value: 43200000 },
                    { name: "1 day",      value: 86400000 },
                    { name: "2 days",     value: 172800000 },
                    { name: "1 week",     value: 604800000 },
                    { name: "2 weeks",    value: 1209600000 },
                    { name: "1 month",    value: 2419200000 }
                )
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("remove")
            .setDescription("Remove a timeout from a user")
            .addUserOption(option => option
                .setName("user")
                .setDescription("The user to remove the timeout from")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Reason for the timeout removal")
                .setRequired(true)
            )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
    cooldown: 0,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        const data = await modActionPreCheck(interaction, "timeout", "moderatable");
        if (!data) return;

        const { member, user, moderator } = data;
        const reason = interaction.options.getString("reason", true);
        let caseData: CaseData;

        switch (interaction.options.getSubcommand() as "add" | "remove") {
            case "add": {
                const duration = interaction.options.getInteger("duration", true);

                await member.timeout(duration, reason);

                caseData = await prisma.case.create({
                    data: {
                        type: CaseType.TIMEOUT,
                        userId: user.id,
                        moderatorId: moderator.id,
                        reason,
                        duration
                    }
                });
                break;
            }
            case "remove": {
                await member.timeout(null, reason);
                caseData = { type: CaseType.TIMEOUT, reason };
                break;
            }
        }

        await logModAction(
            interaction,
            user,
            moderator,
            caseData
        );
    }
});
