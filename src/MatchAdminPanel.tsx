import {
    ButtonStyle,
    ModalSubmitInteraction,
    useMessageCtx,
    useModal,
    User,
} from "reaccord"
import { getUserMention } from "./util/mentions"

type MatchAdminPanelProps = {
    matchId: string
    onMatchCanceled: () => void
    onForceSetScore: (score: [number, number]) => void
    players: User[]
}

export const MatchAdminPanel = ({
    players,
    onMatchCanceled,
}: MatchAdminPanelProps) => {
    const { terminateInteraction } = useMessageCtx()
    // const { openModal } = useModal()

    const cancelMatch = async () => {
        onMatchCanceled()
        terminateInteraction()
    }

    return (
        <>
            <embed>
                <title>Admin panel</title>
                <desc>Match started at {new Date().toLocaleString()}</desc>
                {players.map((player, i) => (
                    <field title={`Player ${i + 1}`} inline key={player.id}>
                        {getUserMention(player.id)}
                    </field>
                ))}
            </embed>
            <action-row>
                {/* TODO: Admin Force set score */}
                <button onClick={cancelMatch} style={ButtonStyle.Danger}>
                    Cancel Match
                </button>
            </action-row>
        </>
    )
}
