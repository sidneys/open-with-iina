/* globals Parser */
'use strict';

function notify(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: '/data/icons/48.png',
        title: chrome.i18n.getMessage('appTitle'),
        message
    });
}

function copy(tabId) {
    if (/Firefox/.test(navigator.userAgent)) {
        chrome.tabs.executeScript(tabId, {
            allFrames: false,
            runAt: 'document_start',
            code: `
                document.oncopy = (event) => {
                    event.clipboardData.setData('text/plain', '${copy.urls.join(', ')}');
                    event.preventDefault();
                };
                window.focus();
                document.execCommand('Copy', false, null);
            `
        }, () => {
            notify(
                chrome.runtime.lastError ?
                    chrome.i18n.getMessage('msgNoCopy') :
                    chrome.i18n.getMessage('msgCopy') + ' ' + copy.urls.length
            );
            copy.urls = [];
        });
    }
    else {
        document.oncopy = e => {
            e.clipboardData.setData('text/plain', copy.urls.join('\n'));
            e.preventDefault();
            notify(chrome.i18n.getMessage('msgCopy') + ' ' + copy.urls.length);
            copy.urls = [];
        };
        document.execCommand('Copy', false, null);
    }
}
copy.urls = [];



/**
 * Get URL for custom scheme
 * @param {String} value - Query value
 * @param {String=} scheme - URL scheme
 * @param {String=} path - URL path
 * @param {String=} parameter - Query parameter
 * @returns {String} - Encoded URL
 */
let encodeUrl = (value, scheme = 'iina', path = 'weblink', parameter = 'url') => {
    return `${scheme}://${path}?${parameter}=${encodeURIComponent(value)}`;
}

function openUrls(urlList) {
    console.debug('openUrls()')
    console.debug(urlList)

    chrome.tabs.query({ currentWindow: true, active: true }, (tabList) => {
        // Filter tab urls
        if (!/^((http|https):\/\/)/.test(tabList[0].url)) {
            console.warn(`ignoring url (${tabList[0].url})`);
            return;
        }

        const tabId = tabList[0].id
        const encodedUrl = encodeUrl(urlList[0])

        chrome.tabs.executeScript(tabId, {
            allFrames: false,
            runAt: 'document_start',
            code: `
                (window.parent ? window.parent : window).location.assign('${encodedUrl}');
            `
        });

        console.debug('encodedUrl: ', encodedUrl)
    });
}

chrome.runtime.onMessage.addListener((request, sender) => {
    console.debug('chrome.runtime.onMessage.addListener()')
    console.debug(request)
    if (request.method === 'show-button') {
        chrome.storage.local.get({
            badge: true
        }, prefs => prefs.badge && chrome.browserAction.setBadgeText({
            tabId: sender.tab.id,
            text: String(request.count)
        }));
    }
    else if (request.method === 'send-to-vlc') {
        openUrls(request.urls);
    }
    else if (request.method === 'copy') {
        window.clearTimeout(copy.id);
        copy.urls = [...copy.urls, ...request.urls];
        copy.id = window.setTimeout(copy, 500, sender.tab.id);
    }
});

chrome.browserAction.onClicked.addListener(tab => {
    chrome.tabs.sendMessage(tab.id, {
        method: 'get-urls',
        pause: true,
        reply: 'send-to-vlc'
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'open-current') {
        openUrls([info.srcUrl || info.linkUrl]);
    }
    else if (info.menuItemId === 'copy') {
        chrome.tabs.sendMessage(tab.id, {
            method: 'get-urls',
            pause: false,
            reply: 'copy'
        });
    }
});

(function(callback) {
    chrome.runtime.onInstalled.addListener(callback);
    chrome.runtime.onStartup.addListener(callback);
})(function() {
    chrome.contextMenus.create({
        id: 'copy',
        title: 'contextMenuCopy',
        contexts: ['browser_action'],
        documentUrlPatterns: ['*://*/*']
    });
    chrome.storage.local.get({
        video: true,
        audio: true,
        link: true,
        color: '#6e6e6e'
    }, prefs => {
        if (prefs.video || prefs.audio || prefs.link) {
            chrome.contextMenus.create({
                id: 'open-current',
                title: 'appTitle',
                contexts: [
                    prefs.video ? 'video' : '',
                    prefs.audio ? 'audio' : '',
                    prefs.link ? 'link' : ''
                ].filter(a => a),
                documentUrlPatterns: ['*://*/*']
            });
        }
        chrome.browserAction.setBadgeBackgroundColor({
            color: prefs.color
        });
    });
});

