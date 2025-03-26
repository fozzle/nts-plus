import * as React from 'react';
import Authenticating from './Authenticating';
import Authenticated from './Authenticated';
import * as BackgroundUtils from '../background/BackgroundUtils';
import Education from './Education';
import style from './style.module.css';

function PopUp() {
    const [isAuthenticated, setIsAuthenticated] = React.useState<
        boolean | undefined
    >();
    const [isAuthenticating, setIsAuthenticating] = React.useState(false);

    React.useEffect(() => {
        async function getTokenStatus() {
            const { accessToken } = await BackgroundUtils.getToken();
            setIsAuthenticated(Boolean(accessToken));
        }
        getTokenStatus();
    }, []);

    async function handleRevoke() {
        await BackgroundUtils.revokeTokens();
        setIsAuthenticated(false);
    }

    async function handleAuth() {
        setIsAuthenticating(true);
        await BackgroundUtils.getTokenWithAuth();
        setIsAuthenticating(false);
        setIsAuthenticated(true);
    }

    if (isAuthenticated == null) {
        return <div className={style.popup}>Loading...</div>;
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
                <Authenticated onRevoke={handleRevoke} />
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
