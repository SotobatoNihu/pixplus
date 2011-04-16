if (window.opera) {
  opera.extension.onmessage = function(event) {
    var res = create_response(JSON.parse(event.data));
    if (res.data) event.source.postMessage(JSON.stringify(res));
  };
} else if (window.chrome) {
  chrome.extension.onRequest.addListener(function(message, sender, func) {
    func(create_response(message));
  });
} else if (window.safari) {
  safari.application.addEventListener('message', function(ev) {
    var res = create_response({command: ev.name, data: ev.message});
    if (res.data) ev.target.page.dispatchMessage(res.command, res.data);
  },false);
}

function create_config_map() {
  var data = {};
  conf.each(function(sec, key) {
    data[sec.name + '_' + key] = conf.get(sec.name, key);
  });
  return data;
}
function create_response(data) {
  if (data.command == 'config') {
    return {command: data.command, data: create_config_map()};
  } else if (data.command == 'config-set') {
    var section = data.data.section, key = data.data.key, value = data.data.value;
    conf.set(section, key, value);
  } else if (data.command == 'config-remove') {
    conf.remove(data.data.section, data.data.key);
  } else if (data.command == 'open-options') {
    if (window.opera) {
      opera.extension.tabs.create({url: 'options.html', focused: true});
    }
  }
  return {command: data.command, data: null};
}
