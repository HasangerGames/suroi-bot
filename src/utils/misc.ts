import { PrismaClient } from "@prisma/client";
import { ChannelType, EmbedBuilder, GuildMember, MessageFlags, User, type APIEmbedField, type ChatInputCommandInteraction } from "discord.js";
import { Config } from "./config";

export const prisma = new PrismaClient();

export function pickRandomInArray<T>(array: T[]): T {
    if (!array.length) throw new RangeError("Empty array");
    return array[Math.floor(Math.random() * array.length)] as T;
}

export async function sendModActionEmbeds(
    interaction: ChatInputCommandInteraction,
    user: User,
    moderator: User,
    userActionText: string,
    modActionText: string,
    reason: string,
    embedFields: APIEmbedField[] | undefined,
    embedColor: number
) {
    embedFields ??= [];
    embedFields.unshift({ name: "Reason", value: reason });
    embedFields.push({ name: "Responsible Moderator", value: `<@${moderator.id}>` });

    const dmEmbed = new EmbedBuilder()
        .setAuthor({
            name: moderator.displayName,
            iconURL: moderator.avatarURL() ?? undefined
        })
        .setTitle(`🔨 You have been ${userActionText} **Suroi**`)
        .addFields(embedFields)
        .setColor(embedColor)
        .setTimestamp();
    user.send({ embeds: [dmEmbed] });

    const modEmbed = new EmbedBuilder()
        .setAuthor({
            name: user.username,
            iconURL: user.avatarURL() ?? undefined
        })
        .setTitle(`🔨 ${modActionText} **${user.displayName}**`)
        .addFields(embedFields)
        .setColor(embedColor)
        .setFooter({ text: `User ID: ${user.id}` })
        .setTimestamp();
    interaction.followUp({ embeds: [modEmbed] });

    if (!interaction.guild) throw new Error("Guild not found");
    const logChannel = await interaction.guild.channels.fetch(Config.moderationLogChannelId);
    if (!logChannel) throw new Error("Moderation log channel not found");
    if (logChannel.type !== ChannelType.GuildText) throw new Error("Moderation log channel is not a text channel");
    logChannel.send({ embeds: [modEmbed] });
}

export async function modActionPreCheck(
    interaction: ChatInputCommandInteraction,
    actionType: string,
    guardProp: keyof GuildMember
): Promise<{ member: GuildMember, user: User, moderator: User, userId: string, moderatorId: string } | undefined> {
    const member = interaction.options.getMember("user");

    if (!(member instanceof GuildMember)) {
        const embed = new EmbedBuilder()
            .setTitle(`❌ Unknown user`)
            .setDescription("Could not find that user.")
            .setColor(EmbedColors.error);
        interaction.followUp({ embeds: [embed] });
        return;
    }

    if (!member[guardProp]) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: member.user.username,
                iconURL: member.user.avatarURL() ?? undefined
            })
            .setTitle(`❌ Unable to ${actionType} **${member.displayName}**`)
            .setDescription("This user is immune to this action")
            .setColor(EmbedColors.error);
        interaction.followUp({ embeds: [embed] });
        return;
    }

    const userId = member.id;

    await prisma.user.upsert({
        where: { userId },
        update: {},
        create: { userId }
    });

    return {
        member,
        user: member.user,
        moderator: interaction.user,
        userId,
        moderatorId: interaction.user.id
    };
}

export const EmbedColors = {
    important: 0x007bff,
    success: 0x28a745,
    info: 0x17a2b8,
    warning: 0xffc107,
    error: 0xdc3545
};

export function simpleEmbed(title: string, description: string | null, color = EmbedColors.info) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);
}

export function simpleEmbedFollowUp(
    interaction: ChatInputCommandInteraction,
    title: string,
    description: string | null,
    color = EmbedColors.info,
    ephemeral = false
) {
    const embed = simpleEmbed(title, description, color);
    interaction.followUp({
        embeds: [embed],
        flags: ephemeral ? [MessageFlags.Ephemeral] : undefined
    });
}
