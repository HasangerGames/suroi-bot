import { CaseType } from "@prisma/client";
import { type ChatInputCommandInteraction, Colors, EmbedBuilder, PermissionsBitField, SlashCommandBuilder, type User } from "discord.js";
import { Command } from "../../utils/command";
import { type CaseData, logModAction, modActionPreCheck, prisma } from "../../utils/misc";

const appealDurations = [
    { name: "1 month",     value: 2629800000 },
    { name: "2 months",    value: 5259600000 },
    { name: "3 months",    value: 7889400000 },
    { name: "6 months",    value: 15778800000 },
    { name: "1 year",      value: 31557600000 },
    { name: "Never",       value: -1 }
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
            .addIntegerOption(option => option
                .setName("delete_messages")
                .setDescription("How much of the user's message history to delete")
                .addChoices(
                    { name: "Previous hour",     value: 3600 },
                    { name: "Previous 6 hours",  value: 21600 },
                    { name: "Previous 12 hours", value: 43200 },
                    { name: "Previous day",      value: 86400 },
                    { name: "Previous 3 days",   value: 259200 },
                    { name: "Previous week",     value: 604800 }
                )
            )
            .addIntegerOption(option => option
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
        const reason = interaction.options.getString("reason", true);
        let caseData: CaseData;
        let callback: (() => Promise<unknown>) | undefined;

        switch (interaction.options.getSubcommand() as "add" | "remove") {
            case "add": {
                const data = await modActionPreCheck(interaction, "ban", "bannable");
                if (!data) return;

                user = data.user;
                const { member, moderator } = data;
                const duration = interaction.options.getInteger("appeal") ?? -1;
                const deleteMessageSeconds = interaction.options.getInteger("delete_messages") ?? undefined;

                callback = async() => await member.ban({ reason, deleteMessageSeconds });

                caseData = await prisma.case.create({
                    data: {
                        type: CaseType.BAN,
                        userId: user.id,
                        moderatorId: moderator.id,
                        reason,
                        duration
                    }
                });
                break;
            }
            case "remove": {
                const id = interaction.options.getString("id", true);

                user = await interaction.client.users.fetch(id);
                if (!user) {
                    const embed = new EmbedBuilder()
                        .setTitle("❌ Unknown user")
                        .setDescription("Could not find that user.")
                        .setColor(Colors.Red);
                    await interaction.followUp({ embeds: [embed] });
                    return;
                }

                const guild = interaction.guild;
                if (!guild) throw new Error("Unknown guild");

                const bans = await guild.bans.fetch();
                if (!bans.has(id)) {
                    const embed = new EmbedBuilder()
                        .setTitle("❌ Unable to unban user")
                        .setDescription("User is not banned from this server.")
                        .setColor(Colors.Red);
                    await interaction.followUp({ embeds: [embed] });
                    return;
                }

                await guild.members.unban(user, reason);

                caseData = { type: CaseType.BAN, reason };
                break;
            }
        }

        await logModAction(
            interaction,
            user,
            interaction.user,
            caseData,
            callback
        );
    }
});
