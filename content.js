var timer = null;
var waitTimer = null;
var interval = -1;
var secondsToWait = -1;
var countdownDom = null;
var options = null;
var notificationId = null;
var badgeAdded = false;
var countdownDomClassName = 'free-auto-refresh-extension-countdown';

document.addEventListener('DOMContentLoaded', function () {
  queryTask('dom-ready');
});

window.addEventListener('load', function () {
  queryTask('finish-loading');
});

chrome.runtime.onMessage.addListener((req, sender, reply) => {
  if (req.type === 'DISPATCH') {
    handleTask(req.options);
  }
  reply('ok');
  return true;
});

function notify(string, options) {
  if (options['otherOptions'].indexOf('notification') === -1) {
    return;
  }
  chrome.runtime.sendMessage(
    {
      type: 'NOTIFY',
      message: string,
      id: notificationId,
    },
    function (res) {
      notificationId = res;
    },
  );
}

function queryTask(when) {
  chrome.runtime.sendMessage({ type: 'QUERY' }, function (res) {
    var opts = res.options;
    if (!opts) return;
    if (when !== opts['whenToStartCountdown']) {
      return;
    }
    if (opts['whenToStop'] === 'text' && opts['textPattern']) {
      var pageContent = document.documentElement.innerText;
      if (pageContent.match(new RegExp(opts['textPattern']))) {
        notify('Task stopped, because text "' + opts['textPattern'] + '" appears.', opts);
        stopTask();
        return;
      }
    }
    if (opts['whenToStop'] === 'element' && opts['elementSelector']) {
      var element = document.querySelector(opts['elementSelector']);
      if (element) {
        notify('Task stopped, because element "' + opts['elementSelector'] + '" appears.', opts);
        stopTask();
        return;
      }
    }
    handleTask(res.options);
  });
}

async function stopTask() {
  await chrome.runtime.sendMessage({ type: 'STOP' });
}

function reloadPage() {
  var noCache = options['otherOptions'].indexOf('noCache') !== -1;
  if (noCache) {
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, function (res) {
      if (res === 'ok') {
        window.location.reload();
      }
    });
  } else {
    window.location.reload();
  }
}

function clearTimer() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

function handleTask(opts) {
  if (!opts) return;
  var isIntervalChange = !options || options.interval !== opts.interval;
  options = opts;
  // update
  if (options.started) {
    secondsToWait = timeToWait();
    if (secondsToWait > 0) {
      clearTimer();
      removeCountDown();
      removeBadge();
      startWaitTimer();
      return;
    }
    if (isIntervalChange) {
      interval = options.interval;
      clearTimer();
      showCountDown(options);
      if (interval === 0) {
        reloadPage();
        return;
      }
      timer = setInterval(function () {
        interval -= 1;
        showCountDown(options);
        if (interval <= 0) {
          clearTimer();
          reloadPage();
        }
      }, 1000);
    }
  }
  // stop
  if ((!opts.started || opts.interval <= 0) && timer) {
    clearTimer();
    removeCountDown();
    removeBadge();
  }
}

function timeToWait() {
  if (!options) return -1;
  if (options['whenToStart'] === 'specific-time' && options['timeToStart']) {
    var arr = options['timeToStart'].split(':');
    var hour = +arr[0];
    var minutes = +arr[1];
    var seconds = +arr[2];
    var now = new Date();
    now.setHours(hour);
    now.setMinutes(minutes);
    now.setSeconds(seconds);
    var delta = (now.getTime() - Date.now()) / 1000;
    if (delta < 0) {
      return -1;
    }
    return delta;
  }
  return -1;
}

function clearWaitTimer() {
  if (!waitTimer) return;
  clearInterval(waitTimer);
  waitTimer = null;
}

function startWaitTimer() {
  clearWaitTimer();
  waitTimer = setInterval(function () {
    secondsToWait -= 1;
    setBadge('P', '#ED7161');
    if (secondsToWait <= 0) {
      notify('Task has started.', options);
      reloadPage();
    }
  }, 1000);
}

function removeCountDown() {
  if (countdownDom) {
    document.body.removeChild(countdownDom);
    countdownDom = null;
  }
}

function showCountDown(opts) {
  if (opts['whereToShowCountdown'].indexOf('page') !== -1) {
    if (!countdownDom) {
      countdownDom = document.createElement('div');
      countdownDom.classList.add(countdownDomClassName);
      document.body.appendChild(countdownDom);
    }
    countdownDom.innerHTML = interval > 0 ? interval : 'loading...';
  } else {
    removeCountDown();
  }
  if (opts['whereToShowCountdown'].indexOf('icon') !== -1) {
    setBadge(interval, '#61B872');
  } else {
    removeBadge();
  }
}

function setBadge(text, color) {
  chrome.runtime.sendMessage({ type: 'BADGE', text: text, color: color }, function (res) {
    if (res === 'ok') {
      badgeAdded = true;
    }
  });
}

function removeBadge() {
  if (!badgeAdded) return;
  chrome.runtime.sendMessage({ type: 'BADGE', text: '', color: '#61B872' }, function (res) {
    if (res === 'ok') {
      badgeAdded = false;
    }
  });
}
