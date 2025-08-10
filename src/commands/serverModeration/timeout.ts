import { CaseType } from "@prisma/client";
import { ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder, type APIEmbedField } from "discord.js";
import { Command } from "../../utils/command";
import { EmbedColors, modActionPreCheck, prisma, sendModActionEmbeds } from "../../utils/misc";

const timeoutDurations = [
    { name: "1 minute",   value: "60000" },
    { name: "5 minutes",  value: "300000" },
    { name: "10 minutes", value: "600000" },
    { name: "30 minutes", value: "1800000" },
    { name: "1 hour",     value: "3600000" },
    { name: "2 hours",    value: "7200000" },
    { name: "6 hours",    value: "21600000" },
    { name: "12 hours",   value: "43200000" },
    { name: "1 day",      value: "86400000" },
    { name: "2 days",     value: "172800000" },
    { name: "1 week",     value: "604800000" },
    { name: "2 weeks",    value: "1209600000" },
    { name: "1 month",    value: "2419200000" }
];

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
            .addStringOption(option => option
                .setName("duration")
                .setDescription("Duration of the timeout")
                .setRequired(true)
                .addChoices(timeoutDurations)
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
        const subcommand = interaction.options.getSubcommand() as "add" | "remove";
        const isTimeout = subcommand === "add";
        let embedFields: APIEmbedField[] | undefined;

        switch (subcommand) {
            case "add":
                const durationStr = interaction.options.getString("duration", true);
                const duration = parseInt(durationStr);

                member.timeout(duration, reason);

                const userCase = await prisma.case.create({
                    data: {
                        type: CaseType.TIMEOUT,
                        userId: user.id,
                        moderatorId: moderator.id,
                        reason,
                        duration
                    }
                });

                embedFields = [
                    { name: "Duration", value: timeoutDurations.find(t => t.value === durationStr)?.name ?? "Unknown", inline: true },
                    { name: "Case ID", value: `\`${userCase.id}\``, inline: true },
                    { name: "Expires", value: `<t:${Math.round((Date.now() + duration) / 1000)}:F>` },
                ];
                break;
            case "remove":
                member.timeout(null, reason);
                break;
        }

        sendModActionEmbeds(
            interaction,
            user,
            moderator,
            isTimeout ? "timed out in" : "removed from timeout in",
            isTimeout ? "Timed out" : "Removed timeout from",
            reason,
            embedFields,
            isTimeout ? EmbedColors.error : EmbedColors.success
        );
    }
});
