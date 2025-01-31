console.info('NTS Plus - Mixcloud Controller Loaded');

window.addEventListener('message', (message) => {
    if (typeof message.data !== 'object') return;
    const messagePayload = message.data;
    if (messagePayload.ntsPlus !== true) return;
    switch (messagePayload.type) {
        case 'volume':
            const audioElement = document.querySelector('audio');
            if (audioElement != null) {
                audioElement.volume = messagePayload.volume;
            }
    }
});


const audioMutationObserver = new MutationObserver((_, observer) => {
  const audioElement = document.querySelector('audio');
  if (audioElement) {
    window.parent.postMessage({ ntsPlus: true, type: 'volume_request' }, '*');
    observer.disconnect();
  }
});
audioMutationObserver.observe(document.body, {childList: true, subtree: true})

