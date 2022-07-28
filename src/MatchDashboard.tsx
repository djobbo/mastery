import { ButtonStyle, useMessageCtx, User } from "reaccord"
import { useState } from "react"
import { renderMessage } from "./client"
import { getUserMention } from "./util/mentions"

const parseMatchWinners = (rawWinners: string[]) => {
    // BO3 Only ATM
    // TODO: support BO5 and more

    const results = rawWinners.reduce(
        (acc, winner) => {
            if (acc.ended) return acc

            acc.winners.push(winner)
            if (!winner) {
                acc.ended = true
                return acc
            }

            acc.scores.set(winner, (acc.scores.get(winner) ?? 0) + 1)
            if (acc.scores.get(winner) === 2) {
                acc.ended = true
                acc.winner = winner
            }

            return acc
        },
        {
            winners: [] as string[],
            scores: new Map<string, number>(),
            ended: false,
            winner: "",
        },
    )

    return results
}

const SetScoresPanel = ({
    players,
    maxGamesCount,
    onSubmitWinners,
}: {
    players: User[]
    maxGamesCount: number
    onSubmitWinners: (winners: string[]) => void
}) => {
    const [player1, player2] = players
    const { message, terminateInteraction } = useMessageCtx()

    const [currentGame, setCurrentGame] = useState(0)
    const [winnersIds, setWinnersIds] = useState<string[]>(
        Array.from({ length: maxGamesCount }, () => ""),
    )

    const setWinner = (game: number, winner: string) => {
        setWinnersIds((winners) => {
            winners[game] = winner
            return [...winners]
        })
    }

    const { winners, ended, winner, scores } = parseMatchWinners(winnersIds)

    const winnerUser =
        ended && !!winner
            ? players.find((player) => player.id === winner)
            : undefined

    return (
        <>
            <embed>
                <title>Scores</title>
                <desc>
                    {winnerUser ? (
                        <>{winnerUser.username} won!</>
                    ) : (
                        "Game not ended yet"
                    )}
                </desc>
                <footer>
                    {player1.username} {scores.get(player1.id) ?? 0} -{" "}
                    {scores.get(player2.id) ?? 0} {player2.username}
                </footer>
                {winners.map((winnerId, i) => (
                    <field key={i} title={`Match #${i + 1}`}>
                        {i === currentGame && "⚙️ "}
                        {getUserMention(player1.id)} [
                        {!winnerId ? "0" : winnerId === player1.id ? "W" : "L"}]
                        - [
                        {!winnerId ? "0" : winnerId === player2.id ? "W" : "L"}]{" "}
                        {getUserMention(player2.id)}
                    </field>
                ))}
            </embed>
            <action-row>
                <button
                    onClick={() => setCurrentGame(currentGame - 1)}
                    disabled={currentGame <= 0}
                    style={ButtonStyle.Primary}
                >
                    {"< Previous game"}
                </button>
                <button style={ButtonStyle.Secondary} disabled>
                    Game #{currentGame}
                </button>
                <button
                    onClick={() => setCurrentGame(currentGame + 1)}
                    disabled={currentGame >= winners.length - 1}
                    style={ButtonStyle.Primary}
                >
                    {" Next game >"}
                </button>
            </action-row>
            <action-row>
                <button
                    onClick={() => setWinner(currentGame, player1.id)}
                    style={
                        !winnersIds[currentGame]
                            ? ButtonStyle.Secondary
                            : winnersIds[currentGame] === player1.id
                            ? ButtonStyle.Success
                            : ButtonStyle.Danger
                    }
                >
                    {player1.username}
                </button>
                <button
                    style={ButtonStyle.Secondary}
                    disabled
                >{`< Choose winner >`}</button>
                <button
                    onClick={() => setWinner(currentGame, player2.id)}
                    style={
                        !winnersIds[currentGame]
                            ? ButtonStyle.Secondary
                            : winnersIds[currentGame] === player2.id
                            ? ButtonStyle.Success
                            : ButtonStyle.Danger
                    }
                >
                    {player2.username}
                </button>
            </action-row>
            <action-row>
                <button
                    onClick={async () => {
                        onSubmitWinners(winners)
                        await message.delete()
                        terminateInteraction()
                    }}
                    style={ButtonStyle.Primary}
                    disabled={!ended || !winner}
                >
                    Submit scores
                </button>
                <button
                    onClick={async () => {
                        await message.delete()
                        terminateInteraction()
                    }}
                    style={ButtonStyle.Secondary}
                >
                    Cancel
                </button>
            </action-row>
        </>
    )
}

