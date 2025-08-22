import { createReadStream } from "node:fs";
import { exists, mkdir } from "node:fs/promises";
import { type AudioPlayerState, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, StreamType, type VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { ActionRowBuilder, type APIEmbedField, ButtonBuilder, type ButtonInteraction, ButtonStyle, type ChatInputCommandInteraction, Colors, ComponentType, EmbedBuilder, GuildMember, type MessageActionRowComponentBuilder, MessageFlags, SlashCommandBuilder, type TextChannel, type VoiceBasedChannel } from "discord.js";
import YouTube, { type Video } from "youtube-sr";
import { Command } from "../../utils/command";
import { Config } from "../../utils/config";
import { standardNumberFormat } from "../../utils/misc";

enum QueueStatus {
    Downloading,
    Playing,
    Idle
}

interface QueueVideo extends Video {
    addedBy?: GuildMember
    addedAt?: Date
}

class SongManagerClass {
    private readonly _player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    });

    connection?: VoiceConnection;

    lastChannel?: TextChannel;

    queue: Array<QueueVideo> = [];
    get currentSong(): QueueVideo | undefined { return this.queue[0]; }

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

        this.connection.on("stateChange", (_, newState) => {
            if (
                newState.status !== VoiceConnectionStatus.Disconnected
                && newState.status !== VoiceConnectionStatus.Destroyed
            ) return;

            this.currentDownload?.kill();
            this.connection = undefined;
            this.queue = [];
            this._status = QueueStatus.Idle;
        });

        this.connection.subscribe(this._player);
    }

    disconnect(): void {
        if (this.connection?.state.status === VoiceConnectionStatus.Destroyed) return;
        this.connection?.destroy();
    }

    addToQueue(video: QueueVideo): void {
        this.queue.push(video);
        if (this.queue.length === 1) {
            this._play(video, false);
        }
    }

    removeFromQueue(index: number): void {
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

    skip(): QueueVideo | undefined {
        if (this._status === QueueStatus.Downloading) return;
        const video = this.queue.shift();
        this._player.stop();
        this._status = QueueStatus.Idle;
        if (this.queue.length) {
            this._play(this.currentSong);
        }
        return video;
    }

    makeNowPlayingEmbed(video: QueueVideo | undefined, title: string, color: number, hideExtraInfo?: boolean): EmbedBuilder {
        if (!video) {
            return new EmbedBuilder()
                .setTitle("Not playing anything")
                .setDescription("Use the \`/song play\` command to queue up a song!")
                .setColor(Colors.Blue);
        }

        return new EmbedBuilder()
            .setAuthor({
                iconURL: video.channel?.iconURL(),
                name: video.channel?.name ?? "Unknown Channel",
                url: video.channel?.url
            })
            .setTitle(`**${video.title ?? "No Title"}**`)
            .setURL(video.url)
            .setThumbnail(video.thumbnail?.displayThumbnailURL() ?? null)
            .setFields(
                { name: " ", value: title },
                ...(hideExtraInfo ? [] : [
                    { name: "Duration", value: `\`${video.durationFormatted}\``, inline: true },
                    { name: "Views", value: `\`${standardNumberFormat.format(video.views)}\``, inline: true },
                    ...(video.uploadedAt === null ? [] : [{ name: "Uploaded", value: `\`${video.uploadedAt}\``, inline: true }])
                ]),
            )
            .setFooter(video.addedBy ? { iconURL: video.addedBy.displayAvatarURL(), text: `Added by ${video.addedBy.nickname ?? video.addedBy.displayName}` } : null)
            .setTimestamp(video.addedAt ?? null)
            .setColor(color);
    }

    private async _play(video?: Video, sendNowPlayingMessage = true): Promise<void> {
        if (!video || this._status === QueueStatus.Downloading) return;

        const filename = `data/songs/${video.url.slice(video.url.lastIndexOf("=") + 1)}.opus`;

        if (!(await exists(filename))) {
            this._status = QueueStatus.Downloading;
            await new Promise((resolve, reject) => {
                this.currentDownload = Bun.spawn({
                    cmd: [Config.youtubeDownloaderPath, "--cookies", "data/cookies.txt", "-x", "--audio-format", "opus", "--audio-quality", "0", "-o", "data/songs/%(id)s", video.url],
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
            await this.lastChannel?.send({
                embeds: [this.makeNowPlayingEmbed(video, "▶️ Now Playing", Colors.Blue)]
            });
        }

        const resource = createAudioResource(
            createReadStream(filename),
            { inputType: StreamType.OggOpus }
        );
        this._player.play(resource);
    }
}

export const SongManager = new SongManagerClass();

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
    async execute(interaction: ChatInputCommandInteraction) {
        const member = interaction.member;
        if (!(member instanceof GuildMember)) throw new Error("Invalid member");

        const channel = member.voice.channel;
        if (!channel) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Can't use command")
                .setDescription("You must be connected to a voice channel to use this command.")
                .setColor(Colors.Red);
            await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            return;
        }

        await interaction.deferReply();

        SongManager.lastChannel = interaction.channel as TextChannel ?? undefined;

        switch (interaction.options.getSubcommand()) {
            case "search": {
                const query = interaction.options.getString("query", true);
                const videos = await YouTube.search(query, { type: "video", limit: 5 });

                const embed = new EmbedBuilder()
                    .setTitle(`🔍 Search Results for **${query}**`)
                    .setFields(
                        videos.flatMap((video: Video, i: number): APIEmbedField[] => [
                            { name: " ", value: `${selectionEmojis[i]} [**${video.title ?? "No Title"}**](${video.url})` },
                            { name: " ", value: `[${video.channel?.name ?? "No Channel"}](${video.channel?.url})` },
                            { name: "Duration", value: `\`${video.durationFormatted}\``, inline: true },
                            { name: "Views", value: `\`${standardNumberFormat.format(video.views)}\``, inline: true },
                            ...(video.uploadedAt === null ? [] : [{ name: "Uploaded", value: `\`${video.uploadedAt}\``, inline: true }])
                        ])
                    )
                    .setThumbnail(videos[0]?.thumbnail?.displayThumbnailURL() ?? null)
                    .setFooter({ text: "Click a button below to add a song to the queue." })
                    .setColor(Colors.Blue);

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
                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    max: 1,
                    time: 120000
                });

                const disableButtons = async() => {
                    row.components.forEach(btn => btn.setDisabled(true));
                    await interaction.editReply({ components: [row] });
                };

                collector.on("collect", async(i: ButtonInteraction) => {
                    await disableButtons();

                    const selection: QueueVideo | undefined = videos[parseInt(i.customId)];
                    if (!selection) {
                        const embed = new EmbedBuilder()
                            .setTitle("❌ Unable to make selection")
                            .setColor(Colors.Red);
                        await i.reply({ embeds: [embed] });
                        return;
                    }
                    selection.addedBy = member;
                    selection.addedAt = new Date();

                    SongManager.connect(channel);
                    SongManager.addToQueue(selection);

                    const embed = SongManager.makeNowPlayingEmbed(selection, SongManager.queue.length === 1 ? "▶️ Now Playing" : "↪️ Added to Queue", Colors.DarkGreen);
                    await i.reply({ embeds: [embed] });
                });

                collector.on("end", disableButtons);
                break;
            }
            // TODO Make this method accept YT URLs
            // TODO Allow inserting songs at any position in the queue
            // TODO search embed for no results
            // TODO keep track of most played songs, make leaderboard
            case "play": {
                const query = interaction.options.getString("query", true);
                const video: QueueVideo | undefined = (await YouTube.search(query, { type: "video", limit: 1 }))[0];
                if (!video) {
                    const embed = new EmbedBuilder()
                        .setTitle(`❌ No results for **${query}**`)
                        .setColor(Colors.Red);
                    await interaction.followUp({ embeds: [embed] });
                    return;
                }
                video.addedBy = member;
                video.addedAt = new Date();

                SongManager.connect(channel);
                SongManager.addToQueue(video);

                const embed = SongManager.makeNowPlayingEmbed(video, SongManager.queue.length === 1 ? "▶️ Now Playing" : "↪️ Added to Queue", Colors.DarkGreen);
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
                    .setColor(Colors.Blue);

                await interaction.followUp({ embeds: [embed] });
                break;
            }
            case "nowplaying": {
                const embed = SongManager.makeNowPlayingEmbed(
                    SongManager.currentSong,
                    "▶️ Now Playing",
                    Colors.Blue
                );
                await interaction.followUp({ embeds: [embed] });
                break;
            }
            case "pause": {
                SongManager.pause();
                const embed = SongManager.makeNowPlayingEmbed(
                    SongManager.currentSong,
                    "⏸️ Paused",
                    Colors.DarkGreen,
                    true
                );
                await interaction.followUp({ embeds: [embed] });
                break;
            }
            case "unpause": {
                SongManager.unpause();
                const embed = SongManager.makeNowPlayingEmbed(
                    SongManager.currentSong,
                    "▶️ Now Playing",
                    Colors.DarkGreen,
                    true
                );
                await interaction.followUp({ embeds: [embed] });
                break;
            }
            // TODO Add "Next Up" field or somethin to show the next song
            case "skip": {
                const embed = SongManager.makeNowPlayingEmbed(
                    SongManager.currentSong,
                    "⏩ Skipped",
                    Colors.DarkGreen,
                    true
                );
                SongManager.skip();
                await interaction.followUp({ embeds: [embed] });
                break;
            }
            case "remove": {
                const index = interaction.options.getInteger("index", true) - 1;
                const item = SongManager.queue[index];
                if (!item) {
                    const embed = new EmbedBuilder()
                        .setTitle("❌ That index doesn't exist in the queue")
                        .setColor(Colors.Red);
                    await interaction.followUp({ embeds: [embed] });
                    return;
                }

                const embed = SongManager.makeNowPlayingEmbed(item, "✂️ Removed from Queue", Colors.DarkGreen, true);
                SongManager.removeFromQueue(index);
                await interaction.followUp({ embeds: [embed] });
                break;
            }
            case "stop": {
                SongManager.disconnect();
                const embed = new EmbedBuilder()
                    .setTitle("👋 So long!")
                    .setDescription("Cleared queue and left voice channel.")
                    .setColor(Colors.DarkGreen);
                await interaction.followUp({ embeds: [embed] });
                break;
            }
        }
    }
});
