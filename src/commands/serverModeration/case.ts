import { ActionRowBuilder, type APIEmbedField, ButtonBuilder, type ButtonInteraction, ButtonStyle, type ChatInputCommandInteraction, Colors, ComponentType, EmbedBuilder, type MessageActionRowComponentBuilder, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { caseDurationToString, getModLogChannel, modActionData, prisma } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("case")
        .setDescription("Commands for managing moderation cases")
        .addSubcommand(subcommand => subcommand
            .setName("list")
            .setDescription("List a user's cases")
            .addUserOption(option => option
                .setName("user")
                .setDescription("The user to list cases for")
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName("page")
                .setDescription("The page of cases to view")
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("info")
            .setDescription("Get information about a specific case")
            .addIntegerOption(option => option
                .setName("number")
                .setDescription("The case number")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("delete")
            .setDescription("Delete a case")
            .addIntegerOption(option => option
                .setName("number")
                .setDescription("The case number")
                .setRequired(true)
            )
        ),
    cooldown: 5000,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand() as "list" | "info" | "delete";

        switch (subcommand) {
            case "list": {
                const user = interaction.options.getUser("user");
                if (!user) {
                    const embed = new EmbedBuilder()
                        .setTitle(`❌ Unknown user`)
                        .setDescription("Could not find that user.")
                        .setColor(Colors.Red);
                    await interaction.followUp({ embeds: [embed] });
                    return;
                }

                const count = await prisma.case.count({
                    where: { userId: user.id }
                });

                const pageCount = Math.ceil(count / 5);

                let page = (interaction.options.getInteger("page") ?? 1) - 1;
                if (page < 0 || page > pageCount) {
                    const embed = new EmbedBuilder()
                        .setTitle(`❌ Invalid page`)
                        .setDescription(`Please enter a page number between 1 and ${pageCount}.`)
                        .setColor(Colors.Red);
                    await interaction.followUp({ embeds: [embed] });
                    return;
                }

                const getCaseFields = async(): Promise<APIEmbedField[]> => {
                    const cases = await prisma.case.findMany({
                        where: { userId: user.id },
                        orderBy: { id: "desc" },
                        take: 5,
                        skip: 5 * page
                    });

                    return cases.map(c => {
                        const actionData = modActionData[c.type];
                        const duration = Number(c.duration);
                        return {
                            name: `Case #**${c.id}**`,
                            value:
                                `||||| **Type**: ${actionData.name}\n` +
                                `||||| **Reason**: ${c.reason}\n` +
                                (duration ? `||||| **${actionData.durationText}**: ${caseDurationToString[duration]}\n` : "") +
                                `||||| **Date**: <t:${Math.round(c.createdAt.getTime() / 1000)}:F>\n` +
                                (duration && duration !== -1 ? `||||| **${actionData.expirationText}**: <t:${Math.round((c.createdAt.getTime() + duration) / 1000)}:${actionData.expirationFormat}>\n` : "") +
                                `||||| **Moderator**: <@${c.moderatorId}>`
                        }
                    });
                };

                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL()
                    })
                    .setTitle(`🔨 ${count} ${count === 1 ? "case" : "cases"} for **${user.displayName}**`)
                    .addFields(await getCaseFields())
                    .setColor(Colors.Aqua)
                    .setFooter({ text: `User ID: ${user.id}` });

                let previousBtn: ButtonBuilder;
                let currentPageBtn: ButtonBuilder;
                let nextBtn: ButtonBuilder;
                let row: ActionRowBuilder<MessageActionRowComponentBuilder> | undefined;
                if (count > 5) {
                    previousBtn = new ButtonBuilder()
                        .setCustomId("previous")
                        .setLabel("<-")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page < 1);
                    currentPageBtn = new ButtonBuilder()
                        .setCustomId("page")
                        .setLabel(`Page ${page + 1}/${pageCount}`)
                        .setStyle(ButtonStyle.Secondary);
                    nextBtn = new ButtonBuilder()
                        .setCustomId("next")
                        .setLabel("->")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page > pageCount - 2);
                    row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .addComponents(previousBtn, currentPageBtn, nextBtn);
                }

                const message = await interaction.followUp({
                    embeds: [embed],
                    components: row ? [row] : undefined
                });

                if (!row) break;

                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000
                });

                collector.on("collect", async(i: ButtonInteraction) => {
                    await i.deferUpdate();

                    switch (i.customId) {
                        case "previous":
                            page = Math.max(page - 1, 0);
                            break;
                        case "page":
                            page = page === pageCount - 1 ? 0 : pageCount - 1;
                            break;
                        case "next":
                            page = Math.min(page + 1, pageCount - 1);
                            break;
                    }

                    embed.setFields(await getCaseFields());

                    previousBtn.setDisabled(page < 1);
                    currentPageBtn.setLabel(`Page ${page + 1}/${pageCount}`);
                    nextBtn.setDisabled(page > pageCount - 2);

                    i.editReply({ embeds: [embed], components: [row] });
                });

                collector.on("end", () => {
                    previousBtn.setDisabled(true);
                    currentPageBtn.setDisabled(true);
                    nextBtn.setDisabled(true);
                    interaction.editReply({ components: [row] });
                });
                break;
            }
            case "info":
            case "delete": {
                if (!(interaction.member?.permissions as Readonly<PermissionsBitField>).has(PermissionsBitField.Flags.BanMembers)) {
                    const embed = new EmbedBuilder()
                        .setTitle("❌ Insufficient permissions")
                        .setDescription("You must be a moderator to use this command.")
                        .setColor(Colors.Red);
                    await interaction.followUp({ embeds: [embed] });
                    break;
                }

                const id = interaction.options.getInteger("number", true);
                const userCase = await prisma.case.findUnique({ where: { id } });
                if (!userCase) {
                    const embed = new EmbedBuilder()
                        .setTitle("❌ Case not found")
                        .setDescription(`Could not find case **#${id}**.`)
                        .setColor(Colors.Red);
                    await interaction.followUp({ embeds: [embed] });
                    return;
                }

                const user = await interaction.client.users.fetch(userCase.userId);
                const actionData = modActionData[userCase.type];
                const duration = Number(userCase.duration);

                const embedFields: APIEmbedField[] = [
                    { name: "User", value: `<@${user.id}>` },
                    { name: "Type", value: actionData.name, inline: duration !== 0 },
                    ...(
                        duration
                            ? [{ name: actionData.durationText ?? "", value: caseDurationToString[duration] ?? "Unknown", inline: true }]
                            : []
                    ),
                    { name: "Reason", value: userCase.reason },
                    { name: "Date", value: `<t:${Math.round(userCase.createdAt.getTime() / 1000)}:F>` },
                    ...(
                        duration && duration !== -1
                            ? [{ name: actionData.expirationText ?? "", value: `<t:${Math.round((userCase.createdAt.getTime() + duration) / 1000)}:${actionData.expirationFormat}>`, inline: true }]
                            : []
                    ),
                    { name: "Responsible Moderator", value: `<@${userCase.moderatorId}>` },
                ];

                const isInfo = subcommand === "info";

                const deleteEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL() ?? undefined
                    })
                    .setTitle(`${actionData.emoji} ${isInfo ? "Case" : "Deleting Case"} #**${id}**`)
                    .addFields(embedFields)
                    .setColor(isInfo ? Colors.Aqua : Colors.Red)
                    .setFooter({ text: `User ID: ${user.id}` });

                if (isInfo) {
                    await interaction.followUp({ embeds: [deleteEmbed] });
                    break;
                }

                deleteEmbed.setTimestamp();

                const cancelBtn = new ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary);
                const confirmBtn = new ButtonBuilder()
                    .setCustomId("confirm")
                    .setLabel("🗑️ Delete Case (CANNOT UNDO!)")
                    .setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(cancelBtn, confirmBtn);

                const message = await interaction.followUp({
                    embeds: [deleteEmbed],
                    components: [row]
                });

                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter: i => i.user.id === interaction.user.id,
                    time: 20000
                });

                collector.on("collect", async(i: ButtonInteraction) => {
                    await i.deferUpdate();

                    if (i.customId === "confirm") {
                        await prisma.case.delete({ where: { id } });

                        deleteEmbed
                            .setTitle(`${actionData.emoji} Case #**${id}** Deleted`)
                            .addFields({ name: "Case Deleted By", value: `<@${interaction.user.id}>` });
                        const logChannel = await getModLogChannel(interaction.guild);
                        logChannel.send({ embeds: [deleteEmbed] });

                        const embed = new EmbedBuilder()
                            .setTitle("✅ Case deleted")
                            .setDescription(`Case **#${id}** deleted successfully.`)
                            .setColor(Colors.DarkGreen);
                        await i.followUp({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle("❌ Deletion canceled")
                            .setColor(Colors.Red);
                        await i.followUp({ embeds: [embed] });
                    }

                    cancelBtn.setDisabled(true);
                    confirmBtn.setDisabled(true);
                    await interaction.editReply({ components: [row] });
                });

                collector.on("end", async() => {
                    cancelBtn.setDisabled(true);
                    confirmBtn.setDisabled(true);
                    await interaction.editReply({ components: [row] });
                });
                break;
            }
        }
    }
});
