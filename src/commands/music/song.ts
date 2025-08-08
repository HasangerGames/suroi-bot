import { type AudioPlayerState, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnection } from "@discordjs/voice";
import { ActionRowBuilder, type APIEmbedField, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, ComponentType, EmbedBuilder, type GuildMember, type MessageActionRowComponentBuilder, MessageFlags, SlashCommandBuilder, TextChannel, type VoiceBasedChannel } from "discord.js";
import { createReadStream } from "node:fs";
import { exists, mkdir } from "node:fs/promises";
import YouTube, { Video } from "youtube-sr";
import { Command } from "../../utils/command";
import { makeSimpleEmbed, EmbedColors, sendSimpleEmbed } from "../../utils/misc";

enum QueueStatus {
    Downloading,
    Playing,
    Idle
}

class SongManagerClass {
    private readonly _player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    });

    connection?: VoiceConnection;

    lastChannel?: TextChannel;

    queue: Array<Video> = [];
    get currentSong(): Video | undefined { return this.queue[0]; }

    currentDownload?: Bun.Subprocess;

    private _status = QueueStatus.Idle;
    get status(): QueueStatus { return this._status; }

    constructor() {
        mkdir("data/songs", { recursive: true });

        this._player.on("stateChange", (
            { status: oldStatus }: AudioPlayerState,
            { status: newStatus }: AudioPlayerState
        ): void => {
            if (oldStatus === AudioPlayerStatus.Playing && newStatus === AudioPlayerStatus.Idle) {
                this.skip();
            }
        });
    }

    connect(channel: VoiceBasedChannel): void {
        if (this.connection) return;

        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        this.connection.subscribe(this._player);
    }

    disconnect(): void {
        this.connection?.destroy();
        this.connection = undefined;
        this.queue = [];
        this._status = QueueStatus.Idle;
    }

    async addToQueue(video: Video): Promise<void> {
        this.queue.push(video);
        if (this.queue.length === 1) {
            this._play(video, false);
        }
    }

    async removeFromQueue(index: number): Promise<void> {
        if (index === 0) {
            this.skip();
            return;
        }
        this.queue.splice(index, 1);
    }

    pause(): void {
        if (this._status === QueueStatus.Downloading) return;
        this._player.pause();
        this._status = QueueStatus.Idle;
    }

    unpause(): void {
        if (this._status === QueueStatus.Downloading) return;
        this._player.unpause();
        this._status = QueueStatus.Playing;
    }

    skip(): void {
        if (this._status === QueueStatus.Downloading) return;
        this.queue.shift();
        this._player.stop();
        this._status = QueueStatus.Idle;
        if (this.queue.length) {
            this._play(this.currentSong);
        }
    }

    makeNowPlayingEmbed(video: Video, name: string, color: number): EmbedBuilder {
        return new EmbedBuilder()
            .setAuthor({ iconURL: video.channel?.iconURL(), name })
            .setTitle(`**${video.title ?? "No Title"}**`)
            .setDescription(video.channel?.name ?? "No Channel")
            .setThumbnail(video.thumbnail?.displayThumbnailURL() ?? null)
            .setFields(
                { name: "Duration", value: `\`${video.durationFormatted}\``, inline: true },
                { name: "Views", value: `\`${numberFormat.format(video.views)}\``, inline: true },
                { name: "Link", value: video.url }
            )
            .setColor(color);
    }

    private async _play(video?: Video, sendNowPlayingMessage = true): Promise<void> {
        if (!video || this._status === QueueStatus.Downloading) return;

        const filename = `data/songs/${video.url.slice(video.url.lastIndexOf("=") + 1)}.opus`;

        if (!(await exists(filename))) {
            this._status = QueueStatus.Downloading;
            await new Promise((resolve, reject) => {
                this.currentDownload = Bun.spawn({
                    cmd: ["yt-dlp", "-x", "--audio-format", "opus", "--audio-quality", "0", "-o", "data/songs/%(id)s", video.url],
                    stdout: "inherit",
                    stderr: "inherit",
                    onExit: (
                        _subprocess,
                        exitCode: number | null,
                        _signalCode,
                        error?: Bun.ErrorLike
                    ): void => {
                        if (exitCode === 0) {
                            resolve(undefined);
                        } else {
                            this._status = QueueStatus.Idle;
                            reject(error);
                        }
                    },
                });
            });
        }

        this._status = QueueStatus.Playing;
        if (sendNowPlayingMessage) {
            this.lastChannel?.send({
                embeds: [this.makeNowPlayingEmbed(video, "Now Playing", EmbedColors.info)]
            });
        }

        const resource = createAudioResource(
            createReadStream(filename),
            { inputType: StreamType.OggOpus }
        );
        this._player.play(resource);
    }
}

