import { CaseType, PrismaClient } from "@prisma/client";
import { type APIEmbedField, ChannelType, type ChatInputCommandInteraction, Colors, EmbedBuilder, type Guild, GuildMember, type TextChannel, type User } from "discord.js";
import { Config } from "./config";

export const prisma = new PrismaClient();

export function pickRandomInArray<T>(array: T[]): T {
    if (!array.length) throw new RangeError("Empty array");
    return array[Math.floor(Math.random() * array.length)] as T;
}

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

export async function sendModActionEmbeds(
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

    if (caseWasAdded) {
        embedFields.push({ name: `Case **#${caseId}**`, value: " " });
    }

    embedFields.push({ name: "Reason", value: reason });

    if (duration) {
        embedFields.push({ name: durationText ?? "", value: caseDurationToString[duration] ?? "Unknown", inline: duration !== -1 });
        if (duration !== -1) {
            embedFields.push({ name: expirationText ?? "", value: `<t:${Math.round((Date.now() + duration) / 1000)}:${expirationFormat}>`, inline: true });
        }
    }

    embedFields.push({ name: "Responsible Moderator", value: `<@${moderator.id}>` });

    if (type !== CaseType.BAN || caseWasAdded) { // we can't tell users they were unbanned because the bot doesn't share a guild with them
        const dmEmbed = new EmbedBuilder()
            .setAuthor({
                name: moderator.displayName,
                iconURL: moderator.displayAvatarURL() ?? undefined
            })
            .setTitle(`${emoji} You have been ${caseWasAdded ? userAddedText : userRemovedText} **Suroi**`)
            .addFields(embedFields)
            .setColor(embedColor)
            .setTimestamp();
        await user.send({ embeds: [dmEmbed] });
    }

    await callback?.();

    const modEmbed = new EmbedBuilder()
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL() ?? undefined
        })
        .setTitle(`${emoji} ${caseWasAdded ? modAddedText : modRemovedText} **${user.displayName}**`)
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
    guardProp: keyof GuildMember
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

    if (!member[guardProp]) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: member.user.username,
                iconURL: member.user.avatarURL() ?? undefined
            })
            .setTitle(`❌ Unable to ${actionType} **${member.displayName}**`)
            .setDescription("This user is immune to this action")
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

export async function getModLogChannel(guild: Guild | null): Promise<TextChannel> {
    if (!guild) throw new Error("Guild not found");
    const logChannel = await guild.channels.fetch(Config.moderationLogChannelId);
    if (!logChannel) throw new Error("Moderation log channel not found");
    if (logChannel.type !== ChannelType.GuildText) throw new Error("Moderation log channel is not a text channel");
    return logChannel;
}
