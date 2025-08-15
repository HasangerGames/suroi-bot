import { CaseType, PrismaClient } from "@prisma/client";
import { type APIEmbedField, type Attachment, ChannelType, type ChatInputCommandInteraction, Colors, EmbedBuilder, type Guild, GuildMember, type Message, type PartialMessage, type TextChannel, type User } from "discord.js";
import { Config } from "./config";

export const prisma = new PrismaClient();

export function pickRandomInArray<T>(array: T[]): T {
    if (!array.length) throw new RangeError("Empty array");
    return array[Math.floor(Math.random() * array.length)] as T;
}

export const linkRegex = /<(@|@&|#|:[^\s]*:)\d+>|<t:\d+:[FfDdTtR]>|https?:\/\//;

export const truncateString = (content: string, maxLength: number): string => content.length > maxLength ? `${content.slice(0, maxLength - 1)}…` : content;

export const caseDurationToString: Record<number, string> = {
    "60000": "1 minute",
    "300000": "5 minutes",
    "600000": "10 minutes",
    "1800000": "30 minutes",
    "3600000": "1 hour",
    "7200000": "2 hours",
    "21600000": "6 hours",
    "43200000": "12 hours",
    "86400000": "1 day",
    "172800000": "2 days",
    "604800000": "1 week",
    "1209600000": "2 weeks",
    // the shorter duration for 1 month is actually 28 days, used for timeouts because 28 days is the max
    "2419200000": "1 month",
    "2629800000": "1 month",
    "5259600000": "2 months",
    "7889400000": "3 months",
    "15778800000": "6 months",
    "31557600000": "1 year",
    "-1": "Never"
};

interface ModActionData {
    readonly name: string
    readonly emoji: string
    readonly durationText?: string
    readonly expirationText?: string
    readonly expirationFormat?: "f" | "F" | "d" | "D" | "t" | "T" | "R"
    readonly userAddedText?: string
    readonly userRemovedText?: string
    readonly modAddedText: string
    readonly modRemovedText?: string
    readonly addedColor: number
}

export const modActionData: Record<CaseType, ModActionData> = {
    VERBAL_WARNING: {
        name: "Verbal Warning",
        emoji: "⚠️",
        modAddedText: "Verbally warned",
        modRemovedText: "Removed verbal warning from",
        addedColor: Colors.Yellow
    },
    WARNING: {
        name: "Warning",
        emoji: "⚠️",
        userAddedText: "warned in",
        modAddedText: "Warned",
        addedColor: Colors.Gold
    },
    TIMEOUT: {
        name: "Timeout",
        emoji: "⏲️",
        durationText: "Duration",
        expirationText: "Expires",
        expirationFormat: "f",
        userAddedText: "timed out in",
        userRemovedText: "removed from timeout in",
        modAddedText: "Timed out",
        modRemovedText: "Removed timeout from",
        addedColor: Colors.Orange
    },
    KICK: {
        name: "Kick",
        emoji: "🦵",
        userAddedText: "kicked from",
        modAddedText: "Kicked",
        addedColor: Colors.DarkRed
    },
    BAN: {
        name: "Ban",
        emoji: "🔨",
        durationText: "Appeal After",
        expirationText: "Appeal Date",
        expirationFormat: "D",
        userAddedText: "banned from",
        userRemovedText: "unbanned from",
        modAddedText: "Banned",
        modRemovedText: "Unbanned",
        addedColor: Colors.Red
    }
};

export interface CaseData {
    readonly type: CaseType
    readonly id?: number
    readonly reason: string
    readonly duration?: bigint | number
}

export async function logModAction(
    interaction: ChatInputCommandInteraction,
    user: User,
    moderator: User,
    { type, id: caseId, reason, duration }: CaseData,
    callback?: () => Promise<unknown>
) {
    const {
        emoji,
        durationText,
        expirationText,
        expirationFormat,
        userAddedText,
        userRemovedText,
        modAddedText,
        modRemovedText,
        addedColor
    } = modActionData[type];
    const caseWasAdded = caseId !== undefined;
    const embedColor = caseWasAdded ? addedColor : Colors.DarkGreen;
    duration = duration !== undefined ? Number(duration) : undefined;

    const embedFields: APIEmbedField[] = [];

    embedFields.push({ name: "Reason", value: reason });

    if (duration) {
        embedFields.push({ name: durationText ?? "", value: caseDurationToString[duration] ?? "Unknown", inline: duration !== -1 });
        if (duration !== -1) {
            embedFields.push({ name: expirationText ?? "", value: `<t:${Math.round((Date.now() + duration) / 1000)}:${expirationFormat}>`, inline: true });
        }
    }

    embedFields.push({ name: "Responsible Moderator", value: `<@${moderator.id}>` });

    if (type !== CaseType.BAN || caseWasAdded) { // we can't tell users they were unbanned because the bot doesn't share a guild with them
        try {
            const dmEmbed = new EmbedBuilder()
                .setAuthor({
                    name: moderator.displayName,
                    iconURL: moderator.displayAvatarURL() ?? undefined
                })
                .setTitle(`${emoji} You have been ${caseWasAdded ? userAddedText : userRemovedText} **Suroi**`)
                .setDescription(caseWasAdded ? `**Case #${caseId}**` : null)
                .addFields(embedFields)
                .setColor(embedColor)
                .setTimestamp();
            await user.send({ embeds: [dmEmbed] });
        } catch (e) {
            console.error("Unable to DM user to inform them of mod action. Details:");
            console.error(e);
        }
    }

    await callback?.();

    const modEmbed = new EmbedBuilder()
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL() ?? undefined
        })
        .setDescription(
            `### ${emoji} ${caseWasAdded ? modAddedText : modRemovedText} <@${user.id}>` +
            (caseWasAdded ? `\n**Case #${caseId}**` : "")
        )
        .addFields(embedFields)
        .setColor(embedColor)
        .setFooter({ text: `User ID: ${user.id}` })
        .setTimestamp();
    await interaction.followUp({ embeds: [modEmbed] });

    const logChannel = await getModLogChannel(interaction.guild);
    await logChannel.send({ embeds: [modEmbed] });
}

