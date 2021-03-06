'use strict'


/**
 * Icon Image Dictionary
 * @type {Object}
 * @constant
 */
const iconImageDictionary = {
    'color': {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '64': 'icons/icon-64.png',
        '128': 'icons/icon-128.png',
        '256': 'icons/icon-256.png',
        '512': 'icons/icon-512.png',
        '1024': 'icons/icon-1024.png'
    },
    'grayscale': {
        '16': 'icons/icon-grayscale-16.png',
        '32': 'icons/icon-grayscale-32.png',
        '64': 'icons/icon-grayscale-64.png',
        '128': 'icons/icon-grayscale-128.png',
        '256': 'icons/icon-grayscale-256.png',
        '512': 'icons/icon-grayscale-512.png',
        '1024': 'icons/icon-grayscale-1024.png'
    }
}

/**
 * Icon Badge Color
 * @type {browserAction.ColorArray}
 * @constant
 */
const iconBadgeColorDefault = [6, 244, 255, 210]

/**
 * Menu Title
 * @type {String}
 * @constant
 */
const menuTitle = 'Send to IINA:'


/**
 * List of known media URLs
 * @type {Array}
 */
let urlList = []



/**
 * Check if URL is text document
 * @param {String} url - URL
 * @returns {Boolean} - Yes / No
 */
let isTextDocument = (url) => {
    console.debug('isDocument')

    return /.*(?:css|css3|htm|txt|php|php3|html)/g.test(url)
}

/**
 * Show native Notification
 * @param {String} title - Title
 * @param {String} message - Message
 */
let showNotification = (title, message) => {
    console.debug('showNotification', 'title:', title, 'message:', message)

    chrome.notifications.create({
        type: 'basic',
        iconUrl: '/data/icons/48.png',
        title: title,
        message: message
    })
}


/**
 * Set Icon Image
 * @param {String} label - Label
 * @param {String=} tabId - Tab
 */
let setIconImage = (label, tabId) => {
    console.debug('setIconImage', 'label:', label, 'tabId:', tabId)

    chrome.browserAction.setIcon({
        path: iconImageDictionary[label],
        tabId: tabId
    })
}

/**
 * Set Icon Badge Color
 * @param {String} color - Color
 * @param {String=} tabId - Tab
 */
let setIconBadgeColor = (color, tabId) => {
    console.debug('setIconBadgeColor', 'color:', color, 'tabId:', tabId)

    chrome.browserAction.setBadgeBackgroundColor({
        color: color,
        tabId: tabId
    })
}

/**
 * Set Icon Badge Text
 * @param {String} text - Text
 * @param {String=} tabId - Tab
 */
let setIconBadgeText = (text, tabId) => {
    console.debug('setIconBadgeText', 'text:', text, 'tabId:', tabId)

    chrome.browserAction.setBadgeText({
        text: text,
        tabId: tabId
    })
}


/**
 * Get URL Basename
 * @param {String} url - URL
 * @return {String} URL Basename
 */
let basename = (url) => {
    // console.debug('basename')

    const urlObject = new URL(url)
    const urlPathname = urlObject.pathname

    return urlPathname.split('/').reverse()[0]
}

/**
 * Create App URL / Scheme URL
 * @param {String} url - URL
 * @param {Boolean=} Enqueue - Enqueue in playlist instead of replacing playlist
 * @returns {String} - Encoded URL
 */
let createAppUrl = (url, enqueue = true) => {
    console.debug('createAppUrl', 'url:', url, 'enqueue:', enqueue)

    return `iina://weblink?url=${encodeURIComponent(url)}&enqueue=${Boolean(enqueue) === true ? '1': '0'}`
}

/**
 * Open URLs
 * @param {String} url - URL
 */
