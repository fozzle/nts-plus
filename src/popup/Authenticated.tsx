import * as React from 'react';

import { DiscordAuth } from '../shared/DiscordAuth';
import { DiscordUser } from '../shared/DiscordTypes';
import styles from './style.module.css';

export default function Authenticated({
    discordAuthClient,
    onRevoke,
}: {
    onRevoke: () => void;
    discordAuthClient: DiscordAuth;
}) {
    const [discordInfo, setDiscordInfo] = React.useState<DiscordUser | null>(
        null,
    );

    React.useEffect(() => {
        async function loadDiscordUser() {
            const accessToken =
                await discordAuthClient.getDiscordAccessToken(false);
            const userInfo = await (
                await fetch('https://discord.com/api/users/@me', {
                    method: 'get',
                    headers: {
                        authorization: `Bearer ${accessToken}`,
                    },
                })
            ).json();
            setDiscordInfo(userInfo as DiscordUser);
        }
        loadDiscordUser();
    }, []);

    return discordInfo ? (
        <>
            <h3>Your Discord is Linked!</h3>
            <div className={styles.userContainer}>
                <img
                    className={styles.avatar}
                    src={`https://cdn.discordapp.com/avatars/${discordInfo.id}/${discordInfo.avatar}`}
                />
                {discordInfo.username}
            </div>
            <p>
                Your Discord presence will be set to "Listening to NTS Radio"
                when you listen to NTS Radio through this browser. To stop this
                behavior, unlink Discord using the button below.
            </p>
            <button onClick={onRevoke}>Unlink Discord</button>
        </>
    ) : (
        <h3>Loading...</h3>
    );
}
