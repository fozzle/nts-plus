const audioPlayer = document.getElementById('nts-player-audio') as HTMLAudioElement;

audioPlayer.addEventListener('volumechange', () => {
    console.log('KYLe volume change', audioPlayer.volume)
})