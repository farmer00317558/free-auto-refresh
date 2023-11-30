var tabId = -1;

const options = {};

const defaultOptions = {
  started: false,
  interval: 3,
  whereToShowCountdown: ['icon'],
  whenToStartCountdown: 'dom-ready',
  whenToStart: 'right-now',
  whenToStop: 'never',
  timeToStart: '',
  textPattern: '',
  elementSelector: '',
  otherOptions: ['notification'],
};

const radioOptions = ['whenToStartCountdown', 'whenToStart', 'whenToStop'];

if (chrome.i18n.getUILanguage() === 'zh-CN') {
  document.querySelectorAll('[data-i18n]').forEach(function (node) {
    var message = chrome.i18n.getMessage(node.dataset.i18n);
    console.info(message);
    if (node.tagName.toLowerCase() === 'input') {
      node.setAttribute('placeholder', message);
      return;
    }
    node.innerText = message;
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  if (tabs.length > 0) {
    tabId = tabs[0].id;
    if (!tabId) {
      return;
    }

    const key = String(tabId);
    const items = await chrome.storage.local.get(key);
    console.info('current tab options:', items);

    Object.assign(options, defaultOptions, items[key], { tabId: tabId });
    applyTabStatus(options.started, options.interval);
    renderSettingForm(options);
  }
});

const btn = document.querySelector('#btn');
const settingBtn = document.querySelector('#setting-btn');
const authorBtn = document.querySelector('#author-btn');
const input = document.querySelector('#interval');
const home = document.querySelector('#home');
const settings = document.querySelector('#settings');
const quickStart = document.querySelector('#quick-start-wrapper');
const checkboxList = document.querySelectorAll('input[type=checkbox]');
const radioList = document.querySelectorAll('input[type=radio]');
const textList = document.querySelectorAll('input[type=text]');
const timeInput = document.querySelector('input[type=time]');

function applyTabStatus(running, interval) {
  btn.classList.toggle('running', running);
  input.classList.toggle('stop', !running);
  if (interval >= 0) {
    input.value = interval;
  }
}

function renderSettingForm(options, inputing = false) {
  // document.querySelectorAll('input[type=text]').forEach(function (node) {
  //     node.style.display = 'none'
  //     node.value = ''
  // })
  document.querySelector('input[name=textPattern]').style.display =
    options['whenToStop'] === 'text' ? 'block' : 'none';
  document.querySelector('input[name=elementSelector]').style.display =
    options['whenToStop'] === 'element' ? 'block' : 'none';

  if (inputing) {
    return;
  }

  Object.keys(options).forEach(function (key) {
    var value = options[key];
    var dom = null;
    // Checkbox
    if (Array.isArray(value)) {
      value.forEach(function (item) {
        dom = document.querySelector('input[value=' + item + ']');
        dom && (dom.checked = true);
      });
      return;
    }
    // Radio
    if (radioOptions.indexOf(key) !== -1) {
      dom = document.querySelector('input[value=' + value + ']');
      dom && (dom.checked = true);
      return;
    }

    dom = document.querySelector('input[name=' + key + ']');
    // Time
    // if (key === 'timeToStart') {
    //     dom.value.valueAs
    // }
    // Text
    dom && (dom.value = value);
  });
}

function updateSettings(opts) {
  Object.assign(options, opts);
  chrome.runtime.sendMessage({ type: 'START', options: options }, function (response) {
    if (response === 'ok') {
      renderSettingForm(options, true);
    }
  });
}

const handleToogleStart = async () => {
  const interval = input.value && input.value.trim();
  const running = btn.classList.contains('running');
  const action = running ? 'STOP' : 'START';

  if (action === 'START' && (!interval || interval < 0)) {
    return;
  }

  options.started = action === 'START';
  options.interval = +interval;

  chrome.runtime.sendMessage({ type: action, options: options }, (res) => {
    if (res === 'ok') {
      applyTabStatus(!running, interval);
    }
  });
};

btn.addEventListener('click', handleToogleStart);

checkboxList.forEach(function (node) {
  node.addEventListener('change', function (e) {
    var checked = e.target.checked;
    var key = e.target.name;
    var value = e.target.value;
    if (checked) {
      options[key].push(value);
    } else {
      var index = options[key].indexOf(value);
      if (index === -1) return;
      options[key].splice(index, 1);
    }
    updateSettings(options);
  });
});

radioList.forEach(function (node) {
  node.addEventListener('change', function (e) {
    var key = e.target.name;
    var value = e.target.value;
    if (key === 'whenToStart' && value === 'specific-time') {
      var timeToStart = options['timeToStart'];
      if (!timeToStart) {
        var fiveMinLater = new Date(Date.now() + 5 * 60 * 1000);
        var hour = fiveMinLater.getHours();
        var minutes = fiveMinLater.getMinutes();
        var seconds = fiveMinLater.getSeconds();
        timeToStart =
          (hour < 10 ? '0' + hour : hour) +
          ':' +
          (minutes < 10 ? '0' + minutes : minutes) +
          ':' +
          (seconds < 10 ? '0' + seconds : seconds);
      }
      options['timeToStart'] = timeToStart;
    }
    options[key] = e.target.value;
    updateSettings(options);
  });
});

textList.forEach(function (node) {
  node.addEventListener('input', function (e) {
    options[e.target.name] = e.target.value;
    updateSettings(options);
  });
});

timeInput.addEventListener('change', function (e) {
  options[e.target.name] = e.target.value;
  updateSettings(options);
});

settingBtn.addEventListener('click', function (e) {
  e.preventDefault();
  settings.classList.toggle('hide');
  home.classList.toggle('hide');
});

authorBtn.addEventListener('click', function (e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

quickStart.addEventListener('click', (e) => {
  const value = e.target.dataset.value;
  if (value) {
    applyTabStatus(true, value);
    updateSettings({
      started: true,
      interval: Number(value),
    });
  }
});
