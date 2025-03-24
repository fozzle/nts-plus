import setupVolumeSyncer from './volume_syncer';
import setupDiscordPresencePublisher from './discord';

setupVolumeSyncer();
setupDiscordPresencePublisher();
console.info('NTS Plus Loaded');
