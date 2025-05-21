import * as React from 'react';

import { DiscordUser } from '../shared/DiscordTypes';
import * as BackgroundUtils from '../background/BackgroundUtils';
import styles from './style.module.css';

class UnauthorizedError extends Error {}

export default function Authenticated({ onRevoke }: { onRevoke: () => void }) {
    const [discordInfo, setDiscordInfo] = React.useState<DiscordUser | null>(null);
    const [error, setError] = React.useState<boolean>(false);

    const loadDiscordUser = React.useCallback(async () => {
        const { accessToken } = await BackgroundUtils.getToken();
        try {
            const resp = await fetch('https://discord.com/api/users/@me', {
                method: 'get',
                headers: {
                    authorization: `Bearer ${accessToken}`,
                },
            });
            if (!resp.ok) {
                if (resp.status === 401) {
                    throw new UnauthorizedError('unauthorized');
                }
                console.log('KYLE throwing error', resp);
                throw new Error('unknown');
            }
            const userInfo = await resp.json();
            setDiscordInfo(userInfo as DiscordUser);
        } catch (e) {
            if (e instanceof UnauthorizedError) {
                onRevoke();
            }
        }
    }, []);

    React.useEffect(() => {
        loadDiscordUser();
    }, [loadDiscordUser]);

    function handleReload() {
        setError(false);
        loadDiscordUser();
    }

    if (error) {
        return (
            <>
                <h3>Failed to Get Discord Info</h3>
                <p>
                    For some unknown reason NTS Plus can't retrieve your Discord info. You can try
                    again or unlink to reset things.
                </p>
                <button onClick={handleReload}>Try Again</button>
                <button onClick={onRevoke}>Unlink Discord</button>
            </>
        );
    }

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
                Your Discord presence will be set to "Listening to NTS Radio" when you listen to NTS
                Radio through this browser. To stop this behavior, unlink Discord using the button
                below.
            </p>
            <button onClick={onRevoke}>Unlink Discord</button>
        </>
    ) : (
        <h3>Loading...</h3>
    );
}
