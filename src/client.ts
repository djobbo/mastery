import { Client, renderMessage as renderMessageBase } from "reaccord"
import { config as loadEnv } from "dotenv"

loadEnv()

const {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_DEV_GUILD_ID,
    QUEUE_CHANNEL_ID,
    EVERYONE_ROLE_ID,
} = process.env

if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN not set")
if (!DISCORD_CLIENT_ID) throw new Error("DISCORD_CLIENT_ID not set")
if (!DISCORD_DEV_GUILD_ID) throw new Error("DISCORD_DEV_GUILD_ID not set")
if (!QUEUE_CHANNEL_ID) throw new Error("QUEUE_CHANNEL_ID not set")
if (!EVERYONE_ROLE_ID) throw new Error("EVERYONE_ROLE_ID not set")

export const client = new Client({
    token: DISCORD_TOKEN ?? "",
    intents: [],
    devGuildId: DISCORD_DEV_GUILD_ID,
    clientId: DISCORD_CLIENT_ID,
})

export const renderMessage = renderMessageBase(client, { staleAfter: null })

export const env = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_DEV_GUILD_ID,
    QUEUE_CHANNEL_ID,
    EVERYONE_ROLE_ID,
}
