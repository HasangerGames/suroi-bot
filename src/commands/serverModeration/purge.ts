import { ActionRowBuilder, ButtonBuilder, type ButtonInteraction, ButtonStyle, type ChatInputCommandInteraction, Colors, ComponentType, EmbedBuilder, type GuildTextBasedChannel, type MessageActionRowComponentBuilder, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { Config } from "../../utils/config";
import { createMessageLink, getModLogChannel, logDeletedMessage } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Purge messages from the current channel")
        .addIntegerOption(option => option
            .setName("count")
            .setDescription("The number of messages to purge")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addBooleanOption(option => option
            .setName("log")
            .setDescription("Whether to log the deleted messages (defaults to True)")
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    cooldown: 30000,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.channel || interaction.channel.isDMBased()) throw new Error("Invalid channel");

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const count = interaction.options.getInteger("count", true);

        const messages = await interaction.channel.messages.fetch({ limit: count });
        const messageCount = `**${count}** ${count === 1 ? "message" : "messages"}`;
        const firstMessage = messages?.at(-1);

        const embed = new EmbedBuilder()
            .setDescription(
                `### 🗑️ Confirm purge of ${messageCount} from <#${interaction.channelId}>\n` +
                `${createMessageLink(firstMessage, "Jump to first message")}\n` +
                `Are you sure you want to **permanently delete** the last ${messageCount} from this channel?\n` +
                `**WARNING: THIS ACTION CANNOT BE UNDONE!**`
            )
            .setColor(Colors.Red)
            .setTimestamp();

        const cancelBtn = new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary);
        const confirmBtn = new ButtonBuilder()
            .setCustomId("confirm")
            .setLabel(`Delete ${count} ${count === 1 ? "Message" : "Messages"}`)
            .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(cancelBtn, confirmBtn);

        const message = await interaction.followUp({
            embeds: [embed],
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            max: 1,
            time: 30000
        });

        collector.on("collect", async(i: ButtonInteraction) => {
            await i.deferUpdate();

            cancelBtn.setDisabled(true);
            confirmBtn.setDisabled(true);

            if (i.customId === "confirm") {
                await (interaction.channel as GuildTextBasedChannel).bulkDelete(messages);

                const embed = new EmbedBuilder()
                    .setTitle("✅ Messages purged")
                    .setDescription(`Successfully deleted ${messageCount} from <#${interaction.channelId}>.`)
                    .setColor(Colors.DarkGreen)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed], components: [row] });

                const logChannel = await getModLogChannel(interaction.guild);

                if (
                    (interaction.options.getBoolean("log") ?? true)
                    && interaction.channelId !== Config.moderationLogChannelId // allows purging mod logs without the deleted messages being logged
                    && messages.size > 1 // deleting a single message emits a messageDelete event, so no need to log separately here
                ) {
                    for (const [, message] of messages) {
                        await logDeletedMessage(message, logChannel);
                    }
                }

                const logEmbed = new EmbedBuilder()
                    .setDescription(`### 🗑️ ${messageCount} purged from <#${interaction.channelId}> by <@${interaction.user.id}>`)
                    .setColor(Colors.Red)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle("❌ Purge canceled")
                    .setColor(Colors.Red);
                await interaction.editReply({ embeds: [embed], components: [row] });
            }
        });

        collector.on("end", async() => {
            cancelBtn.setDisabled(true);
            confirmBtn.setDisabled(true);
            await interaction.editReply({ components: [row] });
        });
    }
});
