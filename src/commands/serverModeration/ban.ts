import { CaseType } from "@prisma/client";
import { ChatInputCommandInteraction, EmbedBuilder, PermissionsBitField, SlashCommandBuilder, User, type APIEmbedField } from "discord.js";
import { Command } from "../../utils/command";
import { EmbedColors, modActionPreCheck, prisma, sendModActionEmbeds } from "../../utils/misc";

const appealDurations = [
    { name: "Immediately", value: "0" },
    { name: "1 month",     value: "2629746000" },
    { name: "2 months",    value: "5259492000" },
    { name: "3 months",    value: "5259492000" },
    { name: "6 months",    value: "15778476000" },
    { name: "1 year",      value: "31556952000" },
    { name: "Never",       value: "-1" }
];

export default new Command({
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Commands for managing bans")
        .addSubcommand(subcommand => subcommand
            .setName("add")
            .setDescription("Ban a user")
            .addUserOption(option => option
                .setName("user")
                .setDescription("The user to ban")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Reason for the ban")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("delete_messages")
                .setDescription("How much of the user's message history to delete")
                .addChoices(
                    { name: "Previous hour", value: "3600" },
                    { name: "Previous 6 hours", value: "21600" },
                    { name: "Previous 12 hours", value: "43200" },
                    { name: "Previous day", value: "86400" },
                    { name: "Previous 3 days", value: "259200" },
                    { name: "Previous week", value: "604800" }
                )
            )
            .addStringOption(option => option
                .setName("appeal")
                .setDescription("Time after which the user is allowed to appeal (defaults to Never)")
                .addChoices(appealDurations)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("remove")
            .setDescription("Unban a user")
            .addStringOption(option => option
                .setName("id")
                .setDescription("The ID of the user to unban")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Reason for the unban")
                .setRequired(true)
            )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
    cooldown: 0,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        let user: User;
        const subcommand = interaction.options.getSubcommand() as "add" | "remove";
        const isBan = subcommand === "add";
        const reason = interaction.options.getString("reason", true);
        let embedFields: APIEmbedField[] | undefined;

        switch (subcommand) {
            case "add":
                const data = await modActionPreCheck(interaction, "ban", "bannable");
                if (!data) return;

                user = data.user;
                const { member, moderator } = data;
                const appealStr = interaction.options.getString("appeal", true);
                const duration = parseInt(appealStr);
                const deleteMessages = interaction.options.getString("delete_messages");
                const deleteMessageSeconds = deleteMessages ? parseInt(deleteMessages) : undefined;

                member.ban({ reason, deleteMessageSeconds });

                const userCase = await prisma.case.create({
                    data: {
                        type: CaseType.BAN,
                        userId: user.id,
                        moderatorId: moderator.id,
                        reason,
                        duration
                    }
                });

                embedFields = [
                    { name: "Appeal After", value: appealDurations.find(t => t.value === appealStr)?.name ?? "Unknown", inline: true },
                    { name: "Case ID", value: `\`${userCase.id}\``, inline: true }
                ];
                if (duration !== -1) {
                    embedFields.push({ name: "Appeal Date", value: `<t:${Math.round((Date.now() + duration) / 1000)}:D>` });
                }
                break;
            case "remove":
                user = await interaction.client.users.fetch(interaction.options.getString("id", true));
                if (!user) {
                    const embed = new EmbedBuilder()
                        .setTitle(`❌ Unknown user`)
                        .setDescription("Could not find that user.")
                        .setColor(EmbedColors.error);
                    interaction.followUp({ embeds: [embed] });
                    return;
                }

                const guild = interaction.guild;
                if (!guild) throw new Error("Unknown guild");

                guild.members.unban(user, reason);
                break;
        }

        sendModActionEmbeds(
            interaction,
            user,
            interaction.user,
            isBan ? "banned from" : "unbanned from",
            isBan ? "Banned" : "Unbanned",
            reason,
            embedFields,
            isBan ? EmbedColors.error : EmbedColors.success
        );
    }
});