export async function modActionPreCheck(
    interaction: ChatInputCommandInteraction,
    actionType: string,
    guardProp?: keyof GuildMember
): Promise<{ member: GuildMember, user: User, moderator: User } | undefined> {
    const member = interaction.options.getMember("user");

    if (!(member instanceof GuildMember)) {
        const embed = new EmbedBuilder()
            .setTitle("❌ Unknown user")
            .setDescription("Could not find that user.")
            .setColor(Colors.Red);
        await interaction.followUp({ embeds: [embed] });
        return;
    }

    if (guardProp && !member[guardProp]) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: member.user.username,
                iconURL: member.user.displayAvatarURL() ?? undefined
            })
            .setDescription(`### ❌ Unable to ${actionType} <@${member.id}>\nThis user is immune to this action`)
            .setColor(Colors.Red);
        await interaction.followUp({ embeds: [embed] });
        return;
    }

    return {
        member,
        user: member.user,
        moderator: interaction.user
    };
}

export async function logDeletedMessage(message: Message, logChannel: TextChannel) {
    if (message.content) {
        const author = message.author;

        const embed = new EmbedBuilder()
            .setAuthor({
                name: author.username,
                iconURL: author.displayAvatarURL()
            })
            .setDescription(
                `### 🗑️ Message by <@${author.id}> deleted in <#${message.channelId}>\n` +
                // For messages with links, we avoid using the diff view because it prevents them from resolving
                (linkRegex.test(message.content)
                    // embed descriptions have a maximum length of 4096 chars, so we truncate it here to leave room for the rest of the description
                    ? truncateString(message.content, 3896)
                    : (
                        `\`\`\`diff\n` +
                        truncateString(`- ${message.content.replaceAll("\n", "\n- ")}\n`, 3896) +
                        `\`\`\``
                    )
                )
            )
            .setColor(Colors.Red)
            .setFooter({ text: `User ID: ${author.id}` })
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });

        const gifMatches = message.content?.matchAll(/https:\/\/(tenor.com\/view\/[^\s]*|[^\s]*\.gif)/g) ?? [];
        for (const [content] of gifMatches) {
            await logChannel.send({ content });
        }
    }

    const attachments = message.attachments.values().toArray();
    if (attachments.length) {
        await logRemovedAttachments(attachments, message, logChannel);
    }
}

export async function logRemovedAttachments(files: Attachment[], message: Message | PartialMessage, logChannel: TextChannel, messageLink?: string) {
    const author = message.author;
    if (!author) return;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: author.username,
            iconURL: author.displayAvatarURL()
        })
        .setDescription(
            `### 🗑️ ${files.length === 1 ? "Attachment" : `${files.length} attachments`} by <@${author.id}> removed in <#${message.channelId}>\n` +
            (messageLink ?? "") +
            `\`\`\`diff\n` +
            `- 📎${files.map(({ name }) => name).join("\n- 📎")}\n` +
            `\`\`\``
        )
        .setColor(Colors.Red)
        .setFooter({ text: `User ID: ${author.id}` })
        .setTimestamp();

    // send them separately so the attachments appear below the embed
    await logChannel.send({ embeds: [embed] });
    await logChannel.send({ files });
}

export async function getModLogChannel(guild: Guild | null): Promise<TextChannel> {
    return await getTextChannelById(guild, Config.moderationLogChannelId);
}

export async function getTextChannelById(guild: Guild | null, id: string): Promise<TextChannel> {
    if (!guild) throw new Error("Guild not found");
    const logChannel = await guild.channels.fetch(id);
    if (!logChannel) throw new Error("Moderation log channel not found");
    if (logChannel.type !== ChannelType.GuildText) throw new Error("Moderation log channel is not a text channel");
    return logChannel;
}
