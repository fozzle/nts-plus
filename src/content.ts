console.info('NTS Plus Loaded');

const audioPlayer = document.getElementById(
    'nts-player-audio',
) as HTMLAudioElement;
const episodePlayer = document.querySelector(
    '.episode-player__player',
) as HTMLDivElement;

function applyMainVolume() {
    const volume = audioPlayer.volume;
    const soundcloudPlayer = document?.querySelector(
        '.soundcloud-player__content audio',
    ) as HTMLAudioElement;
    if (soundcloudPlayer != null) {
        soundcloudPlayer.volume = audioPlayer.volume;
    }

    const mixcloudFrame = document?.querySelector(
        '.mixcloud-player__iframe-container iframe',
    ) as HTMLIFrameElement;
    mixcloudFrame?.contentWindow?.postMessage(
        { ntsPlus: true, type: 'volume', volume },
        '*',
    );
}

window.addEventListener('message', (message) => {
    const messagePayload = message.data;
    if (typeof messagePayload !== 'object') return;
    if (messagePayload.ntsPlus !== true) return;
    switch (messagePayload.type) {
        case 'volume_request':
            applyMainVolume();
    }
});

const episodePlayerObserver = new MutationObserver(() => {
    applyMainVolume();
});
episodePlayerObserver.observe(episodePlayer, {
    childList: true,
    subtree: true,
});

audioPlayer.addEventListener('volumechange', applyMainVolume);
