let curTabId = -1;

async function getTask(tabId) {
  const key = String(tabId);
  const items = await chrome.storage.local.get(key);
  return items[key];
}

async function updateTask(tabId, options) {
  const key = String(tabId);
  const preOptions = await getTask(tabId);

  const items = {
    [key]: {
      ...preOptions,
      ...options,
    },
  };
  await chrome.storage.local.set(items);
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'DISPATCH', options: options }, (response) => {
      if (response === undefined) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

async function startTask(tabId, options) {
  return updateTask(tabId, options);
}

async function stopTask(tabId) {
  return updateTask(tabId, { started: false });
}

chrome.tabs.onActivated.addListener((info) => {
  curTabId = info.tabId;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  console.info('remove config of tab:', tabId);
  chrome.storage.local.remove(tabId + '');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  var tabId = (request.options && request.options.tabId) || (sender.tab && sender.tab.id);
  console.info(tabId);
  if (request.type === 'START' && tabId > 0) {
    startTask(tabId, request.options)
      .then(() => {
        sendResponse('ok');
      })
      .catch((e) => {
        console.error(e);
      });
    return true;
  }
  if (request.type === 'STOP' && tabId > 0) {
    stopTask(tabId)
      .then(() => {
        sendResponse('ok');
      })
      .catch((e) => {
        console.error(e);
      });
    return true;
  }
  if (request.type === 'QUERY' && sender.tab) {
    getTask(sender.tab.id)
      .then((options) => {
        sendResponse({ options });
      })
      .catch((e) => {
        console.error(e);
      });
    return true;
  }
  if (request.type === 'BADGE' && sender.tab) {
    chrome.action.setBadgeText({
      text: request.text + '',
      tabId: sender.tab.id,
    });
    chrome.action.setBadgeBackgroundColor({
      color: request.color,
      tabId: sender.tab.id,
    });
    sendResponse('ok');
    return true;
  }
  if (request.type === 'CLEAR_CACHE' && sender.tab) {
    chrome.browsingData.remove({ since: 0 }, { cache: true }, () => {
      console.info('remove cache completed');
      sendResponse('ok');
    });
    return true;
  }
  if (request.type === 'NOTIFY' && sender.tab) {
    if (!request.id) {
      chrome.notifications.create(
        {
          type: 'basic',
          iconUrl: 'image/icon128.png',
          title: 'Free Auto Refresh',
          message: request.message,
        },
        (nId) => {
          sendResponse(nId);
        },
      );
    } else {
      chrome.notifications.update(
        request.id,
        {
          type: 'basic',
          iconUrl: 'image/icon128.png',
          title: 'Free Auto Refresh',
          message: request.message,
        },
        () => {
          sendResponse(request.id);
        },
      );
    }
    return true;
  }
});