let openUrl = (url) => {
    console.debug('openUrl', 'url:', url)

    // Lookup URL Components via URL API
    const urlObject = new URL(url)
    const urlHref = urlObject.href
    const urlPathname = urlObject.pathname
    const urlHostname = urlObject.hostname

    chrome.tabs.query({ currentWindow: true, active: true }, (tabList) => {
        // Filter tab urls
        if (!/^((http|https):\/\/)/.test(tabList[0].url)) {
            console.warn(`Ignoring tab URL: ${tabList[0].url}`)
            return
        }

        // Default: Enqueue URL
        let shouldEnqueueUrl = true

        // YouTube Playlists: replace active playlist
        if (urlHostname.includes('youtube.com') && urlPathname.startsWith('/playlist')) {
            shouldEnqueueUrl = false
        }

        const iinaUrl = createAppUrl(urlHref, shouldEnqueueUrl)

        // Open URL Scheme URL
        chrome.tabs.executeScript(tabList[0].id, {
            allFrames: false,
            runAt: 'document_start',
            code: `(window.parent ? window.parent : window).location.assign('${iinaUrl}')`
        }, () => showNotification((shouldEnqueueUrl ? 'Enqueueing URL' : 'Opening URL'), basename(urlHref)))

        console.debug('iinaUrl: ', iinaUrl)
    })
}

/**
 * Reset URL database
 */
let resetUrls = () => {
    console.debug('resetUrls')

    urlList = []
}

/**
 * Reset Menu
 * @param {String=} tabId - Tab
 */
let resetMenu = (tabId) => {
    console.debug('resetMenu', 'tabId:', tabId)

    chrome.contextMenus.removeAll()
    setIconImage('grayscale')
    setIconBadgeText('', tabId)
    setIconBadgeColor(iconBadgeColorDefault, tabId)
}

/**
 * Register URLs
 * @param {Array} urls - URLs
 * @param {String} tabId - Tab
 */
let registerUrls = (urls, tabId) => {
    console.debug('registerUrls')
    // console.debug('registerUrls', 'urls:', ...urls)

    // Register
    urlList = urlList.concat(urls)

    // Cleanup
    urlList = urlList.filter(String)
    urlList = [...new Set(urlList)]

    // Filter
    urlList = urlList.filter(url => !isTextDocument(url))

    console.debug('urlList', ...urlList)

    if (urlList.length === 0) { return }

    chrome.contextMenus.create({
        enabled: false,
        title: menuTitle,
        id: `title-${Math.random().toString(36).substring(7)}`,
        contexts: ['browser_action'],
        documentUrlPatterns: ['*://*/*']
    })

    // Add URLs to add-on popup menu
    urlList.forEach((url, urlIndex) => {
        chrome.contextMenus.create({
            id: `url-${Math.random().toString(36).substring(7)}`,
            title: basename(url),
            contexts: ['browser_action'],
            documentUrlPatterns: ['*://*/*'],
            onclick: () => openUrl(url)
        })
    })

    // Update Icon
    setIconBadgeText(String(urlList.length), tabId)
    setIconImage('color', tabId)
}


/**
 * Fired when a message is sent from either an extension process (by runtime.sendMessage) or a content script (by tabs.sendMessage).
 * @listens chrome.runtime#onMessage
 */
chrome.runtime.onMessage.addListener((request, sender) => {
    // console.debug('chrome.runtime.onMessage')
    // console.debug('request:', request)
    // console.debug('sender:', sender)

    switch (request.method) {
        case 'add-urls':
            console.debug(`chrome.runtime.onMessage#${request.method}`)

            resetMenu(sender.tab.id)
            registerUrls(request.urls, sender.tab.id)

            break
    }
})

/**
 * Fired when a tab did navigate
 * @listens chrome.tabs#onUpdated
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // console.debug('chrome.tabs#onUpdated', 'tabId:', tabId)

    if (!(changeInfo.status && (changeInfo.status === 'complete'))) { return }

    resetUrls()
    chrome.tabs.sendMessage(tabId, { method: 'did-update' })
})

/**
 * Fired when a tab is activated
 * @listens chrome.tabs#onUpdated
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.debug('chrome.tabs#onActivated', 'windowId:', activeInfo.windowId, 'tabId:', activeInfo.tabId)

    resetUrls()
    chrome.tabs.sendMessage(activeInfo.tabId, { method: 'did-activate' })
})


/**
 * Init
 */
resetMenu()
