import { InputActions } from "@suroi/constants";
import { Skins } from "@suroi/definitions/items/skins";
import { InputPacket } from "@suroi/packets/inputPacket";
import { JoinPacket } from "@suroi/packets/joinPacket";
import { PacketStream } from "@suroi/packets/packetStream";
import { type APIEmbedField, type ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";

export interface Region {
    /**
     * The human-readable name of the region, displayed in the server selector.
     */
    readonly name: string

    /**
     * An emoji flag to display alongside the region name.
     */
    readonly flag?: string

    /**
     * The address of the region's main server.
     */
    readonly mainAddress: string

    /**
     * Pattern used to determine the address of the region's game servers.
     * The string `<gameID>` is replaced by the `gameID` given by the /getGame API, plus {@linkcode offset}.
     * For example, if `gameID` is 0, `gameAddress` is `"wss://na.suroi.io/game/<gameID>"`, and `offset` is 1, the resulting address will be wss://na.suroi.io/game/1.
     */
    readonly gameAddress: string

    /**
     * Number to increment `gameID` by when determining the game address. See {@linkcode gameAddress} for more info.
     */
    readonly offset: number
}

const regions = {
    na: {
        name: "North America",
        flag: "🇺🇸 ",
        mainAddress: "https://na.suroi.io",
        gameAddress: "wss://na.suroi.io/game/<gameID>",
        offset: 1
    },
    eu: {
        name: "Europe",
        flag: "🇩🇪 ",
        mainAddress: "https://eu.suroi.io",
        gameAddress: "wss://eu.suroi.io/game/<gameID>",
        offset: 1
    },
    sa: {
        name: "South America",
        flag: "🇧🇷 ",
        mainAddress: "https://sa.suroi.io",
        gameAddress: "wss://sa.suroi.io/game/<gameID>",
        offset: 1
    },
    as: {
        name: "Asia",
        flag: "🇻🇳 ",
        mainAddress: "https://as.suroi.io",
        gameAddress: "wss://as.suroi.io/game/<gameID>",
        offset: 1
    },
    ea: {
        name: "East Asia",
        flag: "🇭🇰 ",
        mainAddress: "https://ea.suroi.io",
        gameAddress: "wss://ea.suroi.io/game/<gameID>",
        offset: 1
    },
    oc: {
        name: "Oceania",
        flag: "🇦🇺 ",
        mainAddress: "https://oc.suroi.io",
        gameAddress: "wss://oc.suroi.io/game/<gameID>",
        offset: 1
    }
} as Record<string, Region>;

enum ServerStatus { Waiting, Connecting, Offline, Online }

interface ServerInfo {
    status: ServerStatus
    statusText?: string
    playerCount?: number
}

const statusIcons = {
    [ServerStatus.Waiting]: "<:50cal:1121529048879861770>",
    [ServerStatus.Connecting]: "<:9mm:1121528988737753128>",
    [ServerStatus.Offline]: "<:12gauge:1121528786551308425>",
    [ServerStatus.Online]: "<:556mm:1121528879966859315>"
};

let loadingServerData = false;

export default new Command({
    data: new SlashCommandBuilder()
        .setName("servers")
        .setDescription("Check the status of the Suroi servers"),
    cooldown: 20000,
    async execute(interaction: ChatInputCommandInteraction) {
        if (loadingServerData) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Can't use command")
                .setDescription("Server data is currently being fetched. Please try again later.")
                .setColor(Colors.Red);
            await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            return;
        }
        loadingServerData = true;

        const serverStatus: Record<keyof typeof regions, ServerInfo> = Object.keys(regions)
            .reduce<Record<string, ServerInfo>>((acc, cur) => {
                acc[cur] = { status: ServerStatus.Waiting, statusText: "Waiting..." };
                return acc;
            }, {});

        const embed = new EmbedBuilder()
            .setTitle("🖥️ Suroi Server Status")
            .setColor(Colors.DarkBlue)
            .setTimestamp();

        const updateStatus = async(edit = true) => {
            const count = Object.values(serverStatus).reduce<number>(
                (acc, { status, playerCount }) => {
                    if (!playerCount || status !== ServerStatus.Online) return acc;
                    acc += playerCount;
                    return acc;
                },
                0
            );
            embed.setDescription(
                `**Total**: ${count} ${count === 1 ? "player" : "players"}\n` +
                Object.entries(serverStatus).map(([regionId, info]) => {
                    const region = regions[regionId];
                    if (!region) return;
                    return `${statusIcons[info.status]} **${region.name}**: ${info.statusText}\n`;
                }).join("")
            );
            await interaction[edit ? "editReply" : "reply"]({ embeds: [embed] });
        };

        await updateStatus(false);

        await Promise.allSettled(Object.entries(regions).map(async([regionId, region]) => {
            const status = serverStatus[regionId];
            if (!status) return;

            status.status = ServerStatus.Connecting;
            status.statusText = "Fetching server data...";
            await updateStatus();

            const getApiResponse = async<T>(endpoint: string, errorStatusText: string): Promise<T | undefined> => {
                try {
                    const response = await fetch(`${region.mainAddress}/api/${endpoint}`, { signal: AbortSignal.timeout(30000) });
                    return (await response.json()) as T;
                } catch (e) {
                    console.error(e);
                    status.status = ServerStatus.Offline;
                    status.statusText = errorStatusText;
                    await updateStatus();
                    return;
                }
            };

            const serverInfo = await getApiResponse<{ playerCount: number }>("serverInfo", "Error fetching server data");
            if (!serverInfo) return;
            status.playerCount = serverInfo.playerCount;

            status.statusText = "Finding game...";
            await updateStatus();

            const gameData = await getApiResponse<{ success: true, gameID: number } | { success: false }>("getGame", "Error fetching game data");
            if (!gameData) return;

            if (!gameData.success) {
                status.status = ServerStatus.Offline;
                status.statusText = "Error finding game";
                return;
            }

            status.statusText = "Connecting to game...";
            await updateStatus();

            const socket = new WebSocket(`${region.gameAddress.replace("<gameID>", (gameData.gameID + region.offset).toString())}/play`);
            socket.binaryType = "arraybuffer";

            const rejectTimeout = setTimeout(async() => {
                socket.close();
                status.status = ServerStatus.Offline;
                status.statusText = "WebSocket timed out";
                await updateStatus();
            }, 30000);

            await new Promise(resolve => {
                socket.onopen = () => {
                    const stream = new PacketStream(new ArrayBuffer(128));

                    // makes the bot actually join the game
                    const joinPacket = JoinPacket.create({
                        name: "SuroiBot :3",
                        isMobile: false,
                        skin: Skins.fromString("gunmetal"),
                        emotes: []
                    });
                    stream.serialize(joinPacket);

                    // makes the bot not despawn (for funsies)
                    const inputPacket = InputPacket.create({
                        movement: { up: false, down: false, left: false, right: false },
                        actions: [{ type: InputActions.Interact }]
                    });
                    stream.serialize(inputPacket);

                    socket.send(stream.getBuffer().slice(0, stream.stream.index));
                    setTimeout(() => socket.close(), 1000);

                    clearTimeout(rejectTimeout);
                    status.status = ServerStatus.Online;
                    status.statusText = `${serverInfo.playerCount} ${serverInfo.playerCount === 1 ? "player" : "players"}`;
                    updateStatus().then(resolve);
                };

                socket.onerror = () => {
                    if (status.status === ServerStatus.Online) return;

                    clearTimeout(rejectTimeout);
                    status.status = ServerStatus.Offline;
                    status.statusText = "Error joining game";
                    updateStatus().then(resolve);
                };
            });
        }));

        loadingServerData = false;
    }
});