const SongManager = new SongManagerClass();

const numberFormat = Intl.NumberFormat("en", { notation: "standard" });
const selectionEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

export default new Command({
    data: new SlashCommandBuilder()
        .setName("song")
        .setDescription("Commands for playing music. Must be in a voice channel to use.")
        .addSubcommand(subcommand => subcommand
            .setName("search")
            .setDescription("Search for a song.")
            .addStringOption(option => option
                .setName("query")
                .setDescription("The search query")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("play")
            .setDescription("Add a song to the queue.")
            .addStringOption(option => option
                .setName("query")
                .setDescription("The search query")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("queue")
            .setDescription("Show a list of songs currently in the queue.")
        )
        .addSubcommand(subcommand => subcommand
            .setName("nowplaying")
            .setDescription("Show details about the song currently playing.")
        )
        .addSubcommand(subcommand => subcommand
            .setName("pause")
            .setDescription("Pause the song that's currently playing.")
        )
        .addSubcommand(subcommand => subcommand
            .setName("unpause")
            .setDescription("Unpause the current song.")
        )
        .addSubcommand(subcommand => subcommand
            .setName("skip")
            .setDescription("Skip the song that's currently playing.")
        )
        .addSubcommand(subcommand => subcommand
            .setName("remove")
            .setDescription("Remove a song from the queue.")
            .addIntegerOption(option => option
                .setName("index")
                .setDescription("The number of the item to remove")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("stop")
            .setDescription("Clear the queue and leave the voice channel.")
        ),
    cooldown: 5000,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        const channel = (interaction.member as GuildMember)?.voice.channel;
        if (!channel) return interaction.reply({ content: "You are not connected to a voice channel!", flags: [MessageFlags.Ephemeral] });

        SongManager.lastChannel = interaction.channel as TextChannel ?? undefined;

        switch (interaction.options.getSubcommand()) {
            case "search": {
                const query = interaction.options.getString("query", true);
                const videos = await YouTube.search(query, { type: "video", limit: 5 });

                const embed = new EmbedBuilder()
                    .setTitle(`🔍 Search Results for **${query}**`)
                    .setFields(
                        videos.flatMap((video: Video, i: number): APIEmbedField[] => [
                            { name: `${selectionEmojis[i]} ${video.title ?? "No Title"}`, value: video.channel?.name ?? "No Channel" },
                            { name: "Duration", value: `\`${video.durationFormatted}\``, inline: true },
                            { name: "Views", value: `\`${numberFormat.format(video.views)}\``, inline: true }
                        ])
                    )
                    .setThumbnail(videos[0]?.thumbnail?.displayThumbnailURL() ?? null)
                    .setFooter({ text: "Click a button below to add a song to the queue." })
                    .setColor(EmbedColors.info);

                const buttons = Array.from({ length: videos.length }, (_, i) =>
                    new ButtonBuilder()
                        .setCustomId(i.toString())
                        .setLabel((i + 1).toString())
                        .setStyle(ButtonStyle.Primary)
                );
                const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons);

                const message = await interaction.followUp({
                    embeds: [embed],
                    components: [row]
                });
                const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
                let madeSelection = false;

                const disableButtons = () => {
                    row.components.forEach(btn => btn.setDisabled(true));
                    interaction.editReply({ components: [row] });
                };

                collector.on("collect", i => {
                    if (madeSelection) return;
                    madeSelection = true;

                    const selection = videos[parseInt(i.customId)];
                    if (!selection) {
                        const embed = new EmbedBuilder()
                            .setTitle(`❌ Unable to make selection`)
                            .setColor(EmbedColors.danger);
                        i.reply({ embeds: [embed] });
                        return;
                    }

                    disableButtons();

                    SongManager.connect(channel);
                    SongManager.addToQueue(selection);

                    const embed = SongManager.makeNowPlayingEmbed(selection, "Added to Queue", EmbedColors.success);
                    i.reply({ embeds: [embed] });
                });

                collector.on("end", disableButtons);
                break;
            }
            case "play": {
                const query = interaction.options.getString("query", true);
                const video = (await YouTube.search(query, { type: "video", limit: 1 }))[0];
                if (!video) {
                    const embed = new EmbedBuilder()
                        .setTitle(`❌ No results for **${query}**`)
                        .setColor(EmbedColors.danger);
                    await interaction.followUp({ embeds: [embed] });
                    return;
                }

                SongManager.connect(channel);
                SongManager.addToQueue(video);

                const embed = SongManager.makeNowPlayingEmbed(video, "Added to Queue", EmbedColors.success);
                await interaction.followUp({ embeds: [embed] });
                break;
            }
            case "queue": {
                let statusText: string;
                switch (SongManager.status) {
                    case QueueStatus.Downloading:
                        statusText = "Downloading...";
                        break;
                    case QueueStatus.Playing:
                        statusText = "Now Playing";
                        break;
                    case QueueStatus.Idle:
                        statusText = "Paused";
                        break;
                }

                const queue = SongManager.queue;

                const embed = new EmbedBuilder()
                    .setTitle("🎶 Queue")
                    .setDescription(!queue.length ? "Queue is currently empty." : null)
                    .addFields(
                        queue.map((video: Video, i: number): APIEmbedField => ({
                            name: `${i + 1}. **${video.title ?? "No Title"}**`,
                            value: `${video.channel?.name ?? "No Channel"} - \`${video.durationFormatted}\`${i === 0 ? ` ◀️ ${statusText}` : ""}`
                        }))
                    )
                    .setThumbnail(SongManager.currentSong?.thumbnail?.displayThumbnailURL() ?? null)
                    .setColor(EmbedColors.info);

                await interaction.followUp({ embeds: [embed] });
                break;
            }
            case "nowplaying": {
                const currentSong = SongManager.currentSong;
                const embed = currentSong
                    ? SongManager.makeNowPlayingEmbed(currentSong, "Now Playing", EmbedColors.info)
                    : makeSimpleEmbed(
                        "Not playing anything",
                        "Use the /song play command to queue up a song!",
                        EmbedColors.info
                    );
                await interaction.followUp({ embeds: [embed] });
                break;
            }
            // TODO add a method to SongManager to create an embed with the current song and a custom title
            case "pause": {
                SongManager.pause();
                sendSimpleEmbed(
                    interaction,
                    "⏸️ Paused current song",
                    null,
                    EmbedColors.success
                );
                break;
            }
            case "unpause": {
                SongManager.unpause();
                sendSimpleEmbed(
                    interaction,
                    "▶️ Unpaused current song",
                    null,
                    EmbedColors.success
                );
                break;
            }
            case "skip": {
                SongManager.skip();
                sendSimpleEmbed(
                    interaction,
                    "⏩ Skipped current song",
                    null,
                    EmbedColors.success
                );
                break;
            }
            case "remove": {
                const index = interaction.options.getInteger("index", true) - 1;
                if (!SongManager.queue[index]) {
                    sendSimpleEmbed(
                        interaction,
                        "❌ That index doesn't exist in the queue",
                        null,
                        EmbedColors.danger
                    );
                    return;
                }

                SongManager.removeFromQueue(index);

                sendSimpleEmbed(
                    interaction,
                    "✂️ Removed song from queue",
                    null,
                    EmbedColors.success
                );
                break;
            }
            case "stop": {
                SongManager.disconnect();
                sendSimpleEmbed(
                    interaction,
                    "👋 So long!",
                    "Cleared queue and left voice channel.",
                    EmbedColors.success
                );
                break;
            }
        }
    }
});
