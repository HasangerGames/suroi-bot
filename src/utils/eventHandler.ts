import type { ClientEvents } from "discord.js";

export class EventHandler<T extends keyof ClientEvents> {
    constructor(readonly event: T, readonly listener: (...args: ClientEvents[T]) => void) {}
}
