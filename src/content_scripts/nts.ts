import setupVolumeSyncer from './volume_syncer';
import setupDiscordPresencePublisher from './discord';

Promise.allSettled([setupVolumeSyncer(), setupDiscordPresencePublisher()]).then(() => {
    console.info('NTS Plus Loaded');
});
