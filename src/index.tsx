import {
    Channel,
    ChannelType,
    ChatInputCommand,
    Client,
    Guild,
    OverwriteResolvable,
    TextChannel,
    User,
    PermissionsBitField,
} from "reaccord"
import { v4 as uuidV4 } from "uuid"
import { MatchAdminPanel } from "./MatchAdminPanel"
import { getUserMention } from "./util/mentions"
import { client, env, renderMessage } from "./client"
import { MatchDashboard } from "./MatchDashboard"

const { QUEUE_CHANNEL_ID } = env

type Match = {
    id: string
    channelId: string
    player1: string
    player2: string
    score: [number, number]
}

const usersQueuing = new Set<string>()
const matches = new Map<string, Match>()

const isQueueChannel = (channel?: Channel | null): channel is TextChannel =>
    !!channel &&
    channel.id === QUEUE_CHANNEL_ID &&
    channel.type === ChannelType.GuildText

// TODO: use guild instead of client
const getQueueChannel = async (client: Client) => {
    const channel = await client.channels.fetch(QUEUE_CHANNEL_ID)
    if (!isQueueChannel(channel)) {
        throw new Error(`Queue channel not found`)
    }
    return channel
}

const isUserQueuing = (user: User): boolean => {
    // TODO: db stuff
    return usersQueuing.has(user.id)
}

const addUserToQueue = (user: User): boolean => {
    // TODO: db stuff
    usersQueuing.add(user.id)
    return true
}

const removeUserFromQueue = (user: User): boolean => {
    // TODO: db stuff
    usersQueuing.delete(user.id)
    return true
}

const createMatch = async (
    guild: Guild,
    playerId1: string,
    playerId2: string,
): Promise<boolean> => {
    const matchId = uuidV4()
    const category = await guild.channels.create({
        name: `Match ${matchId}`,
        type: ChannelType.GuildCategory,
        position: 9999,
        // TODO: permissions
        // permissionOverwrites: [
        //     {
        //         id: guild.roles.everyone,
        //         deny: [PermissionsBitField.Flags.ViewChannel]
        //     }
        // ]
    })

    const adminChannel = await guild.channels.create({
        name: `admin`,
        type: ChannelType.GuildText,
        parent: category,
    })

    const gameChannel = await guild.channels.create({
        name: "lobby",
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [playerId1, playerId2].map(
            (playerId) =>
                ({
                    id: playerId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.AttachFiles,
                    ],
                } as OverwriteResolvable),
        ),
    })

    const voiceChannel = await guild.channels.create({
        name: "voice",
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [playerId1, playerId2].map(
            (playerId) =>
                ({
                    id: playerId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.Connect,
                        PermissionsBitField.Flags.Speak,
                        PermissionsBitField.Flags.Stream,
                    ],
                } as OverwriteResolvable),
        ),
    })

    const players = [playerId1, playerId2].map(
        (playerId) => client.users.cache.get(playerId)!,
    )

    await Promise.all([
        renderMessage(adminChannel, () => (
            <MatchAdminPanel
                matchId={matchId}
                players={players}
                onMatchCanceled={async () => {
                    matches.delete(matchId)
                    const reason = "Match cancelled by admin"
                    await gameChannel.delete(reason)
                    await voiceChannel.delete(reason)
                    await adminChannel.delete(reason)
                    await category.delete(reason)
                }}
                onForceSetScore={() => {
                    throw new Error("Not implemented")
                }}
            />
        )),
        renderMessage(gameChannel, () => <MatchDashboard players={players} />),
    ])

    const match: Match = {
        id: matchId,
        channelId: gameChannel.id,
        player1: playerId1,
        player2: playerId2,
        score: [0, 0],
    }

    matches.set(matchId, match)
    return true
}

const checkQueue = (): [string, string] | null => {
    if (usersQueuing.size < 2) return null
    const [player1, player2] = usersQueuing.values()

    if (!player1 || !player2) {
        return null
    }

    usersQueuing.delete(player1)
    usersQueuing.delete(player2)
    return [player1, player2]
}

const queueCommand = new ChatInputCommand("q", "Start a queue").exec(
    async (_, interaction) => {
        if (isUserQueuing(interaction.user)) {
            await interaction.reply({
                content: "You are already in queue",
                ephemeral: true,
            })
            return
        }

        if (!addUserToQueue(interaction.user)) {
            await interaction.reply({
                content:
                    "Something went wrong when adding you to the queue, please try again",
                ephemeral: true,
            })
            return
        }

        await interaction.reply({
            content: "Successfully added you to the queue",
            ephemeral: true,
        })
    },
)

const dequeueCommand = new ChatInputCommand("dq", "Dequeue yourself").exec(
    async (_, interaction) => {
        if (!isUserQueuing(interaction.user)) {
            await interaction.reply({
                content: "You are not in queue",
                ephemeral: true,
            })
            return
        }

        if (!removeUserFromQueue(interaction.user)) {
            await interaction.reply({
                content:
                    "Something went wrong when removing you from the queue, please try again",
                ephemeral: true,
            })
            return
        }

        await interaction.reply({
            content: "Successfully removed you from the queue",
            ephemeral: true,
        })
    },
)

client.registerCommand(queueCommand)
client.registerCommand(dequeueCommand)

setInterval(async () => {
    const queue = checkQueue()
    if (!queue) return

    const [player1, player2] = queue

    const channel = await getQueueChannel(client)
    await channel.send({
        content: `${getUserMention(player1)} and ${getUserMention(
            player2,
        )} are now matched!`,
        allowedMentions: {
            users: [],
        },
    })

    await createMatch(channel.guild, player1, player2)
}, 1000)

client.connect(() =>
    console.log(`🚀 Client connected as ${client.user?.username}!`),
)
