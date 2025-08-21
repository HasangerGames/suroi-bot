import { CaseType } from "@prisma/client";
import { Colors, EmbedBuilder, Events, type Snowflake } from "discord.js";
import { Config } from "../../utils/config";
import { EventHandler } from "../../utils/eventHandler";
import { createMessageLink, getModLogChannel, getTextChannelById, logModAction, prisma, standardNumberFormat } from "../../utils/misc";
import { getLevelForXp, getLevelInfoForXp } from "../../utils/xp";

const messageCounts = new Map<Snowflake, number>();
const xpAwardedUsers = new Set<Snowflake>();
let messageCountsLastCleared = 0;

export default new EventHandler(Events.MessageCreate, async message => {
    if (message.guildId !== Config.mainGuildId || message.partial) return;

    if (message.author.bot) return;

    const member = message.member;
    if (!member) return;

    const userId = message.author.id;
    const isCountingChannel = message.channelId === Config.countingChannelId;

    const now = Date.now();
    if (now - messageCountsLastCleared > 5000) {
        messageCountsLastCleared = now;
        messageCounts.clear();
        xpAwardedUsers.clear();
    }

    const messageCount = (messageCounts.get(userId) ?? 0) + 1;
    messageCounts.set(userId, messageCount);

    if (messageCount > 7 && !member?.isCommunicationDisabled()) {
        const embed = new EmbedBuilder()
            .setDescription(`### 🚨 Spam detected for user <@${userId}> in <#${message.channelId}>\n${createMessageLink(message)}`)
            .setColor(Colors.Red)
            .setTimestamp();
        const logChannel = await getModLogChannel(message.guild);
        logChannel.send({ embeds: [embed] });

        if (member?.moderatable) {
            const duration = 300000; // 5 minutes
            const reason = "Spamming (7+ messages in 5 seconds)";
            const bot = await message.client.users.fetch(Config.clientId);

            member.timeout(duration, reason);

            const caseData = await prisma.case.create({
                data: {
                    type: CaseType.TIMEOUT,
                    userId: member.id,
                    moderatorId: bot.id,
                    reason,
                    duration
                }
            });

            await logModAction(
                message.guild,
                message.author,
                bot,
                caseData
            )
        }
    } else if (!xpAwardedUsers.has(userId) && (!isCountingChannel || Math.random() < 0.5)) {
        //                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 50% chance of awarding XP in counting channel
        xpAwardedUsers.add(userId);

        const awardedXp = isCountingChannel ? 1 : 5;

        const user = await prisma.user.findUnique({ where: { userId } });
        if (user?.levelNotifs) {
            const oldXp = user.xp;
            const newXp = oldXp + awardedXp;
            const oldLevel = getLevelForXp(oldXp);
            const newLevel = getLevelForXp(newXp);
            if (newLevel > oldLevel) {
                const rank = await prisma.user.count({ where: { xp: { gt: newXp } } }) + 1;
                const { relativeXp, xpForNextLevel } = getLevelInfoForXp(newXp);
                const embed = new EmbedBuilder()
                    .setThumbnail(member.displayAvatarURL())
                    .setTitle("⏫ Level Up!")
                    .setDescription(`<@${userId}> just reached level **${newLevel}**!`)
                    .addFields(
                        { name: "Rank", value: `#${rank}`, inline: true },
                        { name: "Total XP", value: standardNumberFormat.format(newXp), inline: true },
                        { name: "XP to Next Level", value: standardNumberFormat.format(xpForNextLevel - relativeXp), inline: true },
                        { name: " ", value: "-# You can disable these notifications using the \`/levelnotifs off\` command." }
                    )
                    .setColor(Colors.Fuchsia)
                    .setTimestamp();
                const levelingChannel = await getTextChannelById(message.guild, Config.levelingChannelId);
                await levelingChannel.send({ content: `<@${userId}>`, embeds: [embed] });
            }
        }

        await prisma.user.upsert({
            where: { userId },
            create: { userId, xp: awardedXp },
            update: {
                xp: { increment: awardedXp },
                lastMessageTime: new Date()
            }
        });
    }

    if (isCountingChannel) {
        const previousMessage = (await message.channel.messages.fetch({ limit: 2 }))?.at(1);
        if (
            !previousMessage
            // prevents the same user from sending 2 messages in a row
            || previousMessage.author.id === userId
            // ensures each message contains a number exactly 1 larger than the previous
            || Number(message.content) !== Number(previousMessage.content) + 1
        ) {
            await message.delete();
        }
    }
});
