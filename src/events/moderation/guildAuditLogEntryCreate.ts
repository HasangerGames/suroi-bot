import { CaseType } from "@prisma/client";
import { AuditLogEvent, Events } from "discord.js";
import { EventHandler } from "../../utils/eventHandler";
import { caseDurationToString, logModAction, prisma } from "../../utils/misc";

export default new EventHandler(Events.GuildAuditLogEntryCreate, async(auditLogEntry, guild) => {
    const action = auditLogEntry.action;
    switch (action) {
        case AuditLogEvent.MemberUpdate:
        case AuditLogEvent.MemberKick:
        case AuditLogEvent.MemberBanAdd:
        case AuditLogEvent.MemberBanRemove: {
            const { targetId: userId, executorId: moderatorId } = auditLogEntry;
            if (!userId || !moderatorId) break;
            const user = await guild.client.users.fetch(userId);
            const moderator = await guild.client.users.fetch(moderatorId);
            const reason = auditLogEntry.reason ?? "No reason provided";

            if (moderator.bot) break; // already logged by command in the bot

            let duration: number | undefined = -1;
            switch (action) {
                case AuditLogEvent.MemberUpdate: {
                    const change = auditLogEntry.changes[0];
                    if (!change) return;

                    const { key, old: oldVal, new: newVal } = change;
                    if (key !== "communication_disabled_until") return;

                    console.log(oldVal, newVal);
                    if (oldVal && !newVal) {
                        duration = undefined;
                    } else if (newVal) {
                        duration = new Date(newVal).getTime() - Date.now();
                        // round duration to the nearest value from the list of durations
                        duration = Object.keys(caseDurationToString)
                            .map(n => Number(n))
                            // biome-ignore lint/style/noNonNullAssertion: the above assignment to duration ensures it won't be undefined
                            .reduce((a, b) => Math.abs(duration! - a) < Math.abs(duration! - b) ? a : b);
                    }
                    break;
                }
                case AuditLogEvent.MemberBanRemove:
                case AuditLogEvent.MemberKick: {
                    duration = undefined;
                    break;
                }
            }
            console.log(duration);

            const type = {
                [AuditLogEvent.MemberUpdate]: CaseType.TIMEOUT,
                [AuditLogEvent.MemberKick]: CaseType.KICK,
                [AuditLogEvent.MemberBanAdd]: CaseType.BAN,
                [AuditLogEvent.MemberBanRemove]: CaseType.UNBAN
            }[action];

            await logModAction(
                guild,
                user,
                moderator,
                action === AuditLogEvent.MemberUpdate && duration === undefined
                    ? { type, reason }
                    : await prisma.case.create({
                        data: {
                            type,
                            userId,
                            moderatorId,
                            reason,
                            duration
                        }
                    })
            );
            break;
        }
    }
});