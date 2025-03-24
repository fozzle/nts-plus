import * as React from 'react';
import { DiscordAuth } from '../shared/DiscordAuth';
import Authenticating from './Authenticating';
import Authenticated from './Authenticated';
import Education from './Education';
import style from './style.module.css';

const discordAuthClient = new DiscordAuth();
discordAuthClient.init();

function PopUp() {
    const [discordAuthClient] = React.useState(() => new DiscordAuth());
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [isAuthenticating, setIsAuthenticating] = React.useState(false);

    React.useEffect(() => {
        async function loadDiscordAuth() {
            await discordAuthClient.init();
            setIsAuthenticated(
                Boolean(await discordAuthClient.getDiscordAccessToken(false)),
            );
        }

        loadDiscordAuth();
    }, []);

    async function handleRevoke() {
        await discordAuthClient.revokeTokens();
        setIsAuthenticated(false);
    }

    async function handleAuth() {
        setIsAuthenticating(true);
        await discordAuthClient.getDiscordAccessToken(true);
        setIsAuthenticating(false);
        setIsAuthenticated(true);
    }

    if (isAuthenticating) {
        return (
            <div className={style.popup}>
                <Authenticating />
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div className={style.popup}>
                <Authenticated
                    discordAuthClient={discordAuthClient}
                    onRevoke={handleRevoke}
                />
            </div>
        );
    }

    return (
        <div className={style.popup}>
            <Education onAuth={handleAuth} />
        </div>
    );
}

export default PopUp;
