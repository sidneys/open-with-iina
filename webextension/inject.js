'use strict'


/**
 * Check YouTube URL
 */
let checkYoutubeUrl = () => {
    console.debug('checkYoutubeUrl')

    if (window.location.hostname === 'www.youtube.com') {
        chrome.runtime.sendMessage({
            method: 'add-urls',
            urls: [window.location.href]
        })
    }
}

/**
 * Add new URL
 * @param {Array} urls - URLs
 */
let addUrls = (urls) => {
    console.debug('addUrls', 'urls:', ...urls)

    if (urls.length === 0) { return }

    urls = urls.filter(String)

    chrome.runtime.sendMessage({
        method: 'add-urls',
        urls: [...urls]
    })
}


/**
 * Fired when a message is sent from either an extension process (by runtime.sendMessage) or a content script (by tabs.sendMessage).
 * @listens chrome.runtime#onMessage
 */
chrome.runtime.onMessage.addListener((request) => {
    console.debug('chrome.runtime.onMessage')
    // console.debug('request:', request)

    switch (request.method) {
        case 'did-activate':
        case 'did-update':
            console.debug(`chrome.runtime.onMessage#${request.method}`)

            checkYoutubeUrl()
            break
    }
})



/**
 * The readystatechange event is fired when the readyState attribute of a document has changed.
 * @listens document#Event:readystatechange
 */
document.documentElement.appendChild(Object.assign(document.createElement('script'), {
    textContent: `
    {
        const open = XMLHttpRequest.prototype.open
        XMLHttpRequest.prototype.open = function (method, url) {
            open.apply(this, arguments)
            this.addEventListener('readystatechange', function _() {
                if(this.readyState == this.HEADERS_RECEIVED) {
                    const contentType = this.getResponseHeader('Content-Type') || ''
                    if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
                        window.postMessage({
                            source: 'xmlhttprequest-media',
                            url,
                            method,
                            contentType
                        }, '*')
                    }
                    this.removeEventListener('readystatechange', _)
                }
            })
        }
    }
    `
}))

/**
 * The canplay event is fired when the user agent can play the media, but estimates that not enough data has been loaded to play the media up to its end without having to stop for further buffering of content.
 * @listens document#Event:canplay
 */
document.addEventListener('canplay', (event) => {
    console.debug('document.canplay')
    // console.debug('event:', event)

    const elementList = [event.target, ...event.target.querySelectorAll('source')]
    const urlList = elementList.map(element => element.src)

    addUrls(urlList)
}, true)

/**
 * A message event informs the target, a WebSocket, RTCDataChannel, EventSource, or a BroadcastChannel object, that a message has been received.
 * @listens window#MessageEvent:message
 */
window.addEventListener('message', (event) => {
    console.debug('window.message')
    // console.debug('event:', event)

    if (!(event.data && (event.data.source === 'xmlhttprequest-media'))) { return }

    addUrls([event.data.url])
})
