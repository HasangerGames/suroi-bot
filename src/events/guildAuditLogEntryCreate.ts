import { Events } from "discord.js";
import { EventHandler } from "../utils/eventHandler";

export default new EventHandler(Events.GuildAuditLogEntryCreate, auditLogEntry => {

});