export const MatchDashboard = ({ players }: { players: User[] }) => {
    const [player1, player2] = players
    const [winners, setWinners] = useState<Map<string, string[]>>(new Map())

    const onWinnersSubmitted = (player: User, winners: string[]) => {
        setWinners((winnersMap) => {
            winnersMap.set(player.id, winners)
            return new Map(winnersMap)
        })
    }

    const hasPlayer1Submitted = !!winners.get(player1.id)
    const hasPlayer2Submitted = !!winners.get(player2.id)
    const haveBothPlayersSubmitted = hasPlayer1Submitted && hasPlayer2Submitted
    const player1Winners = winners.get(player1.id) ?? []
    const player2Winners = winners.get(player2.id) ?? []

    const winnersCount = Math.max(player1Winners.length, player2Winners.length)
    const winnersIds = Array.from({ length: winnersCount }, (_, i) => {
        const player1Winner = player1Winners[i]
        const player2Winner = player2Winners[i]
        if (!player1Winner || !player2Winner) return "CONFLICT"
        return player1Winner === player2Winner ? player1Winner : "CONFLICT"
    })

    const conflict = winnersIds.findIndex((winner) => winner === "CONFLICT")

    return (
        <>
            <embed>
                <title>Match dashboard</title>
                {haveBothPlayersSubmitted && conflict >= 0 ? (
                    <desc>
                        Conflicting results, please verify game #{conflict + 1}!
                    </desc>
                ) : (
                    <desc>
                        {player1.username} vs {player2.username}
                    </desc>
                )}
                {hasPlayer1Submitted && hasPlayer2Submitted ? (
                    <>
                        {/* TODO: show score */}
                        {/* <footer>{player1.username} {scores.get(player1.id) ?? 0} - {scores.get(player2.id) ?? 0} {player2.username}</footer> */}
                        <field title={`${player1.username}'s submition`}>
                            {player1Winners.map((winnerId, i) => (
                                <span key={i}>
                                    {i === conflict ? "❌" : "✔️"} Match #
                                    {i + 1}: {getUserMention(player1.id)} [
                                    {!winnerId
                                        ? "0"
                                        : winnerId === player1.id
                                        ? "W"
                                        : "L"}
                                    ] - [
                                    {!winnerId
                                        ? "0"
                                        : winnerId === player2.id
                                        ? "W"
                                        : "L"}
                                    ] {getUserMention(player2.id)}
                                    <br />
                                </span>
                            ))}
                        </field>
                        <field title={`${player2.username}'s submition`}>
                            {player2Winners.map((winnerId, i) => (
                                <span key={i}>
                                    {i === conflict ? "❌" : "✔️"} Match #
                                    {i + 1}: {getUserMention(player1.id)} [
                                    {!winnerId
                                        ? "0"
                                        : winnerId === player1.id
                                        ? "W"
                                        : "L"}
                                    ] - [
                                    {!winnerId
                                        ? "0"
                                        : winnerId === player2.id
                                        ? "W"
                                        : "L"}
                                    ] {getUserMention(player2.id)}
                                    <br />
                                </span>
                            ))}
                        </field>
                    </>
                ) : (
                    <footer>
                        Waiting for{" "}
                        {!hasPlayer1Submitted && !hasPlayer2Submitted
                            ? "both players"
                            : !hasPlayer1Submitted
                            ? player1.username
                            : player2.username}{" "}
                        to submit results
                    </footer>
                )}
            </embed>
            <action-row>
                <button
                    style={ButtonStyle.Primary}
                    onClick={async (interaction) => {
                        const { user } = interaction
                        if (!players.find((p) => p.id === user.id)) {
                            await interaction.reply({
                                content: `You are not part of this match.`,
                                ephemeral: true,
                            })
                            return
                        }

                        renderMessage(interaction, () => (
                            <SetScoresPanel
                                players={players}
                                // TODO: maxGamesCount BO3 only ATM -> support BO5 and more
                                maxGamesCount={3}
                                onSubmitWinners={(winners) =>
                                    onWinnersSubmitted(user, winners)
                                }
                            />
                        ))
                        return true
                    }}
                >
                    Set scores
                </button>
            </action-row>
        </>
    )
}
