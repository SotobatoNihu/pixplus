// ==UserScript==
// @name        pixplus.js
// @author      wowo
// @version     1.13.3
// @license     The MIT License
// @description hogehoge
// @icon        http://ccl4.info/pixplus/pixplus_48.png
// @icon64      http://ccl4.info/pixplus/pixplus_64.png
// @namespace   http://my.opera.com/crckyl/
// @include     http://www.pixiv.net/*
// @exclude     *pixivreader*
// @run-at      document-end
// @downloadURL https://ccl4.info/cgit/pixplus.git/plain/autoupdate/1/pixplus.user.js
// ==/UserScript==

(function(entrypoint) {
  var w = window, g = this || window;

  if (/pixivreader/.test(w.location.href) || w !== w.top) {
    return;
  }

  var greasemonkey =
         false;

  var inject = function(data) {
    var s = w.document.createElement('script'), d = w.document;
    s.setAttribute('type', 'text/javascript');
    s.textContent
      = ('(' + entrypoint.toString() + ')'
         + '(this || window,window,window.document,'
         + g.JSON.stringify(data) + ')');
    (d.body || d.documentElement || d).appendChild(s);
  };

  var send_message;

  if (g.opera) {
    if (g.opera && g.opera.extension) {
      g.opera.extension.onmessage = function(ev){
        var data = g.JSON.parse(ev.data);
        if (data.command === 'config') {
          // entrypoint(g, w, w.document, {conf: data.data});
          inject({conf: data.data});
        }
      };
      g.opera.extension.postMessage(g.JSON.stringify({command: 'config'}));
      send_message = function(command, data) {
        g.opera.extension.postMessage(g.JSON.stringify({command: command, data: data}));
      };

    } else {
      entrypoint(g, w, w.document);
    }

  } else if (greasemonkey) {
    inject(null);

  } else if (g.chrome) {
    var base_uri = g.chrome.extension.getURL('/');
    g.chrome.extension.sendRequest({command: 'config'}, function(msg) {
      if (msg.command === 'config') {
        inject({base_uri: base_uri, conf: msg.data});
      }
    });
    send_message = function(command, data) {
      g.chrome.extension.sendRequest({command: command, data: data});
    };

  } else if (g.safari) {
    g.safari.self.addEventListener('message', function(ev) {
      if (ev.name === 'config') {
        inject({
          base_uri: g.safari.extension.baseURI,
          conf:     ev.message
        });
      }
    }, false);
    g.safari.self.tab.dispatchMessage('config', null);
    send_message = function(command, data) {
      g.safari.self.tab.dispatchMessage(command, data);
    };

  } else {
    inject(null);
  }

  if (send_message) {
    w.addEventListener('pixplusConfigSet', function(ev) {
      var data = {};
      ['section', 'item', 'value'].forEach(function(attr) {
        data[attr] = ev.target.getAttribute('data-pp-' + attr);
      });
      send_message('config-set', data);
    }, false);
  }
})(function(g, w, d, _extension_data) {

  if (w.pixplus || w !== w.top) {
    return;
  }

  // __LIBRARY_BEGIN__

  var _ = w.pixplus = {
    extend: function(base) {
      g.Array.prototype.slice.call(arguments, 1).forEach(function(extract) {
        for(var key in extract) {
          base[key] = extract[key];
        }
      });
      return base;
    },

    version: function() {
      return _.changelog[0].version;
    },

    release_date: function() {
      return _.changelog[0].date;
    },

    strip: function(text) {
      return text ? text.replace(/(?:^\s+|\s+$)/g, '') : '';
    },

    escape_regex: function(text) {
      return text.replace(/([\.\?\*\+\|\(\)\[\]\\])/g, '\\$1');
    },

    q: function(query, context) {
      return (context || d).querySelector(query);
    },

    qa: function(query, context) {
      var list = (context || d).querySelectorAll(query);
      return g.Array.prototype.slice.call(list);
    },

    listen: function(targets, events, listener, options) {
      var throttling_timer;

      if (!options) {
        options = {};
      }

      if (!targets) {
        targets = [];
      } else if (!g.Array.isArray(targets)) {
        targets = [targets];
      }

      if (!g.Array.isArray(events)) {
        events = [events];
      }

      // _.debug('listen: ' + targets.join(',') + ' ' + events.join(',') + ' capture:' + !!options.capture);

      var wrapper = function(ev) {
        if (options.async) {
          if (throttling_timer) {
            return;
          }
          throttling_timer = g.setTimeout(function() {
            listener(ev, connection);
            throttling_timer = 0;
          }, 50);
          return;
        }

        if (listener(ev, connection)) {
          ev.preventDefault();
          ev.stopPropagation();
        }
      };

      var connection = {
        disconnected: false,
        disconnect: function() {
          if (connection.disconnected) {
            return;
          }
          events.forEach(function(event) {
            targets.forEach(function(target) {
              target.removeEventListener(event, wrapper, !!options.capture);
            });
          });
          connection.disconnected = true;
        }
      };

      events.forEach(function(event) {
        targets.forEach(function(target) {
          target.addEventListener(event, wrapper, !!options.capture);
        });
      });
      return connection;
    },

    onclick: function(context, listener, options) {
      return _.listen(context, 'click', function(ev, connection) {
        if (ev.button !== 0 || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) {
          return false;
        }
        return listener(ev, connection);
      }, options);
    },

    onwheel: function(context, listener, options) {
      return _.listen(
        context,
        ['DOMMouseScroll', 'mousewheel'],
        function(ev, connection) {
          if (ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) {
            return false;
          }
          return listener(ev, connection);
        },
        options
      );
    },

    send_click: function(elem) {
      _.debug('send click event');
      var doc  = elem.ownerDocument || d,
          ev   = doc.createEvent('MouseEvent'),
          view = doc.defaultView;
      ev.initMouseEvent(
        'click', // type
        true,    // canBubble
        true,    // cancelable
        view,    // view
        1,       // detail
        0,       // screenX
        0,       // screenY
        0,       // clientX
        0,       // clientY
        false,   // ctrlKey
        false,   // altKey
        false,   // shiftKey
        false,   // metaKey
        0,       // button
        elem     // relatedTarget
      );
      elem.dispatchEvent(ev);
    },

    lazy_scroll: function(target, scroll) {
      var de     = d.documentElement,
          margin = g.Math.floor(de.clientHeight * 0.2);

      if (!target) {
        return;
      }
      if (!scroll) {
        scroll = target.parentElement;
      }

      var r_scroll = scroll.getBoundingClientRect(),
          r_target = target.getBoundingClientRect(),
          bt       = g.Math.max(margin, r_scroll.top + margin),
          bb       = g.Math.min(r_scroll.bottom - margin, de.clientHeight - margin),
          change   = 0;

      if (r_target.top < bt) {
        change = r_target.top - bt;
      } else if (r_target.bottom > bb) {
        change = r_target.bottom - bb;
      }

      if (scroll === de) {
        w.scrollBy(0, change);
      } else {
        var style = w.getComputedStyle(scroll);
        if (scroll.scrollHeight > scroll.clientHeight) {
          scroll.scrollTop += change;
        }
        if (scroll.parentElement && !/^fixed$/i.test(style.position)) {
          _.lazy_scroll(target, scroll.parentElement);
        }
      }
    },

    e: function(name, options, parent) {
      if (!options) {
        options = { };
      }

      var elem, nsuri;

      if (options.ns) {
        nsuri = _.namespaces[options.ns] || options.ns;
        delete options.ns;
      } else if (_.namespaces[name]) {
        nsuri = _.namespaces[name];
      } else if (parent) {
        nsuri = parent.namespaceURI;
      }

      if (nsuri) {
        elem = d.createElementNS(nsuri, name);
      } else {
        elem = d.createElement(name);
      }

      for(var key in options) {
        if (key === 'text') {
          elem.textContent = options[key];
        } else if (key === 'css') {
          elem.style.cssText = options[key];
        } else if (key === 'cls') {
          elem.className = options[key];
        } else {
          elem.setAttribute(key, options[key]);
        }
      }

      if (parent) {
        parent.appendChild(elem);
      }
      return elem;
    },

    namespaces: {
      svg: 'http://www.w3.org/2000/svg'
    },

    clear: function() {
      g.Array.prototype.forEach.call(arguments, function(elem) {
        while(elem.childNodes.length) {
          elem.removeChild(elem.childNodes[0]);
        }
      });
    },

    open: function(url) {
      if (url) {
        w.open(url);
      }
    },

    key_enabled: function(ev) {
      return !(/^textarea$/i.test(ev.target.nodeName) ||
               (/^input$/i.test(ev.target.nodeName) &&
                (!ev.target.type ||
                 /^(?:text|search|tel|url|email|password|number)$/i.test(ev.target.type))));
    },

    parse_query: function(query) {
      var map = { };
      query.replace(/^.*?\?/, '').split('&').forEach(function(p) {
        var pair = p.split('=', 2).map(function(t) {
          return g.decodeURIComponent(t);
        });
        map[pair[0]] = pair[1] || '';
      });
      return map;
    },

    calculate_ratio: function(width, height) {
      return (width - height) / g.Math.min(width, height);
    }
  };

  ['log', 'error', 'debug', 'warn'].forEach(function(name) {
    if (g.console) {
      _[name] = function(msg) {
        if (name !== 'debug' || _.conf.general.debug) {
          var args = g.Array.prototype.slice.call(arguments);
          if (typeof(args[0]) === 'string') {
            args[0] = 'pixplus: [' + name + '] ' + args[0];
          }
          (g.console[name] || g.console.log).apply(g.console, args);
        }
      };
    } else {
      _[name] = function() { };
    }
  });

  _.conf = {
    __key_prefix: '__pixplus_',
    __is_extension: false,

    __conv: {
      'string': function(value) {
        return g.String(value);
      },
      'number': function(value) {
        return g.parseFloat(value) || 0;
      },
      'boolean': function(value) {
        return g.String(value).toLowerCase() === 'true';
      },

      bookmark_tag_order: {
        parse: function(str) {
          var ary = [], ary_ary = [], lines = str.split(/[\r\n]+/);
          for(var i = 0; i < lines.length; ++i) {
            var tag = lines[i];
            if (tag === '-') {
              if (ary_ary.length) {
                ary.push(ary_ary);
              }
              ary_ary = [];
            } else if (tag === '*') {
              ary_ary.push(null);
            } else if (tag) {
              ary_ary.push(tag);
            }
          }
          if (ary_ary.length) {
            ary.push(ary_ary);
          }
          return ary;
        },

        dump: function(bm_tag_order) {
          var str = '';
          if (!bm_tag_order) {
            return str;
          }
          for(var i = 0; i < bm_tag_order.length; ++i) {
            var ary = bm_tag_order[i];
            for(var j = 0; j < ary.length; ++j) {
              if (ary[j] === null) {
                ary[j] = '*';
              }
            }
            if (i) {
              str += '-\n';
            }
            str += ary.join('\n') + '\n';
          }
          return str;
        }
      },

      bookmark_tag_aliases: {
        parse: function(str) {
          var aliases = {};
          var lines = str.split(/[\r\n]+/);
          for(var i = 0; i < Math.floor(lines.length / 2); ++i) {
            var tag = lines[i * 2], alias = lines[i * 2 + 1];
            if (tag && alias) {
              aliases[tag] = alias.replace(/(?:^\s+|\s+$)/g, '').split(/\s+/);
            }
          }
          return aliases;
        },

        dump: function(bm_tag_aliases) {
          var str = '';
          for(var key in bm_tag_aliases) {
            str += key + '\n' + bm_tag_aliases[key].join(' ') + '\n';
          }
          return str;
        }
      }
    },

    __export: function(key_prefix) {
      var that = this;
      var storage = { };
      this.__schema.forEach(function(section) {
        section.items.forEach(function(item) {
          var value = that[section.name][item.key];
          var conv = that.__conv[section.name + '_' + item.key];
          if (conv) {
            value = conv.dump(value);
          } else {
            value = g.String(value);
          }
          storage[key_prefix + section.name + '_' + item.key] = value;
        });
      });
      return storage;
    },

    __import: function(data) {
      var that = this;
      this.__schema.forEach(function(section) {
        section.items.forEach(function(item) {
          var key = section.name + '_' + item.key;
          var value = data[key];
          if (typeof(value) === 'undefined') {
            return;
          }

          var conv = that.__conv[key];
          if (conv) {
            value = conv.parse(value);
          } else if ((conv = that.__conv[typeof(item.value)])) {
            value = conv(value);
          }

          that[section.name][item.key] = value;
        });
      });
    },

    __key: function(section, item) {
      return this.__key_prefix + section + '_' + item;
    },

    __parse: function(section, item, value) {
      var conv = this.__conv[typeof(this.__defaults[section][item])];
      if (conv) {
        value = conv(value);
      }
      conv = this.__conv[section + '_' + item];
      if (conv) {
        value = conv.parse(value);
      }
      return value;
    },

    __dump: function(section, item, value) {
      var conv = this.__conv[section + '_' + item];
      if (conv) {
        return conv.dump(value);
      } else {
        return g.String(value);
      }
    },

    __wrap_storage: function(storage) {
      var that = this;
      return {
        get: function(section, item) {
          return storage.getItem(that.__key(section, item));
        },

        set: function(section, item, value) {
          storage.setItem(that.__key(section, item), value);
        }
      };
    },

    __init: function(storage) {
      var that = this;
      this.__defaults = { };
      this.__schema.forEach(function(section) {
        that.__defaults[section.name] = { };
        section.items.forEach(function(item) {
          that.__defaults[section.name][item.key] = item.value;
        });
      });

      this.__schema.forEach(function(section) {
        var conf_section = that[section.name] = { };

        section.items.forEach(function(item) {
          var value = storage.get(section.name, item.key);
          value = that.__parse(section.name, item.key, value === null ? item.value : value);

          conf_section.__defineGetter__(item.key, function() {
            return value;
          });

          conf_section.__defineSetter__(item.key, function(new_value) {
            value = new_value;
            storage.set(section.name, item.key, that.__dump(section.name, item.key, value));
          });
        });
      });
    }
  };

  _.xhr = {
    cache: { },

    remove_cache: function(url) {
      this.cache[url] = null;
    },

    request: function(method, url, headers, data, cb_success, cb_error) {
      if (!/^(?:(?:http)?:\/\/www\.pixiv\.net)?\/(?:member_illust|bookmark_add)\.php(?:\?|$)/.test(url)) {
        _.error('XHR: URL not allowed - ' + url);
        if (cb_error) {
          cb_error();
        }
        return;
      }

      var that = this;
      var xhr = new w.XMLHttpRequest();
      xhr.onload = function() {
        that.cache[url] = xhr.responseText;
        cb_success(xhr.responseText);
      };
      if (cb_error) {
        xhr.onerror = function() {
          cb_error();
        };
      }
      xhr.open(method, url, true);
      if (headers) {
        headers.forEach(function(p) {
          xhr.setRequestHeader(p[0], p[1]);
        });
      }
      xhr.send(data);
    },

    get: function(url, cb_success, cb_error) {
      if (this.cache[url]) {
        cb_success(this.cache[url]);
        return;
      }
      this.request('GET', url, null, null, cb_success, cb_error);
    },

    post: function(form, cb_success, cb_error) {
      this.request(
        'POST',
        form.getAttribute('action'),
        [['Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8']],
        this.serialize(form),
        cb_success, cb_error
      );
    },

    serialize: function(form) {
      var data = '', data_map = { };
      if (/^form$/i.test(form.nodeName)) {
        _.qa('input', form).forEach(function(input) {
          switch((input.type || '').toLowerCase()) {
          case 'reset':
          case 'submit':
            break;
          case 'checkbox':
          case 'radio':
            if (!input.checked) {
              break;
            }
          default:
            data_map[input.name] = input.value;
            break;
          }
        });
      } else {
        data_map = form;
      }
      for(var key in data_map) {
        if (data) {
          data += '&';
        }
        data += g.encodeURIComponent(key) + '=' + g.encodeURIComponent(data_map[key]);
      }
      return data;
    }
  };

  _.key = {
    keycode_map: { },
    canonical_map: {
      Spacebar: 'Space',
      Esc: 'Escape',
      '+': 'plus',
      ',': 'comma',
      ' ': 'Space',
      '\t': 'Tab'
    },
    global: {
      connection: null,
      handlers: []
    },

    parse_event: function(ev) {
      var keys = [], key, chr = ev['char'];

      var k = ev.keyCode, c = ev.charCode;
      if (c >= 0x20 && c < 0x7f) {
        key = g.String.fromCharCode(c).toLowerCase();
      } else {
        key = this.keycode_map[k];
      }

      if (!key) {
        return null;
      }

      keys.push(this.canonical_map[key] || key);

      [
        [ev.ctrlKey, 'Control'],
        [ev.shiftKey, 'Shift'],
        [ev.altKey, 'Alt'],
        [ev.metaKey, 'Meta']
      ].forEach(function(p) {
        if (p[0] && keys.indexOf(p[1]) < 0) {
          keys.unshift(p[1]);
        }
      });

      return keys.join('+');
    },

    listen: function(context, listener, options) {
      var that = this, suspend = null;
      return _.listen(context, ['keydown', 'keypress'], function(ev, connection) {
        var key = that.parse_event(ev);
        if (!key) {
          return false;
        }

        if (suspend === key && ev.type === 'keypress') {
          return true;
        }

        _.debug('keyevent type=' + ev.type + ' key=' + key);
        var res = !!listener(key, ev, connection);
        if (res) {
          _.debug('  canceled');
          if (ev.type === 'keydown') {
            suspend = key;
          }
        }
        return res;
      }, options);
    },

    listen_global: function(listener) {
      var that = this;

      if (!this.global.connection) {
        _.debug('key.listen_global: begin');

        this.global.connection = this.listen(w, function() {
          for(var i = 0; i < that.global.handlers.length; ++i) {
            var ret = that.global.handlers[i].apply(this, arguments);
            if (ret) {
              return ret;
            }
          }
          return false;
        }, {capture: true});
      }

      this.global.handlers.unshift(listener);

      return {
        disconnect: function() {
          var idx = that.global.handlers.indexOf(listener);
          if (idx >= 0) {
            that.global.handlers.splice(idx, 1);
          }
          if (that.global.handlers.length === 0) {
            that.global.connection.disconnect();
            that.global.connection = null;

            _.debug('key.listen_global: end');
          }
        }
      };
    },

    init: function() {
      var that = this;

      [

        // http://www.w3.org/TR/DOM-Level-3-Events/#legacy-key-models
        // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent

        [8, 'Backspace'], [9, 'Tab'], [13, 'Enter'], [16, 'Shift'], [17, 'Control'], [18, 'Alt'],
        [27, 'Escape'], [32, 'Space'], [33, 'PageUp'], [34, 'PageDown'], [35, 'End'], [36, 'Home'],
        [37, 'Left'], [38, 'Up'], [39, 'Right'], [40, 'Down'], [45, 'Insert'], [46, 'Delete'],

        // The following punctuation characters MAY change virtual codes
        // between keyboard layouts, but reporting these values will likely
        // be more compatible with legacy content expecting US-English
        // keyboard layout

        // From MDN
        // [188, ','], [190, '.'], [191, '/'], [192, '`'],
        // [219, '['], [220, '\\'], [221, ']'], [222, "'"],

        // Semicolon              ';' 186
        // Colon                  ':' 186
        // Equals sign            '=' 187
        // Plus                   '+' 187
        // Comma                  ',' 188
        // Less than sign         '<' 188
        // Minus                  '-' 189
        // Underscore             '_' 189
        // Period                 '.' 190
        // Greater than sign      '>' 190
        // Forward slash          '/' 191
        // Question mark          '?' 191
        // Backtick               '`' 192
        // Tilde                  '~' 192
        // Opening square bracket '[' 219
        // Opening curly brace    '{' 219
        // Backslash              '\' 220
        // Pipe                   '|' 220
        // Closing square bracket ']' 221
        // Closing curly brace    '}' 221
        // Single quote           ''' 222
        // Double quote           '"' 222

        // ASCII
        [48, '0'], [49, '1'], [50, '2'], [51, '3'], [52, '4'], [53, '5'], [54, '6'], [55, '7'],
        [56, '8'], [57, '9'], [58, ':'], [59, ';'], [60, '<'], [61, '='], [62, '>'], [63, '?'],
        [64, '@'], [65, 'a'], [66, 'b'], [67, 'c'], [68, 'd'], [69, 'e'], [70, 'f'], [71, 'g'],
        [72, 'h'], [73, 'i'], [74, 'j'], [75, 'k'], [76, 'l'], [77, 'm'], [78, 'n'], [79, 'o'],
        [80, 'p'], [81, 'q'], [82, 'r'], [83, 's'], [84, 't'], [85, 'u'], [86, 'v'], [87, 'w'],
        [88, 'x'], [89, 'y'], [90, 'z'],

        // From MDN
        [96, '0'], [97, '1'], [98, '2'], [99, '3'], [100, '4'], [101, '5'], [102, '6'], [103, '7'],
        [104, '8'], [105, '9'], [106, '*'], [107, '+'], [108, ','],
        [109, '-'], [110, '.'], [111, '/'], [112, 'F1'], [113, 'F2'], [114, 'F3'], [115, 'F4'],
        [116, 'F5'], [117, 'F6'], [118, 'F7'], [119, 'F8'], [120, 'F9'], [121, 'F10'], [122, 'F11'],
        [123, 'F12'], [124, 'F13'], [125, 'F14'], [126, 'F15'], [127, 'F16'], [128, 'F17'], [129, 'F18'],
        [130, 'F19'], [131, 'F20'], [132, 'F21'], [133, 'F22'], [134, 'F23'], [135, 'F24'], [160, '^'],
        [161, '!'], [162, '"'], [163, '#'], [164, '$'], [165, '%'], [166, '&'], [167, '_'], [168, '('],
        [169, ')'], [170, '*'], [171, '+'], [172, '|'], [173, '-'], [174, '{'], [175, '}'], [176, '~']

      ].forEach(function(p) {
        var code = p[0], name = p[1];
        that.keycode_map[code] = name;
      });
    }
  };

  _.ui = {
    slider: function(min, max, step, attrs) {
      var slider;

      if (!_.conf.general.debug) {
        slider = _.e('input', _.extend({type: 'range', min: min, max: max, step: step}, attrs));
        if (slider.type === 'range') {
          slider.set_value = function(value) {
            slider.value = value;
          };
          return slider;
        }
      }

      var rail, knob;
      slider = _.e('div', _.extend({cls: 'pp-slider'}, attrs));
      rail = _.e('div', {cls: 'pp-slider-rail'}, slider);
      knob = _.e('div', {cls: 'pp-slider-knob'}, rail);

      // if (_.conf.general.debug) {
      //   slider.classList.add('pp-debug');
      // }

      // div.__define[GS]etter__ are not works on FirefoxESR...

      slider.set_value = function(value) {
        var pos;
        value = g.Math.max(min, g.Math.min(g.parseFloat(value), max));
        pos = (value - min) / (max - min);
        knob.style.left = (pos * 100) + '%';
        return slider.value = value;
      };

      _.listen(knob, 'mousedown', function(ev) {
        var x, conn1, conn2;

        x = ev.screenX - (knob.offsetLeft + 4);
        slider.classList.add('pp-active');

        conn1= _.listen(w, 'mousemove', function(ev) {
          var pos = ev.screenX - x;
          pos = g.Math.max(0, g.Math.min(pos, rail.offsetWidth));
          knob.style.left = pos + 'px';
          slider.value = (max - min) * pos / rail.offsetWidth + min;

          ev = d.createEvent('Event');
          ev.initEvent('change', true, true);
          slider.dispatchEvent(ev);
        });

        conn2 = _.listen(w, 'mouseup', function(ev) {
          conn1.disconnect();
          conn2.disconnect();
          slider.classList.remove('pp-active');
        });

        return true;
      });
      return slider;
    }
  };

  _.modal = {
    suspend: false,
    dialog: null,

    centerize: function() {
      var dlg = this.dialog;
      while(dlg) {
        var options = this.dialog.options,
            container = this.dialog.container;

        var de = d.documentElement, x, y;

        x = (de.clientWidth  - container.offsetWidth)  / 2;
        y = (de.clientHeight - container.offsetHeight) / 2;

        if (/^(?:both|horizontal)$/i.test(options.centerize)) {
          container.style.left = g.Math.floor(x) + 'px';
        }
        if (/^(?:both|vertical)$/i.test(options.centerize)) {
          container.style.top  = g.Math.floor(y) + 'px';
        }

        dlg = dlg.parent;
      }
    },

    begin: function(container, options) {
      if (this.dialog && container === this.dialog.container) {
        return;
      }

      while(this.dialog && this.dialog.container !== options.parent) {
        this.close();
      }

      try {
        w.pixiv.ui.modal.close();
      } catch(ex) {
        _.error(ex);
      }

      _.debug('Begin modal');

      this.dialog = {
        parent: this.dialog,
        container: container,
        options: options || { }
      };

      this.centerize();
      this.init_events();

      var that = this;
      this.suspend = true;

      g.setTimeout(function() {
        that.suspend = false;
      }, 100);
    },

    close: function() {
      _.debug('End modal');
      if (this.dialog.options && this.dialog.options.onclose) {
        this.dialog.options.onclose(this.dialog.container);
      }
      this.dialog = this.dialog.parent;
      if (!this.dialog) {
        this.uninit_events();
      }
    },

    end: function(target) {
      while(this.dialog) {
        var end = this.dialog.container === target;
        this.close();
        if (end) {
          break;
        }
      }
    },

    init_events: function() {
      var that = this;
      if (!this.conn_key) {
        this.conn_key = _.key.listen_global(function(key) {
          if (!that.suspend && key === 'Escape') {
            that.close();
            return true;
          }
          return false;
        });
      }

      if (!this.conn_click) {
        this.conn_click = _.onclick(d, function(ev) {
          if (that.suspend || !d.body.contains(ev.target)) {
            return;
          }

          var members = [that.dialog.container].concat(that.dialog.options.members || []);
          for(var i = 0; i < members.length; ++i) {
            if (ev.target === members[i] || members[i].contains(ev.target)) {
              return;
            }
          }

          that.close();
        });
      }

      if (!this.conn_resize) {
        this.conn_resize = _.listen(w, 'resize', this.centerize.bind(this), {async: true});
      }

      if (!this.conn_pixiv_modal_open) {
        var on_modal_open = function() {
          that.end();
        };
        try {
          w.colon.d.on('uiModalOpen', on_modal_open);
        } catch(ex) {
          _.error(ex);
        }
        this.conn_pixiv_modal_open = {
          disconnect: function() {
            try {
              w.colon.d.off('uiModalOpen', on_modal_open);
            } catch(ex) {
              _.error(ex);
            }
          }
        };
      }
    },

    uninit_events: function() {
      var that = this;
      ['key', 'click', 'resize', 'pixiv_modal_open'].forEach(function(name) {
        if (that['conn_' + name]) {
          that['conn_' + name].disconnect();
          that['conn_' + name] = null;
        }
      });
    }
  };

  _.PopupMenu = function(button) {
    this.dom = { };
    this.dom.root = _.e('div', {cls: 'pp-popup-menu'});
    this.dom.list = _.e('ol', {cls: 'pp-popup-menu-items'}, this.dom.root);
    this.button = button;
    this.onopen = [];

    var that = this;
    _.onclick(button, function() {
      that.open(button);
    });
  };

  _.extend(_.PopupMenu.prototype, {
    add: function(name, text, options) {
      if (!options) {
        options = { };
      }

      if (options.key) {
        text = _.i18n.key_subst(text, options.key);
      }

      var that = this;

      var li = _.e('li', {
        cls: 'pp-popup-menu-item',
        'data-name': name,
        'data-type': options.type || 'normal'
      }, this.dom.list);

      if (options.type === 'link') {
        var link = _.e('a', {text: text, href: options.url || ''}, li);
        if (options.get_url) {
          this.onopen.push(function() {
            link.href = options.get_url();
          });
        }

      } else {
        var label = _.e('label', null, li);

        if (options.type === 'checkbox') {
          var check = _.e('input', {type: 'checkbox'}, label);

          label.appendChild(d.createTextNode(text));
          if (options.checked) {
            check.checked = true;
          }

          _.listen(check, 'change', function(ev) {
            if (options.callback) {
              options.callback(name, check.checked);
            }
            that.close();
          });

        } else {
          label.textContent = text;

          _.onclick(li, function(ev) {
            if (options.callback) {
              options.callback(name);
            }
            that.close();
          });
        }
      }
    },

    add_conf_item: function(section, item, callback) {
      var options = { };
      var value = _.conf[section][item];

      if (typeof(value) === 'boolean') {
        options.type = 'checkbox';
        options.checked = value;
        options.callback = function(name, checked) {
          _.conf[section][item] = checked;
          if (callback) {
            callback(checked);
          }
        };


      } else {
        return;
      }

      this.add(section + '_' + item, _.lng.conf[section][item], options);
    },

    open: function(button) {
      var that = this, root = this.dom.root;

      if (root.parentNode) {
        return;
      }

      this.onopen.forEach(function(handler) {
        handler.call(that);
      });

      d.body.appendChild(root);

      var options = {
        onclose: function() {
          if (that.button) {
            root.parentNode.removeChild(root);
            that.button.classList.remove('pp-active');
          }
        }
      };

      if (button) {
        var rect = button.getBoundingClientRect(), de = d.documentElement;
        var x, y;

        x = g.Math.max(g.Math.min(rect.left, de.clientWidth - root.offsetWidth), 0);
        y = g.Math.max(g.Math.min(rect.bottom, de.clientHeight - root.offsetHeight), 0);

        root.style.left = x + 'px';
        root.style.top = y + 'px';
      } else {
        options.centerize = 'both';
      }

      _.modal.begin(root, options);

      if (this.button) {
        this.button.classList.add('pp-active');
      }
    },

    close: function() {
      if (this.dom.root.parentNode) {
        _.modal.end(this.dom.root);
      }
    }
  });

  _.configui = {
    editor: {
      regexp_paths: [
        '/mypage.php',
        '/new_illust.php',
        '/bookmark_new_illust.php',
        '/mypixiv_new_illust.php',
        '/ranking.php?mode=daily',
        '/ranking_area.php',
        '/stacc/p/activity',
        '/stacc/p/activity?mode=unify',
        '/user_event.php',
        '/bookmark.php',
        '/bookmark.php?rest=hide',
        '/bookmark.php?id=11',
        '/member.php?id=11',
        '/member_illust.php',
        '/member_illust.php?id=11',
        '/member_illust.php?mode=medium&illust_id=11437736',
        '/response.php?illust_id=11437736',
        '/tags.php?tag=pixiv',
        '/search.php?s_mode=s_tag&word=pixiv',
        '/cate_r18.php',
        '/new_illust_r18.php',
        '/user_event.php?type=r18',
        '/questionnaire_illust.php',
        '/search_user.php'
      ],

      close: function() {
        if (this.wrapper) {
          this.wrapper.parentNode.removeChild(this.wrapper);
          this.wrapper = null;
        }
        if (this.current_target) {
          this.current_target.classList.remove('pp-active');
          this.current_target = null;
        }
      },

      open: function(input, type, lang) {
        var args = g.Array.prototype.slice.call(arguments, 3);

        var wrapper = _.e('div', {cls: 'pp-config-editor-wrapper'}, null);
        input.parentNode.insertBefore(wrapper, input);

        var editor = _.e('div', {cls: 'pp-dialog pp-config-editor pp-config-' + type + '-editor'}, wrapper);

        var close = function() {
          _.modal.end(editor);
        };

        var data = this[type].apply(this, [editor, input, close, lang].concat(args)) || {};

        if (data.update) {
          data.update(input.value);
        }

        if (data.input) {
          _.listen(data.input, 'input', function() {
            input.value = data.input.value;
            if (data.update) {
              data.update(input.value);
            }
          });
        }

        if (data.input || data.update) {
          _.listen(input, 'input', function() {
            if (data.input) {
              data.input.value = input.value;
            }
            if (data.update) {
              data.update(input.value);
            }
          });
        }

        _.modal.begin(editor, {
          onclose: this.close.bind(this),
          parent: _.configui.dom.root,
          members: [input]
        });

        this.wrapper = wrapper;
        input.classList.add('pp-active');
        this.current_target = input;
      },

      register: function(input) {
        var that = this, args = g.Array.prototype.slice.call(arguments);
        _.listen(input, 'focus', function(ev) {
          that.open.apply(that, args);
        });
      },

      key: function(root, input, close, lang) {
        var list = _.e('ul', null, root);

        var reset = function() {
          _.clear(list);
          if (input.value) {
            input.value.split(',').forEach(add);
          }
        };

        var add = function(key) {
          var li = _.e('li', null, list);
          _.onclick(_.e('button', {text: '\u2715'}, li), function() {
            list.removeChild(li);
            apply();
          });
          _.e('label', {text: key}, li);
        };

        var apply = function() {
          var keys = [];
          _.qa('li label', list).forEach(function(key) {
            keys.push(key.textContent);
          });
          input.value = keys.join(',');
          input.focus();

          var ev = d.createEvent('Event');
          ev.initEvent('input', true, true);
          input.dispatchEvent(ev);
        };

        reset();

        var toolbar = _.e('div', {cls: 'pp-config-key-editor-toolbar'}, root);
        var add_input = _.e('input', {'placeholder': 'Grab key', cls: 'pp-config-key-editor-grab'}, toolbar);
        _.key.listen(add_input, function(key) {
          add_input.value = key;
          return true;
        });

        var btn_add = _.e('button', {text: lang.pref.add, cls: 'pp-config-key-editor-add'}, toolbar);
        _.onclick(btn_add, function() {
          add(add_input.value);
          add_input.value = '';
          apply();
        });

        var btn_close = _.e('button', {text: lang.pref.close, cls: 'pp-config-key-editor-close'}, toolbar);
        _.onclick(btn_close, close);
      },

      regexp: function(root, input, close, lang, pagecheck) {
        var textarea = _.e('textarea', {cls: 'pp-config-regexp-editor-textarea'}, root);
        textarea.value = input.value;

        var ul = _.e('ul', null, root);
        var status = _.e('li', {cls: 'pp-config-regexp-editor-status'}, ul);

        if (pagecheck) {
          var table = _.e('table', null, root);

          this.regexp_paths.forEach(function(path) {
            var row = table.insertRow(-1);
            _.e('a', {href: path, text: path, target: '_blank'}, row.insertCell(-1));

            var cell = row.insertCell(-1);
            cell.className = 'pp-config-regexp-editor-status';
            cell.setAttribute('data-path', path);
          });
        }

        return {input: textarea, update: function(value) {
          var valid = true;
          try {
            new g.RegExp(value);
          } catch(ex) {
            valid = false;
          }

          status.classList[valid ? 'add' : 'remove']('pp-yes');
          status.classList[valid ? 'remove' : 'add']('pp-no');
          status.textContent = valid ? lang.pref.regex_valid : lang.pref.regex_invalid;

          if (pagecheck) {
            _.qa('*[data-path]', table).forEach(function(status) {
              var yes = valid && (new g.RegExp(value)).test('http://www.pixiv.net' + status.dataset.path);
              status.classList[yes ? 'add' : 'remove']('pp-yes');
              status.classList[yes ? 'remove' : 'add']('pp-no');
              status.textContent = yes ? '\u25cb' : '\u2715';
            });
          }
        }};
      }
    },

    tabs: {
      __default: function(root, section, lang) {
        var tbody = _.e('tbody', null, _.e('table', null, root)), subsection;

        section.items.forEach(function(item) {
          if (!_.conf.general.debug && item.hidden) {
            return;
          }

          if (item.subsection && item.subsection !== subsection) {
            _.e('div', {text: lang.pref[section.name + '_' + item.subsection]},
                _.e('td', {colspan: 3}, _.e('tr', {cls: 'pp-config-subsection-title'}, tbody)));
            subsection = item.subsection;
          }

          var type = typeof(item.value),
              info = lang.conf[section.name][item.key] || '[Error]',
              row  = _.e('tr', null, tbody),
              desc = _.e('td', null, row),
              input_id = 'pp-config-' + section.name + '-' + item.key.replace(/_/g, '-'),
              control, control_propname;
          if (info === '[Error]') {
            alert(item.key);
          }

          if (type === 'boolean') {
            var label = _.e('label', null, desc);
            control = _.e('input', {type: 'checkbox', id: input_id}, label);
            control_propname = 'checked';
            label.appendChild(d.createTextNode(info.desc || info));
            desc.setAttribute('colspan', '2');
          } else {
            var value = _.e('td', null, row);
            desc.textContent = info.desc || info;
            if (info.hint) {
              control = _.e('select', {id: input_id}, value);
              info.hint.forEach(function(hint, idx) {
                var ovalue = hint.value || idx;
                var opt = _.e('option', {text: hint.desc || hint, value: ovalue}, control);
              });
            } else {
              control = _.e('input', {id: input_id}, value);
            }
            control_propname = 'value';
          }

          control[control_propname] = _.conf[section.name][item.key];
          _.listen(control, ['change', 'input'], function() {
            var value = control[control_propname];
            if (typeof(item.value) === 'number') {
              value = g.parseFloat(value);
            }
            _.conf[section.name][item.key] = value;
          });

          _.onclick(
            _.e('button', {text: lang.pref['default'], id: input_id + '-default'}, row.insertCell(-1)),
            function() {
              _.conf[section.name][item.key] = item.value;
              control[control_propname] = item.value;
            }
          );
        });
      },

      popup: function(root, section, lang) {
        this.__default(root, section, lang);

        _.qa('input[id$="-regexp"]', root).forEach(function(input) {
          _.configui.editor.register(input, 'regexp', lang, true);
        });
      },

      key: function(root, section, lang) {
        this.__default(root, section, lang);

        _.qa('input', root).forEach(function(input) {
          _.configui.editor.register(input, 'key', lang);
        });
      },

      bookmark: function(root, section, lang) {
        _.e('div', {text: lang.conf.bookmark.tag_order, css: 'white-space:pre'}, root);

        var tag_order_textarea = _.e('textarea', null, root);
        tag_order_textarea.value = _.conf.bookmark.tag_order.map(function(a) {
          return a.map(function(tag) {
            return tag || '*';
          }).join('\n');
        }).join('\n-\n');

        _.listen(tag_order_textarea, 'input', function() {
          var tag_order = [[]];
          tag_order_textarea.value.split(/[\r\n]+/).forEach(function(line) {
            if (!line) {
              return;
            }
            if (line === '-') {
              tag_order.push([]);
            } else {
              tag_order[tag_order.length - 1].push(line === '*' ? null : line);
            }
          });
          _.conf.bookmark.tag_order = tag_order;
        });


        _.e('div', {text: lang.conf.bookmark.tag_aliases}, root);

        var tag_alias_table = _.e('table', {id: 'pp-config-bookmark-tag-aliases'}, root);
        _.onclick(_.e('button', {text: lang.pref.add}, root), function() {
          add_row();
        });

        function save() {
          var aliases = { };
          g.Array.prototype.forEach.call(tag_alias_table.rows, function(row) {
            var inputs = _.qa('input', row);
            if (inputs.length === 2 && inputs[0].value) {
              aliases[inputs[0].value] = inputs[1].value.split(/\s+/);
            }
          });
          _.conf.bookmark.tag_aliases = aliases;
        }

        function add_row(tag, list) {
          var row = tag_alias_table.insertRow(-1);
          _.onclick(_.e('button', {text: '\u2715'}, row.insertCell(-1)), function() {
            row.parentNode.removeChild(row);
            save();
          });

          var i_tag = _.e('input', {value: tag || ''}, row.insertCell(-1)),
              i_atags = _.e('input', {value: list ? list.join(' ') : ''}, row.insertCell(-1));
          _.listen(i_tag, 'input', save);
          _.listen(i_atags, 'input', save);
        }

        var aliases = _.conf.bookmark.tag_aliases;
        for(var key in aliases) {
          add_row(key, aliases[key]);
        }
      },

      importexport: function(root, section, lang) {
        var toolbar  = _.e('div', {id: 'pp-config-importexport-toolbar'}, root);
        var textarea = _.e('textarea', null, root);

        _.onclick(_.e('button', {text: lang.pref['export']}, toolbar), function() {
          textarea.value = JSON.stringify(_.conf.__export(''), null, 2);
        });

        _.onclick(_.e('button', {text: lang.pref['import']}, toolbar), function() {
          var data;
          try {
            data = JSON.parse(textarea.value);
          } catch(ex) {
            g.alert(ex);
            return;
          }
          _.conf.__import(data);
        });
      },

      about: function(root, section, lang) {
        var urls = [
          'http://ccl4.info/pixplus/',
          'https://github.com/crckyl/pixplus',
          'http://ccl4.info/cgit/pixplus.git/',
          'http://crckyl.hatenablog.com/',
          'http://twitter.com/crckyl'
        ];

        _.e('p', {text: 'pixplus ' + _.version() + ' - ' + _.release_date()}, root);

        var info = _.e('dl', null, root);
        [
          [lang.pref.about_web, function(dd) {
            var ul = _.e('ul', null, dd);
            urls.forEach(function(url) {
              _.e('a', {href: url, text: url}, _.e('li', null, ul));
            });
          }],
          [lang.pref.about_email,
           _.e('a', {text: 'crckyl@gmail.com', href: 'mailto:crckyl@gmail.com'})],
          [lang.pref.about_license, 'The MIT License']
        ].forEach(function(p) {
          var label = p[0], content = p[1];
          _.e('dt', {text: label}, info);
          var dd = _.e('dd', null, info);
          if (content.nodeName) {
            dd.appendChild(content);
          } else if (content.call) {
            content(dd);
          } else {
            dd.textContent = content;
          }
        });

        var changelog = _.e('dl', null, root);
        _.changelog.forEach(function(release) {
          var dt = _.e('dt', {text: release.version + ' - ' + release.date}, changelog);
          if (release.releasenote) {
            dt.textContent += ' ';
            _.e('a', {href: release.releasenote, text: lang.pref.releasenote}, dt);
          }

          var ul = _.e('ul', null, _.e('dd', null, changelog));

          var changes;
          if (release.changes_i18n) {
            changes = release.changes_i18n[lang.__name__] || release.changes_i18n.en;
          } else {
            changes = release.changes;
          }
          changes.forEach(function(change) {
            _.e('li', {text: change}, ul);
          });
        });
      },

      debug: function(root, section, lang) {
        var langbar = _.e('div', {id: 'pp-config-langbar'}, root);
        ['en', 'ja'].forEach(function(name) {
          _.onclick(_.e('button', {text: name}, langbar), function() {
            _.configui.lng = _.i18n[name];
            _.configui.dom.root.parentNode.removeChild(_.configui.dom.root);
            _.configui.dom = { };
            _.configui.show();
          });
        });

        var escaper = _.e('div', {id: 'pp-config-escaper'}, root), escaper_e;
        _.listen(_.e('input', null, escaper), 'input', function(ev) {
          escaper_e.value = ev.target.value.split('').map(function(c) {
            var b = c.charCodeAt(0);

            if (b >= 0x20 && b <= 0x7e) {
              return c;
            }

            c = b.toString(16);
            while(c.length < 4) {
              c = '0' + c;
            }
            return '\\u' + c;
          }).join('');
        });
        escaper_e = _.e('input', null, escaper);

        var input_line = _.e('div', null, root);
        var input      = _.e('input', null, input_line);
        var cancel_l   = _.e('label', null, input_line);
        var cancel     = _.e('input', {type: 'checkbox', css: 'margin-left:4px;', checked: true}, cancel_l);
        var console_l  = _.e('label', null, input_line);
        var console    = _.e('input', {type: 'checkbox', css: 'margin-left:4px;', checked: true}, console_l);
        var logger     = _.e('table', {css: 'margin-top:4px;border:1px solid #aaa'}, root);

        cancel_l.appendChild(d.createTextNode('Cancel'));
        console_l.appendChild(d.createTextNode('Console'));

        var log_attrs  = [
          'type',
          'keyCode',
          'charCode',
          'key',
          'char',
          'keyIdentifier',
          'which',
          'eventPhase',
          'detail',
          'timeStamp'
        ];

        function clear() {
          input.value = '';
          logger.innerHTML = '';
          var row = logger.insertRow(0);
          row.insertCell(-1).textContent = 'Key';
          log_attrs.forEach(function(attr) {
            row.insertCell(-1).textContent = attr;
          });
        }

        function log(ev) {
          var row = logger.insertRow(1);
          var key = _.key.parse_event(ev) || 'None';
          row.insertCell(-1).textContent = key;
          log_attrs.forEach(function(attr) {
            row.insertCell(-1).textContent = ev[attr];
          });
          if (cancel.checked && key) {
            ev.preventDefault();
          }
          if (console.checked) {
            _.debug(ev);
          }
        }

        clear();
        _.onclick(_.e('button', {text: 'Clear', css: 'margin-left:4px;'}, input_line), clear);
        input.addEventListener('keydown', log, false);
        input.addEventListener('keypress', log, false);
      }
    },

    dom: { },
    lng: null,
    container: null,
    toggle_btn: null,

    init: function(container, toggle_btn) {
      if (!container) {
        return;
      }

      this.lng = _.lng;
      this.container = container;
      this.toggle_btn = toggle_btn;
    },

    create_tab: function(name, create_args) {
      if (name === 'mypage') {
        return;
      }

      var that = this, dom = this.dom, label, content;

      label = _.e('label', {text: this.lng.pref[name], cls: 'pp-config-tab',
                            id: 'pp-config-tab-' + name}, dom.tabbar);
      content = _.e('div', {id: 'pp-config-' + name + '-content', cls: 'pp-config-content'});

      (this.tabs[name] || this.tabs.__default).call(this.tabs, content, create_args, this.lng);
      dom.content.appendChild(content);
      dom[name] = {label: label, content: content};
      _.onclick(label, function() {
        that.activate_tab(dom[name]);
        return true;
      });
    },

    create: function() {
      var that = this, dom = this.dom;
      if (dom.created) {
        return;
      }

      dom.root    = _.e('div', {id: 'pp-config'}, this.container);
      dom.tabbar  = _.e('div', {id: 'pp-config-tabbar'});
      dom.content = _.e('div', {id: 'pp-config-content-wrapper'});

      _.conf.__schema.forEach(function(section) {
        that.create_tab(section.name, section);
      });
      ['importexport', 'about'].forEach(this.create_tab.bind(this));
      if (_.conf.general.debug) {
        that.create_tab('debug');
      }

      dom.root.appendChild(dom.tabbar);
      dom.root.appendChild(dom.content);

      dom.created = true;

      this.activate_tab(dom.general);
    },

    activate_tab: function(tab) {
      var lasttab = this.dom.lasttab;
      if (lasttab) {
        lasttab.label.classList.remove('pp-active');
        lasttab.content.classList.remove('pp-active');
      }
      tab.label.classList.add('pp-active');
      tab.content.classList.add('pp-active');
      this.dom.lasttab = tab;
    },

    is_active: function() {
      return !!this.dom.root && this.dom.root.classList.contains('pp-show');
    },

    show: function() {
      this.create();
      this.dom.root.classList.add('pp-show');
      if (this.toggle_btn) {
        this.toggle_btn.classList.add('pp-active');

        var el = this.dom.content, de = d.documentElement;
        el.style.height = g.Math.floor((de.clientHeight - el.getBoundingClientRect().top) * 0.7) + 'px';
      }
    },

    hide: function() {
      this.dom.root.classList.remove('pp-show');
      if (this.toggle_btn) {
        this.toggle_btn.classList.remove('pp-active');
      }
    },

    toggle: function() {
      if (this.is_active()) {
        this.hide();
      } else {
        this.show();
      }
    }
  };

  // __LIBRARY_END__

  _.extend(_, {
    redirect_jump_page: function(root) {
      if (_.conf.general.redirect_jump_page !== 2) {
        return;
      }
      _.qa('a[href*="jump.php"]', root).forEach(function(link) {
        var re;
        if ((re = /^(?:(?:http:\/\/www\.pixiv\.net)?\/)?jump\.php\?(.+)$/.exec(link.href))) {
          link.href = g.decodeURIComponent(re[1]);
        }
      });
    },

    modify_caption: function(caption, base_illust) {
      if (!caption) {
        return;
      }

      var last = null;
      _.qa('a[href*="mode=medium"]', caption).forEach(function(link) {
        var query = _.illust.parse_illust_url(link.href);
        if (query && query.mode === 'medium' && query.illust_id) {
          var illust = _.illust.create_from_id(query.illust_id);
          illust.link = link;
          illust.connection = _.onclick(illust.link, function() {
            _.popup.show(illust);
            return true;
          });
          illust.prev = last || base_illust;
          if (last) {
            last.next = illust;
          }
          last = illust;
        }
      });

      if (last) {
        last.next = base_illust;
      }
    },

    reorder_tag_list: function(list, cb_get_tagname) {
      var list_parent = list.parentNode, lists = [list];

      var tags = _.qa('li', list), tag_map = { };
      tags.forEach(function(tag) {
        var tagname = cb_get_tagname(tag);
        if (tagname) {
          tag_map[tagname] = tag;
          tag.parentNode.removeChild(tag);
        }
      });

      var all_list, all_list_before;

      var add_list = function() {
        var new_list = list.cloneNode(false);
        list_parent.insertBefore(new_list, list.nextSibling);
        list = new_list;
        lists.push(list);
        return list;
      };

      _.conf.bookmark.tag_order.forEach(function(tag_order, idx) {
        if (idx > 0) {
          add_list();
        }
        tag_order.forEach(function(tag) {
          if (tag) {
            if (tag_map[tag]) {
              list.appendChild(tag_map[tag]);
              tag_map[tag] = null;
            }
          } else {
            all_list = list;
            all_list_before = list.lastChild;
          }
        });
      });

      for(var tag in tag_map) {
        if (!tag_map[tag]) {
          continue;
        }
        if (!all_list) {
          all_list = add_list();
        }
        all_list.insertBefore(tag_map[tag], all_list_before ? all_list_before.nextSibling : null);
      }

      return lists;
    }
  });

  _.fastxml = {
    ignore_elements: /^(?:script|style)$/,
    query_cache: {},

    parse: function(xml) {
      var dom, node, tags = xml.split(/<(\/?[a-zA-Z0-9]+)( [^<>]*?\/?)?>/);
      for(var i = 0; i + 2 < tags.length; i += 3) {
        var text = tags[i], tag = tags[i + 1].toLowerCase(),
            attrs = tags[i + 2] || '', raw = '<' + tag + attrs + '>';
        if (text && node) {
          node.children.push({text: text});
        }

        if (tag[0] === '/') {
          tag = tag.substring(1);
          if (node) {
            var target = node;
            while(target) {
              if (target.tag === tag) {
                target.raw_close = raw;
                node = target.parent;
                break;
              }
              target = target.parent;
            }
            if (!node) {
              break;
            }
          }
          continue;
        }

        var attr_map = { };
        attrs = attrs.split(/\s([a-zA-Z0-9-]+)=\"([^\"]+)\"/);
        for(var j = 1; j + 1 < attrs.length; j += 3) {
          attr_map[attrs[j]] = attrs[j + 1];
        }

        if (node || tag === 'body') {
          var newnode = {
            parent:   node,
            tag:      tag,
            attrs:    attr_map,
            children: [],
            raw_open: raw
          };
          if (node) {
            node.children.push(newnode);
            node = newnode;
          } else {
            dom = node = newnode;
          }

          if (attrs[attrs.length - 1] === '/') {
            if (!(node = node.parent)) {
              break;
            }
          }
        }
      }
      return dom;
    },

    q: function(root, selector, callback) {
      if (!root) {
        return null;
      }

      var tokens = selector.split(' ').map(function(token) {
        var terms = token.split(/([#\.])/);
        return function(node) {
          if (terms[0] && node.tag != terms[0]) {
            return false;
          }
          if (terms.length > 1 && !node.attrs) {
            return false;
          }

          var class_list = (node.attrs['class'] || '').split(/\s+/);
          for(var i = 1; i + 1 < terms.length; i += 2) {
            var v = terms[i + 1];
            if (terms[i] === '#') {
              if (v && v !== node.attrs.id) {
                return false;
              }
            } else if (terms[i] === '.') {
              if (v && class_list.indexOf(v) < 0) {
                return false;
              }
            }
          }
          return true;
        };
      });

      var test = function(node) {
        var tidx = tokens.length - 1;
        if (!tokens[tidx--](node)) {
          return false;
        }
        node = node.parent;
        while(tidx >= 0 && node) {
          if (tokens[tidx](node)) {
            --tidx;
          }
          node = node.parent;
        }
        return tidx < 0;
      };

      var find = function(node) {
        if (test(node)) {
          if (!callback || callback(node)) {
            return node;
          }
        }
        if (!node.children) {
          return null;
        }
        for(var i = 0; i < node.children.length; ++i) {
          var r = find(node.children[i]);
          if (r) {
            return r;
          }
        }
        return null;
      };

      return find(root);
    },

    qa: function(root, selector) {
      var nodes = [];
      this.q(root, selector, function(node) {
        nodes.push(node);
      });
      return nodes;
    },

    remove_selector: function(root, selector) {
      var that = this;
      this.qa(root, selector).forEach(function(node) {
        that.remove_from_parent(node);
      });
    },

    remove_from_parent: function(node) {
      if (!node || !node.parent) {
        return;
      }

      var idx = node.parent.children.indexOf(node);
      if (idx >= 0) {
        node.parent.children.splice(idx, 1);
      }
    },

    html: function(node, all) {
      if (!node || (!all && this.ignore_elements.test(node.tag))) {
        return '';
      }
      return (node.raw_open || '') + this.inner_html(node, all) + (node.raw_close || '');
    },

    inner_html: function(node, all) {
      if (!node || (!all && this.ignore_elements.test(node.tag))) {
        return '';
      }
      if (node.text) {
        return node.text;
      }
      var that = this;
      return node.children.reduce(function(a, b) {
        return a + that.html(b, all);
      }, '');
    },

    text: function(node, all) {
      if (!node || (!all && this.ignore_elements.test(node.tag))) {
        return '';
      }
      if (node.text) {
        return node.text;
      }
      var that = this;
      return node.children.map(function(c) {
        return c.text || that.text(c);
      }).join('');
    }
  };

  _.illust = {
    root: null,
    last_link_count: 0,
    list: [ ],

    parse_image_url: function(url, opt) {
      if (!opt) {
        opt = {};
      }

      var allow_types = opt.allow_types || ['_s', '_100', '_128x128', '_240ms', '_240mw'];
      var allow_sizes = opt.allow_sizes || ['100x100', '128x128', '150x150', '240x240', '240x480', '600x600'];

      var re, server, size, dir, id, rest, p0, suffix, prefix, inf, type, page, ret;
      if ((re = /^(http:\/\/i\d+\.pixiv\.net\/)c\/(\d+x\d+)\/img-master\/(img\/(?:\d+\/){6})(\d+)(-[0-9a-f]{32})?(_p\d+)?_(?:master|square)1200(\.\w+(?:\?.*)?)$/.exec(url))) {

        server = re[1];
        size   = re[2];
        dir    = re[3];
        id     = re[4];
        rest   = re[5] || ''; // access restriction
        page   = re[6] || '';
        suffix = re[7];

        if (allow_sizes.indexOf(size) < 0) {
          return null;
        }

        id = g.parseInt(id, 10);
        if (id < 1) {
          return null;
        }

        if (!page) {
          // maybe, it's ugoira
          return {id: id};
        }

        ret = {
          id: id,
          image_url_medium: server + 'c/600x600/img-master/' + dir + id + rest + page + '_master1200' + suffix,
          image_url_big: server + 'img-original/' + dir + id + rest + page + '.jpg',
          image_url_big_alt: [server + 'img-original/' + dir + id + rest + page + '.png',
                              server + 'img-original/' + dir + id + rest + page + '.gif'],
          new_url_pattern: true
        };

      } else if ((re = /^(http:\/\/i\d+\.pixiv\.net\/img(\d+|-inf)\/img\/[^\/]+\/(?:(?:\d+\/){5})?)(?:mobile\/)?(\d+)(_[\da-f]{10}|-[\da-f]{32})?(?:(_[sm]|_100|_128x128|_240m[sw])|(?:_big)?(_p\d+))(\.\w+(?:\?.*)?)$/.exec(url))) {

        prefix = re[1];
        inf    = re[2];
        id     = re[3];
        rest   = re[4] || ''; // access restriction
        type   = re[5] || '';
        page   = re[6] || '';
        suffix = re[7];

        if (allow_types.indexOf(type) < 0) {
          return null;
        }

        id = g.parseInt(id, 10);
        if (id < 1) {
          return null;
        }

        if ((!inf /* ugoira */) || (inf === '-inf' /* all jpg */)) {
          return {id: id};
        } else {
          var url_base = prefix + id;
          ret = {
            id: id,
            image_url_medium: url_base + rest + (page || '_m') + suffix,
            image_url_big: url_base + rest + (page ? '_big' + page : '') + suffix
          };
        }
      }

      if (ret && !opt.manga_page) {
        delete ret.image_url_big;
        delete ret.image_url_big_alt;
      }

      return ret || null;
    },

    create_from_id: function(id) {
      return {
        id:                   id,
        url_medium:           '/member_illust.php?mode=medium&illust_id=' + id,
        url_big:              '/member_illust.php?mode=big&illust_id=' + id,
        url_author_profile:   null,
        url_author_works:     null,
        url_author_bookmarks: null,
        url_author_staccfeed: null,
        url_bookmark:         '/bookmark_add.php?type=illust&illust_id=' + id,
        url_bookmark_detail:  '/bookmark_detail.php?illust_id=' + id,
        url_manga:            '/member_illust.php?mode=manga&illust_id=' + id,
        url_response:         '/response.php?illust_id=' + id,
        url_response_to:      null,
        manga:                { }
      };
    },

    update_urls: function(illust) {
      if (illust.author_id) {
        illust.url_author_profile   = '/member.php?id=' + illust.author_id;
        illust.url_author_works     = '/member_illust.php?id=' + illust.author_id;
        illust.url_author_bookmarks = '/bookmark.php?id=' + illust.author_id;
      } else {
        illust.url_author_profile   = null;
        illust.url_author_works     = null;
        illust.url_author_bookmarks = null;
      }

      if (illust.image_response_to) {
        illust.url_response_to =
          '/member_illust.php?mode=medium&illust_id=' + illust.image_response_to;
      } else {
        illust.url_response_to = null;
      }
    },

    create: function(link, allow_types, cb_onshow) {
      var illust, images = _.qa('img,*[data-filter*="lazy-image"]', link).concat([link]);

      for(var i = 0; i < images.length; ++i) {
        var img = images[i], src;

        if (/(?:^|\s)lazy-image(?:\s|$)/.test(img.dataset.filter)) {
          src = img.dataset.src;
        } else if (/^img$/i.test(img.tagName)) {
          src = img.src;
        } else {
          continue;
        }

        var p = this.parse_image_url(src, {allow_types: allow_types});

        if (!p) {
          continue;
        }

        // if multiple thumbails found...
        if (illust) {
          return null;
        }

        illust = p;
        illust.image_thumb = img;
      }

      if (!illust) {
        return null;
      }

      _.extend(illust, this.create_from_id(illust.id), {
        link: link,
        next: null
      });

      var query = _.illust.parse_illust_url(link.href);
      if (query && query.uarea) {
        illust.url_medium += '&uarea=' + query.uarea;
      }

      illust.connection = _.onclick(illust.link, function() {
        _.popup.show(illust);
        if (cb_onshow) {
          cb_onshow();
        }
        return true;
      });
      return illust;
    },

    update: function() {
      var links = _.qa('a[href*="member_illust.php?mode=medium"]', this.root);
      if (links.length === this.last_link_count) {
        return;
      }
      this.last_link_count = links.length;

      _.debug('updating illust list');

      var that = this;

      var extract = function(link) {
        var list = that.list;
        for(var i = 0; i < list.length; ++i) {
          var illust = list[i];
          if (illust.link === link) {
            list.splice(i, 1);
            return illust;
          }
        }
        return null;
      };

      var new_list = [], last = null;
      links.forEach(function(link) {
        var illust = extract(link);
        if (!illust) {
          illust = that.create(link);
        }
        if (!illust) {
          return;
        }

        illust.prev = last;
        illust.next = null;
        if (last) {
          last.next = illust;
        }
        last = illust;

        new_list.push(illust);
      });

      this.list.forEach(function(illust) {
        illust.connection.disconnect();
      });
      this.list = new_list;

      if (new_list.length < 1) {
        this.last_link_count = 0;
      }

      _.debug('illust list updated - ' + new_list.length);
    },

    setup: function(root) {
      if (!root) {
        _.error('Illust list root not specified');
        return;
      }

      this.root = root;
      this.update();

      _.listen(this.root, 'DOMNodeInserted', this.update.bind(this), {async: true});
    },

    parse_medium_html: function(illust, html) {
      var root = _.fastxml.parse(html), re, re2;

      var error = _.fastxml.q(root, '.one_column_body .error');
      if (error) {
        illust.error = _.fastxml.text(error);
        _.error('pixiv reported error: ' + illust.error);
        return false;
      }

      re = /pixiv\.context\.ugokuIllustData *= *(\{[^;]*?\});/.exec(html);
      re2 = /pixiv\.context\.ugokuIllustFullscreenData *= *(\{[^;]*?\});/.exec(html);

      if (re || re2) {
        var err;

        if (re) {
          try {
            illust.ugoira_small = g.JSON.parse(re[1]);
          } catch(ex) {
            err = 'Failed to parse pixiv.context.ugokuIllustData JSON';
            _.error(err, ex);
            illust.ugoira_small = null;
          }
        }

        if (re2) {
          try {
            illust.ugoira_big = g.JSON.parse(re2[1]);
          } catch(ex) {
            err = 'Failed to parse pixiv.context.ugokuIllustFullscreenData JSON';
            _.error(err, ex);
            illust.ugoira_big = null;
          }
        }

        if (!illust.ugoira_small && !illust.ugoira_big) {
          illust.error = err;
          return false;
        }

        [illust.ugoira_small, illust.ugoira_big].forEach(function(ugoira) {
          if (!ugoira) {
            return;
          }
          ugoira.duration = 0;
          ugoira.progress = [];
          ugoira.frames.forEach(function(frame) {
            ugoira.progress.push(ugoira.duration);
            ugoira.duration += frame.delay;
          });
        });

      } else {
        var med = _.fastxml.q(root, '.works_display img');
        if (med) {
          var p = this.parse_image_url(med.attrs.src, {allow_types: ['_m'], allow_sizes: ['600x600']});
          if (p) {
            if (p.id !== illust.id) {
              illust.error = 'Invalid medium image url';
              return false;
            }
            _.extend(illust, p);
          } else if (!illust.image_url_medium) {
            illust.error = 'Failed to parse medium image url';
            return false;
          }
        } else if (!illust.image_url_medium) {
          illust.error = 'Medium image not found';
          return false;
        }

        var big = _.fastxml.q(root, 'img.original-image');
        if (big) {
          var big_src = big.attrs.src || big.attrs['data-src'];
          if (big_src) {
            _.debug('Big image found: ' + big_src);
            illust.image_url_big = big_src;
          }
        } else {
          if (!illust.load_statuses) {
            illust.load_statuses = {};
          }
          illust.load_statuses.big = 'error';
        }
      }

      // error check end

      var work_info = _.fastxml.q(root, '.work-info'),
          title     = _.fastxml.q(work_info, '.title'),
          caption   = _.fastxml.q(work_info, '.caption'),
          score     = _.fastxml.q(work_info, '.score'),
          question  = _.fastxml.q(work_info, '.questionnaire'),
          tags_tmpl = _.fastxml.q(root, '#template-work-tags'),
          tags      = _.fastxml.q(root, '.work-tags .tags-container');

      illust.title = _.strip(_.fastxml.text(title));
      illust.caption = _.strip(_.fastxml.inner_html(caption));
      illust.tags = _.fastxml.qa(tags, '.tag .text').map(function(tag) {
        return _.strip(_.fastxml.text(tag));
      });
      illust.score = {};
      ['view', 'rated', 'score'].forEach(function(name) {
        var node = _.fastxml.q(score, '.' + name + '-count');
        illust.score[name] = g.parseInt(_.strip(_.fastxml.text(node)));
      });

      illust.taglist  = _.fastxml.html(tags_tmpl, true) + _.fastxml.html(tags);
      illust.rating   = _.fastxml.html(score);
      illust.question = _.fastxml.html(question, true);

      illust.rated = !!_.fastxml.q(score, '.rating.rated');
      illust.answered = null;
      if (question) {
        illust.answered = !_.fastxml.q(question, '.list');
      }

      var profile_area   = _.fastxml.q(root, '.profile-unit'),
          avatar         = _.fastxml.q(profile_area, 'img.user-image'),
          author_link    = _.fastxml.q(profile_area, 'a.user-link'),
          author_name    = _.fastxml.q(author_link, 'h1.user'),
          staccfeed_link = _.fastxml.q(root, '.column-header .tabs a', function(link) {
            return /^(?:(?:http:\/\/www\.pixiv\.net)?\/)?stacc\//.test(link.attrs.href);
          });

      illust.author_id              = null;
      illust.author_name            = author_name ? _.fastxml.text(author_name) : null;
      illust.author_favorite        = !!_.fastxml.q(profile_area, '#favorite-button.following');
      illust.author_mutual_favorite = !!_.fastxml.q(profile_area, '.user-relation .sprites-heart');
      illust.author_mypixiv         = !!_.fastxml.q(profile_area, '#mypixiv-button.mypixiv');
      illust.author_image_url       = avatar ? avatar.attrs.src : null;
      illust.author_is_me           = null;

      if (author_link && (re = /\/member\.php\?id=(\d+)/.exec(author_link.attrs.href))) {
        illust.author_id = g.parseInt(re[1], 10);
      }

      if (!illust.author_id) {
        if ((re = /pixiv\.context\.userId\s*=\s*([\'\"])(\d+)\1;/.exec(html))) {
          illust.author_id = g.parseInt(re[2]);
        }
      }

      try {
        illust.author_is_me = illust.author_id === w.pixiv.user.id;
      } catch(ex) {
        _.error(ex);
      }

      illust.url_author_staccfeed = null;
      if (staccfeed_link) {
        illust.url_author_staccfeed =
          staccfeed_link.attrs.href.replace(/^http:\/\/www.pixiv.net(?=\/)/, '');
      }

      var meta = _.fastxml.qa(work_info, '.meta li'),
          meta2 = _.fastxml.text(meta[1]);

      illust.datetime = _.fastxml.text(meta[0]);

      illust.is_manga = !!_.fastxml.q(root, '._work.manga');

      illust.size = null;
      illust.manga = {
        available: false,
        book_mode: null, // 'ltr' or 'rtl' or null
        viewed: illust.manga ? !!illust.manga.viewed : false,
        page_count: 0
      };

      if (_.fastxml.q(root, '.works_display ._work.multiple')) {
        illust.manga.available = true;
      }

      if (_.fastxml.q(root, '._work.rtl')) {
        illust.manga.book_mode = 'rtl';
      } else if (_.fastxml.q(root, '._work.ltr')) {
        illust.manga.book_mode = 'ltr';
      }

      if ((re = /^(\d+)\u00d7(\d+)$/.exec(meta2))) {
        illust.size = {width: g.parseInt(re[1], 10), height: g.parseInt(re[2], 10)};
      } else if ((re = /^[^ ]{1,10} (\d+)P$/.exec(meta2))) {
        illust.manga.available = true;
        illust.manga.page_count = g.parseInt(re[1], 10);
      }

      if (illust.manga.available && illust.manga.page_count < 1) {
        _.debug('It seems manga but page count not detected');
      }

      illust.tools = _.fastxml.qa(work_info, '.meta .tools li').map(function(node) {
        return _.strip(_.fastxml.text(node));
      });

      illust.bookmarked = !!_.fastxml.q(root, '.bookmark-container .bookmark-count');

      illust.has_image_response = !!_.fastxml.q(root, '.worksImageresponse .worksResponse');
      illust.image_response_to  = null;
      _.fastxml.q(root, '.worksImageresponseInfo a', function(link) {
        re = /^\/member_illust\.php\?.*&(?:amp;)?illust_id=(\d+).*&(?:amp;)?uarea=response_out(?:&|$)/.exec(link.attrs.href);
        if (re) {
          illust.image_response_to = g.parseInt(re[1]);
          return true;
        }
        return false;
      });

      var comment = _.fastxml.q(root, '#one_comment .layout-column-1');
      _.fastxml.remove_selector(comment, '.worksImageresponse');
      illust.comment = _.fastxml.inner_html(comment) || 'Error';

      if (!_.stampSeries) {
        re = /pixiv\.context\.stampSeries *= *(\[[^;]*?\]);/.exec(html);
        if (re) {
          _.stampSeries = g.JSON.parse(re[1]);
        } else {
          _.error('pixiv.context.stampSeries not detected');
        }
      }

      if (!_.emojiSeries) {
        re = /pixiv\.context\.emojiSeries *= *(\[[^;]*?\]);/.exec(html);
        if (re) {
          _.emojiSeries = g.JSON.parse(re[1]);
        } else {
          _.error('pixiv.context.emojiSeries not detected');
        }
      }

      _.illust.update_urls(illust);
      return true;
    },

    // parhaps cb_success() will called 2 times or more
    load_images: function(page, load_big_image, cb_success, cb_error) {
      if (!load_big_image) {
        load_big_image = _.conf.popup.big_image;
      }

      if (!page.load_statuses) {
        page.load_statuses = {};
      }

      if (page.image_medium || page.image_big) {
        cb_success(page);
      }

      var images = {};

      var load = function(name, other_name, retry) {
        if (/^(?:loading|complete)$/.test(page.load_statuses[name])) {
          return;
        }

        var img, url = page['image_url_' + name];
        if (!url) {
          return;
        }
        images[name] = img = new w.Image();

        img.addEventListener('load', function() {
          _.debug('Successfully loaded ' + name + ' image: ' + url);
          page['image_' + name] = img;
          --page.loading_count;
          page.load_statuses[name] = 'complete';
          cb_success(page);
        }, false);

        img.addEventListener('error', function() {
          --page.loading_count;
          page.load_statuses[name] = 'error';

          _.debug('Failed to load ' + name + ' image: ' + url);

          var alt = page['image_url_' + name + '_alt'];
          if (alt && alt.length > 0) {
            url = alt.shift();
            _.debug('Retrying to load ' + name + ' image with new url: ' + url);
            page['image_url_' + name] = url;
            load(name, other_name, true);
          } else if (!/^(?:loading|complete)$/.test(page.load_statuses[other_name])) {
            cb_error();
          }
        }, false);

        if (!retry) {
          _.debug('Trying to load ' + name + ' image: ' + url);
        }
        img.src = url;
        page.load_statuses[name] = 'loading';
        page.loading_count = (page.loading_count || 0) + 1;
      };

      load('medium', 'big');
      if (load_big_image) {
        load('big', 'medium');
      }
    },

    load: function(illust, load_big_image) {
      if (!load_big_image) {
        load_big_image = _.conf.popup.big_image;
      }

      if (!illust.load_statuses) {
        illust.load_statuses = {};
      }

      if (illust.load_statuses.html === 'complete' &&
          ((!load_big_image && illust.image_medium) || illust.image_big)) {
        _.popup.onload(illust);
        return;
      }

      illust.error = null;

      var error_sent = false;
      var send_error = function(msg) {
        if (!error_sent) {
          if (msg && !illust.error) {
            illust.error = msg;
          }
          _.popup.onerror(illust);
          error_sent = true;
        }
      };

      var that = this;
      var load_images = function() {
        that.load_images(illust, load_big_image, function() {
          if (illust.load_statuses.html === 'complete') {
            _.popup.onload(illust);
          }
        }, function() {
          send_error('Failed to load images');
        });
      };

      if (illust.image_url_medium || (load_big_image && illust.image_url_big)) {
        load_images();
      }

      if (!/^(?:loading|complete)$/.test(illust.load_statuses.html)) {
        _.debug('Start loading medium html...');

        illust.load_statuses.html = 'loading';
        illust.loading_count = (illust.loading_count || 0) + 1;

        _.xhr.get(illust.url_medium, function(text) {
          _.debug('Medium html loaded!');

          --illust.loading_count;

          if (!that.parse_medium_html(illust, text)) {
            illust.load_statuses.html = 'error';
            send_error('Failed to parse medium html');
            return;
          }

          illust.load_statuses.html = 'complete';

          if (illust.ugoira_big || illust.ugoira_small) {

            illust.loaded = true;

            if (load_big_image && illust.ugoira_big) {
              illust.ugoira = illust.ugoira_big;
            } else {
              illust.ugoira = illust.ugoira_small;
            }

            if (!illust.ugoira_player) {
              illust.ugoira_canvas = _.e('canvas');

              try {

                illust.ugoira_player = new w.ZipImagePlayer({
                  canvas: illust.ugoira_canvas,
                  source: illust.ugoira.src,
                  metadata: illust.ugoira,
                  chunkSize: 3e5,
                  loop: true,
                  autoStart: false,
                  debug: false,
                  autosize: true
                });

                illust.ugoira_player._displayFrame = function() {
                  var ret;

                  ret = w.ZipImagePlayer.prototype._displayFrame.apply(this, arguments);

                  if (_.popup.running && _.popup.illust === illust) {
                    var canvas = illust.ugoira_canvas;

                    if (canvas.width !== canvas.naturalWidth ||
                        canvas.height !== canvas.naturalHeight) {
                      canvas.naturalWidth = canvas.width;
                      canvas.naturalHeight = canvas.height;
                      _.popup.adjust();
                    }

                    _.popup.update_ugoira_progress(this.getCurrentFrame());
                  }

                  return ret;
                };

              } catch(ex) {
                send_error(g.String(ex));
                return;
              }
              _.popup.onload(illust);
            }
            return;
          }

          if (illust.image_medium || illust.image_big) {
            _.popup.onload(illust);
            if (illust.image_url_big && !illust.image_big) {
              load_images();
            }
          } else {
            load_images();
          }

          if (_.conf.popup.preload && illust.manga.available) {
            that.load_manga_page(illust, 0);
          }

        }, function() {
          illust.load_statuses.html = 'error';
          --illust.loading_count;
          send_error('Failed to load medium html');
        });
      }
    },

    unload: function(illust) {
      if (!illust) {
        return;
      }
      illust.load_statuses.html = null;
      if (illust.ugoira_player) {
        illust.ugoira_player.stop();
        illust.ugoira_player = null;
        illust.ugoira_canvas = null;
      }
      _.xhr.remove_cache(illust.url_medium);
    },

    create_manga_page: function(page, medium, big, pagenum) {
      if (medium) {
        page.image_url_medium = medium;
      }
      if (big) {
        page.image_url_big = big;
      }
      page.url_manga_big = '/member_illust.php?mode=manga_big&illust_id=' + page.id + '&page=' + pagenum;
      return page;
    },

    parse_book_html: function(illust, html) {
      var images = [], images_big = [], page_count = 0;

      var terms = html.split(/pixiv\.context\.(images|originalImages)\[(\d+)\] *= *(\"[^\"]+\")/);
      for(var i = 1; i + 1 < terms.length; i += 4) {
        var type = terms[i],
            num  = g.parseInt(terms[i + 1]),
            url  = terms[i + 2];
        page_count = g.Math.max(num + 1, page_count);
        _.log(type + ':' + num + ' ' + url);
        try {
          (type === 'originalImages' ? images_big : images)[num] = g.JSON.parse(url);
        } catch(ex) {
          _.warn('Failed to parse pixiv.context.images json', ex);
        }
      }

      if (illust.manga.page_count === 0) {
        _.warn('illust.manga.page_count not declared');
      } else if (page_count !== illust.manga.page_count) {
        _.error('Manga page count mismatch!');
        return false;
      }

      var page_pairs = [];

      var rtl = !(/pixiv\.context\.rtl *= *false/.test(html)); // make default to true
      for(i = 0; i < page_count; ++i) {
        if (!(images[i] && images_big[i])) {
          _.error('Could not detect manga image url for page idx ' + 1);
          return false;
        }

        if (i === 0 || (i + 1) === page_count) {
          page_pairs.push([this.create_manga_page({id: illust.id}, images[i], images_big[i], i)]);

        } else {
          if (!(images[i + 1] && images_big[i + 1])) {
            _.error('Could not detect manga image url for page idx ' + (i + 1));
            return false;
          }

          if (rtl) {
            page_pairs.push([
              this.create_manga_page({id: illust.id}, images[i + 1], images_big[i + 1], i + 1),
              this.create_manga_page({id: illust.id}, images[i], images_big[i], i)
            ]);
          } else {
            page_pairs.push([
              this.create_manga_page({id: illust.id}, images[i], images_big[i], i),
              this.create_manga_page({id: illust.id}, images[i + 1], images_big[i + 1], i + 1)
            ]);
          }

          ++i;
        }
      }

      illust.manga.pages = page_pairs;
      illust.manga.page_count = page_count;
      return true;
    },

    parse_manga_html: function(illust, html) {
      illust.manga.book = /pixiv\.context\.bound *= *true/.test(html);
      if (illust.manga.book) {
        return this.parse_book_html(illust, html);
      }

      var that = this, page_pairs = [], cnt = 0;
      var root = _.fastxml.parse(html);

      var containers = _.fastxml.qa(root, '.manga .item-container');
      for(var i = 0; i < containers.length; ++i) {

        var pages = [];
        var images = _.fastxml.qa(containers[i], 'img');

        for(var j = 0; j < images.length; ++j) {
          var img = images[j];

          if (img.attrs['data-filter'] !== 'manga-image') {
            continue;
          }

          var src = img.attrs['data-src'] || img.attrs.src;
          var p = _.illust.parse_image_url(src, {
            allow_types: [''],
            allow_sizes: ['1200x1200'],
            manga_page: true
          });

          if (p && p.image_url_medium) {
            pages.push(this.create_manga_page(p, null, null, cnt));
            ++cnt;
          } else {
            _.error('Failed to parse manga page image url');
            return false;
          }
        }

        page_pairs.push(pages);
      }

      if (illust.manga.page_count === 0) {
        _.warn('illust.manga.page_count not declared');
      } else if (cnt !== illust.manga.page_count) {
        _.error('Multiple illust page count mismatch!');
        return false;
      }

      illust.manga.pages = page_pairs;
      illust.manga.page_count = cnt;
      return true;
    },

    load_manga_page: function(illust, page, load_big_image) {
      var that = this;

      if (!illust.manga.pages) {
        _.debug('Start loading manga html...');
        _.xhr.get(illust.url_manga, function(text) {
          _.debug('Manga html loaded!');
          if (that.parse_manga_html(illust, text)) {
            that.load_manga_page(illust, page, load_big_image);
          } else {
            _.debug('Failed to parse manga html');
            _.popup.manga.onerror(illust, page);
          }
        }, function() {
          _.debug('Failed to load manga html');
          _.popup.manga.onerror(illust, page);
        });
        return;
      }

      if (page >= illust.manga.pages.length) {
        _.popup.manga.onerror(illust, page);
        return;
      }

      var pages = illust.manga.pages[page];

      var error_sent = false;
      var send_error = function() {
        if (!error_sent) {
          _.popup.manga.onerror(illust, page);
          error_sent = true;
        }
      };

      var onload = function() {
        if (error_sent) {
          return;
        }
        for(var i = 0; i < pages.length; ++i) {
          if (!(pages[i].image_medium || pages[i].image_big)) {
            return;
          }
        }
        _.popup.manga.onload(illust, page);
      };

      pages.forEach(function(page) {
        _.illust.load_images(page, load_big_image, onload, send_error);
      });
    },

    parse_illust_url: function(url) {
      var re;
      if (!(re = /^(?:(?:http:\/\/www\.pixiv\.net)?\/)?member_illust\.php(\?.*)?$/.exec(url))) {
        return null;
      }
      var query = _.parse_query(re[1]);
      if (query.illust_id) {
        query.illust_id = g.parseInt(query.illust_id, 10);
      }
      return query;
    }
  };

  _.popup = {
    dom: { },
    images: [],
    saved_context: null,

    RM_AUTO:      -1,
    RM_FIT_LONG:   0,
    RM_FIT_SHORT:  1,
    RM_ORIGINAL:   2,

    scrollbar_width:  0,
    scrollbar_height: 0,

    resize_mode:      -1,
    resize_mode_next: -1,

    create: function() {
      var that = this;
      var dom = this.dom;
      if (dom.created) {
        return;
      }

      dom.root              = _.e('div', {id: 'pp-popup'});
      dom.title             = _.e('div', {id: 'pp-popup-title'}, dom.root);
      dom.rightbox          = _.e('div', {id: 'pp-popup-rightbox'}, dom.title);
      dom.status            = _.e('span', {id: 'pp-popup-status'}, dom.rightbox);
      dom.ugoira_status     = _.e('span', {id: 'pp-popup-ugoira-status'}, dom.rightbox);
      dom.resize_mode       = _.e('a', {id: 'pp-popup-button-resize-mode', cls: 'pp-hide'}, dom.rightbox);
      dom.button_manga      = _.e('a', {id: 'pp-popup-button-manga', cls: 'pp-hide'}, dom.rightbox);
      dom.button_response   = _.e('a', {id: 'pp-popup-button-response', text: '[R]', cls: 'pp-hide'}, dom.rightbox);
      dom.button_bookmark   = _.e('a', {id: 'pp-popup-button-bookmark', text: '[B]'}, dom.rightbox);
      dom.title_link        = _.e('a', null, dom.title);
      dom.title_clearfix    = _.e('div', {css: 'clear:both'}, dom.root);
      dom.header            = _.e('div', {id: 'pp-popup-header'}, dom.root);
      dom.caption_wrapper   = _.e('div', {id: 'pp-popup-caption-wrapper'}, dom.header);
      dom.caption           = _.e('div', {id: 'pp-popup-caption'}, dom.caption_wrapper);
      dom.comment_wrapper   = _.e('div', {id: 'pp-popup-comment-wrapper'}, dom.caption_wrapper);
      dom.comment_toolbar   = _.e('div', {id: 'pp-popup-comment-toolbar'}, dom.comment_wrapper);
      dom.comment_form_btn  = _.e('button', {id: 'pp-popup-comment-form-btn', cls: 'pp-popup-comment-btn'}, dom.comment_toolbar);
      dom.comment_conf_btn  = _.e('button', {id: 'pp-popup-comment-config-btn', cls: 'pp-popup-comment-btn'}, dom.comment_toolbar);
      dom.comment           = _.e('div', {id: 'pp-popup-comment'}, dom.comment_wrapper);
      dom.taglist           = _.e('div', {id: 'pp-popup-taglist'}, dom.header);
      dom.rating            = _.e('div', {id: 'pp-popup-rating', cls: 'pp-popup-separator'}, dom.header);
      dom.info              = _.e('div', {id: 'pp-popup-info', cls: 'pp-popup-separator'}, dom.header);
      dom.author_image      = _.e('img', {id: 'pp-popup-author-image'}, dom.info);
      dom.author_status     = _.e('img', {id: 'pp-popup-author-status', cls: 'pp-sprite'}, dom.info);
      dom.datetime          = _.e('div', {id: 'pp-popup-date'}, dom.info);
      dom.size_tools        = _.e('div', {id: 'pp-popup-size-tools'}, dom.info);
      dom.size              = _.e('span', {id: 'pp-popup-size'}, dom.info);
      dom.tools             = _.e('span', {id: 'pp-popup-tools'}, dom.info);
      dom.author_links      = _.e('div', {id: 'pp-popup-author-links'}, dom.info);
      dom.author_profile    = _.e('a', {id: 'pp-popup-author-profile'}, dom.author_links);
      dom.author_works      = _.e('a', {id: 'pp-popup-author-works'}, dom.author_links);
      dom.author_bookmarks  = _.e('a', {id: 'pp-popup-author-bookmarks'}, dom.author_links);
      dom.author_staccfeed  = _.e('a', {id: 'pp-popup-author-staccfeed'}, dom.author_links);
      dom.info_clearfix     = _.e('div', {css: 'clear:both'}, dom.info);
      dom.image_wrapper     = _.e('div', {id: 'pp-popup-image-wrapper'}, dom.root);
      dom.image_scroller    = _.e('div', {id: 'pp-popup-image-scroller'}, dom.image_wrapper);
      dom.image_layout      = _.e('a', {id: 'pp-popup-image-layout'}, dom.image_scroller);
      dom.olc_prev          = _.e('div', {id: 'pp-popup-olc-prev', cls: 'pp-popup-olc'}, dom.image_scroller);
      dom.olc_prev_icon     = this.create_olc_icon(dom.olc_prev);
      dom.olc_next          = _.e('div', {id: 'pp-popup-olc-next', cls: 'pp-popup-olc'}, dom.image_scroller);
      dom.olc_next_icon     = this.create_olc_icon(dom.olc_next);
      dom.bookmark_wrapper  = _.e('div', {id: 'pp-popup-bookmark-wrapper'}, dom.root);
      dom.tagedit_wrapper   = _.e('div', {id: 'pp-popup-tagedit-wrapper'}, dom.root);

      (function() {
        var svg = _.e('svg', {viewBox: '0 0 24 24'}, dom.ugoira_status);
        dom.ugoira_progress_svg = svg;
        dom.ugoira_progress_clip = _.e('path', null, _.e('clipPath', {id: 'pp-popup-ugoira-progress-clip'}, _.e('defs', null, svg)));
        _.e('path', {d: 'M 22,12 A 10,10 0 1 1 2,12 10,10 0 1 1 22,12 z', 'clip-path': 'url(#pp-popup-ugoira-progress-clip)', style: 'fill:none;stroke:#000;stroke-width:2'}, svg);
        _.e('path', {d: 'M 8,6 8,18 19,12 z', style: 'fill:none;stroke:#000;stroke-width:2', id: 'pp-popup-ugoira-playing'}, svg);
        _.e('path', {d: 'M 7,7 10,7 10,17 7,18 z M 14,7 17,7 17,17 14,17 z', style: 'fill:none;stroke:#000;stroke-width:2', id: 'pp-popup-ugoira-paused'}, svg);
      })();

      dom.multipage_icon = (function() {
        var svg = _.e('svg', {id: 'pp-popup-multipage-icon',
                              width: '160', height: '160',
                              viewBox: '0 0 100 100'}, dom.image_scroller);

        var grad = _.e('linearGradient',
                       {id: 'pp-popup-multipage-icon-grad',
                        x1: '50%', y1: '50%', x2: '100%', y2: '100%'},
                       _.e('defs', null, svg));
        _.e('stop', {offset: '0%', style: 'stop-color:black;stop-opacity:0'}, grad);
        _.e('stop', {offset: '100%', style: 'stop-color:black;stop-opacity:1'}, grad);

        _.e('rect', {x: '0', y: '0', width: '100', height: '100', id: 'pp-popup-multipage-icon-bg'}, svg);

        var g = _.e('g', null, svg);
        _.e('rect', {x: '64', y: '58', width: '18', height: '24', fill: 'white'}, g);
        _.e('path', {d: 'M 84 63 l 3 0 l 0 24 l -18 0 l 0 -3 l 15 0 z', fill: 'white'}, g);
        _.e('path', {d: 'M 89 68 l 3 0 l 0 24 l -18 0 l 0 -3 l 15 0 z', fill: 'white'}, g);

        return svg;
      })();


      this.comment_conf_menu = new _.PopupMenu(dom.comment_conf_btn);
      this.comment_conf_menu.add_conf_item('popup', 'show_comment_form', function(checked) {
        if (checked) {
          that.comment.show_form();
        }
      });
      this.comment_conf_menu.add_conf_item('popup', 'hide_stamp_comments', function(checked) {
        that.comment.update_hide_stamp_comments();
      });



      this.ugoira_menu = new _.PopupMenu(dom.ugoira_progress_svg);

      this.ugoira_menu.add(
        'play-pause', _.lng.ugoira_play_pause,
        {callback: this.ugoira_play_pause.bind(this),
         key: _.conf.key.popup_ugoira_play_pause}
      );
      this.ugoira_menu.add(
        'next-frame', _.lng.ugoira_next_frame,
        {callback: this.ugoira_next_frame.bind(this),
         key: _.conf.key.popup_ugoira_next_frame}
      );
      this.ugoira_menu.add(
        'prev-frame', _.lng.ugoira_prev_frame,
        {callback: this.ugoira_prev_frame.bind(this),
         key: _.conf.key.popup_ugoira_prev_frame}
      );

      this.ugoira_menu.add('dl-zip', _.lng.ugoira_download_zip, {
        type: 'link',
        get_url: function() {
          return (that.illust.ugoira_big || that.illust.ugoira_small).src;
        }
      });

      this.ugoira_menu.add('gen-tc', _.lng.ugoira_generate_timecode, {
        callback: function() {
          // http://www.bunkus.org/videotools/mkvtoolnix/doc/mkvmerge.html#mkvmerge.external_timecode_files
          var data = '# timecode format v2\r\n' + that.illust.ugoira.progress.join('\r\n') + '\r\n';
          w.open('data:text/plain,' + w.encodeURIComponent(data));
        }
      });

      this.ugoira_menu.add('help', _.lng.ugoira_how_to_use, {
        callback: function() {
          var text = [
            '$ unzip downloaded_file.zip',
            '$ ffmpeg -i "%06d.jpg" -vcodec mjpeg -qscale 0 test.avi',
            '$ mkvmerge --timecodes 0:generated_timecode.txt test.avi -o test2.mkv',
            '$ mplayer -loop 0 test2.mkv',
            "$ echo 'yay!'",
          ].join('\r\n');
          w.open('data:text/plain,' + w.encodeURIComponent(text));
        }
      });



      _.listen(dom.comment, 'DOMNodeInserted', this.comment.update.bind(this.comment), {async: true});

      this.input.init();

      _.listen(w, 'resize', function() {
        if (that.running) {
          that.adjust();
        }
      }, {async: true});

      dom.created = true;
    },

    create_olc_icon: function(parent) {
      var icon = _.e('svg', {viewBox: '0 0 100 100'}, parent);
      _.e('path', {'d': 'M 10 50 l 45 -45 l 0 30 l 35 0 l 0 30 l -35 0 l 0 30 z'}, icon);
      return icon;
    },

    update_scrollbar_size: function() {
      var that = this;
      g.setTimeout(function() {
        var scroller = that.dom.image_scroller,
            sw       = scroller.offsetWidth  - scroller.clientWidth,
            sh       = scroller.offsetHeight - scroller.clientHeight,
            change   = false;

        if (sw > 0 && sw !== that.scrollbar_width) {
          that.scrollbar_width = sw;
          change = true;
        }

        if (sh > 0 && sh !== that.scrollbar_height) {
          that.scrollbar_height = sh;
          change = true;
        }

        if (change) {
          that.adjust();
        }
      }, 0);
    },

    layout_images: function(max_width, max_height) {
      var that = this;

      var natural_sizes, dom = this.dom;

      if (!this.images || this.images.length <= 0) {
        dom.image_layout.style.width  = 'auto';
        dom.image_layout.style.height = 'auto';
        return;
      }

      natural_sizes = this.images.map(function(img) {
        return {width: img.naturalWidth, height: img.naturalHeight};
      });

      var total_width = 0, total_height = 0;
      natural_sizes.forEach(function(size) {
        total_width += size.width;
        total_height = g.Math.max(total_height, size.height);
      });

      // initialize

      var image_scroller = dom.image_scroller;
      image_scroller.style.cssText = '';

      // calculate scale

      var scale = 1,
          update_scale = false,
          aspect_ratio = total_width / total_height,
          resize_mode = this.resize_mode,
          update_resize_mode = (resize_mode === this.RM_AUTO);

      if (aspect_ratio < 1) {
        aspect_ratio = 1 / aspect_ratio;
      }
      this.aspect_ratio = aspect_ratio;

      if (update_resize_mode) {
        resize_mode = this.RM_FIT_LONG;
      }

      this.resize_mode_next = this.RM_FIT_LONG;
      if (total_width > max_width || total_height > max_height) {
        if (update_resize_mode && _.conf.popup.fit_short_threshold > 0) {
          if (aspect_ratio >= _.conf.popup.fit_short_threshold) {
            resize_mode = this.RM_FIT_SHORT;
          } else {
            resize_mode = this.RM_FIT_LONG;
          }
        }
        if (resize_mode === this.RM_FIT_LONG) {
          this.resize_mode_next = this.RM_FIT_SHORT;
        } else if (resize_mode === this.RM_FIT_SHORT) {
          if (total_width > max_width && total_height > max_height) {
            this.resize_mode_next = this.RM_ORIGINAL;
          }
        }
        update_scale = true;
      } else {
        resize_mode = this.RM_FIT_LONG;
      }

      // update resize mode indicator

      dom.resize_mode.textContent = '[' + 'LSO'[resize_mode] + ']';
      if (resize_mode === this.RM_FIT_LONG) {
        dom.resize_mode.classList.add('pp-hide');
      } else {
        dom.resize_mode.classList.remove('pp-hide');
      }

      if (update_scale) {
        if (resize_mode === this.RM_FIT_LONG) {
          scale = g.Math.min(max_width / total_width, max_height / total_height, 1);

        } else {
          var scroll_x = false, scroll_y = false;
          this.update_scrollbar_size();

          if (resize_mode === this.RM_FIT_SHORT) {
            var sw = max_width / total_width,
                sh = max_height / total_height;

            if (sw < sh) {
              scroll_x = true;
              scale = g.Math.min((max_height - this.scrollbar_height) / total_height, 1);
            } else {
              scroll_y = true;
              scale = g.Math.min((max_width - this.scrollbar_width) / total_width, 1);
            }

          } else {
            // original
            if (total_width > max_width) {
              scroll_x = true;
            }
            if (total_height > max_height) {
              scroll_y = true;
            }
          }

          image_scroller.style.maxWidth  = max_width  + 'px';
          image_scroller.style.maxHeight = max_height + 'px';

          if (scroll_x) {
            if (total_height + this.scrollbar_height > max_height) {
              image_scroller.style.height = max_height + 'px';
            } else {
              image_scroller.style.height = (total_height + this.scrollbar_height) + 'px';
            }
            image_scroller.style.maxWidth  = max_width  + 'px';
            image_scroller.style.overflowX = 'auto';
            image_scroller.style['overflow-x'] = 'auto';
          }

          if (scroll_y) {
            if (total_width + this.scrollbar_width > max_width) {
              image_scroller.style.width = max_width + 'px';
            } else {
              image_scroller.style.width = (total_width + this.scrollbar_width) + 'px';
            }
            image_scroller.style.maxHeight = max_height + 'px';
            image_scroller.style.overflowY = 'auto';
            image_scroller.style['overflow-y'] = 'auto';
          }
        }
      }

      // apply scale

      var layout_height = 0, layout_width = 0, image_height = [];
      this.images.forEach(function(img, idx) {
        var nsize  = natural_sizes[idx],
            width  = g.Math.round(nsize.width  * scale),
            height = g.Math.round(nsize.height * scale);
        img.style.width = width + 'px';
        img.style.height = height + 'px';
        if (height > layout_height) {
          layout_height = height;
        }
        layout_width += img.parentNode ? img.offsetWidth : g.Math.round(nsize.width * scale);
        image_height.push(height);
      });

      this.images.forEach(function(img, idx) {
        var mtop = g.Math.floor((layout_height - image_height[idx]) / 2);
        img.style.margin = mtop + 'px 0px 0px 0px';
      });

      dom.image_layout.style.width  = layout_width + 'px';
      dom.image_layout.style.height = layout_height + 'px';

      this.scale = scale;
    },

    calculate_max_content_size: function(content) {
      var c, dom = this.dom, root = dom.root, de = d.documentElement;
      if (this.bookmark.active) {
        c = dom.bookmark_wrapper;
      } else if (this.tagedit.active) {
        c = dom.tagedit_wrapper;
      } else {
        c = dom.image_wrapper;
      }
      return [
        de.clientWidth  - 20 - (root.offsetWidth  - c.clientWidth),
        de.clientHeight - 20 - (root.offsetHeight - c.clientHeight)
      ];
    },

    adjust_olc_icon: function(icon, next) {
      var olc  = icon.parentNode,
          size = g.Math.min(g.Math.floor(g.Math.min(olc.offsetWidth, olc.offsetHeight) * 0.8), 200),
          left = g.Math.min(g.Math.floor((olc.offsetWidth  - size) / 2), 50),
          top;

      // if (olc.offsetHeight - size < olc.offsetWidth - size) {
      //   top = g.Math.floor((olc.offsetHeight  - size) / 2);
      // } else {
      //   top = olc.offsetHeight - size - left;
      // }

      top = g.Math.floor((olc.offsetHeight  - size) / 2);

      if (next) {
        left = olc.offsetWidth - size - left;
      }

      icon.style.width  = size + 'px';
      icon.style.height = size + 'px';
      icon.style.left   = left + 'px';
      icon.style.top    = top  + 'px';
    },

    adjust: function() {
      if (!this.running) {
        return;
      }

      _.debug('popup: adjust');

      var dom = this.dom, root = dom.root, de = d.documentElement,
          max_size = this.calculate_max_content_size();

      if (this.bookmark.active) {
        this.bookmark.adjust(max_size[0], max_size[1]);

      } else if (this.tagedit.active) {
        this.tagedit.adjust(max_size[0], max_size[1]);

      } else {
        dom.image_layout.style.margin = '0px';

        this.layout_images(max_size[0], max_size[1]);

        var mh = dom.image_scroller.clientWidth  - dom.image_layout.offsetWidth,
            mv = dom.image_scroller.clientHeight - dom.image_layout.offsetHeight;
        dom.image_layout.style.marginLeft = g.Math.max(g.Math.floor(mh / 2), 0) + 'px';
        dom.image_layout.style.marginTop  = g.Math.max(g.Math.floor(mv / 2), 0) + 'px';

        var header_height = dom.image_wrapper.offsetHeight;
        if (!this.comment.active) {
          header_height = g.Math.floor(header_height * _.conf.popup.caption_height);
        }

        dom.caption_wrapper.style.height = 'auto';
        var caption_height = header_height - (dom.header.offsetHeight - dom.caption_wrapper.offsetHeight);
        if (caption_height < _.conf.popup.caption_minheight) {
          caption_height = _.conf.popup.caption_minheight;
        }
        if (dom.caption_wrapper.offsetHeight > caption_height) {
          dom.caption_wrapper.style.height = caption_height + 'px';
        }

        var width = _.conf.popup.overlay_control;
        if (width <= 0) {
          dom.olc_prev.classList.remove('pp-active');
          dom.olc_next.classList.remove('pp-active');
        } else {
          if (width < 1) {
            width = g.Math.floor(dom.image_scroller.clientWidth * width);
          }

          // avoid overlap with scrollbar

          var height = dom.image_scroller.clientHeight;

          dom.olc_prev.style.width  = width  + 'px';
          dom.olc_next.style.width  = width  + 'px';
          dom.olc_prev.style.height = height + 'px';
          dom.olc_next.style.height = height + 'px';

          dom.olc_next.style.right = this.scrollbar_width + 'px';

          this.adjust_olc_icon(dom.olc_prev_icon);
          this.adjust_olc_icon(dom.olc_next_icon, true);

          dom.olc_prev.classList.add('pp-active');
          dom.olc_next.classList.add('pp-active');
        }
      }

      root.style.left = g.Math.floor((de.clientWidth  - root.offsetWidth)  / 2) + 'px';
      root.style.top  = g.Math.floor((de.clientHeight - root.offsetHeight) / 2) + 'px';

      this.update_info();
    },

    update_info: function() {
      var that = this;

      var size_list, illust = this.illust;
      if (illust.size && !illust.manga.available && !this.manga.active) {
        size_list = [illust.size];
      } else {
        size_list = this.images.map(function(img) {
          return {width: img.naturalWidth, height: img.naturalHeight};
        });
      }

      var size_text = size_list.map(function(size, idx) {
        var str = size.width + 'x' + size.height,
            more_info = [],
            img = that.images[idx],
            re;

        if (img && img.offsetWidth !== size.width) {
          more_info.push((g.Math.floor(img.offsetWidth * 100 / size.width) / 100) + 'x');
        }

        if (_.conf.general.debug) {
          more_info.push('ar:' + (g.Math.floor(_.calculate_ratio(size.width, size.height) * 100) / 100));
        }

        if (img && (re = /\.(\w+)(?:\?|$)/.exec(img.src))) {
          more_info.push(re[1]);
        }

        if (more_info.length > 0) {
          str += '(' + more_info.join('/') + ')';
        }

        return str;
      }).join('/');

      if (_.conf.general.debug) {
        size_text += ' ar:' + (g.Math.floor(this.aspect_ratio * 100) / 100);
      }

      this.dom.size.textContent = size_text;
    },

    update_ugoira_progress: function(frame_number) {
      if (!this.running || !this.illust.ugoira) {
        return;
      }

      var data, prog;
      data = this.illust.ugoira;
      prog = data.progress[frame_number] / data.duration;

      var path = ['12,12', '12,-4', '28,-4'];
      if (prog >= 0.25) {
        path.push('28,28');
      }
      if (prog >= 0.5) {
        path.push('-4,28');
      }
      if (prog >= 0.75) {
        path.push('-4, -4');
      }

      var x, y, rad;
      rad = g.Math.PI * 2 * (prog - 0.25);
      x = g.Math.cos(rad) * 12 + 12;
      y = g.Math.sin(rad) * 12 + 12;
      path.push(x + ',' + y);

      this.dom.ugoira_progress_clip.setAttribute('d', 'M ' + path.join(' ') + ' z');
      this.dom.ugoira_progress_svg.style.width = this.dom.ugoira_progress_svg.style.height =
        this.dom.button_bookmark.offsetHeight + 'px';
    },

    clear: function() {
      var dom = this.dom;

      dom.button_manga.classList.add('pp-hide');
      dom.button_response.classList.add('pp-hide');
      dom.author_status.classList.add('pp-hide');
      dom.author_image.classList.add('pp-hide');
      dom.root.classList.remove('pp-frontpage-new');

      _.clear(
        dom.title_link,
        dom.caption,
        dom.taglist,
        dom.rating,
        dom.datetime,
        dom.tools,
        dom.author_profile,
        dom.author_works,
        dom.author_bookmarks,
        dom.author_staccfeed,
        dom.image_layout
      );

      this.images = [];

      if (this.illust && this.illust.ugoira_player) {
        this.illust.ugoira_player.pause();
      }

      this.clear_submod();
    },

    clear_submod: function() {
      this.bookmark.clear();
      this.manga.clear();
      this.question.clear();
      this.comment.clear();
      this.tagedit.clear();
    },

    set_images: function(images) {
      var dom = this.dom;
      this.images = images;
      this.adjust();
      if (dom.image_layout.childElementCount === images.length) {
        this.images.forEach(function(img, idx) {
          dom.image_layout.replaceChild(img, dom.image_layout.children[idx]);
        });
      } else {
        _.clear(dom.image_layout);
        this.images.forEach(function(img) {
          dom.image_layout.appendChild(img);
        });
      }
      this.dom.image_scroller.scrollTop = 0;
      this.adjust();
    },

    onload: function(illust) {
      if (illust !== this.illust || this.bookmark.active || this.tagedit.active) {
        return;
      }

      var that = this;
      var dom = this.dom;

      if (_.conf.popup.preload) {
        if (illust.prev) {
          _.illust.load(illust.prev);
        }
        if (illust.next) {
          _.illust.load(illust.next);
        }
      }

      this.clear_submod();
      dom.button_manga.classList.add('pp-hide');
      dom.button_response.classList.add('pp-hide');
      dom.author_status.classList.add('pp-hide');
      dom.author_image.classList.add('pp-hide');

      dom.root.classList[illust.is_manga ? 'add' : 'remove']('pp-mangawork');
      dom.root.classList[illust.ugoira ? 'add' : 'remove']('pp-ugoira');

      if (illust.manga.available) {
        dom.root.classList.add('pp-multipage');
        dom.root.classList.add('pp-frontpage');
        dom.root.classList.add(illust.new_url_pattern ? 'pp-frontpage-new' : 'pp-frontpage-old');
      } else {
        dom.root.classList.remove('pp-multipage');
        dom.root.classList.remove('pp-frontpage');
        dom.root.classList.remove('pp-frontpage-new');
        dom.root.classList.remove('pp-frontpage-old');
      }

      if (illust.manga.book_mode) {
        dom.root.classList.add('pp-book');
        if (illust.manga.book_mode === 'rtl') {
          dom.root.classList.add('pp-book-rtl');
        } else if (illust.manga.book_mode === 'ltr') {
          dom.root.classList.add('pp-book-ltr');
        }
      } else {
        dom.root.classList.remove('pp-book');
        dom.root.classList.remove('pp-book-rtl');
        dom.root.classList.remove('pp-book-ltr');
      }

      dom.title_link.innerHTML = illust.title;
      dom.title_link.href = illust.url_medium;

      dom.button_bookmark.href = illust.url_bookmark;
      if (illust.bookmarked) {
        dom.button_bookmark.classList.add('pp-active');
      } else {
        dom.button_bookmark.classList.remove('pp-active');
      }

      if (illust.has_image_response) {
        dom.button_response.classList.remove('pp-active');
        dom.button_response.classList.remove('pp-hide');
        dom.button_response.href = illust.url_response;
      } else if (illust.image_response_to) {
        dom.button_response.classList.add('pp-active');
        dom.button_response.href = illust.url_response_to;
        dom.button_response.classList.remove('pp-hide');
      }

      if (illust.manga.available) {
        dom.button_manga.href = illust.url_manga + '#pp-manga-thumbnail';
        this.manga.update_button();
        dom.button_manga.classList.remove('pp-hide');
      }

      dom.caption.innerHTML = illust.caption;
      _.modify_caption(dom.caption, illust);
      _.redirect_jump_page(dom.caption);

      dom.taglist.innerHTML = illust.taglist;
      _.onclick(
        _.e('a', {text: '[E]', href: '#', id: 'pp-popup-tagedit-button'}, dom.taglist),
        function() {
          that.tagedit.start();
          return true;
        }
      );

      dom.rating.innerHTML = illust.rating + illust.question;

      ['pixpedia', 'pixiv_comic', 'booth'].forEach(function(name) {
        var f = _.conf.popup['remove_' + name];
        dom.taglist.classList[f ? 'add' : 'remove']('pp-no-' + name.replace('_', '-'));
      });

      if (_.conf.popup.author_status_icon) {
        [
          ['favorite', 'pp-fav'],
          ['mutual_favorite', 'pp-fav-m'],
          ['mypixiv', 'pp-mypix']
        ].forEach(function(p) {
          if (illust['author_' + [p[0]]]) {
            dom.author_status.classList.add(p[1]);
            dom.author_status.classList.remove('pp-hide');
          } else {
            dom.author_status.classList.remove(p[1]);
          }
        });
      }

      if (illust.author_image_url) {
        dom.author_image.src = illust.author_image_url;
        dom.author_image.classList.remove('pp-hide');
      }

      dom.datetime.textContent = illust.datetime;

      _.clear(dom.tools);
      illust.tools.forEach(function(tool) {
        var url = '/search.php?word=' + g.encodeURIComponent(tool) + '&s_mode=s_tag';
        _.e('a', {href: url, text: tool}, dom.tools);
      });

      if (illust.author_id) {
        dom.author_profile.href = illust.url_author_profile;
        if (illust.author_is_me) {
          dom.author_profile.innerHTML = '[Me]';
        } else {
          dom.author_profile.innerHTML = illust.author_name || '[Error]';
        }
        dom.author_works.href = illust.url_author_works;
        dom.author_works.textContent = _.lng.author_works;
        dom.author_bookmarks.href = illust.url_author_bookmarks;
        dom.author_bookmarks.textContent = _.lng.author_bookmarks;
      }
      if (illust.url_author_staccfeed) {
        dom.author_staccfeed.href = illust.url_author_staccfeed;
        dom.author_staccfeed.textContent = _.lng.author_staccfeed;
      }

      if (illust.manga.available) {
        dom.image_layout.href = illust.url_manga;
      } else {
        dom.image_layout.href = illust.image_url_big;
      }

      try {
        if (_.stampSeries) {
          w.pixiv.context.stampSeries = _.stampSeries;
        }
        if (_.emojiSeries) {
          w.pixiv.context.emojiSeries = _.emojiSeries;
        }
      } catch(ex) {
        _.error(ex);
      }

      _.popup.comment.setup(illust.comment);

      try {
        w.pixiv.context.illustId = illust.id;
        w.pixiv.context.userId = illust.author_id;
        w.pixiv.context.rated = illust.rated;
      } catch(ex) {
        _.error(ex);
      }

      try {
        if (illust.rating && !illust.rated) {
          w.pixiv.rating.setup();
        }
      } catch(ex) {
        _.error(ex);
      }

      try {
        if (illust.question) {
          w.pixiv.context.hasQuestionnaire = true;
          w.pixiv.context.answered = illust.answered;
          w.pixiv.questionnaire.setup();
        } else {
          w.pixiv.context.hasQuestionnaire = false;
        }
      } catch(ex) {
        _.error(ex);
      }

      if (illust.ugoira_canvas) {
        this.ugoira_replay();
        this.ugoira_play();
      }

      if (illust.ugoira_canvas) {
        this.set_images([illust.ugoira_canvas]);
      } else if (illust.image_big && !(illust.manga.available && illust.image_medium)) {
        this.set_images([illust.image_big]);
      } else {
        this.set_images([illust.image_medium]);
      }

      this.status_complete();
    },

    onerror: function(illust) {
      if (illust !== this.illust || this.bookmark.active || this.tagedit.active) {
        return;
      }

      this.status_error(illust.error || 'Unknown error');
      this.adjust();
    },

    set_status_text: function(text) {
      var dom = this.dom;
      if (text) {
        dom.status.textContent = text;
        dom.status.classList.remove('pp-hide');
      } else {
        dom.status.classList.add('pp-hide');
      }
    },

    set_status_tooltip: function(text) {
      if (text) {
        this.dom.status.classList.add('_ui-tooltip');
        this.dom.status.setAttribute('data-tooltip', text);
      } else {
        this.dom.status.classList.remove('_ui-tooltip');
      }
    },

    status_loading: function() {
      this.dom.root.classList.add('pp-loading');
      this.dom.root.classList.remove('pp-error');
      this.set_status_text('Loading');
      this.set_status_tooltip();
    },

    status_complete: function() {
      this.dom.root.classList.remove('pp-loading');
      this.dom.root.classList.remove('pp-error');
      this.set_status_text('');
      this.set_status_tooltip();
    },

    status_error: function(message) {
      this.dom.root.classList.remove('pp-loading');
      this.dom.root.classList.add('pp-error');
      this.set_status_text('Error');
      this.set_status_tooltip(message);
      if (message) {
        _.error(message);
      }
    },

    show: function(illust) {
      if (!this.saved_context) {
        _.debug('saving pixiv.context');
        this.saved_context = w.pixiv.context;
        w.pixiv.context = _.extend({ }, w.pixiv.context);
      }

      if (!illust) {
        this.hide();
        return;
      }

      _.modal.end();

      if (this.bookmark.active) {
        this.bookmark.end();
      }
      if (this.tagedit.active) {
        this.tagedit.end();
      }

      var dom = this.dom;
      this.create();
      dom.root.style.fontSize = _.conf.popup.font_size;
      dom.header.style.backgroundColor = 'rgba(255,255,255,' + _.conf.popup.caption_opacity + ')';

      if (this.illust && this.illust.ugoira_player) {
        this.illust.ugoira_player.pause();
      }

      if (illust !== this.illust && illust.manga &&
          !_.conf.popup.manga_viewed_flags) {
        illust.manga.viewed = false;
      }

      this.illust = illust;
      this.running = true;
      if (!dom.root.parentNode) {
        d.body.insertBefore(dom.root, d.body.firstChild);
      }
      _.popup.key.activate();

      this.resize_mode = this.RM_AUTO;
      if (illust.loaded) {
        this.status_complete();
        this.onload(illust);
      } else {
        this.status_loading();
        this.adjust();
        _.illust.load(illust);
      }

      _.lazy_scroll(illust.image_thumb || illust.link);

      // On Opera 12.10+, this will breaks down <a href> path resolution. Looks like a bug...
      if (!w.opera && _.conf.popup.mark_visited && illust.link && w.history.replaceState) {
        var url = w.location.href;
        w.history.replaceState({}, '', illust.link.href);
        w.history.replaceState({}, '', url);
      }
    },

    hide: function() {
      _.popup.key.inactivate();

      if (!this.running) {
        return;
      }

      if (this.saved_context) {
        _.debug('restoring pixiv.context');
        w.pixiv.context = this.saved_context;
      } else {
        _.error('pixiv.context not saved (bug)');
      }

      var dom = this.dom;
      if (dom.root.parentNode) {
        dom.root.parentNode.removeChild(dom.root);
      }
      this.clear();
      this.dom.header.classList.remove('pp-hide');
      this.dom.header.classList.remove('pp-show');
      this.running = false;
    },

    reload: function() {
      _.illust.unload(this.illust);
      this.show(this.illust);
    },

    show_caption: function() {
      this.dom.header.classList.add('pp-show');
      this.dom.header.classList.remove('pp-hide');
    },

    hide_caption: function() {
      this.question.blur();

      var h = this.dom.header;
      h.classList.remove('pp-show');
      if (this.is_caption_visible()) {
        h.classList.add('pp-hide');
      }
    },

    is_caption_visible: function() {
      var h = this.dom.header;
      return (!h.classList.contains('pp-hide') &&
              (h.classList.contains('pp-show') ||
               (h.oMatchesSelector && h.oMatchesSelector(':hover')) ||
               (h.mozMatchesSelector && h.mozMatchesSelector(':hover')) ||
               (h.webkitMatchesSelector && h.webkitMatchesSelector(':hover'))));
    },

    toggle_caption: function() {
      if (this.is_caption_visible()) {
        this.hide_caption();
      } else {
        this.show_caption();
      }
    },

    send_rate: function(score) {
      if (this.illust.rating && !this.illust.rated) {
        try {
          w.pixiv.rating.rate = score;
          w.pixiv.rating.apply();
        } catch(ex) {
          _.error(ex);
        }
      }
    },

    can_scroll: function() {
      return this.can_scroll_vertically() || this.can_scroll_horizontally();
    },

    can_scroll_vertically: function() {
      return this.dom.image_scroller.scrollHeight > this.dom.image_scroller.clientHeight;
    },

    can_scroll_horizontally: function() {
      return this.dom.image_scroller.scrollWidth > this.dom.image_scroller.clientWidth;
    },

    ugoira_current_frame: function() {
      return this.illust.ugoira_player.getCurrentFrame();
    },

    ugoira_frame_count: function() {
      return this.illust.ugoira_player.getFrameCount();
    },

    ugoira_play: function() {
      if (!this.illust.ugoira_player) {
        return false;
      }

      this.illust.ugoira_player.play();
      this.dom.root.classList.add('pp-ugoira-playing');
      this.dom.root.classList.remove('pp-ugoira-paused');

      return true;
    },

    ugoira_replay: function() {
      if (!this.illust.ugoira_player) {
        return false;
      }
      this.illust.ugoira_player.rewind();
      return this.ugoira_play();
    },

    ugoira_pause: function() {
      if (!this.illust.ugoira_player) {
        return false;
      }

      this.illust.ugoira_player.pause();
      this.dom.root.classList.remove('pp-ugoira-playing');
      this.dom.root.classList.add('pp-ugoira-paused');

      return true;
    },

    ugoira_play_pause: function() {
      if (!this.illust.ugoira_player) {
        return false;
      }
      if (this.illust.ugoira_player._paused) {
        return this.ugoira_play();
      } else {
        return this.ugoira_pause();
      }
    },

    ugoira_prev_frame: function() {
      if (!this.ugoira_pause()) {
        return false;
      }

      var player = this.illust.ugoira_player;
      if (--player._frame < 0) {
        player._frame = player.getFrameCount() - 1;
      }
      player._displayFrame();
      return true;
    },

    ugoira_next_frame: function() {
      if (!this.ugoira_pause()) {
        return false;
      }
      this.illust.ugoira_player._nextFrame();
      return true;
    }
  };

  _.popup.bookmark = {
    active: false,

    init: function() {
      if (this.initialized) {
        return;
      }
      this.initialized = true;

      _.onclick(_.popup.dom.bookmark_wrapper, function(ev) {
        if (ev.target.classList.contains('tag')) {
          w.pixiv.tag.toggle(ev.target.dataset.tag);
        }
      });
    },

    clear: function() {
      _.clear(_.popup.dom.bookmark_wrapper);
      _.popup.dom.root.classList.remove('pp-bookmark-mode');
      this.active = false;
      w.focus(); // for Firefox
    },

    adjust: function(w, h) {
      if (this.active) {
        _.bookmarkform.adjust(w, h);
      }
    },

    onload: function(illust, html) {
      if (illust !== _.popup.illust || !this.active) {
        return;
      }

      this.init();

      var root = _.fastxml.parse(html),
          body = _.fastxml.q(root, '.layout-body');

      var re, wrapper = _.popup.dom.bookmark_wrapper;

      wrapper.innerHTML = _.fastxml.html(body, true);

      (function(re) {
        if (!re) {
          _.error('Failed to detect pixiv.context.tags declaration');
          return;
        }

        var tags, tags_data;

        try {
          tags = g.JSON.parse(re[1]); // eval(re[1])
          tags_data = g.JSON.parse(tags);
        } catch(ex) {
          _.error('Failed to parse pixiv.context.tags json', ex);
          return;
        }

        w.pixiv.context.tags = tags;

        var load = w.pixiv.bookmarkTag.load;
        w.pixiv.bookmarkTag.load = function(){};
        w.pixiv.bookmarkTag.setup(_.q('.tag-cloud-container', wrapper));
        w.pixiv.bookmarkTag.load = load;

        w.pixiv.tag.setup();

        w.pixiv.bookmarkTag.data = tags_data;
        w.pixiv.bookmarkTag.initialize();
        w.pixiv.bookmarkTag.show();
        w.pixiv.bookmarkTag.tagContainer.removeClass('loading-indicator');

      })(/>pixiv\.context\.tags\s*=\s*(\"[^\"]+\");/.exec(html));

      var that = this;

      _.bookmarkform.setup(wrapper, {
        autoinput: !illust.bookmarked,
        submit: function() {
          _.popup.status_loading();
        },
        success: function() {
          _.popup.status_complete();

          _.xhr.remove_cache(illust.url_bookmark);

          if (illust === _.popup.illust && _.popup.bookmark.active) {
            that.end();
            _.popup.reload();
          }
        },
        error: function() {
          _.popup.status_error();
          g.alert('Error!');
        }
      });

      if (_.bookmarkform.dom.input_tag) {
        g.setTimeout(function() {
          _.bookmarkform.dom.input_tag.focus();
        }, 0);
      }

      _.popup.dom.root.classList.add('pp-bookmark-mode');
      _.popup.status_complete();
      _.popup.adjust();
    },

    start: function() {
      if (this.active) {
        return;
      }

      var that = this;

      var illust = _.popup.illust;
      this.active = true;
      _.popup.status_loading();

      _.xhr.get(illust.url_bookmark, function(html) {
        that.onload(illust, html);
      }, function() {
        if (illust !== _.popup.illust || !that.active) {
          return;
        }

        that.active = false;
        _.popup.status_error();
      });
    },

    submit: function() {
      if (!this.active) {
        return;
      }
      _.bookmarkform.submit();
    },

    end: function() {
      if (!this.active) {
        return;
      }
      this.clear();
      _.popup.show(_.popup.illust);
    },

    toggle: function() {
      if (this.active) {
        this.end();
      } else {
        this.start();
      }
    }
  };

  _.popup.manga = {
    active: false,
    page: -1,

    clear: function() {
      this.active = false;
      this.page = -1;
      this.update_button();
    },

    onload: function(illust, page) {
      if (illust !== _.popup.illust || !this.active || page !== this.page) {
        return;
      }

      if (_.conf.popup.preload) {
        if (this.page > 0) {
          _.illust.load_manga_page(illust, this.page - 1);
        }
        if (this.page + 1 < illust.manga.pages.length) {
          _.illust.load_manga_page(illust, this.page + 1);
        }
      }

      this.update_button();

      var page_data = illust.manga.pages[page];

      _.popup.dom.root.classList.remove('pp-frontpage');
      _.popup.dom.root.classList.remove('pp-frontpage-new');
      _.popup.dom.root.classList.remove('pp-frontpage-old');
      _.popup.dom.image_layout.href = illust.url_manga + '#pp-manga-page-' + page;
      _.popup.status_complete();
      _.popup.set_images(illust.manga.pages[page].map(function(page) {
        return page.image_big || page.image_medium;
      }));
    },

    onerror: function(illust, page) {
      if (illust !== _.popup.illust || !this.active || page !== this.page) {
        return;
      }
      if (illust.error) {
        _.popup.dom.image_layout.textContent = illust.error;
      }
      _.popup.status_error();
      _.popup.adjust();
    },

    update_button: function() {
      var illust = _.popup.illust,
          pages = illust.manga.pages,
          page;

      if (this.page >= 0 && pages) {
        page = 1;
        for(var i = 0; i < this.page; ++i) {
          page += pages[i].length;
        }

        var img_cnt = pages[this.page].length;
        if (img_cnt > 1) {
          page = page + '-' + (page + img_cnt - 1);
        }

      } else {
        page = this.page + 1;
      }

      _.popup.dom.button_manga.textContent = '[M:' + page + '/' + illust.manga.page_count + ']';
      _.popup.dom.button_manga.classList[this.page >= 0 ? 'add' : 'remove']('pp-active');
    },

    show: function(page) {
      var illust = _.popup.illust;
      if (!illust.manga.available) {
        return;
      }
      if (page < 0 || (illust.manga.pages && page >= illust.manga.pages.length)) {
        this.end();
        return;
      }
      this.active = true;
      this.page = page;
      this.update_button();
      _.popup.resize_mode = _.popup.RM_AUTO;
      illust.manga.viewed = true;
      _.popup.status_loading();
      _.illust.load_manga_page(illust, this.page);
    },

    start: function() {
      if (this.active) {
        return;
      }
      this.show(0);
    },

    end: function() {
      if (!this.active) {
        return;
      }
      this.clear();
      _.popup.show(_.popup.illust);
    },

    toggle: function() {
      if (this.active) {
        this.end();
      } else {
        this.start();
      }
    }
  };

  _.popup.question = {
    is_active: function() {
      return !!_.q('.questionnaire .list.visible,.questionnaire .stats.visible', _.popup.dom.rating);
    },

    clear: function() {
    },

    get_buttons: function() {
      return _.qa('.questionnaire .list ol input[type="button"]');
    },

    get_selected: function() {
      var active = d.activeElement;
      if (this.get_buttons().indexOf(active) >= 0) {
        return active;
      }
      return null;
    },

    blur: function() {
      var selected = this.get_selected();
      if (selected) {
        selected.blur();
      }
    },

    select_button: function(move) {
      var buttons;
      if (move === 0 || (buttons = this.get_buttons()).length < 1) {
        return;
      }

      var selected = buttons.indexOf(d.activeElement);
      move %= buttons.length;
      if (selected < 0) {
        if (move > 0) {
          --move;
        }
      } else {
        move += selected;
      }
      if (move < 0) {
        move += buttons.length;
      } else if (move >= buttons.length) {
        move -= buttons.length;
      }
      buttons[move].focus();
    },

    select_prev: function() {
      this.select_button(-1);
    },

    select_next : function() {
      this.select_button(1);
    },

    submit: function() {
      var selected = this.get_selected();
      if (selected) {
        _.send_click(selected);
      }
    },

    start: function() {
      var toggle = _.q('.questionnaire .toggle-list,.questionnaire .toggle-stats', _.popup.dom.rating);
      if (toggle) {
        _.popup.show_caption();
        _.send_click(toggle);
      }
    },

    end: function() {
      this.blur();
      _.qa('.questionnaire .list,.questionnaire .stats', _.popup.dom.rating).forEach(function(elem) {
        elem.classList.remove('visible');
      });
    }
  };

  _.popup.comment = {
    active: false,
    first_setup_done: false,

    clear: function() {
      var show_form = _.conf.popup.show_comment_form;
      _.popup.dom.root.classList.remove('pp-comment-mode');
      _.popup.dom.root.classList[show_form ? 'add' : 'remove']('pp-show-comment-form');

      this.update_hide_stamp_comments();

      this.active = false;
    },

    update_hide_stamp_comments: function() {
      var hide_stamps = _.conf.popup.hide_stamp_comments;
      _.popup.dom.root.classList[hide_stamps ? 'add' : 'remove']('pp-hide-stamp-comments');
      _.popup.adjust();
    },

    update: function() {
      _.qa('._comment-item', _.popup.dom.comment).forEach(function(item) {
        if (_.q('.sticker-container', item)) {
          item.classList.add('pp-stamp-comment');
        }
      });
      _.popup.adjust();
    },

    scroll: function() {
      _.popup.dom.caption_wrapper.scrollTop = _.popup.dom.caption.offsetHeight;
    },

    show_form: function() {
      if (_.popup.dom.root.classList.add('pp-show-comment-form')) {
        var textarea = _.q('form textarea[name="comment"]', _.popup.dom.comment);
        if (textarea) {
          textarea.focus();
        }
      }
    },

    hide_form: function() {
      _.popup.dom.root.classList.remove('pp-show-comment-form');
    },

    toggle_form: function() {
      _.popup.dom.root.classList.toggle('pp-show-comment-form');
    },

    setup: function(html) {
      var dom = _.popup.dom;

      dom.comment.innerHTML = html;
      _.qa('img[data-src]', dom.comment).forEach(function(img) {
        img.src = img.dataset.src;
      });

      _.onclick(_.q('.more-comment', dom.comment), function(ev) {
        w.pixiv.comment.more(ev);
      });

      _.qa('form[action="member_illust.php"]', dom.comment).forEach(function(form) {
        form.setAttribute('action', '/member_illust.php');
      });

      try {
        w.colon.d.off('click.pixivEmoji');
        w.pixiv.emoji.setup();
      } catch(ex) {
        _.error(ex);
      }

      try {
        w.pixiv.comment.setup();
      } catch(ex) {
        _.error(ex);
      }
    },

    start: function() {
      if (this.active) {
        return;
      }
      this.active = true;
      _.popup.dom.root.classList.add('pp-comment-mode');
      _.popup.show_caption();
      _.popup.adjust();
      this.scroll();
    },

    end: function() {
      if (!this.active) {
        return;
      }
      _.popup.dom.root.classList.remove('pp-comment-mode');
      this.active = false;
      _.popup.adjust();
      _.popup.dom.caption_wrapper.scrollTop = 0;
    },

    toggle: function() {
      if (this.active) {
        this.end();
      } else {
        this.start();
      }
    }
  };

  _.popup.tagedit = {
    active: false,

    clear: function() {
      _.popup.dom.root.classList.remove('pp-tagedit-mode');
      _.clear(_.popup.dom.tagedit_wrapper);
      this.active = false;
    },

    adjust: function(w, h) {
      var wrap  = _.popup.dom.tagedit_wrapper,
          twrap = _.q('#pp-popup-tagedit-table-wrapper', wrap);

      if (!twrap) {
        return;
      }

      h -= wrap.offsetHeight - twrap.offsetHeight;
      twrap.style.maxHeight = h + 'px';
    },

    onload: function(illust, html) {
      if (illust !== _.popup.illust || !this.active) {
        return;
      }

      var that = this;
      _.clear(_.popup.dom.tagedit_wrapper);

      var c = _.e('div', {id: 'tag-editor', css: 'display:block'}, _.popup.dom.tagedit_wrapper);
      c.innerHTML = html;

      var table = _.q('table', c);
      if (table) {
        var tw = _.e('div', {id: 'pp-popup-tagedit-table-wrapper'});
        table.parentNode.replaceChild(tw, table);
        tw.appendChild(table);
      }

      _.popup.status_complete();
      _.popup.dom.root.classList.add('pp-tagedit-mode');
      _.popup.adjust();
    },

    onerror: function(illust, message) {
      if (illust !== _.popup.illust || !this.active) {
        return;
      }
      if (!_.popup.dom.root.classList.contains('pp-tagedit-mode')) {
        this.active = false;
      }
      _.popup.dom.tagedit_wrapper.textContent = message || 'Error';
      _.popup.status_error();
    },

    reload: function() {
      var illust = _.popup.illust;
      if (!illust.author_id) {
        this.onerror(illust, 'Author id not specified');
        return;
      }

      var that = this;
      try {
        w.pixiv.api.post('/rpc_tag_edit.php', {
          mode: 'first',
          i_id: illust.id,
          u_id: illust.author_id,
          e_id: w.pixiv.user.id
        }, {
          ajaxSettings: {dataType: 'text'}
        }).done(function(data) {
          try {
            that.onload(illust, g.JSON.parse(data).html);
          } catch(ex) {
            that.onerror(illust, g.String(ex));
          }
        }).fail(function(data) {
          that.onerror(illust, data);
        });
      } catch(ex) {
        this.onerror(illust);
        return;
      }

      _.popup.status_loading();
    },

    start: function() {
      if (this.active) {
        return;
      }
      this.active = true;
      this.reload();
      _.popup.adjust();
    },

    end: function() {
      if (!this.active) {
        return;
      }
      this.active = false;
      _.popup.dom.root.classList.remove('pp-tagedit-mode');
      _.popup.adjust();
    }
  };

  _.popup.input = (function(mod) {

    for(var i = 1; i <= 10; ++i) {
      mod['rate' + (i <= 9 ? '0' : '') + i] = (function(i) {
        return function() {
          if (_.conf.popup.rate_key) {
            _.popup.send_rate(i);
            return true;
          }
          return false;
        };
      })(i);
    }

    return mod;
  })({
    wheel_delta: 0,

    init: function() {
      var that = this;

      ['auto_manga', 'reverse'].forEach(function(name) {
        var mode = _.conf.popup[name], value;
        if (mode === 2) {
          var pattern = _.conf.popup[name + '_regexp'];
          if (pattern) {
            try {
              value = (new g.RegExp(pattern)).test(w.location.href);
            } catch(ex) {
              value = false;
            }
          } else {
            value = false;
          }
        } else {
          value = mode === 1;
        }
        that[name] = value;
      });

      _.popup.mouse.init();
    },

    /*
     * direction
     *   0: vertical
     *   1: horizontal
     *   2: vertical(prior) or horizontal
     */
    scroll: function(elem, direction, offset) {
      var prop, page, max, value;

      if (direction === 2) {
        if (elem.scrollHeight > elem.clientHeight) {
          direction = 0;
        } else if (elem.scrollWidth > elem.clientWidth) {
          direction = 1;
        } else {
          return false;
        }
      }

      if (direction === 0) {
        prop = 'scrollTop';
        page = elem.clientHeight;
        max = elem.scrollHeight - page;
      } else if (direction === 1) {
        prop = 'scrollLeft';
        page = elem.clientWidth;
        max = elem.scrollWidth - page;
      } else {
        return false;
      }

      if (offset > -1 && offset < 1) {
        offset = g.Math.floor(page * offset);
      }

      value = g.Math.min(g.Math.max(0, elem[prop] + offset), max);
      if (value !== elem[prop]) {
        elem[prop] = value;
        return true;
      }

      return false;
    },

    prev: function() {
      if (_.popup.manga.active) {
        _.popup.manga.show(_.popup.manga.page - 1);
      } else {
        _.popup.show(_.popup.illust[this.reverse ? 'next' : 'prev']);
      }
      return true;
    },

    next: function() {
      if (_.popup.manga.active) {
        _.popup.manga.show(_.popup.manga.page + 1);
      } else if (this.auto_manga && _.popup.illust.manga.available && !_.popup.illust.manga.viewed) {
        _.popup.manga.start();
      } else {
        _.popup.show(_.popup.illust[this.reverse ? 'prev' : 'next']);
      }
      return true;
    },

    prev_direction: function() {
      if (_.popup.manga.active) {
        _.popup.manga.show(_.popup.manga.page - 1);
      } else {
        _.popup.show(_.popup.illust.prev);
      }
      return true;
    },

    next_direction: function() {
      if (_.popup.manga.active) {
        _.popup.manga.show(_.popup.manga.page + 1);
      } else {
        _.popup.show(_.popup.illust.next);
      }
      return true;
    },

    first: function() {
      if (_.popup.manga.active) {
        _.popup.manga.show(0);
      } else {
        _.popup.show(_.illust.list[0]);
      }
      return true;
    },

    last: function() {
      if (_.popup.manga.active) {
        _.popup.manga.show(_.popup.illust.manga.pages.length - 1);
      } else {
        _.popup.show(_.illust.list[_.illust.list.length - 1]);
      }
      return true;
    },

    caption_scroll_up: function() {
      return this.scroll(_.popup.dom.caption_wrapper, 0, -_.conf.popup.scroll_height);
    },

    caption_scroll_down: function() {
      return this.scroll(_.popup.dom.caption_wrapper, 0, _.conf.popup.scroll_height);
    },

    illust_scroll_up: function() {
      return this.scroll(_.popup.dom.image_scroller, 0, -_.conf.popup.scroll_height);
    },

    illust_scroll_down: function() {
      return this.scroll(_.popup.dom.image_scroller, 0, _.conf.popup.scroll_height);
    },

    illust_scroll_left: function() {
      return this.scroll(_.popup.dom.image_scroller, 1, -_.conf.popup.scroll_height);
    },

    illust_scroll_right: function() {
      return this.scroll(_.popup.dom.image_scroller, 1, _.conf.popup.scroll_height);
    },

    illust_scroll_top: function() {
      if (_.popup.can_scroll()) {
        var el = _.popup.dom.image_scroller;
        el.scrollLeft = 0;
        el.scrollTop = 0;
        return true;
      }
      return false;
    },

    illust_scroll_bottom: function() {
      if (_.popup.can_scroll()) {
        var el = _.popup.dom.image_scroller;
        el.scrollLeft = el.scrollWidth;
        el.scrollTop = el.scrollHeight;
        return true;
      }
      return false;
    },

    illust_page_up: function() {
      return this.scroll(_.popup.dom.image_scroller, 2, -_.conf.popup.scroll_height_page);
    },

    illust_page_down: function() {
      return this.scroll(_.popup.dom.image_scroller, 2, _.conf.popup.scroll_height_page);
    },

    switch_resize_mode: function() {
      _.popup.resize_mode = _.popup.resize_mode_next;
      _.popup.adjust();

      if (_.popup.manga.active) {
        var page_data = _.popup.illust.manga.pages[_.popup.manga.page];
        if (page_data.filter(function(p){return !p.image_big;}).length >= 1) {
          if (_.popup.resize_mode === _.popup.RM_FIT_LONG) {
            _.popup.resize_mode = _.popup.RM_AUTO;
          }
          _.popup.status_loading();
          _.illust.load_manga_page(_.popup.illust, _.popup.manga.page, true);
        }
      } else {
        if (!_.popup.illust.image_big) {
          if (_.popup.resize_mode === _.popup.RM_FIT_LONG) {
            _.popup.resize_mode = _.popup.RM_AUTO;
          }
          _.popup.status_loading();
          _.illust.load(_.popup.illust, true);
        }
      }
      return true;
    },

    close: function() {
      _.popup.hide();
      return true;
    },

    open: function() {
      _.open(_.popup.illust.url_medium);
      return true;
    },

    open_big: function() {
      if (_.popup.illust.manga.available) {
        if (_.popup.manga.active) {
          _.popup.illust.manga.pages[_.popup.manga.page].forEach(function(p) {
            _.open(p.image_big
                   ? p.image_big.src
                   : (p.image_url_big_alt ? p.url_manga_big : p.image_url_big));
          });
        } else {
          _.open(_.popup.illust.url_manga);
        }
      } else {
        _.open(_.popup.illust.image_url_big);
      }
      return true;
    },

    open_profile: function() {
      _.open(_.popup.illust.url_author_profile);
      return true;
    },

    open_illust: function() {
      _.open(_.popup.illust.url_author_works);
      return true;
    },

    open_bookmark: function() {
      _.open(_.popup.illust.url_author_bookmarks);
      return true;
    },

    open_staccfeed: function() {
      _.open(_.popup.illust.url_author_staccfeed);
      return true;
    },

    open_response: function() {
      if (_.popup.illust.has_image_response) {
        _.open(_.popup.illust.url_response);
        return true;
      }

      if (_.popup.illust.image_response_to) {
        _.open(_.popup.illust.url_response_to);
      }

      return false;
    },

    open_bookmark_detail: function() {
      _.open(_.popup.illust.url_bookmark_detail);
      return true;
    },

    open_manga_thumbnail: function() {
      _.open(_.popup.illust.url_manga + '#pp-manga-thumbnail');
      return true;
    },

    reload: function() {
      _.popup.reload();
      return true;
    },

    caption_toggle: function() {
      _.popup.toggle_caption();
      return true;
    },

    comment_toggle: function() {
      _.popup.comment.toggle();
      return true;
    },

    // manga mode

    manga_start: function() {
      if (_.popup.illust.manga.available && !_.popup.manga.active) {
        _.popup.manga.start();
        return true;
      }
      return false;
    },

    manga_end: function() {
      if (_.popup.manga.active) {
        _.popup.manga.end();
        return true;
      }
      return false;
    },

    manga_open_page: function() {
      if (_.popup.manga.active) {
        var hash = '';
        if (_.popup.manga.active) {
          hash = '#pp-manga-page-' + _.popup.manga.page;
        }
        _.open(_.popup.illust.url_manga + hash);
        return true;
      }
      return false;
    },

    // question mode
    qrate_start: function() {
      if (!_.popup.question.is_active()) {
        _.popup.question.start();
        return true;
      }
      return false;
    },

    qrate_end: function() {
      if (_.popup.question.is_active()) {
        _.popup.question.end();
        return true;
      }
      return false;
    },

    qrate_submit: function() {
      if (_.popup.question.is_active()) {
        _.popup.question.submit();
        return true;
      }
      return false;
    },

    qrate_select_prev: function() {
      if (_.popup.question.is_active()) {
        _.popup.question.select_prev();
        return true;
      }
      return false;
    },

    qrate_select_next: function() {
      if (_.popup.question.is_active()) {
        _.popup.question.select_next();
        return true;
      }
      return false;
    },

    // bookmark mode

    bookmark_start: function() {
      _.popup.bookmark.start();
      return true;
    },

    bookmark_end: function() {
      if (_.popup.bookmark.active) {
        _.popup.bookmark.end();
        return true;
      }
      return false;
    },

    bookmark_submit: function() {
      if (_.popup.bookmark.active) {
        _.popup.bookmark.submit();
        return true;
      }
      return false;
    },

    // tag edit mode

    tag_edit_start: function() {
      if (!_.popup.tagedit.active) {
        _.popup.tagedit.start();
        return true;
      }
      return false;
    },

    tag_edit_end: function() {
      if (_.popup.tagedit.active) {
        _.popup.tagedit.end();
        return true;
      }
      return false;
    },

    // ugoira

    ugoira_play_pause: function() {
      return _.popup.ugoira_play_pause();
    },

    ugoira_prev_frame: function() {
      return _.popup.ugoira_prev_frame();
    },

    ugoira_next_frame: function() {
      return _.popup.ugoira_next_frame();
    }
  });

  _.popup.key = {
    keys: [
      'bookmark_submit',
      'bookmark_end',

      function() {
        return _.popup.bookmark.active;
      },

      'qrate_start',
      'qrate_end',
      'qrate_submit',
      'qrate_select_prev',
      'qrate_select_next',

      'manga_start',
      'manga_end',
      'manga_open_page',

      'tag_edit_start',
      'tag_edit_end',

      'ugoira_play_pause',
      'ugoira_prev_frame',
      'ugoira_next_frame',

      'illust_scroll_up',
      'illust_scroll_down',
      'illust_scroll_left',
      'illust_scroll_right',
      'illust_scroll_top',
      'illust_scroll_bottom',
      'illust_page_up',
      'illust_page_down',

      'prev',
      'next',
      'prev_direction',
      'next_direction',
      'first',
      'last',
      'caption_scroll_up',
      'caption_scroll_down',
      'switch_resize_mode',
      'close',

      'rate01',
      'rate02',
      'rate03',
      'rate04',
      'rate05',
      'rate06',
      'rate07',
      'rate08',
      'rate09',
      'rate10',

      'open',
      'open_big',
      'open_profile',
      'open_illust',
      'open_bookmark',
      'open_staccfeed',
      'open_response',
      'open_bookmark_detail',
      'open_manga_thumbnail',
      'bookmark_start',
      'reload',
      'caption_toggle',
      'comment_toggle'
    ],

    activate: function() {
      if (this.conn) {
        return;
      }

      var that = this;

      this.conn = _.key.listen_global(function(key, ev, connection) {
        if (!_.popup.running || !_.key_enabled(ev)) {
          return false;
        }

        var cancel = false;

        for(var i = 0; i < that.keys.length; ++i) {
          var item = that.keys[i];

          if (item instanceof g.Function) {
            if (item.call(_.popup.input)) {
              break;
            }
            continue;
          }

          if (_.conf.key['popup_' + item].split(',').indexOf(key) >= 0) {
            var action = _.popup.input[item];
            cancel = true;
            if (action.call(_.popup.input)) {
              break;
            }
          }
        }

        return cancel;
      });
    },

    inactivate: function() {
      if (this.conn) {
        this.conn.disconnect();
        this.conn = null;
      }
    }
  };

  _.popup.mouse = {
    init: function() {
      _.onwheel(w, function(ev) {
        if (!_.popup.running || _.conf.popup.mouse_wheel === 0) {
          return false;
        }

        var node = ev.target;
        while(node && node.nodeType === w.Node.ELEMENT_NODE) {
          if (node === d.body || node === d.documentElement) {
            break;
          }
          if (node.scrollHeight > node.offsetHeight) {
            return false;
          }
          node = node.parentNode;
        }

        var action;
        _.popup.input.wheel_delta += ev.wheelDelta || -ev.detail || 0;
        if (_.conf.popup.mouse_wheel_delta < 0) {
          if (_.popup.input.wheel_delta <= _.conf.popup.mouse_wheel_delta) {
            action = 'prev';
          } else if (_.popup.input.wheel_delta >= -_.conf.popup.mouse_wheel_delta) {
            action = 'next';
          }
        } else {
          if (_.popup.input.wheel_delta >= _.conf.popup.mouse_wheel_delta) {
            action = 'prev';
          } else if (_.popup.input.wheel_delta <= -_.conf.popup.mouse_wheel_delta) {
            action = 'next';
          }
        }
        if (action) {
          if (_.conf.popup.mouse_wheel === 1) {
            action += '_direction';
          }
          _.popup.input[action]();
          _.popup.input.wheel_delta = 0;
        }

        return true;
      });

      var dom = _.popup.dom;

      _.onclick(dom.resize_mode, function() {
        _.popup.input.switch_resize_mode();
        return true;
      });

      _.onclick(dom.button_bookmark, function() {
        _.popup.bookmark.toggle();
        return true;
      });

      _.onclick(dom.button_manga, function() {
        _.popup.manga.toggle();
        return true;
      });

      _.onclick(dom.image_wrapper, function() {
        _.popup.hide();
        return true;
      });

      _.onclick(dom.olc_prev, function() {
        _.popup.input.prev_direction();
        return true;
      });

      _.onclick(dom.olc_next, function() {
        _.popup.input.next_direction();
        return true;
      });

      _.onwheel(dom.image_scroller, function(ev) {

        /* Firefox
         *   MouseScrollEvent::axis
         *     HORIZONTAL_AXIS = 1
         *     VERTICAL_AXIS   = 2
         *
         * https://developer.mozilla.org/en/docs/DOM/MouseScrollEvent
         */

        if (((ev.wheelDeltaX || ev.axis === 1) && _.popup.can_scroll_horizontally()) ||
            ((ev.wheelDeltaY || ev.axis === 2) && _.popup.can_scroll_vertically())) {
          ev.stopPropagation();
        }
        return false;
      });

      _.onclick(dom.tagedit_wrapper, function(ev) {
        var endbtn = ev.target;
        if (/^input$/i.test(endbtn.tagName) && /endTagEdit/.test(endbtn.getAttribute('onclick'))) {
          _.popup.tagedit.end();
          return true;
        }
        return false;
      });

      _.onclick(dom.comment_form_btn, function() {
        _.popup.comment.toggle_form();
      });
    }
  };

  _.bookmarkform = {
    dom: {},

    calc_tag_rect: function(group, rect, grect) {
      if (!grect) {
        grect = group.getBoundingClientRect();
      }
      return {top:    rect.top    - grect.top  + group.scrollTop,
              bottom: rect.bottom - grect.top  + group.scrollTop,
              left:   rect.left   - grect.left + group.scrollLeft,
              right:  rect.right  - grect.left + group.scrollLeft};
    },

    select_tag: function(gidx, idx, rect) {
      if (this.sel.tag) {
        this.sel.tag.classList.remove('pp-tag-select');
      }

      if (gidx >= 0) {
        var group = this.dom.tag_groups[gidx][0];

        this.sel.gidx = gidx;
        this.sel.idx = idx;
        this.sel.tag = this.dom.tag_groups[gidx][1][idx];
        this.sel.rect = rect;

        if (!rect) {
          this.sel.rect = this.calc_tag_rect(group, this.sel.tag.getClientRects()[0]);
        }

        this.sel.tag.classList.add('pp-tag-select');
        _.lazy_scroll(this.sel.tag);

      } else {
        this.sel.tag  = null;
        this.sel.rect = null;
      }
    },

    autoinput_tag: function() {
      if (!this.dom.input_tag) {
        return;
      }

      var illust_tags = _.qa('.work-tags-container .tag[data-tag]', this.dom.root).map(function(tag) {
        return tag.dataset.tag;
      });

      var tags_value = [];

      var aliases = _.conf.bookmark.tag_aliases;
      _.qa('.tag-container.tag-cloud-container .tag[data-tag]').forEach(function(tage) {
        var tag = tage.dataset.tag, pattern;

        pattern = new g.RegExp([tag].concat(aliases[tag] || []).map(_.escape_regex).join('|'));

        for(var i = 0; i < illust_tags.length; ++i) {
          if (pattern.test(illust_tags[i])) {
            tags_value.push(tag);
            break;
          }
        }
      });

      this.dom.input_tag.value = tags_value.join(' ');
      try {
        w.pixiv.tag.update();
      } catch(ex) {
        _.error(ex);
      }
    },

    setup_tag_order: function() {
      var mytags = _.q('.tag-container.tag-cloud-container .list-items', this.dom.root);
      if (!mytags || _.conf.bookmark.tag_order.length < 1) {
        return;
      }

      _.reorder_tag_list(mytags, function(tag) {
        return tag.querySelector('.tag').dataset.tag;
      });

      var opt = _.q('.list-option.tag-order', this.dom.root);
      if (opt) {
        opt.parentNode.removeChild(opt);
      }
    },

    select_nearest_tag: function(key) {
      var that = this;

      var dom = this.dom,
          sel = this.sel;

      var gidx = sel.gidx, idx = sel.idx;
      if (key === 'Right') {
        if (idx >= dom.tag_groups[sel.gidx][1].length - 1) {
          if (gidx >= dom.tag_groups.length - 1) {
            gidx = 0;
          } else {
            ++gidx;
          }
          idx = 0;
        } else {
          ++idx;
        }
        this.select_tag(gidx, idx);
        return true;
      } else if (key === 'Left') {
        if (idx <= 0) {
          if (gidx <= 0) {
            gidx = dom.tag_groups.length - 1;
          } else {
            --gidx;
          }
          idx = dom.tag_groups[gidx][1].length - 1;
        } else {
          --idx;
        }
        this.select_tag(gidx, idx);
        return true;
      }

      var down = key === 'Down';
      if (!down && key !== 'Up') {
        return false;
      }

      var x = (sel.rect.left + sel.rect.right) / 2,
          t_top = {}, t_near = {}, t_bottom = {};

      var set = function(d, gidx, idx, rect, distance) {
        d.set      = true;
        d.gidx     = gidx;
        d.idx      = idx;
        d.rect     = rect;
        d.distance = distance;
      };

      dom.tag_groups.forEach(function(p, gidx) {
        var group = p[0], tags = p[1], grect;
        grect = group.getBoundingClientRect();

        tags.forEach(function(tag, idx) {
          if (tag === sel.tag) {
            return;
          }

          g.Array.prototype.map.call(tag.getClientRects(), function(r) {
            var rect, distance;
            rect = that.calc_tag_rect(group, r, grect);
            distance = g.Math.max(rect.left - x, x - rect.right);

            if (!t_top.set || gidx < t_top.gidx ||
                (gidx === t_top.gidx &&
                 (rect.bottom < t_top.rect.top ||
                  (rect.top < t_top.rect.bottom && distance < t_top.distance)))) {
              set(t_top, gidx, idx, rect, distance);
            }

            if (!t_bottom.set || gidx > t_bottom.gidx ||
                (gidx === t_bottom.gidx &&
                 (rect.top > t_bottom.rect.bottom ||
                  (rect.bottom > t_bottom.rect.top && distance < t_bottom.distance)))) {
              set(t_bottom, gidx, idx, rect, distance);
            }

            if (down) {
              if ((gidx > sel.gidx || (gidx === sel.gidx && rect.top > sel.rect.bottom)) &&
                  (!t_near.set || gidx < t_near.gidx ||
                   (gidx === t_near.gidx &&
                    (rect.bottom < t_near.rect.top ||
                     (rect.top < t_near.rect.bottom && distance < t_near.distance))))) {
                set(t_near, gidx, idx, rect, distance);
              }
            } else {
              if ((gidx < sel.gidx || (gidx === sel.gidx && rect.bottom < sel.rect.top)) &&
                  (!t_near.set || gidx > t_near.gidx ||
                   (gidx === t_near.gidx &&
                    (rect.top > t_near.rect.bottom ||
                     (rect.bottom > t_near.rect.top && distance < t_near.distance))))) {
                set(t_near, gidx, idx, rect, distance);
              }
            }
          });
        });
      });

      if (!t_near.set) {
        t_near = down ? t_top : t_bottom;
      }
      that.select_tag(t_near.gidx, t_near.idx, t_near.rect);
      return true;
    },

    onkey: function(key, ev) {
      if (!this.sel.tag) {
        if (key === 'Down') {
          this.select_tag(this.dom.tag_groups.length - 1, 0);
          return true;
        } else if (key === 'Escape') {
          this.dom.input_tag.blur();
          return true;
        }
        return false;
      }

      if (key === 'Space') {
        var tags = this.dom.input_tag.value.split(/\s+/),
            tag  = this.sel.tag.dataset.tag;
        if (tags.indexOf(tag) >= 0) {
          tags = tags.filter(function(t) {
            return t !== tag;
          });
        } else {
          tags.push(tag);
        }
        this.dom.input_tag.value = tags.join(' ');
        return true;

      } else if (key === 'Escape') {
        this.select_tag(-1);
        return true;
      }

      return this.select_nearest_tag(key);
    },

    setup_key: function() {
      var dom = this.dom;

      dom.tags = [];
      dom.tag_groups = [];
      dom.input_tag = _.q('input#input_tag', dom.root);

      _.qa('.tag-container', dom.root).forEach(function(g) {
        var tags = _.qa('.tag[data-tag]', g);
        if (tags.length) {
          dom.tags = dom.tags.concat(tags);
          dom.tag_groups.push([g, tags]);
        }
      });

      _.key.listen(dom.input_tag, this.onkey.bind(this));
      dom.input_tag.setAttribute('autocomplete', 'off');
    },

    setup_alias_ui: function() {
      var that = this;

      var root = this.dom.root;
      var first_tag_list = _.q('.work-tags-container', root);
      if (!first_tag_list) {
        return;
      }

      var starter = _.e('button', {text: _.lng.associate_tags,
                                   cls: 'pp-tag-association-toggle btn_type03',
                                   css: 'float:right'});
      first_tag_list.insertBefore(starter, first_tag_list.firstChild);

      var associate = function(tag1, tag2) {
        _.send_click(tag2);

        tag1 = tag1.dataset.tag;
        tag2 = tag2.dataset.tag;

        _.log('tag alias: ' + tag1 + ' => ' + tag2);

        var aliases = _.conf.bookmark.tag_aliases;
        if (!aliases[tag2]) {
          aliases[tag2] = [];
        }
        aliases[tag2].push(tag1);
        _.conf.bookmark.tag_aliases = aliases;
      };

      var tag1, tag2;

      var select = function(tag, button) {
        var first = that.dom.tag_groups[0][1].indexOf(tag) >= 0;

        if (first) {
          if (tag1) {
            tag1[1].classList.remove('pp-active');
          }
          tag1 = [tag, button];
          if (tag2) {
            associate(tag1[0], tag2[0]);
            end();
          } else {
            tag1[1].classList.add('pp-active');
          }

        } else {
          if (tag2) {
            tag2[1].classList.remove('pp-active');
          }
          tag2 = [tag, button];
          if (tag1) {
            associate(tag1[0], tag2[0]);
            end();
          } else {
            tag2[1].classList.add('pp-active');
          }
        }
      };

      this.dom.tag_groups.forEach(function(grp) {
        grp[1].forEach(function(tag) {
          var tag_t  = tag.dataset.tag,
              button = _.e('button', {cls: 'pp-tag-associate-button',
                                      text: tag_t, 'data-pp-tag': tag_t});
          tag.parentNode.insertBefore(button, tag.nextSibling);
          _.onclick(button, function() {
            select(tag, button);
            return true;
          });
        });
      });

      var start = function() {
        starter.textContent = _.lng.cancel;
        root.classList.add('pp-associate-tag');
        tag1 = tag2 = null;
      };

      var end = function() {
        starter.textContent = _.lng.associate_tags;
        root.classList.remove('pp-associate-tag');
      };

      _.onclick(starter, function() {
        if (root.classList.contains('pp-associate-tag')) {
          end();
        } else {
          start();
        }
        return true;
      });
    },

    adjust: function(width, height) {
      if (!this.dom.root) {
        return;
      }

      var min = 80;

      _.debug('Max height: ' + height);

      var lists = _.qa('.tag-container', this.dom.root), last;
      lists = g.Array.prototype.filter.call(lists, function(l) {
        if (l.scrollHeight > min) {
          return true;
        }
        l.style.maxHeight = 'none';
        return false;
      });

      if (lists.length <= 0) {
        return;
      }

      height -= lists.reduce(function(h, l) {
        return h - l.offsetHeight;
      }, this.dom.root.offsetHeight);

      if (height < min * lists.length) {
        height = min * lists.length;
      }

      _.debug('Lists height: ' + height);

      last = lists.pop();
      if (height - last.scrollHeight < min * lists.length) {
        last.style.maxHeight = (height - (min * lists.length)) + 'px';
        _.debug('Adjust last tag list: ' + last.style.maxHeight);
      } else {
        last.style.maxHeight = 'none';
      }
      height -= last.offsetHeight;

      height = g.Math.floor(height / lists.length);
      lists.forEach(function(l) {
        l.style.maxHeight = height + 'px';
        _.log('Adjust leading tag list: ' + l.style.maxHeight);
      });
    },

    submit: function() {
      this.options.submit();

      var that = this;
      _.xhr.post(this.dom.form, function() {
        that.options.success();
      }, function() {
        that.options.error();
      });

      _.qa('input[type="submit"]', this.dom.form).forEach(function(btn) {
        btn.value = _.lng.sending;
        btn.setAttribute('disabled', '');
      });
      return true;
    },

    setup: function(root, options) {
      if (!root) {
        return;
      }

      var form = _.q('form[action^="bookmark_add.php"]', root);
      if (!form) {
        _.error('bookmark: form not found');
        return;
      }

      this.dom.root = root;
      this.dom.form = form;

      this.options = options;

      this.sel = {
        tag:  null,
        rect: null
      };

      if (_.conf.general.bookmark_hide) {
        var hide_radio = _.q('.privacy input[name="restrict"][value="1"]', form);
        if (hide_radio) {
          hide_radio.checked = true;
        }
      }

      this.setup_tag_order(root);
      this.setup_key(root);
      this.setup_alias_ui(root);

      if (options.autoinput) {
        this.autoinput_tag();
      }

      form.setAttribute('action', '/bookmark_add.php');
      _.listen(form, 'submit', this.submit.bind(this));
    }
  };

  _.Floater = function(wrap, cont, ignore_elements) {
    this.wrap = wrap;
    this.cont = cont;
    this.floating = false;
    this.disable_float = false;
    this.disable_float_temp = false;
    this.use_placeholder = true;
    this.ignore_elements = ignore_elements || [];
    _.Floater.instances.push(this);
    if (_.Floater.initialized) {
      this.init();
    }
  };

  _.extend(_.Floater.prototype, {
    init: function() {
      this.wrap.style.boxSizing = 'border-box';
      this.wrap.style.webkitBoxSizing = 'border-box';
      this.wrap.style.MozBoxSizing = 'border-box';
      this.wrap.style.width = this.wrap.offsetWidth + 'px';
      if (this.cont) {
        this.cont.style.display = 'block';
        this.cont.style.overflowX = 'hidden';
        this.cont.style['overflow-x'] = 'hidden';
        this.cont.style.overflowY = 'auto';
        this.cont.style['overflow-y'] = 'auto';
      }
      this.update_height();
      this.update_float();
    },

    unfloat: function () {
      if (this.placeholder) {
        this.placeholder.parentNode.removeChild(this.placeholder);
        this.placeholder = null;
      }
      this.scroll_save();
      this.wrap.classList.remove('pp-float');
      this.scroll_restore();
      this.floating = false;
    },

    update_height: function () {
      this.disable_float_temp = false;
      if (this.cont) {
        var de = d.documentElement;
        var top = this.wrap.getBoundingClientRect().top;
        var mh = de.clientHeight - top - (this.wrap.offsetHeight - this.cont.offsetHeight);
        this.ignore_elements.forEach(function(elem) {
          mh += elem.offsetHeight;
        });
        if (mh < 60) {
          this.disable_float_temp = true;
          this.unfloat();
          this.cont.style.maxHeight = 'none';
          return;
        }
        this.cont.style.maxHeight = mh + 'px';
      }
    },

    update_float: function () {
      if (this.disable_float || this.disable_float_temp) {
        return;
      }
      var de = d.documentElement;
      var rect = (this.placeholder || this.wrap).getBoundingClientRect();
      if (!this.floating && rect.top < 0) {
        this.scroll_save();
        if (this.use_placeholder) {
          this.placeholder = this.wrap.cloneNode(false);
          this.placeholder.style.width = this.wrap.offsetWidth + 'px';
          this.placeholder.style.height = this.wrap.offsetHeight + 'px';
          this.wrap.parentNode.insertBefore(this.placeholder, this.wrap);
        }
        this.wrap.classList.add('pp-float');
        if (this.use_placeholder) {
          this.placeholder.style.height
            = Math.min(this.wrap.offsetHeight, de.clientHeight) + 'px';
        }
        this.scroll_restore();
        this.floating = true;
      } else if (this.floating && rect.top > 0) {
        this.unfloat();
      }
      this.update_height();
    },

    scroll_save: function () {
      if (this.cont) {
        this.scroll_pos = this.cont.scrollTop;
      }
    },

    scroll_restore: function () {
      if (this.cont) {
        this.cont.scrollTop = this.scroll_pos;
      }
    },

    add_ignore_element: function(elem) {
      this.ignore_elements.push(elem);
    }
  });

  _.extend(_.Floater, {
    instances: [],
    initialized: false,

    init: function() {
      if (_.Floater.initialized) {
        return;
      }
      _.Floater.instances.forEach(function(inst) {
        inst.init();
      });

      _.listen(w, 'scroll', _.Floater.update_float.bind(_.Floater), {async: true});
      _.listen(w, 'resize', _.Floater.update_height.bind(_.Floater), {async: true});
      _.Floater.initialized = true;
    },

    auto_run: function(func) {
      if (_.conf.general.float_tag_list === 0) {
        return;
      }

      func();
    },

    update_float: function() {
      _.Floater.instances.forEach(function(inst) {
        inst.update_float();
      });
    },

    update_height: function() {
      _.Floater.instances.forEach(function(inst) {
        inst.update_height();
      });
    }
  });

  _.pages = {
    run: function() {
      var re;
      re = /^\/(\w+)\./.exec(w.location.pathname);
      if (re && this[re[1]]) {
        this[re[1]].run(_.parse_query(w.location.search));
      }
    },

    fast_user_bookmark: function() {
      var favorite_button = _.q('.profile-unit .user-relation #favorite-button');
      if (!favorite_button) {
        _.warn('fast_user_bookmark: favorite-button not found');
        return;
      }

      _.onclick(favorite_button, function() {
        if (favorite_button.classList.contains('following') ||
            _.conf.general.fast_user_bookmark <= 0) {
          return;
        }

        g.setTimeout(function() {
          var dialog = _.q('.profile-unit .user-relation #favorite-preference');
          if (!dialog) {
            _.error('fast_user_bookmark: favorite-preference not found');
            return;
          }

          var form = _.q('form', dialog);
          if (!form) {
            _.error('fast_user_bookmark: form not found');
            return;
          }

          var restrict = _.conf.general.fast_user_bookmark - 1,
              radio    = _.q('input[name="restrict"][value="' + restrict + '"]', form);

          if (!radio) {
            _.error('fast_user_bookmark: restrict input not found');
            return;
          }

          radio.checked = true;
          _.xhr.post(form, function() {
            favorite_button.classList.add('following');
          });
          _.send_click(_.q('.close', dialog));
        }, 10);
      });
    },

    member: {
      run: function(query) {
        _.pages.fast_user_bookmark();
      }
    },

    member_illust: {
      run: function(query) {
        this.manga_thumbnail(query);
        this.manga_medium(query);
        _.pages.fast_user_bookmark();
      },

      manga_thumbnail: function() {
        var re;
        if (w.location.hash === '#pp-manga-thumbnail') {
          var toggle_thumbnail = _.q('.toggle-thumbnail');
          _.send_click(toggle_thumbnail);
        } else if ((re = /^#pp-manga-page-(\d+)$/.exec(w.location.hash))) {
          try {
            w.pixiv.mangaViewer.listView.move(g.parseInt(re[1], 10));
          } catch(ex) {
            _.error(ex);
          }
        }
      },

      manga_medium: function(query) {
        if (query.mode !== 'medium' || !query.illust_id) {
          return;
        }

        _.modify_caption(_.q('.work-info .caption'));

        if (_.conf.popup.manga_page_action) {
          var manga = _.q('.works_display a[href*="mode=manga"]');
          if (manga) {
            var illust = _.illust.create(
              manga,
              ['_m'],
              function() {
                if (_.conf.popup.manga_page_action === 2) {
                  _.popup.manga.start();
                }
              }
            );

            if (_.conf.popup.preload) {
              _.illust.load(illust);
            }
          }
        }
      }
    },

    bookmark: {
      run: function(query) {
        this.float_tag_list(query);
      },

      float_tag_list: function(query) {
        var bookmark_list, bookmark_list_ul;
        if (_.conf.bookmark.tag_order.length < 1 ||
            query.id ||
            !(bookmark_list = _.q('#bookmark_list')) ||
            !(bookmark_list_ul = _.q('ul', bookmark_list))) {
          return;
        }

        bookmark_list.classList.add('pp-bookmark-tag-list');

        var first_list, items = _.qa('li', bookmark_list_ul);
        first_list = bookmark_list_ul.cloneNode(false);
        items[0].parentNode.removeChild(items[0]);
        items[1].parentNode.removeChild(items[1]);
        first_list.appendChild(items[0]);
        first_list.appendChild(items[1]);
        bookmark_list_ul.parentNode.insertBefore(first_list, bookmark_list_ul);

        var lists = _.reorder_tag_list(bookmark_list_ul, function(item) {
          var a = _.q('a', item);
          if (!a || !a.firstChild || a.firstChild.nodeType !== w.Node.TEXT_NODE) {
            return null;
          }
          return a.firstChild.nodeValue;
        });

        if (!first_list) {
          first_list = lists[0];
        }

        try {
          var _bookmarkToggle = w.bookmarkToggle;
          w.bookmarkToggle = function() {
            _bookmarkToggle.apply(this, arguments);
            lists.forEach(function(list) {
              list.className = first_list.className;
            });
          };

          if (!first_list.classList.contains('tagCloud')) {
            w.bookmarkToggle('bookmark_list', 'cloud');
            w.bookmarkToggle('bookmark_list', 'flat');
          }
        } catch(ex) {
          _.error(ex);
        }

      }
    },

    search: {
      run: function(query) {
        var that = this;
        ['size', 'ratio'].forEach(function(name) {
          var inputs = _.qa('#search-option ul>li>label>input[name="' + name + '"]');
          if (!inputs.length) {
            return;
          }

          var ul = inputs[0].parentNode.parentNode.parentNode;

          var li    = _.e('li', {id: 'pp-search-' + name + '-custom'}, ul),
              radio = _.e('input', {type: 'radio', name: name}, _.e('label', null, li)),
              curr  = inputs.filter(function(i){return i.checked;})[0];

          if (!curr) {
            radio.checked = true;
          }

          inputs.push(radio);
          that[name](query, ul, li, radio, inputs);
        });

        this.set_default_options(query);
      },

      set_default_options: function(query) {
        var keys = ['s_mode', 'order', 'scd',
                    'wlt', 'hlt', 'wgt', 'hgt',
                    'ratio', 'r18'];

        var form = _.q('.header form[action="/search.php"]');

        keys.forEach(function(key) {
          if (!query.hasOwnProperty(key)) {
            return;
          }

          var input = _.q('input[name="' + key + '"]', form);
          if (!input) {
            input = _.e('input', {type: 'hidden', name: key}, form);
          }
          input.value = query[key];
        });

        _.qa('.column-related .tag a[href^="/search.php?"]').forEach(function(tag) {
          var params = _.parse_query(tag.href);

          keys.forEach(function(key) {
            if (query.hasOwnProperty(key)) {
              params[key] = query[key];
            }
          });

          tag.href = '/search.php?' + _.xhr.serialize(params);
        });
      },

      size: function(query, ul, li, radio, inputs) {
        w.pixiv.search.parseSizeOption = function(value) {
          var size = (value || '').split('-', 2).map(function(p) {
            return p.split('x');
          });

          var min = size[0] || [],
              max = size[1] || [],
              wlt = min[0] || null,
              hlt = min[1] || null,
              wgt = max[0] || null,
              hgt = max[1] || null;

          return {wlt: wlt, hlt: hlt, wgt: wgt, hgt: hgt};
        };

        var e = ['wlt', 'hlt', 'wgt', 'hgt'].map(function(n) {
          return _.e('input', {
            id: 'pp-search-size-custom-' + n,
            type: 'text',
            cls: '_ui-tooltip',
            'data-tooltip': _.lng['search_' + n]
          }, li);
        });

        var wlt = e[0], hlt = e[1], wgt = e[2], hgt = e[3];

        [[hlt, 'x'], [wgt, '-'], [hgt, 'x']].forEach(function(p) {
          p[0].parentNode.insertBefore(d.createTextNode(p[1]), p[0]);
        });

        var update = function() {
          radio.value = wlt.value + 'x' + hlt.value + '-' + wgt.value + 'x' + hgt.value;
        };

        wlt.value = query.wlt || '';
        hlt.value = query.hlt || '';
        wgt.value = query.wgt || '';
        hgt.value = query.hgt || '';
        update();

        _.listen([wlt, hlt, wgt, hgt], 'input', function() {
          update();
          radio.checked = true;
        });
      },

      ratio: function(query, ul, li, radio, inputs) {
        var min = -1.5, max = 1.5;
        var slider  = _.ui.slider(min, max, 0.01, {id: 'pp-search-ratio-custom-slider'});
        li.appendChild(slider);

        var input   = _.e('input', {type: 'text', id: 'pp-search-ratio-custom-text'}, li),
            preview = _.e('div', {id: 'pp-search-ratio-custom-preview'}, li),
            pbox    = _.e('div', null, preview);

        _.listen(inputs, 'change', function() {
          preview.classList[radio.checked ? 'remove' : 'add']('pp-hide');
        });

        var update = function(ratio, set) {
          if (typeof(ratio) !== 'number') {
            return;
          }

          var width = 80, height = 80;

          // ratio = (width - height) / min(width, height)
          if (ratio > 0) {
            // landscape
            height = width / (ratio + 1);
          } else {
            // portrait
            width = height / (1 - ratio);
          }

          preview.style.marginLeft = slider.offsetLeft + 'px';

          var pos = g.Math.max(0, g.Math.min((ratio - min) / (max - min), 1)) * slider.clientWidth;
          pbox.style.width = width + 'px';
          pbox.style.height = height + 'px';
          pbox.style.marginLeft = pos - g.Math.floor(width / 2) + 'px';

          radio.value = ratio;
        };

        update(g.parseFloat(query.ratio));
        slider.set_value(input.value = query.ratio || '0');

        _.listen(slider, ['change', 'input'], function() {
          update(g.parseFloat(slider.value));
          input.value = slider.value;
          radio.checked = true;
        });

        _.listen(input, 'input', function() {
          update(g.parseFloat(input.value));
          slider.set_value(input.value);
          radio.checked = true;
        });
      }
    }
  };

  _.config_button = {
    init: function() {
      var found = false;

      for(var i = 0; i < this.buttons.length; ++i) {
        var btn = this.buttons[i];
        var container = _.q(btn.container);
        if (container) {
          found = true;
          this.button = btn;
          btn.func(container);
          break;
        }
      }

      if (!found) {
        this.button = this.fallback;
        this.fallback.func();
      }

      var that = this;
      _.listen(w, 'hashchange', function() {
        if (w.location.hash === '#pp-config') {
          that.button.show();
        }
      });
    },

    buttons: [

      {
        container: 'body>header .layout-wrapper>.notifications',
        func: function(container) {
          var li  = _.e('li', {id: 'pp-config-btn1-wrapper'}, container),
              btn = _.e('span', {id: 'pp-config-btn1'}, li);
          _.onclick(btn, this.show.bind(this));
          _.configui.init(li, btn);
        },
        show: function() {
          _.configui.show();
          _.modal.begin(_.configui.dom.root, {
            onclose: _.configui.hide.bind(_.configui)
          });
        }
      }

      // new
      // , {
      //   container: '._header .notification-container>ul',
      //   func: function(container) {
      //     var li  = _.e('li', {id: 'pp-config-btn2-wrapper'}, container),
      //         btn = _.e('a', {href: '#pp-config'}, li);
      //     _.e('i', {id: 'pp-config-btn2', cls: '_icon'}, btn);
      //     _.onclick(btn, this.show.bind(this));
      //     _.configui.init(li, btn);
      //   },
      //   show: function() {
      //     _.configui.show();
      //     _.modal.begin(_.configui.root, {
      //       onclose: _.configui.hide.bind(_.configui),
      //       centerize: 'horizontal'
      //     });
      //   }
      // }

    ],

    fallback: {
      func: function() {
        var wrapper = _.e('div', {id: 'pp-config-btn-fallback-wrapper'}, d.body);
        var btn = _.e('div', {id: 'pp-config-btn-fallback'}, wrapper);
        _.onclick(btn, this.show.bind(this));
        _.configui.init(wrapper, btn);
      },
      show: function() {
        _.configui.show();
        _.modal.begin(_.configui.dom.root, {
          onclose: _.configui.hide.bind(_.configui),
          centerize: 'both'
        });
      }
    }
  };

  _.setup_ready = function() {
    _.i18n.setup();
    _.redirect_jump_page();
    _.config_button.init();

    if (_.conf.general.bookmark_hide) {
      _.qa('a[href*="bookmark.php"]').forEach(function(link) {
        var re;
        if ((re = /^(?:(?:http:\/\/www\.pixiv\.net)?\/)?bookmark\.php(\?.*)?$/.exec(link.href))) {
          if (re[1]) {
            var query = _.parse_query(re[1]);
            if (!query.id && !query.rest) {
              link.href += '&rest=hide';
            }
          } else {
            link.href += '?rest=hide';
          }
        }
      });
    }

    _.pages.run(_.parse_query(w.location.search));

    _.Floater.auto_run(function() {
      var wrap = _.q('.ui-layout-west');
      if (!wrap) {
        return;
      }
      var tag_list = _.q('#bookmark_list, .tagCloud', wrap);
      if (!tag_list) {
        return;
      }

      new _.Floater(wrap, tag_list, _.qa('#touch_introduction', wrap));
    });

    if (_.conf.general.disable_effect) {
      try {
        w.jQuery.fx.off = true;
      } catch(ex) {
        _.error(ex);
      }
    }

    try {
      var rate_apply = w.pixiv.rating.apply, waiting_confirmation;
      w.pixiv.rating.apply = function() {
        if (waiting_confirmation) { // workaround for chromium
          return;
        }

        var msg = _.lng.rate_confirm.replace('$point', String(w.pixiv.rating.rate));
        var rate = w.pixiv.rating.rate; // workaround for firefox

        if (_.conf.general.rate_confirm) {
          waiting_confirmation = true; // workaround for chromium
          var confirmed = w.confirm(msg);
          waiting_confirmation = false; // workaround for chromium
          if (!confirmed) {
            _.debug('rating cancelled');
            return;
          }
        }

        _.debug('send rating');
        w.pixiv.rating.rate = rate; // workaround for firefox
        rate_apply.apply(w.pixiv.rating, arguments);
        _.illust.unload(_.popup.illust);
      };
    } catch(ex) {
      _.error('Failed to setup filter of pixiv.rating.apply', ex);
    }

    try {
      var req = w.pixiv.api.request;
      w.pixiv.api.request = function() {
        var args = g.Array.prototype.slice.call(arguments);
        _.debug('pixiv.api.request', args[1]);
        if (/^(?:\.\/)?(?:rpc_tag_edit\.php|rpc_rating\.php)(?:\?|$)/.test(args[1])) {
          args[1] = '/' + args[1];
        }
        return req.apply(this, args);
      };
    } catch(ex) {
      _.error('Failed to setup filter of pixiv.api.request', ex);
    }
  };

  _.run = function() {
    if (_extension_data) {
      var config_set_data = _.e('div', {css: 'display:none'}, d.documentElement);

      _.conf.__init({
        get: function(section, item) {
          return _extension_data.conf[_.conf.__key(section, item)] || null;
        },

        set: function(section, item, value) {
          _extension_data.conf[_.conf.__key(section, item)] = value;

          var ev = d.createEvent('Event');
          ev.initEvent('pixplusConfigSet', true, true);
          config_set_data.setAttribute('data-pp-section', section);
          config_set_data.setAttribute('data-pp-item',    item);
          config_set_data.setAttribute('data-pp-value',   value);
          config_set_data.dispatchEvent(ev);
        }
      });
    } else {
      _.conf.__init(_.conf.__wrap_storage(g.localStorage));
    }

    if (_.conf.general.redirect_jump_page === 1 && w.location.pathname === '/jump.php') {
      w.location.href = g.decodeURIComponent(w.location.search.substring(1));
      return;
    }

    _.i18n.setup();
    _.key.init();

    _.e('style', {text: _.css}, d.documentElement);

    _.illust.setup(d.documentElement);

    _.Floater.init();
    w.addEventListener('load', _.Floater.update_height.bind(_.Floater), false);

    if (/^(?:uninitialized|loading)$/.test(d.readyState)) {
      w.addEventListener('DOMContentLoaded', _.setup_ready, false);
    } else {
      _.setup_ready();
    }
  };

  /* __DATA_BEGIN__ */

  _.css = '\
.pp-hide{display:none}\
.pp-sprite{background-image:url("http://source.pixiv.net/source/images/sprite-2nd.png?20120528")}\
input.pp-flat-input{border:none}\
input.pp-flat-input:not(:hover):not(:focus){background:transparent}\
\
/* ui */\
.pp-slider{display:inline-block;vertical-align:middle;padding:7px 4px}\
.pp-slider-rail{position:relative;width:160px;height:2px;background-color:#aaa}\
.pp-slider-knob{position:absolute;border:1px outset #ddd;background-color:#ccc;\
width:6px;height:14px;margin:-7px -4px}\
.pp-slider.pp-debug{outline:1px solid rgba(255,0,0,0.5)}\
.pp-slider.pp-debug .pp-slider-rail{background-color:#0f0}\
.pp-slider.pp-debug .pp-slider-knob{border:1px solid #f0f;background-color:#00f;opacity:0.5}\
.pp-popup-menu{position:fixed;background-color:#fff;border:1px solid #aaa;\
border-radius:3px;padding:3px 0px;z-index:30000;white-space:pre}\
.pp-popup-menu-item:hover{background-color:#ddd}\
.pp-popup-menu-item>label,.pp-popup-menu-item>a{display:block;padding:0.3em 0.6em;\
color:inherit;text-decoration:none}\
.pp-popup-menu-item input[type="checkbox"]{border:1px solid #aaa;cursor:pointer}\
.pp-dialog{position:absolute;z-index:10000;background-color:#fff;\
border:1px solid #d6dee5;border-radius:5px}\
.pp-dialog-title{background-color:#d6dee5;border-radius:3px 3px 0px 0px;\
padding:0.2em 0.4em;text-align:center;font-weight:bold}\
\
/* popup */\
#pp-popup{position:fixed;border:2px solid #aaa;background-color:#fff;padding:0.2em;z-index:20000}\
#pp-popup-title a{font-size:120%;font-weight:bold;line-height:1em}\
#pp-popup-rightbox{float:right;font-size:80%}\
#pp-popup-rightbox a{margin-left:0.2em;font-weight:bold}\
#pp-popup-rightbox a.pp-active{color:#888;font-weight:normal}\
#pp-popup-button-resize-mode{cursor:pointer}\
#pp-popup-status{color:#888}\
#pp-popup.pp-error #pp-popup-status{color:#a00;font-weight:bold}\
#pp-popup-ugoira-status{opacity:0.4}\
#pp-popup:not(.pp-ugoira) #pp-popup-ugoira-status{display:none}\
#pp-popup-ugoira-status svg{display:inline-block;vertical-align:middle;cursor:pointer;width:1em;height:1em}\
#pp-popup:not(.pp-ugoira-playing) #pp-popup-ugoira-playing{display:none}\
#pp-popup:not(.pp-ugoira-paused) #pp-popup-ugoira-paused{display:none}\
#pp-popup-header{position:absolute;left:0px;right:0px;padding:0px 0.2em;\
background-color:#fff;line-height:1.1em;z-index:20001}\
#pp-popup-header:not(.pp-show):not(:hover){opacity:0 !important}\
.pp-popup-separator{border-top:1px solid #aaa;margin-top:0.1em;padding-top:0.1em}\
#pp-popup-caption-wrapper{overflow-y:auto}\
#pp-popup:not(.pp-comment-mode) #pp-popup-comment-wrapper{display:none}\
#pp-popup-comment-toolbar{margin:0.4em 1em 0px 1em}\
.pp-popup-comment-btn{cursor:pointer;border:1px solid transparent;border-radius:3px;opacity:0.2;\
padding:14px;background-repeat:no-repeat;background-position:center}\
.pp-popup-comment-btn:hover{border-color:#000}\
.pp-popup-comment-btn:focus:not(:hover):not(:active):not(.pp-active){border:1px dashed #000;}\
.pp-popup-comment-btn:active,.pp-popup-comment-btn.pp-active{opacity:0.4;border-color:#000}\
#pp-popup-comment-form-btn{/* __SUBST_FILE_CSS__(temp/icons/pencil.txt) */background-image:url("\
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/w\
D/AP+gvaeTAAAA7ElEQVRIid3UO0pDQRQG4E8UcQkSECzdgfhIIkYEwccKbFxJCht34B6sLdQN2FhZuA\
bBwiI3CgqxuFMMQbk5ublFPDAwc2C+fxiGYQ6qi06T+CCN9qzxYxQYpTHAQVN4HtKri5/8gc8kZL8Cz0\
N2ongvbazCR/jAYQQ/xXBCfIjducVD994oftYk3gnghfLphuoGdxOePIwv4x2r6FecfDuKwx6esvVvIV\
PjcIXLsV4eUmBrWhxecD3WW8NtwrtRcCmbt7CODazgFUepf6/8ix6jAXld4AufeFZezSYW66AL2fwc33\
jAWx30f9UPLzudHbC4MwgAAAAASUVORK5CYII=\
")/* __SUBST_FILE_CSS_END__ */}\
#pp-popup.pp-show-comment-form #pp-popup-comment-form-btn{\
/* __SUBST_FILE_CSS__(temp/icons/pencil_off.txt) */background-image:url("\
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/w\
D/AP+gvaeTAAABXElEQVRIid3UPU4cQRAF4A9hkcAJkHwOfszPCkNm8AlIuITTCRxASoDIgIQAEzghQC\
SWiEnsgMg3QCJhbSQs1sH2olarp7cXkcCTWqPqefVe1XRN8wqwjKVa8pewRhG/C2txGLlBL6ymQvwTul\
HOHVZLCdsRuafcSSoem3wsmTRJQpPhrLeIv4jJMPHYZAXGMwY/MIZOiDshHscpJkvVBTziBL9LpPhMzn\
FQUXkPf7BWUQT6n+c7JqJ4mPhCrTj9sdstdJaKF8c0xUZIyk1TkxH/MIr450i8bWQHJiOLL2kfxfTnOx\
LGcRR805+atoMcmEzhUt218oR3uMW09sPsYS8povqC7OAqipuMeBfzmXdVnezga7IXC3UxVyhgqMk19p\
O99zgL4suZnGqTafwNpEP9bn7iBseYLRRWZbKFB9zjVyDNyF+IOcRDsT3YHIsIm/iHi1D1c9AkzzeA/9\
UUrxx8HheFAAAAAElFTkSuQmCC\
")/* __SUBST_FILE_CSS_END__ */}\
#pp-popup-comment-config-btn{\
/* __SUBST_FILE_CSS__(temp/icons/cogwheel.txt) */background-image:url("\
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/w\
D/AP+gvaeTAAAA8ElEQVRIidWVzQ3CMAyFvwBbcGAP6ARIFYgiGAHYhzIEZZUi9igToCpwaCJVVX6Leu\
iTfImen+3YcWDsEBHcbx/fieV8CiQRwRPlE4QZ8AAkcAa2wJOmgraVQApcFLdQvl7xwiAWandfkBVQ/x\
GgBpa+Kvaq5FhxCWRdMVOTJXHTpSGATwjxZcmwAk7KKgundAm7yq8M/LfHJyrAwcA/hgSwPbQupOEsuk\
+DX5GGq8mpsl5N1th4MnPZuitm6sE8JAsLFj7C4KtCAHnLIWRltDlXAqZLADeaZ7/Dv64zxc1DxDVMH4\
5rDK0fzuBf5vjxA4xDxUUbDZuFAAAAAElFTkSuQmCC\
")/* __SUBST_FILE_CSS_END__ */}\
#pp-popup:not(.pp-show-comment-form) #pp-popup-comment>._comment-item:first-child{display:none}\
#pp-popup-comment .comment.header form{background-color:#fff;margin-bottom:1em;width:100%}\
#pp-popup-comment .comment.header::before{display:none}\
#pp-popup-comment .comment.header::after{display:none}\
#pp-popup-comment ._comment-items ._no-item{\
margin:0px 0px 0px 1em;color:inherit;background-color:transparent;text-align:left}\
#pp-popup.pp-hide-stamp-comments .pp-stamp-comment{display:none}\
#pp-popup.pp-hide-stamp-comments .sticker-container{display:none}\
#pp-popup-taglist{margin:0px;padding:0px;background:none}\
#pp-popup-taglist ul{display:inline}\
#pp-popup-taglist li{display:inline;margin:0px 0.6em 0px 0px;padding:0px;\
border:0px;box-shadow:none;background:none}\
#pp-popup-taglist .no-item{color:#aaa;margin-right:0.6em}\
#pp-popup-taglist.pp-no-pixpedia a[href^="http://dic.pixiv.net/"]{display:none}\
#pp-popup-taglist.pp-no-pixiv-comic a[href^="http://comic.pixiv.net/"]{display:none}\
#pp-popup-taglist.pp-no-booth a[href^="https://booth.pm/"]{display:none}\
#pp-popup-rating *{margin:0px;padding:0px}\
#pp-popup-rating .score dl{display:inline}\
#pp-popup-rating .score dt{display:inline;margin-right:0.2em}\
#pp-popup-rating .score dd{display:inline;margin-right:0.6em}\
#pp-popup-rating .questionnaire{text-align:inherit}\
#pp-popup-info{padding-bottom:0.1em}\
#pp-popup-author-image{max-height:3.2em;float:left;border:1px solid #aaa;margin-right:0.2em}\
#pp-popup-author-image:hover{max-height:none}\
#pp-popup-author-status{position:absolute;left:2px;margin:2px}\
#pp-popup-author-status:not(.pp-hide){display:inline-block}\
#pp-popup-author-status.pp-fav{width:14px;height:14px;background-position:-200px -320px}\
#pp-popup-author-status.pp-fav-m{width:16px;height:14px;background-position:-200px -480px}\
#pp-popup-author-status.pp-mypix{width:14px;height:16px;background-position:0px -360px}\
#pp-popup-author-image:hover~#pp-popup-author-status{display:none}\
#pp-popup-tools:empty{display:none}\
#pp-popup-tools{margin-left:0.6em}\
#pp-popup-tools a+a{margin-left:0.6em}\
#pp-popup-ugoira-info{margin-left:0.6em}\
#pp-popup:not(.pp-ugoira) #pp-popup-ugoira-info{display:none}\
#pp-popup-author-links a{margin-right:0.6em;font-weight:bold}\
#pp-popup-image-wrapper{line-height:0;border:1px solid #aaa;position:relative}\
#pp-popup-image-scroller{min-width:480px;min-height:360px}\
#pp-popup-image-layout{display:inline-block}\
#pp-popup-image-layout img{vertical-align:top}\
.pp-popup-olc{position:absolute;cursor:pointer;opacity:0;top:0px;height:100%;line-height:0px}\
.pp-popup-olc.pp-active:hover{opacity:0.6}\
.pp-popup-olc svg{position:relative}\
.pp-popup-olc svg path{fill:#ddd;stroke:#222;stroke-width:10;stroke-linejoin:round}\
#pp-popup-olc-prev{left:0px}\
#pp-popup-olc-next svg{transform:matrix(-1,0,0,1,0,0);-webkit-transform:matrix(-1,0,0,1,0,0)}\
#pp-popup-multipage-icon{position:absolute;opacity:.8}\
#pp-popup:not(.pp-frontpage-new) #pp-popup-multipage-icon{display:none}\
#pp-popup-multipage-icon{right:0px;bottom:0px;\
fill:url(#pp-popup-multipage-icon-grad)}\
\
/* bookmark */\
#pp-popup-bookmark-wrapper{display:none;border:1px solid #aaa}\
#pp-popup.pp-bookmark-mode #pp-popup-header{display:none}\
#pp-popup.pp-bookmark-mode #pp-popup-image-wrapper{display:none}\
#pp-popup.pp-bookmark-mode .pp-popup-olc{display:none}\
#pp-popup.pp-bookmark-mode #pp-popup-bookmark-wrapper{display:block}\
\
#pp-popup-bookmark-wrapper .layout-body{margin:0px;border:none}\
#pp-popup-bookmark-wrapper .bookmark-detail-unit{border-radius:0px;border:none}\
#pp-popup-bookmark-wrapper .bookmark-list-unit{border-radius:0px;border:none;margin:0px}\
#pp-popup-bookmark-wrapper .tag-container{overflow-y:auto}\
#pp-popup-bookmark-wrapper .list-container+.list-container{margin-top:0px}\
#pp-popup-bookmark-wrapper ._list-unit{padding-top:4px;padding-bottom:4px}\
#pp-popup-bookmark-wrapper .tag-cloud{padding:4px !important}\
\
#pp-popup-bookmark-wrapper iframe{width:100%;height:100%;border:none}\
.pp-bookmark-iframe{overflow:auto}\
.pp-bookmark-iframe>body>*:not(#wrapper){display:none}\
.pp-bookmark-iframe #wrapper>*:not(.layout-body){display:none}\
.pp-bookmark-iframe #wrapper{margin:0px}\
.pp-bookmark-iframe #wrapper .layout-body{margin:0px}\
.pp-bookmark-iframe #wrapper ._unit{margin-bottom:0px;border:none}\
.pp-bookmark-iframe .bookmark-detail-unit{border-radius:0px}\
.pp-bookmark-iframe .bookmark-list-unit{border-radius:0px}\
.pp-bookmark-iframe .tag-container{overflow-y:auto}\
.pp-bookmark-iframe .list-container+.list-container{margin-top:0px}\
.pp-bookmark-iframe ._list-unit{padding-top:4px;padding-bottom:4px}\
.pp-bookmark-iframe .tag-cloud{padding:4px !important}\
\
.pp-tag-select{outline:2px solid #0f0}\
.pp-tag-link{outline:2px solid #f00}\
.pp-tag-associate-button{display:none;background-color:#eee;margin-right:0.2em;\
border:1px solid #bbb;border-radius:0.4em;padding:0px 0.4em;color:#000}\
.pp-tag-associate-button.pp-active{background-color:#aaa}\
.pp-tag-associate-button:hover{background-color:#ddd}\
.pp-associate-tag .tag-container .list-items .tag{display:none}\
.pp-associate-tag .pp-tag-associate-button{display:inline}\
\
/* tagedit */\
#pp-popup-tagedit-button{color:#888;font-size:90%}\
#pp-popup-tagedit-wrapper{display:none;font-size:12px}\
#pp-popup.pp-tagedit-mode #pp-popup-header{display:none}\
#pp-popup.pp-tagedit-mode #pp-popup-image-wrapper{display:none}\
#pp-popup.pp-tagedit-mode .pp-popup-olc{display:none}\
#pp-popup.pp-tagedit-mode #pp-popup-tagedit-wrapper{display:block}\
#pp-popup-tagedit-wrapper #tag-editor>div{margin:0px !important}\
#pp-popup-tagedit-table-wrapper{overflow:auto}\
\
/* config ui */\
#pp-config-btn1{border-radius:5px;margin-left:2px;cursor:pointer;\
display:inline-block;padding:24px 0px 0px 34px;vertical-align:top;\
border:3px solid #f2f4f6;\
background:#f2f4f6 url("data:image/png;base64,\
iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAABmJLR0QA/wD/AP+gvaeTAAACXklE\
QVQ4jbWUz0tUURTHP+c+0aQWWljmNpxmspJo0UabmUUEVqYzwxAt+gfatCkiAoWIaNvGXZibwmZC\
oU20eE0pbopIqRnNjKgkQewXCVb3nRa+kRlxHB3orM75nns/fO+57134TyHrNYdHck3Wo1OVCHAI\
2A44CD9EmfbAFWPuxtsDMxsCp55mj4vKJSACmDLmLJCynr2QjLZ8WRM8OJLb61j6gGiBPIPIPVVG\
HePNqaXaMzSJSgxIANX+unlR7YxFQmMrYNd1qxZM41WQy0DNClLlfCwc6BMRXcvqUCZ7wCIpIOBL\
39SxbYm2ltdm4NGrrQumcQikpwgKYORDKShAVzg0IUZPAb98qU6sc8d13SqzbUvNMMgJv/G5FKRU\
xNpDU6jcKpAOLzi7u4wKswCCvkGle7NgAHG8/iJBOWOwzhVgUVXSqvysBNzdFnwLLBZI+0w82vzJ\
wv7aRed6JVAA/x7mCqQdBiAZDr7v6GheqhQMIEqqoPxYVSkoncn2+l+SRcxpQVOqehEAlYlyf9V6\
Hhv8xFH1dlk1f/IdY+ir2PHqSISbXwLy8Nl4/cn2g1/LgL2jg4/fjSSP7fkOkM5M9gBNAILXpv6L\
IHAunZk8ArCk3hjQX/RWpNzJoBjNrqYj9Nod9qYz72zkgsfj4WBruRn/BYygdRsAFkW5GcfVY9YT\
U5tsCf1+8CSXVNH65ZacBcLLuQ4AowCex1R5sBibiAae58tYJHg/n6czudY8WJFMIhy8Xbi1aBQi\
eq2wVvVulDlRySh2LDQUl7Kz1EYRJlR5sbzOTFdqYNPxD/4mzdyqngK/AAAAAElFTkSuQmCC\
") no-repeat 6px 1px;}\
#pp-config-btn1:hover{background-color:#ddeaf6;border-color:#ddeaf6;}\
#pp-config-btn1.pp-active{position:relative;z-index:10001;background-color:#fff;\
padding-top:27px;border-color:#becad8;border-bottom:none;border-radius:5px 5px 0px 0px}\
\
#pp-config-btn1-wrapper #pp-config{position:absolute;z-index:10000;top:27px;left:-400px;\
width:800px;background-color:#fff;border:3px solid #becad8;border-radius:10px}\
#pp-config-btn1-wrapper #pp-config .pp-config-tab:first-child:hover{\
margin:-1px 0px 0px -1px;border-top-left-radius:8px;border:1px solid #becad8;\
border-right:none;border-bottom:none}\
\
#pp-config-btn-fallback{position:fixed;right:0px;top:0px;opacity:0.2;padding:16px;\
cursor:pointer;background-repeat:no-repeat;background-position:center;\
/* __SUBST_FILE_CSS__(temp/icons/24.txt) */background-image:url("\
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/w\
D/AP+gvaeTAAACY0lEQVRIibWUz0tUURTHP+fOc4apSDJKFwWKM0qSlFAEtoiorE2bFrVwn+aU/QMFks\
s24TBjYkRt2wQGYRQJkQXSLxGhHBU0hNKCJAoa573TYsaZ92xsxpn6bi7ne8/9fs85l3vhP0MKZsTntq\
HJYxhaUWkGrQE2AYvAAsoojnnCpfqJjRn0J06iXATaAH8RxY4gcpULodG/G8QTR0Cvgxx0sQ7IKKpjCE\
uI+nGkFpHDoI2uPBuhl87QNUTUazAwU0nKiSG0uw6kgF585g4d9fN/FKMqxKdPINwCdud46SMSupwziM\
4049Mh0No1Ej/oCm9ZdyirGJytZsV+CdS5TM4TCQ1KZtb3gK15jhZnABCbbkXUPf9lnFS9QYm6xJ8Cia\
IE1yISeoHwzMVUItY5AxLNEN/wLZ9C+F6SAYAjDzyxcNqw+LEfGAce0nFgpWRxAOO89xJSZ9FzNAXsL0\
s4qydfUTehVeafCK+iKvkaeOtilqyyBG9+2Idjxki/9CnOhhuJJYYQWtIJ+ry8DmxTTe4b2ZVeJHePRu\
PldZAPVvI2tn8YJUBn43ghA0NfIkB3+FeW6Z/eizo1majFlesjPnUcG8ABvzUBUMggiMUCscQwPnODT/\
PvUH0DUpEnNwDyOBslU/eBM8XcwXaEdhznEE07DZBPPB8CAIUMkqBRYBJVC5ps4EtR8iKfofCIVuhq6A\
agZ8Qi0mADO7K7sUQbwqNM9JOu8Oa1At4OBl5VoAQ9+7HJ9G+afvEbhtfArrwC7HExQSRwtxThVXhHJM\
yhzHpTdP3v26SmUGsYxAKdK6eQkvEbAe23PlzXIqUAAAAASUVORK5CYII=\
")/* __SUBST_FILE_CSS_END__ */}\
#pp-config-btn-fallback:hover,#pp-config-btn-fallback.pp-active{opacity:1}\
\
#pp-config-btn-fallback-wrapper #pp-config{position:fixed;background-color:#fff;\
width:800px;height:70%;border:3px solid #becad8;border-radius:10px}\
#pp-config-btn-fallback-wrapper #pp-config .pp-config-tab:first-child:hover{\
margin:-1px 0px 0px -1px;border-top-left-radius:8px;border:1px solid #becad8;\
border-right:none;border-bottom:none}\
\
#pp-config{line-height:1.2em}\
#pp-config:not(.pp-show){display:none}\
#pp-config ul{padding:0px;margin:0px}\
#pp-config input,#pp-config button,#pp-config select,#pp-config textarea{\
border:1px solid #becad8;border-radius:2px;margin:0.2em 0px;padding:0.1em 0.3em}\
#pp-config button{white-space:nowrap}\
#pp-config input[type="checkbox"]{padding:1px}\
#pp-config button{background-color:#f2f4f6}\
#pp-config button:hover{background-color:#ddeaf6}\
#pp-config button:active{background-color:#becad8}\
#pp-config ul{list-style-type:none}\
#pp-config li{display:block}\
#pp-config table{border-collapse:collapse;border-spacing:0px}\
#pp-config table td{padding:0px 0.2em}\
#pp-config label{cursor:pointer}\
#pp-config-tabbar{border-bottom:2px solid #becad8}\
#pp-config-tabbar label{cursor:pointer}\
#pp-config-close-button{padding:0.4em}\
#pp-config-tabbar .pp-config-tab{display:inline-block;padding:0.4em 0.6em;font-weight:bold}\
#pp-config-tabbar .pp-config-tab:hover{background-color:#d6dee5}\
#pp-config-tabbar .pp-config-tab.pp-active{background-color:#becad8}\
#pp-config-content-wrapper{padding:0.4em;overflow-x:visible;overflow-y:auto}\
.pp-config-content{display:none}\
.pp-config-content.pp-active{display:block}\
.pp-config-content tr:nth-child(even):not(.pp-config-subsection-title) td{background-color:#f2f4f6}\
.pp-config-content dl{margin-top:1.2em}\
.pp-config-content dt{margin-top:0.4em}\
.pp-config-content dd{margin-left:1em}\
.pp-config-content-header{border-bottom:1px solid #ccc;padding-bottom:0.1em;margin-bottom:0.2em}\
.pp-config-content .pp-config-subsection-title div{font-weight:bold;\
border-bottom:1px solid #becad8;border-left:0.8em solid #becad8;\
margin-top:1.6em;margin-bottom:0.4em;padding:0.3em 0.2em}\
#pp-config-bookmark-content textarea{width:100%;height:20em;\
box-sizing:border-box;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;margin-bottom:1em}\
#pp-config-bookmark-tag-aliases{width:100%}\
#pp-config-bookmark-tag-aliases td:last-child{width:100%}\
#pp-config-bookmark-tag-aliases td:last-child input{width:100%;\
box-sizing:border-box;-webkit-box-sizing:border-box;-moz-box-sizing:border-box}\
#pp-config-importexport-toolbar{margin-bottom:0.2em}\
#pp-config-importexport-toolbar button{margin-right:0.2em}\
#pp-config-importexport-content textarea{width:100%;height:30em;\
box-sizing:border-box;-webkit-box-sizing:border-box;-moz-box-sizing:border-box}\
#pp-config-langbar{margin-bottom:0.2em;padding-bottom:0.2em;border-bottom:1px solid #aaa}\
#pp-config-langbar button{margin-right:0.2em;padding:0.2em 0.4em}\
#pp-config-escaper{margin-bottom:0.2em;padding-bottom:0.2em;border-bottom:1px solid #aaa}\
#pp-config-escaper input{display:block;width:100%;box-sizing:border-box}\
#pp-config-debug-content td{border:1px solid #aaa;padding:0.1em 0.2em}\
\
/* editor */\
#pp-config input.pp-active{background-color:#ffc}\
.pp-config-editor-wrapper{position:relative}\
.pp-config-editor{padding:0.4em;right:100%}\
.pp-config-regexp-editor textarea{width:100%;height:10em;\
box-sizing:border-box;-webkit-box-sizing:border-box;-moz-box-sizing:border-box}\
.pp-config-regexp-editor-status{font-weight:bold}\
.pp-config-regexp-editor-status.pp-yes{color:green}\
.pp-config-regexp-editor-status.pp-no{color:red}\
.pp-config-regexp-editor table{white-space:pre}\
.pp-config-key-editor ul button{padding:0px;margin-right:0.2em}\
.pp-config-key-editor-toolbar{margin-top:0.2em}\
#pp-config .pp-config-key-editor-toolbar button{margin-left:0.2em}\
\
/* floater */\
.pp-float{position:fixed;top:0px;z-index:90}\
.column-action-menu.pp-float:not(:hover){opacity:0.6;}\
#pp-search-header{background-color:#fff}\
#pp-search-header.pp-float:not(:hover){opacity:0.6}\
\
/* search */\
#pp-search-size-custom input[type="text"]{\
width:3em;padding:0px;height:auto;border:1px solid #eee}\
#pp-search-ratio-custom-text{width:3em;padding:0px;height:auto}\
#pp-search-ratio-custom-preview{display:none}\
input[type="range"]:active~#pp-search-ratio-custom-preview{display:block}\
.pp-slider.pp-active~#pp-search-ratio-custom-preview{display:block}\
input[type="text"]:focus~#pp-search-ratio-custom-preview{display:block}\
#pp-search-ratio-custom-preview{position:absolute;margin-top:0.4em}\
#pp-search-ratio-custom-preview div{background-color:#ccc}\
\
.pp-bookmark-tag-list ul+ul:not(.tagCloud){border-top:2px solid #dae1e7}\
.pp-bookmark-tag-list ul+ul.tagCloud{border-bottom:2px solid #dae1e7}\
';

  _.conf.__schema = [
    // __CONFIG_BEGIN__
    {"name": "general", "items": [
      {"key": "bookmark_hide", "value": false},
      {"key": "float_tag_list", "value": 1},
      {"key": "rate_confirm", "value": true},
      {"key": "disable_effect", "value": false},
      {"key": "fast_user_bookmark", "value": 0},
      {"key": "redirect_jump_page", "value": 1},
      {"key": "debug", "value": false}
    ]},

    {"name": "popup", "items": [
      {"key": "preload", "value": true},
      {"key": "big_image", "value": false},
      {"key": "caption_height", "value": 0.4},
      {"key": "caption_minheight", "value": 160},
      {"key": "caption_opacity", "value": 0.9},
      {"key": "remove_pixpedia", "value": false},
      {"key": "remove_pixiv_comic", "value": false},
      {"key": "remove_booth", "value": false},
      {"key": "rate_key", "value": true},
      {"key": "font_size", "value": ""},
      {"key": "auto_manga", "value": 0},
      {"key": "auto_manga_regexp", "value": "/(?:bookmark_new_illust|member_illust|mypage|ranking|bookmark)\\.php"},
      {"key": "manga_viewed_flags", "value": true},
      {"key": "reverse", "value": 0},
      {"key": "reverse_regexp", "value": "/(?:bookmark_new_illust|member_illust|mypage)\\.php"},
      {"key": "overlay_control", "value": 0.3},
      {"key": "scroll_height", "value": 32},
      {"key": "scroll_height_page", "value": 0.8},
      {"key": "author_status_icon", "value": true},
      {"key": "show_comment_form", "value": false},
      {"key": "hide_stamp_comments", "value": false},
      {"key": "mouse_wheel", "value": 2},
      {"key": "mouse_wheel_delta", "value": 1},
      {"key": "fit_short_threshold", "value": 4},
      {"key": "mark_visited", "value": true},
      {"key": "manga_page_action", "value": 2}
    ]},

    {"name": "mypage", "items": [
      {"key": "layout_history", "value": ""}
    ]},

    {"name": "key", "items": [
      {"key": "popup_prev", "value": "Backspace,a,k"},
      {"key": "popup_prev_direction", "value": "Left"},
      {"key": "popup_next", "value": "Space,j"},
      {"key": "popup_next_direction", "value": "Right"},
      {"key": "popup_first", "value": "Home"},
      {"key": "popup_last", "value": "End"},
      {"key": "popup_close", "value": "Escape,q"},
      {"key": "popup_caption_scroll_up", "value": "Up"},
      {"key": "popup_caption_scroll_down", "value": "Down"},
      {"key": "popup_caption_toggle", "value": "c"},
      {"key": "popup_comment_toggle", "value": "Shift+c"},
      {"key": "popup_illust_scroll_up", "value": "Up"},
      {"key": "popup_illust_scroll_down", "value": "Down"},
      {"key": "popup_illust_scroll_left", "value": "Left"},
      {"key": "popup_illust_scroll_right", "value": "Right"},
      {"key": "popup_illust_scroll_top", "value": "Home"},
      {"key": "popup_illust_scroll_bottom", "value": "End"},
      {"key": "popup_illust_page_up", "value": "PageUp"},
      {"key": "popup_illust_page_down", "value": "PageDown"},
      {"key": "popup_switch_resize_mode", "value": "w"},
      {"key": "popup_open", "value": "Shift+f,Shift+o"},
      {"key": "popup_open_big", "value": "f,o"},
      {"key": "popup_open_profile", "value": "e"},
      {"key": "popup_open_illust", "value": "r"},
      {"key": "popup_open_bookmark", "value": "t"},
      {"key": "popup_open_staccfeed", "value": "y"},
      {"key": "popup_open_response", "value": "Shift+r"},
      {"key": "popup_reload", "value": "g"},
      {"key": "popup_open_bookmark_detail", "value": "Shift+b"},
      {"key": "popup_open_manga_thumbnail", "value": "Shift+v"},
      {"key": "popup_rate01", "value": "Shift+0,Shift+~"},
      {"key": "popup_rate02", "value": "Shift+9,Shift+)"},
      {"key": "popup_rate03", "value": "Shift+8,Shift+("},
      {"key": "popup_rate04", "value": "Shift+7,Shift+'"},
      {"key": "popup_rate05", "value": "Shift+6,Shift+&"},
      {"key": "popup_rate06", "value": "Shift+5,Shift+%"},
      {"key": "popup_rate07", "value": "Shift+4,Shift+$"},
      {"key": "popup_rate08", "value": "Shift+3,Shift+#"},
      {"key": "popup_rate09", "value": "Shift+2,Shift+\""},
      {"key": "popup_rate10", "value": "Shift+1,Shift+!"},
      {"key": "popup_ugoira_play_pause", "value": "m"},
      {"key": "popup_ugoira_prev_frame", "value": "comma"},
      {"key": "popup_ugoira_next_frame", "value": "."},
      {"key": "popup_bookmark_start", "value": "b", "subsection": "bookmark"},
      {"key": "popup_bookmark_submit", "value": "Enter,Space", "subsection": "bookmark"},
      {"key": "popup_bookmark_end", "value": "Escape", "subsection": "bookmark"},
      {"key": "popup_manga_start", "value": "v", "subsection": "manga"},
      {"key": "popup_manga_open_page", "value": "Shift+f", "subsection": "manga"},
      {"key": "popup_manga_end", "value": "v,Escape", "subsection": "manga"},
      {"key": "popup_qrate_start", "value": "d", "subsection": "question"},
      {"key": "popup_qrate_select_prev", "value": "Up", "subsection": "question"},
      {"key": "popup_qrate_select_next", "value": "Down", "subsection": "question"},
      {"key": "popup_qrate_submit", "value": "Enter,Space", "subsection": "question"},
      {"key": "popup_qrate_end", "value": "Escape,d", "subsection": "question"},
      {"key": "popup_tag_edit_start", "value": "", "subsection": "tagedit"},
      {"key": "popup_tag_edit_end", "value": "Escape", "subsection": "tagedit"}
    ]},

    {"name": "bookmark", "items": [
      {"key": "tag_order", "value": ""},
      {"key": "tag_aliases", "value": ""}
    ]}
    // __CONFIG_END__
  ];

  _.i18n = {
    en: {
      __name__: 'en',

      pref: {
        general:       'General',
        popup:         'Popup',
        key:           'Key',
        key_bookmark:  'Bookmark mode',
        key_manga:     'Manga mode',
        key_question:  'Questionnaire mode',
        key_question:  'Tag edit mode',
        bookmark:      'Bookmark tag',
        importexport:  'Import/Export',
        'export':      'Export',
        'import':      'Import',
        about:         'About',
        about_web:     'Web',
        about_email:   'Mail',
        about_license: 'License',
        changelog:     'Changelog',
        releasenote:   'Release note',
        debug:         'Debug',
        'default':     'Default',
        add:           'Add',
        close:         'Close',
        regex_valid:   'Valid',
        regex_invalid: 'Invalid'
      },

      conf: {
        general: {
          debug: 'Debug mode',
          bookmark_hide: 'Make private bookmark by default',
          float_tag_list: {
            desc: 'Enable float view for tag list',
            hint: ['Disable', 'Enable']
          },
          rate_confirm: 'Show confirmation dialog when rating',
          disable_effect: 'Disable UI animation',
          fast_user_bookmark: {
            desc: 'Follow user by one-click',
            hint: ['Disable', 'Enable(public)', 'Enable(private)']
          },
          redirect_jump_page: {
            desc: 'Redirect jump.php',
            hint: ['Disable', 'Open target', 'Modify link']
          }
        },

        popup: {
          preload: 'Enable preloading',
          big_image: 'Use original size image',
          caption_height: 'Caption height(ratio)',
          caption_minheight: 'Caption minimum height(px)',
          caption_opacity: 'Caption opacity',
          remove_pixpedia: 'Remove pixiv encyclopedia icon',
          remove_pixiv_comic: 'Remove pixiv comic icon',
          remove_booth: 'Remove booth icon',
          rate_key: 'Enable rate keys',
          font_size: 'Font size(e.g. 10px)',
          auto_manga: {
            desc: 'Switch manga-mode automatically',
            hint: ['Disable', 'Enable', 'Specify pages by regexp']
          },
          auto_manga_regexp: 'Regular expression for "Switch manga..." setting.',
          manga_viewed_flags: 'Do not start manga mode automatically if you have already read it',
          reverse: {
            desc: 'Reverse move direction',
            hint: ['Disable', 'Enable', 'Specify pages by regexp']
          },
          reverse_regexp: 'Regular expression for "Reverse..." setting.',
          overlay_control: 'Click area width(0:Disable/<1:Ratio/>1:Pixel)',
          scroll_height: 'Scroll step(px)',
          scroll_height_page: 'Scroll step for PageUp/PageDown',
          author_status_icon: 'Show icon on profile image',
          show_comment_form: 'Show comment form by default',
          hide_stamp_comments: 'Hide stamp comments',
          mouse_wheel: {
            desc: 'Mouse wheel operation',
            hint: ['Do nothing', 'Move to prev/next illust', 'Move to prev/next illust(respect "reverse" setting)']
          },
          mouse_wheel_delta: 'Threshold for mouse wheel setting(if set negative value, invert direction)',
          fit_short_threshold: 'Aspect ratio threshold for switch resize mode(0:Disable)',
          mark_visited: 'Mark link as visited',
          manga_page_action: {
            desc: 'Open popup in manga page',
            hint: ['Do nothing', 'Open popup', 'Open popup in manga mode']
          }
        },

        key: {
          popup_prev: 'Move to previous illust',
          popup_prev_direction: 'Move to previous illust(ignore "reverse" setting)',
          popup_next: 'Move to next illust',
          popup_next_direction: 'Move to next illust(ignore "reverse" setting)',
          popup_first: 'Move to first illust',
          popup_last: 'Move to last illust',
          popup_close: 'Close',
          popup_caption_scroll_up: 'Scroll caption up',
          popup_caption_scroll_down: 'Scroll caption down',
          popup_caption_toggle: 'Toggle caption display',
          popup_comment_toggle: 'Toggle comment',
          popup_illust_scroll_up: 'Scroll illust up',
          popup_illust_scroll_down: 'Scroll illust down',
          popup_illust_scroll_left: 'Scroll illust left',
          popup_illust_scroll_right: 'Scroll illust right',
          popup_illust_scroll_top: 'Scroll illust to top',
          popup_illust_scroll_bottom: 'Scroll illust to bottom',
          popup_illust_page_up: 'Scroll illust up (PageUp)',
          popup_illust_page_down: 'Scroll illust down (PageDown)',
          popup_switch_resize_mode: 'Switch resize mode',
          popup_open: 'Open illust page',
          popup_open_big: 'Open image',
          popup_open_profile: 'Open profile',
          popup_open_illust: 'Open works',
          popup_open_bookmark: 'Open bookmark',
          popup_open_staccfeed: 'Open feed',
          popup_open_response: 'Open image response',
          popup_reload: 'Reload',
          popup_open_bookmark_detail: 'Open bookmark information page',
          popup_open_manga_thumbnail: 'Open manga thumbnail page',
          popup_rate01: 'Rate (1pt)',
          popup_rate02: 'Rate (2pt)',
          popup_rate03: 'Rate (3pt)',
          popup_rate04: 'Rate (4pt)',
          popup_rate05: 'Rate (5pt)',
          popup_rate06: 'Rate (6pt)',
          popup_rate07: 'Rate (7pt)',
          popup_rate08: 'Rate (8pt)',
          popup_rate09: 'Rate (9pt)',
          popup_rate10: 'Rate (10pt)',
          popup_ugoira_play_pause: '[Ugoira] Play/Pause',
          popup_ugoira_prev_frame: '[Ugoira] Show previous frame',
          popup_ugoira_next_frame: '[Ugoira] Show next frame',
          popup_bookmark_start: 'Start bookmark mode',
          popup_bookmark_submit: 'Send',
          popup_bookmark_end: 'End bookmark mode',
          popup_manga_start: 'Start manga mode',
          popup_manga_open_page: 'Open manga page',
          popup_manga_end: 'End manga mode',
          popup_qrate_start: 'Start questionnaire mode',
          popup_qrate_select_prev: 'Select previous item',
          popup_qrate_select_next: 'Select next item',
          popup_qrate_submit: 'Send',
          popup_qrate_end: 'End questionnaire mode',
          popup_tag_edit_start: 'Start tag edit mode',
          popup_tag_edit_end: 'End tag edit mode'
        },

        bookmark: {
          tag_order: 'Reorder tags. 1 tag per line.\n-: Separator\n*: Others',
          tag_aliases: 'Tag association. Used for auto input. Separate by space.'
        }
      },

      cancel: 'Cancel',
      rate_confirm: 'Rate it?\n$pointpt',
      author_works: 'Works',
      author_bookmarks: 'Bookmarks',
      author_staccfeed: 'Feed',
      sending: 'Sending',
      importing: 'Importing',
      associate_tags: 'Associate tags',
      mypage_layout_history: 'Layout history',
      mypage_layout_history_empty: 'Layout history is empty',
      mypage_layout_history_help: 'Click list item to restore layout.',
      search_wlt: 'Min width <=',
      search_hlt: 'Min height <=',
      search_wgt: '<= Max width',
      search_hgt: '<= Max height',

      ugoira_play_pause: 'Play/Pause (#{key})',
      ugoira_next_frame: 'Next frame (#{key})',
      ugoira_prev_frame: 'Previous frame (#{key})',
      ugoira_download_zip: 'Download zip',
      ugoira_generate_timecode: 'Generate timecode',
      ugoira_how_to_use: 'How to use?'
    },

    ja: {
      __name__: 'ja',

      pref: {
        general:       '\u5168\u822c',
        popup:         '\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7',
        key:           '\u30ad\u30fc',
        key_bookmark:  '\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7de8\u96c6\u30e2\u30fc\u30c9',
        key_manga:     '\u30de\u30f3\u30ac\u30e2\u30fc\u30c9',
        key_question:  '\u30a2\u30f3\u30b1\u30fc\u30c8\u30e2\u30fc\u30c9',
        key_tagedit:   '\u30bf\u30b0\u7de8\u96c6\u30e2\u30fc\u30c9',
        bookmark:      '\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30bf\u30b0',
        importexport:  '\u30a4\u30f3\u30dd\u30fc\u30c8/\u30a8\u30af\u30b9\u30dd\u30fc\u30c8',
        'export':      '\u30a8\u30af\u30b9\u30dd\u30fc\u30c8',
        'import':      '\u30a4\u30f3\u30dd\u30fc\u30c8',
        about:         '\u60c5\u5831',
        about_web:     '\u30a6\u30a7\u30d6\u30b5\u30a4\u30c8',
        about_email:   '\u30e1\u30fc\u30eb',
        about_license: '\u30e9\u30a4\u30bb\u30f3\u30b9',
        changelog:     '\u66f4\u65b0\u5c65\u6b74',
        releasenote:   '\u30ea\u30ea\u30fc\u30b9\u30ce\u30fc\u30c8',
        debug:         '\u30c7\u30d0\u30c3\u30b0',
        'default':     '\u30c7\u30d5\u30a9\u30eb\u30c8',
        add:           '\u8ffd\u52a0',
        close:         '\u9589\u3058\u308b',
        regex_valid:   '\u6709\u52b9',
        regex_invalid: '\u4e0d\u6b63'
      },

      conf: {
        general: {
          debug: '\u30c7\u30d0\u30c3\u30b0\u30e2\u30fc\u30c9',
          bookmark_hide: '\u30d6\u30c3\u30af\u30de\u30fc\u30af\u975e\u516c\u958b\u3092\u30c7\u30d5\u30a9\u30eb\u30c8\u306b\u3059\u308b',
          float_tag_list: {
            desc: '\u30bf\u30b0\u30ea\u30b9\u30c8\u3092\u30d5\u30ed\u30fc\u30c8\u8868\u793a\u3059\u308b',
            hint: ['\u7121\u52b9', '\u6709\u52b9']
          },
          rate_confirm: '\u30a4\u30e9\u30b9\u30c8\u3092\u8a55\u4fa1\u3059\u308b\u6642\u306b\u78ba\u8a8d\u3092\u3068\u308b',
          disable_effect: '\u30a2\u30cb\u30e1\u30fc\u30b7\u30e7\u30f3\u306a\u3069\u306e\u30a8\u30d5\u30a7\u30af\u30c8\u3092\u7121\u52b9\u5316\u3059\u308b',
          fast_user_bookmark: {
            desc: '\u30ef\u30f3\u30af\u30ea\u30c3\u30af\u3067\u30e6\u30fc\u30b6\u30fc\u3092\u30d5\u30a9\u30ed\u30fc\u3059\u308b',
            hint: ['\u7121\u52b9', '\u6709\u52b9(\u516c\u958b)', '\u6709\u52b9(\u975e\u516c\u958b)']
          },
          redirect_jump_page: {
            desc: 'jump.php\u3092\u30ea\u30c0\u30a4\u30ec\u30af\u30c8\u3059\u308b',
            hint: ['\u7121\u52b9', '\u30da\u30fc\u30b8\u3092\u958b\u304f', '\u30ea\u30f3\u30af\u3092\u5909\u66f4']
          }
        },

        popup: {
          preload: '\u5148\u8aad\u307f\u3092\u4f7f\u7528\u3059\u308b',
          big_image: '\u539f\u5bf8\u306e\u753b\u50cf\u3092\u8868\u793a\u3059\u308b',
          caption_height: '\u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u306e\u9ad8\u3055(\u7387)',
          caption_minheight: '\u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u306e\u9ad8\u3055\u306e\u6700\u5c0f\u5024(px)',
          caption_opacity: '\u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u306e\u4e0d\u900f\u660e\u5ea6',
          remove_pixpedia: 'pixiv\u767e\u79d1\u4e8b\u5178\u30a2\u30a4\u30b3\u30f3\u3092\u9664\u53bb\u3059\u308b',
          remove_pixiv_comic: 'pixiv\u30b3\u30df\u30c3\u30af\u30a2\u30a4\u30b3\u30f3\u3092\u9664\u53bb\u3059\u308b',
          remove_booth: 'BOOTH\u30a2\u30a4\u30b3\u30f3\u3092\u9664\u53bb\u3059\u308b',
          rate_key: '\u8a55\u4fa1\u306e\u30ad\u30fc\u30d0\u30a4\u30f3\u30c9\u3092\u6709\u52b9\u306b\u3059\u308b',
          font_size: '\u30d5\u30a9\u30f3\u30c8\u30b5\u30a4\u30ba(\u4f8b: 10px)',
          auto_manga: {
            desc: '\u81ea\u52d5\u7684\u306b\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u3092\u958b\u59cb\u3059\u308b',
            hint: ['\u7121\u52b9', '\u6709\u52b9', '\u30da\u30fc\u30b8\u3092\u6b63\u898f\u8868\u73fe\u3067\u6307\u5b9a']
          },
          auto_manga_regexp: '"\u81ea\u52d5\u7684\u306b\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u3092\u958b\u59cb\u3059\u308b"\u3067\u4f7f\u7528\u3059\u308b\u6b63\u898f\u8868\u73fe',
          manga_viewed_flags: '\u65e2\u306b\u8aad\u3093\u3060\u30de\u30f3\u30ac\u306f\u81ea\u52d5\u3067\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u3092\u958b\u59cb\u3057\u306a\u3044',
          reverse: {
            desc: '\u79fb\u52d5\u65b9\u5411\u3092\u53cd\u5bfe\u306b\u3059\u308b',
            hint: ['\u7121\u52b9', '\u6709\u52b9', '\u30da\u30fc\u30b8\u3092\u6b63\u898f\u8868\u73fe\u3067\u6307\u5b9a']
          },
          reverse_regexp: '"\u79fb\u52d5\u65b9\u5411\u3092\u53cd\u5bfe\u306b\u3059\u308b"\u3067\u4f7f\u7528\u3059\u308b\u6b63\u898f\u8868\u73fe',
          overlay_control: '\u79fb\u52d5\u77e2\u5370\u306e\u5e45(0:\u4f7f\u7528\u3057\u306a\u3044/<1:\u753b\u50cf\u306b\u5bfe\u3059\u308b\u5272\u5408/>1:\u30d4\u30af\u30bb\u30eb)',
          scroll_height: '\u30b9\u30af\u30ed\u30fc\u30eb\u5e45(px)',
          scroll_height_page: 'PageUp/PageDown\u306e\u30b9\u30af\u30ed\u30fc\u30eb\u5e45',
          author_status_icon: '\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u753b\u50cf\u306e\u5de6\u4e0a\u306b\u30a2\u30a4\u30b3\u30f3\u3092\u8868\u793a\u3059\u308b',
          show_comment_form: '\u30b3\u30e1\u30f3\u30c8\u306e\u6295\u7a3f\u30d5\u30a9\u30fc\u30e0\u3092\u30c7\u30d5\u30a9\u30eb\u30c8\u3067\u8868\u793a\u3059\u308b',
          hide_stamp_comments: '\u30b9\u30bf\u30f3\u30d7\u306e\u30b3\u30e1\u30f3\u30c8\u3092\u975e\u8868\u793a\u306b\u3059\u308b',
          mouse_wheel: {
            desc: '\u30de\u30a6\u30b9\u30db\u30a4\u30fc\u30eb\u306e\u52d5\u4f5c',
            hint: ['\u4f55\u3082\u3057\u306a\u3044', '\u524d/\u6b21\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5', '\u524d/\u6b21\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5(\u53cd\u8ee2\u306e\u8a2d\u5b9a\u306b\u5f93\u3046)']
          },
          mouse_wheel_delta: '\u30db\u30a4\u30fc\u30eb\u8a2d\u5b9a\u306e\u95be\u5024(\u8ca0\u6570\u306e\u5834\u5408\u306f\u65b9\u5411\u3092\u53cd\u8ee2)',
          fit_short_threshold: '\u30ea\u30b5\u30a4\u30ba\u30e2\u30fc\u30c9\u3092\u5207\u308a\u66ff\u3048\u308b\u7e26\u6a2a\u6bd4\u306e\u95be\u5024(0:\u7121\u52b9)',
          mark_visited: '\u30ea\u30f3\u30af\u3092\u8a2a\u554f\u6e08\u307f\u306b\u3059\u308b',
          manga_page_action: {
            desc: '\u6f2b\u753b\u4f5c\u54c1\u306e\u30da\u30fc\u30b8\u3067\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3092\u958b\u304f',
            hint: ['\u4f55\u3082\u3057\u306a\u3044', '\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3092\u958b\u304f', '\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3092\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u3067\u958b\u304f']
          }
        },

        key: {
          popup_prev: '\u524d\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5',
          popup_prev_direction: '\u524d\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5("\u53cd\u5bfe\u306b\u3059\u308b"\u30aa\u30d7\u30b7\u30e7\u30f3\u306b\u5f71\u97ff\u3055\u308c\u306a\u3044)',
          popup_next: '\u6b21\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5',
          popup_next_direction: '\u6b21\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5("\u53cd\u5bfe\u306b\u3059\u308b"\u30aa\u30d7\u30b7\u30e7\u30f3\u306b\u5f71\u97ff\u3055\u308c\u306a\u3044)',
          popup_first: '\u6700\u521d\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5',
          popup_last: '\u6700\u5f8c\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5',
          popup_close: '\u9589\u3058\u308b',
          popup_caption_scroll_up: '\u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u3092\u4e0a\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b',
          popup_caption_scroll_down: '\u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u3092\u4e0b\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b',
          popup_caption_toggle: '\u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u306e\u5e38\u6642\u8868\u793a/\u81ea\u52d5\u8868\u793a\u3092\u5207\u308a\u66ff\u3048\u308b',
          popup_comment_toggle: '\u30b3\u30e1\u30f3\u30c8\u8868\u793a\u3092\u5207\u308a\u66ff\u3048',
          popup_illust_scroll_up: '\u30a4\u30e9\u30b9\u30c8\u3092\u4e0a\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b',
          popup_illust_scroll_down: '\u30a4\u30e9\u30b9\u30c8\u3092\u4e0b\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b',
          popup_illust_scroll_left: '\u30a4\u30e9\u30b9\u30c8\u3092\u5de6\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b',
          popup_illust_scroll_right: '\u30a4\u30e9\u30b9\u30c8\u3092\u53f3\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b',
          popup_illust_scroll_top: '\u30a4\u30e9\u30b9\u30c8\u3092\u4e0a\u7aef\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b',
          popup_illust_scroll_bottom: '\u30a4\u30e9\u30b9\u30c8\u3092\u4e0b\u7aef\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b',
          popup_illust_page_up: '\u30a4\u30e9\u30b9\u30c8\u3092\u4e0a\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b (PageUp)',
          popup_illust_page_down: '\u30a4\u30e9\u30b9\u30c8\u3092\u4e0b\u306b\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b (PageDown)',
          popup_switch_resize_mode: '\u30ea\u30b5\u30a4\u30ba\u30e2\u30fc\u30c9\u3092\u5207\u308a\u66ff\u3048\u308b',
          popup_open: '\u30a4\u30e9\u30b9\u30c8\u30da\u30fc\u30b8\u3092\u958b\u304f',
          popup_open_big: '\u30a4\u30e9\u30b9\u30c8\u753b\u50cf\u3092\u958b\u304f',
          popup_open_profile: '\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u3092\u958b\u304f',
          popup_open_illust: '\u4f5c\u54c1\u4e00\u89a7\u3092\u958b\u304f',
          popup_open_bookmark: '\u30d6\u30c3\u30af\u30de\u30fc\u30af\u3092\u958b\u304f',
          popup_open_staccfeed: '\u30d5\u30a3\u30fc\u30c9\u3092\u958b\u304f',
          popup_open_response: '\u30a4\u30e1\u30fc\u30b8\u30ec\u30b9\u30dd\u30f3\u30b9\u4e00\u89a7\u3092\u958b\u304f',
          popup_reload: '\u30ea\u30ed\u30fc\u30c9',
          popup_open_bookmark_detail: '\u30d6\u30c3\u30af\u30de\u30fc\u30af\u8a73\u7d30\u30da\u30fc\u30b8\u3092\u958b\u304f',
          popup_open_manga_thumbnail: '\u30de\u30f3\u30ac\u30b5\u30e0\u30cd\u30a4\u30eb\u30da\u30fc\u30b8\u3092\u958b\u304f',
          popup_rate01: '\u8a55\u4fa1\u3059\u308b (1\u70b9)',
          popup_rate02: '\u8a55\u4fa1\u3059\u308b (2\u70b9)',
          popup_rate03: '\u8a55\u4fa1\u3059\u308b (3\u70b9)',
          popup_rate04: '\u8a55\u4fa1\u3059\u308b (4\u70b9)',
          popup_rate05: '\u8a55\u4fa1\u3059\u308b (5\u70b9)',
          popup_rate06: '\u8a55\u4fa1\u3059\u308b (6\u70b9)',
          popup_rate07: '\u8a55\u4fa1\u3059\u308b (7\u70b9)',
          popup_rate08: '\u8a55\u4fa1\u3059\u308b (8\u70b9)',
          popup_rate09: '\u8a55\u4fa1\u3059\u308b (9\u70b9)',
          popup_rate10: '\u8a55\u4fa1\u3059\u308b (10\u70b9)',
          popup_ugoira_play_pause: '[\u3046\u3054\u30a4\u30e9] \u518d\u751f/\u4e00\u6642\u505c\u6b62',
          popup_ugoira_prev_frame: '[\u3046\u3054\u30a4\u30e9] \u30b3\u30de\u623b\u3057',
          popup_ugoira_next_frame: '[\u3046\u3054\u30a4\u30e9] \u30b3\u30de\u9001\u308a',
          popup_bookmark_start: '\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7de8\u96c6\u30e2\u30fc\u30c9\u958b\u59cb',
          popup_bookmark_submit: '\u9001\u4fe1',
          popup_bookmark_end: '\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7de8\u96c6\u30e2\u30fc\u30c9\u7d42\u4e86',
          popup_manga_start: '\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u958b\u59cb',
          popup_manga_open_page: '\u8868\u793a\u3057\u3066\u3044\u308b\u30da\u30fc\u30b8\u3092\u958b\u304f\u3002',
          popup_manga_end: '\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u7d42\u4e86',
          popup_qrate_start: '\u30a2\u30f3\u30b1\u30fc\u30c8\u30e2\u30fc\u30c9\u958b\u59cb',
          popup_qrate_select_prev: '\u524d\u306e\u9078\u629e\u80a2\u3092\u9078\u629e',
          popup_qrate_select_next: '\u6b21\u306e\u9078\u629e\u80a2\u3092\u9078\u629e',
          popup_qrate_submit: '\u9001\u4fe1',
          popup_qrate_end: '\u30a2\u30f3\u30b1\u30fc\u30c8\u30e2\u30fc\u30c9\u7d42\u4e86',
          popup_tag_edit_start: '\u30bf\u30b0\u7de8\u96c6\u30e2\u30fc\u30c9\u958b\u59cb',
          popup_tag_edit_end: '\u30bf\u30b0\u7de8\u96c6\u30e2\u30fc\u30c9\u7d42\u4e86'
        },

        bookmark: {
          tag_order: '\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30bf\u30b0\u306e\u4e26\u3079\u66ff\u3048\u3068\u30b0\u30eb\u30fc\u30d4\u30f3\u30b0\u30021\u884c1\u30bf\u30b0\u3002\n-: \u30bb\u30d1\u30ec\u30fc\u30bf\n*: \u6b8b\u308a\u5168\u90e8',
          tag_aliases: '\u30bf\u30b0\u306e\u95a2\u9023\u4ed8\u3051\u3002\u81ea\u52d5\u5165\u529b\u306b\u4f7f\u7528\u3059\u308b\u3002\u30b9\u30da\u30fc\u30b9\u533a\u5207\u308a\u3002'
        }
      },

      cancel: '\u4e2d\u6b62',
      rate_confirm: '\u8a55\u4fa1\u3057\u307e\u3059\u304b\uff1f\n$point\u70b9',
      author_works: '\u4f5c\u54c1',
      author_bookmarks: '\u30d6\u30c3\u30af\u30de\u30fc\u30af',
      author_staccfeed: '\u30d5\u30a3\u30fc\u30c9',
      sending: '\u9001\u4fe1\u4e2d',
      importing: '\u30a4\u30f3\u30dd\u30fc\u30c8\u4e2d',
      associate_tags: '\u30bf\u30b0\u3092\u95a2\u9023\u4ed8\u3051\u308b',
      mypage_layout_history: '\u30ec\u30a4\u30a2\u30a6\u30c8\u306e\u5c65\u6b74',
      mypage_layout_history_empty: '\u5c65\u6b74\u304c\u7a7a\u3067\u3059',
      mypage_layout_history_help: '\u30ea\u30b9\u30c8\u3092\u30af\u30ea\u30c3\u30af\u3059\u308b\u3068\u30ec\u30a4\u30a2\u30a6\u30c8\u3092\u5fa9\u5143\u3057\u307e\u3059\u3002',
      search_wlt: '\u5e45\u306e\u6700\u5c0f\u5024 <=',
      search_hlt: '\u9ad8\u3055\u306e\u6700\u5c0f\u5024 <=',
      search_wgt: '<= \u5e45\u306e\u6700\u5927\u5024',
      search_hgt: '<= \u9ad8\u3055\u306e\u6700\u5927\u5024',

      ugoira_play_pause: '\u518d\u751f/\u4e00\u6642\u505c\u6b62 (#{key})',
      ugoira_next_frame: '\u30b3\u30de\u9001\u308a (#{key})',
      ugoira_prev_frame: '\u30b3\u30de\u623b\u3057 (#{key})',
      ugoira_download_zip: 'zip\u3092\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9',
      ugoira_generate_timecode: '\u30bf\u30a4\u30e0\u30b3\u30fc\u30c9\u3092\u751f\u6210',
      ugoira_how_to_use: '\u4f7f\u3044\u65b9'
    },

    setup: function() {
      var lng;
      if (d.documentElement) {
        lng = _.i18n[d.documentElement.lang];
      }
      if (!lng && g.navigator) {
        lng = _.i18n[g.navigator.language];
      }
      _.lng = lng || _.i18n.en;
    },

    key_subst: function(msg, key) {
      return msg.replace('#{key}', {'comma': ',', 'plus': '+'}[key] || key);
    }
  };

  _.changelog = [

    // __CHANGELOG_BEGIN__

    {
      "date": "2014/12/20",
      "version": "1.13.3",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/12/20/pixplus_1.13.3",
      "changes_i18n": {
        "en": [
          "[Fix] Popup window reports an error for old works.",
          "[Fix] \"Use original size image\" option was not working."
        ],
        "ja": [
          "[\u4fee\u6b63] \u53e4\u3044\u4f5c\u54c1\u3067\u30a8\u30e9\u30fc\u306b\u306a\u308b\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u300c\u539f\u5bf8\u306e\u753b\u50cf\u3092\u8868\u793a\u3059\u308b\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u304c\u52d5\u304b\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2014/12/14",
      "version": "1.13.2",
      "releasenote": "",
      "changes_i18n": {
        "en": [
          "[Fix] Fix comment mode (Shift+c) was not working."
        ],
        "ja": [
          "[\u4fee\u6b63] \u30b3\u30e1\u30f3\u30c8\u30e2\u30fc\u30c9(Shift+c)\u304c\u52d5\u304b\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2014/10/19",
      "version": "1.13.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/10/19/pixplus_1.13.1",
      "changes_i18n": {
        "en": [
          "[Fix] Fix popup was broken on Safari 5/6."
        ],
        "ja": [
          "[\u4fee\u6b63] Safari 5/6\u3067\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u304c\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2014/10/10",
      "version": "1.13.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/10/10/pixplus_1.13.0",
      "changes_i18n": {
        "en": [
          "[Change] Change design of frontpage of multi-page works.",
          "[Fix] Fix \"Use original size image\" setting is inverted for \"book\" type works.",
          "[Fix] Fix support for staccfeed, area-ranking and mypage (ranking pane).",
          "[Remove] Remove repost display."
        ],
        "ja": [
          "[\u5909\u66f4] \u8907\u6570\u30da\u30fc\u30b8\u4f5c\u54c1\u306e\u6249\u30da\u30fc\u30b8\u3092\u8868\u793a\u3057\u305f\u969b\u306e\u30c7\u30b6\u30a4\u30f3\u3092\u5909\u66f4\u3002",
          "[\u4fee\u6b63] \u300c\u539f\u5bf8\u306e\u753b\u50cf\u3092\u8868\u793a\u3059\u308b\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u306e\u52d5\u4f5c\u304c\u300c\u30d6\u30c3\u30af\u300d\u306b\u5bfe\u3057\u3066\u9006\u306b\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30b9\u30bf\u30c3\u30af\u30d5\u30a3\u30fc\u30c9\u3001\u5730\u57df\u30e9\u30f3\u30ad\u30f3\u30b0\u3001\u30de\u30a4\u30da\u30fc\u30b8(\u30e9\u30f3\u30ad\u30f3\u30b0\u30da\u30a4\u30f3)\u3067\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u304c\u8868\u793a\u3055\u308c\u306a\u3044\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u524a\u9664] \u300c\u518d\u6295\u7a3f\u300d\u8868\u793a\u3092\u524a\u9664\u3002"
        ]
      }
    },

    {
      "date": "2014/10/01",
      "version": "1.12.3",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/10/01/pixplus_1.12.3",
      "changes_i18n": {
        "en": [
          "[Fix] Support for pixiv's new \"book\" feature."
        ],
        "ja": [
          "[\u4fee\u6b63] \u30d6\u30c3\u30af\u5f62\u5f0f\u6a5f\u80fd\u3092\u30b5\u30dd\u30fc\u30c8\u3002"
        ]
      }
    },

    {
      "date": "2014/09/27",
      "version": "1.12.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/09/27/pixplus_1.12.1",
      "changes_i18n": {
        "en": [
          "[Fix] Follow pixiv's changes.",
          "[Fix] Fix bookmark mode was broken.",
          "[Fix] Fix GreaseMonkey auto update."
        ],
        "ja": [
          "[\u4fee\u6b63] pixiv\u306e\u5909\u66f4\u306b\u5bfe\u5fdc\u3002",
          "[\u4fee\u6b63] \u30d6\u30c3\u30af\u30de\u30fc\u30af\u30e2\u30fc\u30c9\u304c\u3046\u307e\u304f\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] GreaseMonkey \u306e\u81ea\u52d5\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8\u304c\u58ca\u308c\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2014/09/04",
      "version": "1.12.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/09/04/pixplus_1.12.0",
      "changes_i18n": {
        "en": [
          "[Add] Add \"Do not start manga mode automatically if you have already read it\" setting.",
          "[Fix] Fix bookmark mode is not working properly.",
          "[Fix] Fix comment form was broken.",
          "[Remove] Remove mypage layout history manager."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u300c\u65e2\u306b\u8aad\u3093\u3060\u30de\u30f3\u30ac\u306f\u81ea\u52d5\u3067\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u3092\u958b\u59cb\u3057\u306a\u3044\u300d\u8a2d\u5b9a\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] \u30d6\u30c3\u30af\u30de\u30fc\u30af\u30e2\u30fc\u30c9\u304c\u6b63\u3057\u304f\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30b3\u30e1\u30f3\u30c8\u30d5\u30a9\u30fc\u30e0\u304c\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u524a\u9664] \u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u306e\u5c65\u6b74\u3092\u7ba1\u7406\u3059\u308b\u6a5f\u80fd\u3092\u524a\u9664\u3002"
        ]
      }
    },

    {
      "date": "2014/06/28",
      "version": "1.11.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/06/28/pixplus_1.11.0",
      "changes_i18n": {
        "en": [
          "[Add] Add setting to remove BOOTH icon.",
          "[Fix] Support for Ugoira."
        ],
        "ja": [
          "[\u8ffd\u52a0] BOOTH\u30a2\u30a4\u30b3\u30f3\u3092\u9664\u53bb\u3059\u308b\u8a2d\u5b9a\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] \u3046\u3054\u30a4\u30e9\u3092\u30b5\u30dd\u30fc\u30c8\u3002"
        ]
      }
    },

    {
      "date": "2014/05/06",
      "version": "1.10.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/05/06/203423",
      "changes_i18n": {
        "en": [
          "[Add] Add \"Open popup in manga page\" option.",
          "[Fix] Fix key event handling.",
          "[Fix] Fix \"Hide stamp comments\" option.",
          "[Fix] Support emoji comment."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u300c\u6f2b\u753b\u4f5c\u54c1\u306e\u30da\u30fc\u30b8\u3067\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3092\u958b\u304f\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] \u30ad\u30fc\u30a4\u30d9\u30f3\u30c8\u306e\u51e6\u7406\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u300c\u30b9\u30bf\u30f3\u30d7\u306e\u30b3\u30e1\u30f3\u30c8\u3092\u975e\u8868\u793a\u306b\u3059\u308b\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u304c\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30b3\u30e1\u30f3\u30c8\u306e\u7d75\u6587\u5b57\u3092\u30b5\u30dd\u30fc\u30c8\u3002"
        ]
      }
    },

    {
      "date": "2014/02/21",
      "version": "1.9.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2014/02/21/130255",
      "changes_i18n": {
        "en": [
          "[Add] Add \"Hide stamp comments\" option.",
          "[Fix] Fix ranking page support.",
          "[Fix] Support new comment UI.",
          "[Fix] Configuration button doesn't appears."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u300c\u30b9\u30bf\u30f3\u30d7\u306e\u30b3\u30e1\u30f3\u30c8\u3092\u975e\u8868\u793a\u306b\u3059\u308b\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] \u30e9\u30f3\u30ad\u30f3\u30b0\u30da\u30fc\u30b8\u306e\u30b5\u30dd\u30fc\u30c8\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u65b0\u3057\u3044\u30b3\u30e1\u30f3\u30c8UI\u3092\u30b5\u30dd\u30fc\u30c8\u3002",
          "[\u4fee\u6b63] \u8a2d\u5b9a\u30dc\u30bf\u30f3\u304c\u8868\u793a\u3055\u308c\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2013/08/14",
      "version": "1.8.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/08/14/100851",
      "changes_i18n": {
        "en": [
          "[Fix] Fix tag selection in bookmark mode.",
          "[Fix] Fix \"w\" key reloads illust when in manga mode."
        ],
        "ja": [
          "[\u4fee\u6b63] \u30d6\u30c3\u30af\u30de\u30fc\u30af\u30e2\u30fc\u30c9\u3067\u30bf\u30b0\u3092\u9078\u629e\u3067\u304d\u306a\u3044\u5834\u5408\u304c\u3042\u308b\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u3067\"w\"\u30ad\u30fc\u304c\u4e0a\u624b\u304f\u52d5\u304b\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2013/08/07",
      "version": "1.8.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/08/07/110857",
      "changes_i18n": {
        "en": [
          "[Add] Add \"Mark link as visited\" option.",
          "[Add] Add \"Scroll step for PageUp/PageDown\" option.",
          "[Add] Support \"Suggested Users\" page.",
          "[Change] Try to load big image by \"w\" key if \"original size image\" option is disabled.",
          "[Fix] ESC key is not working.",
          "[Fix] Shift+V key (open manga thumbnail page) is not working.",
          "[Fix] Image response support.",
          "[Fix] Can't view access restricted illust.",
          "[Fix][Firefox] Some keys are not working on Firefox23."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u300c\u30ea\u30f3\u30af\u3092\u8a2a\u554f\u6e08\u307f\u306b\u3059\u308b\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u8ffd\u52a0\u3002",
          "[\u8ffd\u52a0] \u300cPageUp/PageDown\u306e\u30b9\u30af\u30ed\u30fc\u30eb\u5e45\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u8ffd\u52a0\u3002",
          "[\u8ffd\u52a0] \u300c\u304a\u3059\u3059\u3081\u30e6\u30fc\u30b6\u30fc\u300d\u30da\u30fc\u30b8\u306b\u5bfe\u5fdc\u3002",
          "[\u5909\u66f4] \u300c\u539f\u5bf8\u306e\u753b\u50cf\u3092\u8868\u793a\u3059\u308b\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u304c\u7121\u52b9\u306b\u306a\u3063\u3066\u3044\u308b\u3068\u304d\u3001\"w\"\u30ad\u30fc\u3067\u539f\u5bf8\u306e\u753b\u50cf\u306b\u5207\u308a\u66ff\u3048\u308b\u3088\u3046\u306b\u5909\u66f4\u3002",
          "[\u4fee\u6b63] ESC\u30ad\u30fc\u304c\u52d5\u4f5c\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] Shift+V\u30ad\u30fc(\u30de\u30f3\u30ac\u30b5\u30e0\u30cd\u30a4\u30eb\u30da\u30fc\u30b8\u3092\u958b\u304f)\u304c\u52d5\u4f5c\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30a4\u30e1\u30fc\u30b8\u30ec\u30b9\u30dd\u30f3\u30b9\u306e\u51e6\u7406\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30a2\u30af\u30bb\u30b9\u5236\u9650\u304c\u8a2d\u5b9a\u3055\u308c\u3066\u3044\u308b\u30a4\u30e9\u30b9\u30c8\u3092\u958b\u3051\u306a\u3044\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63][Firefox] Firefox23\u3067\u30ad\u30fc\u64cd\u4f5c\u3067\u304d\u306a\u3044\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2013/06/26",
      "version": "1.7.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/06/26/120605",
      "changes_i18n": {
        "en": [
          "[Fix][Chrome] Greasemonkey version(.user.js) is not working on Chrome."
        ],
        "ja": [
          "[\u4fee\u6b63][Chrome] Greasemonkey\u7248\u304cChrome\u4e0a\u3067\u52d5\u4f5c\u3057\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2013/06/25",
      "version": "1.7.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/06/25/110601",
      "changes_i18n": {
        "en": [
          "Improve boot performance.",
          "[Add] Added some features that extends \"Advanced Search\" dialog.",
          "[Remove] Remove \"Change 'Stacc feed' link\" option.",
          "[Remove] Remove \"Separator style for tag list\" option.",
          "[Fix] Fix manga mode always reports error.",
          "[Fix][Firefox] Fix bookmark mode is not working on Firefox ESR 17"
        ],
        "ja": [
          "\u8d77\u52d5\u3092\u9ad8\u901f\u5316\u3002",
          "[\u8ffd\u52a0] \u300c\u691c\u7d22\u30aa\u30d7\u30b7\u30e7\u30f3\u300d\u30c0\u30a4\u30a2\u30ed\u30b0\u306b\u3044\u304f\u3064\u304b\u306e\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u8ffd\u52a0\u3059\u308b\u6a5f\u80fd\u3092\u8ffd\u52a0\u3002",
          "[\u524a\u9664] \u300c\u30b9\u30bf\u30c3\u30af\u30d5\u30a3\u30fc\u30c9\u300d\u306e\u30ea\u30f3\u30af\u5148\u3092\u5909\u66f4\u3059\u308b\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u524a\u9664\u3002",
          "[\u524a\u9664] \u300c\u30bf\u30b0\u30ea\u30b9\u30c8\u306e\u30bb\u30d1\u30ec\u30fc\u30bf\u306e\u30b9\u30bf\u30a4\u30eb\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u524a\u9664\u3002",
          "[\u4fee\u6b63] \u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u304c\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63][Firefox] Firefox ESR 17\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30e2\u30fc\u30c9\u304c\u52d5\u4f5c\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2013/05/26",
      "version": "1.6.3",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/05/25/210523",
      "changes_i18n": {
        "en": [
          "[Fix] Support new bookmark page."
        ],
        "ja": [
          "[\u4fee\u6b63] \u65b0\u3057\u3044\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30da\u30fc\u30b8\u3092\u30b5\u30dd\u30fc\u30c8\u3002"
        ]
      }
    },

    {
      "date": "2013/05/18",
      "version": "1.6.2",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/05/18/070549",
      "changes_i18n": {
        "en": [
          "[Fix] Fix author status icon.",
          "[Fix] Bookmark button is always inactive, even though it is bookmarked.",
          "[Fix] Fix loading error on Firefox21"
        ],
        "ja": [
          "[\u4fee\u6b63] \u4f5c\u8005\u306e\u30b9\u30c6\u30fc\u30bf\u30b9\u30a2\u30a4\u30b3\u30f3\u304c\u8868\u793a\u3055\u308c\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30d6\u30c3\u30af\u30de\u30fc\u30af\u3057\u3066\u3082\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30dc\u30bf\u30f3\u306e\u8868\u793a\u304c\u5909\u5316\u3057\u306a\u3044\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] Firefox21\u3067\u8aad\u307f\u8fbc\u307f\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3059\u308b\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2013/03/13",
      "version": "1.6.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/03/13/100325",
      "changes_i18n": {
        "en": [
          "[Change] Change \"Click area\" design.",
          "[Fix] Minor fix for pixiv's change."
        ],
        "ja": [
          "[\u5909\u66f4] \u79fb\u52d5\u7528\u30af\u30ea\u30c3\u30af\u30a4\u30f3\u30bf\u30fc\u30d5\u30a7\u30fc\u30b9\u306e\u30c7\u30b6\u30a4\u30f3\u3092\u5909\u66f4\u3002",
          "[\u4fee\u6b63] pixiv\u306e\u5909\u66f4\u306b\u5bfe\u5fdc\u3002"
        ]
      }
    },

    {
      "date": "2013/02/23",
      "version": "1.6.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/02/23/100201",
      "changes_i18n": {
        "en": [
          "[Add] Add resize mode settings and key bindings.",
          "[Fix] Fix author does not shown properly in popup."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u30ea\u30b5\u30a4\u30ba\u30e2\u30fc\u30c9\u306e\u8a2d\u5b9a\u3068\u30ad\u30fc\u30d0\u30a4\u30f3\u30c9\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] \u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u306b\u4f5c\u8005\u304c\u8868\u793a\u3055\u308c\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2013/02/10",
      "version": "1.5.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/02/09/210216",
      "changes_i18n": {
        "en": [
          "[Add] Add top-page layout history manager.",
          "[Fix][Extension] Fix can't save settings in General section."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u306e\u5909\u66f4\u5c65\u6b74\u3092\u7ba1\u7406\u3059\u308b\u6a5f\u80fd\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63][\u30a8\u30af\u30b9\u30c6\u30f3\u30b7\u30e7\u30f3] \u300c\u5168\u822c\u300d\u30bb\u30af\u30b7\u30e7\u30f3\u306e\u8a2d\u5b9a\u304c\u4fdd\u5b58\u3055\u308c\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2013/02/02",
      "version": "1.4.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2013/02/02/120229",
      "changes_i18n": {
        "en": [
          "[Add] Add tag association ui to bookmark mode.",
          "[Fix] Fix author does not shown properly in popup.",
          "[Fix] Fix comment view in popup.",
          "[Fix] Fix \"Add favorite user by one-click\" is not working."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u30d6\u30c3\u30af\u30de\u30fc\u30af\u30e2\u30fc\u30c9\u306b\u30bf\u30b0\u3092\u95a2\u9023\u4ed8\u3051\u308bUI\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] \u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u306b\u4f5c\u8005\u304c\u8868\u793a\u3055\u308c\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3067\u30b3\u30e1\u30f3\u30c8\u304c\u95b2\u89a7\u51fa\u6765\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u304a\u6c17\u306b\u5165\u308a\u30e6\u30fc\u30b6\u30fc\u306e\u8ffd\u52a0\u3092\u30ef\u30f3\u30af\u30ea\u30c3\u30af\u3067\u884c\u3046\u8a2d\u5b9a\u304c\u52d5\u4f5c\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/12/16",
      "version": "1.3.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/12/16/041240",
      "changes_i18n": {
        "en": [
          "[Add] Add option to remove pixiv comic icon.",
          "[Change] Improve bookmark mode layout.",
          "[Change] Improve key navigation feature in bookmark mode.",
          "[Change] Improve tag edit mode layout.",
          "[Fix] Fix tag edit mode is not working.",
          "[Fix] Can not open preferences in UserJS/Greasemonkey version."
        ],
        "ja": [
          "[\u8ffd\u52a0] pixiv\u30b3\u30df\u30c3\u30af\u30a2\u30a4\u30b3\u30f3\u3092\u9664\u53bb\u3059\u308b\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u8ffd\u52a0\u3002",
          "[\u5909\u66f4] \u30d6\u30c3\u30af\u30de\u30fc\u30af\u30e2\u30fc\u30c9\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u3092\u6539\u5584\u3002",
          "[\u5909\u66f4] \u30d6\u30c3\u30af\u30de\u30fc\u30af\u30e2\u30fc\u30c9\u306e\u30ad\u30fc\u64cd\u4f5c\u3092\u6539\u5584\u3002",
          "[\u5909\u66f4] \u30bf\u30b0\u7de8\u96c6\u30e2\u30fc\u30c9\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u3092\u6539\u5584\u3002",
          "[\u4fee\u6b63] \u30bf\u30b0\u7de8\u96c6\u30e2\u30fc\u30c9\u304c\u52d5\u304b\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] UserJS/Greasemonkey\u7248\u3067\u8a2d\u5b9a\u753b\u9762\u3092\u958b\u3051\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/12/06",
      "version": "1.2.2",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/12/06/101212",
      "changes_i18n": {
        "en": [
          "[Fix] Fix manga layout is broken.",
          "[Fix] Fix tag list layout.",
          "[Fix] Fix fail to load access-restricted illust.",
          "[Fix] Fix broken tag list with no tags."
        ],
        "ja": [
          "[\u4fee\u6b63] \u30de\u30f3\u30ac\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u304c\u5d29\u308c\u308b\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30bf\u30b0\u30ea\u30b9\u30c8\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30a2\u30af\u30bb\u30b9\u304c\u5236\u9650\u3055\u308c\u305f\u4f5c\u54c1\u3092\u95b2\u89a7\u51fa\u6765\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30a4\u30e9\u30b9\u30c8\u306b\u30bf\u30b0\u304c\u767b\u9332\u3055\u308c\u3066\u3044\u306a\u3044\u6642\u306b\u8868\u793a\u304c\u58ca\u308c\u308b\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/09/29",
      "version": "1.2.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/09/29/050955",
      "changes_i18n": {
        "en": [
          "[Fix] Minor fix for pixiv's update."
        ],
        "ja": [
          "[\u4fee\u6b63] pixiv\u306e\u5909\u66f4\u306b\u5bfe\u5fdc\u3002"
        ]
      }
    },

    {
      "date": "2012/08/27",
      "version": "1.2.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/08/27/100841",
      "changes_i18n": {
        "en": [
          "[Add] Add \"Redirect jump.php\" setting.",
          "[Fix] Fix control key support for DOM3Events.",
          "[Fix] Improve auto-manga-mode feature.",
          "[Fix] Support \"new Staccfeed\" page."
        ],
        "ja": [
          "[\u8ffd\u52a0] \"jump.php\u3092\u30ea\u30c0\u30a4\u30ec\u30af\u30c8\u3059\u308b\"\u8a2d\u5b9a\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] DOM3Event\u306eControl\u30ad\u30fc\u30b5\u30dd\u30fc\u30c8\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u81ea\u52d5\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u306e\u6319\u52d5\u3092\u6539\u5584\u3002",
          "[\u4fee\u6b63] \u300c\u65b0\u3057\u3044\u30b9\u30bf\u30c3\u30af\u30d5\u30a3\u30fc\u30c9\u300d\u3092\u30b5\u30dd\u30fc\u30c8\u3002"
        ]
      }
    },

    {
      "date": "2012/08/14",
      "version": "1.1.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/08/14/070809",
      "changes_i18n": {
        "en": [
          "[Fix] Header area hidden by click navigator.",
          "[Fix] \"Reverse\" setting applied in manga mode.",
          "[Fix] Can't read old manga if \"Use original size image\" is enabled.",
          "[Fix] Can't add or modify bookmark in staccfeed page.",
          "[Change] Change default value for some preferences.",
          "[Fix][WebKit] Status field layout is broken while loading."
        ],
        "ja": [
          "[\u4fee\u6b63] \u30af\u30ea\u30c3\u30af\u30ca\u30d3\u30b2\u30fc\u30b7\u30e7\u30f3\u306eUI\u3067\u30d8\u30c3\u30c0\u9818\u57df\u304c\u96a0\u308c\u3066\u3057\u307e\u3046\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \"\u79fb\u52d5\u65b9\u5411\u3092\u53cd\u5bfe\u306b\u3059\u308b\"\u8a2d\u5b9a\u304c\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u306b\u3082\u9069\u7528\u3055\u308c\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \"\u539f\u5bf8\u306e\u753b\u50cf\u3092\u8868\u793a\u3059\u308b\"\u304c\u6709\u52b9\u306b\u306a\u3063\u3066\u3044\u308b\u3068\u53e4\u3044\u30de\u30f3\u30ac\u4f5c\u54c1\u3092\u95b2\u89a7\u51fa\u6765\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30b9\u30bf\u30c3\u30af\u30d5\u30a3\u30fc\u30c9\u30da\u30fc\u30b8\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u306e\u8ffd\u52a0\u30fb\u7de8\u96c6\u304c\u51fa\u6765\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u5909\u66f4] \u3044\u304f\u3064\u304b\u306e\u8a2d\u5b9a\u9805\u76ee\u306e\u30c7\u30d5\u30a9\u30eb\u30c8\u5024\u3092\u5909\u66f4\u3002",
          "[\u4fee\u6b63][WebKit] \u30ed\u30fc\u30c9\u4e2d\u306e\u30b9\u30c6\u30fc\u30bf\u30b9\u8868\u793a\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u304c\u5909\u306b\u306a\u308b\u306e\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/08/09",
      "version": "1.1.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/08/09/100814",
      "changes_i18n": {
        "en": [
          "[Add] Open popup from illust link in caption(author comment).",
          "[Add] Add tag edit mode.",
          "[Fix] Don't open popup from image-response list in illust page.",
          "[Fix] Improve error handling.",
          "[Fix] Displaying html entity in title and author name.",
          "[Fix] Can' t move to another illust when in bookmark mode.",
          "[Fix] Various minor bug fixes.",
          "[Fix][Firefox] Can't send rating if \"Show confirmation dialog when rating\" option is on.",
          "[Fix][Firefox] Popup don't works on ranking page."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u5185\u306e\u30ea\u30f3\u30af\u304b\u3089\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3092\u958b\u304f\u6a5f\u80fd\u3092\u8ffd\u52a0\u3002",
          "[\u8ffd\u52a0] \u30bf\u30b0\u7de8\u96c6\u6a5f\u80fd\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] \u30a4\u30e9\u30b9\u30c8\u30da\u30fc\u30b8\u5185\u306e\u30a4\u30e1\u30fc\u30b8\u30ec\u30b9\u30dd\u30f3\u30b9\u4e00\u89a7\u304b\u3089\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u304c\u958b\u304b\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30a8\u30e9\u30fc\u51e6\u7406\u3092\u6539\u5584\u3002",
          "[\u4fee\u6b63] \u30bf\u30a4\u30c8\u30eb\u3068\u30e6\u30fc\u30b6\u30fc\u540d\u306bHTML\u30a8\u30f3\u30c6\u30a3\u30c6\u30a3\u304c\u8868\u793a\u3055\u308c\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u30d6\u30c3\u30af\u30de\u30fc\u30af\u30e2\u30fc\u30c9\u306e\u6642\u306b\u4ed6\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5\u51fa\u6765\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63] \u4ed6\u7d30\u304b\u306a\u30d0\u30b0\u4fee\u6b63\u3002",
          "[\u4fee\u6b63][Firefox] \u300c\u30a4\u30e9\u30b9\u30c8\u3092\u8a55\u4fa1\u3059\u308b\u6642\u306b\u78ba\u8a8d\u3092\u3068\u308b\u300d\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u6709\u52b9\u306b\u3057\u3066\u3044\u308b\u3068\u8a55\u4fa1\u3067\u304d\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
          "[\u4fee\u6b63][Firefox] \u30e9\u30f3\u30ad\u30f3\u30b0\u30da\u30fc\u30b8\u3067\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u304c\u958b\u304b\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/08/08",
      "version": "1.0.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/08/08/140851",
      "changes_i18n": {
        "en": [
          "Rewrite whole of source code.",
          "[Add] Add preference to specify minimum height of caption area.",
          "[Remove] Remove tag edit feature.",
          "[Remove] Remove some dead preferences.",
          "[Remove] Remove zoom feature.",
          "[Fix] Fix multilingual support."
        ],
        "ja": [
          "\u5168\u4f53\u7684\u306b\u66f8\u304d\u76f4\u3057\u3002",
          "[\u8ffd\u52a0] \u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u306e\u9ad8\u3055\u306e\u6700\u5c0f\u5024\u3092\u6307\u5b9a\u3059\u308b\u8a2d\u5b9a\u3092\u8ffd\u52a0\u3002",
          "[\u524a\u9664] \u30bf\u30b0\u7de8\u96c6\u6a5f\u80fd\u3092\u524a\u9664\u3002",
          "[\u524a\u9664] \u6a5f\u80fd\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u3044\u304f\u3064\u304b\u306e\u8a2d\u5b9a\u9805\u76ee\u3092\u524a\u9664\u3002",
          "[\u524a\u9664] \u30ba\u30fc\u30e0\u6a5f\u80fd\u3092\u524a\u9664\u3002",
          "[\u4fee\u6b63] \u591a\u8a00\u8a9e\u30b5\u30dd\u30fc\u30c8\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/08/05",
      "version": "0.9.4",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/08/05/010838",
      "changes_i18n": {
        "en": [
          "[Fix] Rating feature don't works."
        ],
        "ja": [
          "[\u4fee\u6b63] \u8a55\u4fa1\u6a5f\u80fd\u304c\u52d5\u304b\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u306e\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/08/03",
      "version": "0.9.3",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/08/03/120844",
      "changes_i18n": {
        "en": [
          "[Fix] Support pixiv's update."
        ],
        "ja": [
          "[\u4fee\u6b63] pixiv\u306e\u4ed5\u69d8\u5909\u66f4\u306b\u5bfe\u5fdc\u3002"
        ]
      }
    },

    {
      "date": "2012/06/29",
      "version": "0.9.2",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/06/29/100651",
      "changes_i18n": {
        "en": [
          "[Fix] If conf.popup.big_image=0, \"S\" key (conf.key.popup_open_big) opens medium image."
        ],
        "ja": [
          "[\u4fee\u6b63] conf.popup.big_image=0\u306e\u6642\u3001\"S\"\u30ad\u30fc(conf.key.popup_open_big)\u3067medium\u306e\u753b\u50cf\u3092\u958b\u3044\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/06/26",
      "version": "0.9.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/06/25/210620",
      "changes_i18n": {
        "en": [
          "[Fix] Corresponds to pixiv's spec changes.",
          "[Fix] In reposted illust, pixplus shows first version."
        ],
        "ja": [
          "[\u4fee\u6b63] pixiv\u306e\u4ed5\u69d8\u5909\u66f4\u306b\u5bfe\u5fdc\u3002",
          "[\u4fee\u6b63] \u30a4\u30e9\u30b9\u30c8\u304c\u518d\u6295\u7a3f\u3055\u308c\u3066\u3044\u308b\u5834\u5408\u306b\u53e4\u3044\u753b\u50cf\u3092\u8868\u793a\u3057\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/02/17",
      "version": "0.9.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/02/17/100206",
      "changes_i18n": {
        "en": [
          "[New] Added a setting to change mouse wheel operation. (conf.popup.mouse_wheel)",
          "[Fix] External links in author comment were broken."
        ],
        "ja": [
          "[\u8ffd\u52a0] \u30de\u30a6\u30b9\u30db\u30a4\u30fc\u30eb\u306e\u52d5\u4f5c\u3092\u5909\u66f4\u3059\u308b\u8a2d\u5b9a(conf.popup.mouse_wheel)\u3092\u8ffd\u52a0\u3002",
          "[\u4fee\u6b63] \u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u5185\u306e\u5916\u90e8\u30ea\u30f3\u30af\u304c\u58ca\u308c\u3066\u3044\u305f\u306e\u3092\u4fee\u6b63\u3002"
        ]
      }
    },

    {
      "date": "2012/02/11",
      "version": "0.8.3",
      "releasenote": "http://crckyl.hatenablog.com/entry/2012/02/11/150242",
      "changes": [
        "\u65b0\u7740\u30a4\u30e9\u30b9\u30c8\u30da\u30fc\u30b8\u3067\u4e0a\u624b\u304f\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30b9\u30bf\u30c3\u30af\u30d5\u30a3\u30fc\u30c9\u3067\u4e0a\u624b\u304f\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30bf\u30b0\u30ea\u30b9\u30c8\u306e\u30d5\u30ed\u30fc\u30c8\u8868\u793a\u306e\u52d5\u4f5c\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/10/27",
      "version": "0.8.2",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/10/27/111054",
      "changes": [
        "\u30a2\u30f3\u30b1\u30fc\u30c8\u306b\u56de\u7b54\u3059\u308b\u3068\u30a8\u30e9\u30fc\u30c0\u30a4\u30a2\u30ed\u30b0\u304c\u51fa\u308b\u3088\u3046\u306b\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30c8\u30c3\u30d7\u30da\u30fc\u30b8(mypage.php)\u3067\u4e0a\u624b\u304f\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/09/17",
      "version": "0.8.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/09/17/010931",
      "changes": [
        "pixiv\u306e\u5909\u66f4\u3067\u30a2\u30f3\u30b1\u30fc\u30c8\u306a\u3069\u306e\u52d5\u4f5c\u304c\u304a\u304b\u3057\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "conf.key.popup_manga_open_page\u306e\u30c7\u30d5\u30a9\u30eb\u30c8\u5024\u304c\u5909\u3060\u3063\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/09/03",
      "version": "0.8.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/09/03/010924",
      "changes": [
        "\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7ba1\u7406\u30da\u30fc\u30b8\u3067\u3001\u95b2\u89a7\u51fa\u6765\u306a\u304f\u306a\u3063\u305f\u30a4\u30e9\u30b9\u30c8\u306b\u4e00\u62ec\u3067\u30c1\u30a7\u30c3\u30af\u3092\u5165\u308c\u308b\u6a5f\u80fd\u3092\u8ffd\u52a0\u3002",
        "\u30b3\u30e1\u30f3\u30c8\u3092\u6295\u7a3f\u3059\u308b\u3068\u30b3\u30e1\u30f3\u30c8\u30d5\u30a9\u30fc\u30e0\u304c\u6d88\u3048\u3066\u3057\u307e\u3046\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30d5\u30a9\u30fc\u30e0\u3067\u30a8\u30e9\u30fc\u304c\u51fa\u308b\u3088\u3046\u306b\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u8a00\u8a9e\u30b5\u30dd\u30fc\u30c8\u3092\u6539\u5584\u3002",
        "AutoPatchWork\u7b49\u306e\u30b5\u30dd\u30fc\u30c8\u3092\u6539\u5584\u3002"
      ]
    },

    {
      "date": "2011/08/21",
      "version": "0.7.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/08/21/110824",
      "changes": [
        "\u30e9\u30f3\u30ad\u30f3\u30b0\u30da\u30fc\u30b8\u306b\u304a\u3044\u3066AutoPatchWork\u306a\u3069\u3067\u7d99\u304e\u8db3\u3057\u305f\u4e8c\u30da\u30fc\u30b8\u76ee\u4ee5\u964d\u306e\u753b\u50cf\u304c\u8868\u793a\u3055\u308c\u306a\u3044\u306e\u3092\u662f\u6b63\u3059\u308b\u6a5f\u80fd\u3092\u8ffd\u52a0\u3002",
        "\u304a\u3059\u3059\u3081\u30a4\u30e9\u30b9\u30c8\u3092\u30da\u30fc\u30b8\u306e\u53f3\u5074\u306b\u8868\u793a\u3059\u308b\u6a5f\u80fd(conf.locate_recommend_right)\u3092\u524a\u9664\u3002",
        "\u5730\u57df\u30e9\u30f3\u30ad\u30f3\u30b0(/ranking_area.php)\u306e\u65b0\u30c7\u30b6\u30a4\u30f3\u306b\u5bfe\u5fdc\u3002"
      ]
    },

    {
      "date": "2011/07/24",
      "version": "0.6.3",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/07/24/100702",
      "changes": [
        "\u30b9\u30bf\u30c3\u30af\u30d5\u30a3\u30fc\u30c9\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u3057\u3088\u3046\u3068\u3059\u308b\u3068\u30a8\u30e9\u30fc\u304c\u51fa\u308b\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u300c\u30b9\u30e9\u30a4\u30c9\u30e2\u30fc\u30c9\u300d\u8a2d\u5b9a\u306e\u6642\u3001\u30de\u30f3\u30ac\u3092\u95b2\u89a7\u51fa\u6765\u306a\u3044\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30e9\u30f3\u30ad\u30f3\u30b0\u3067\u4e0a\u624b\u304f\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/06/26",
      "version": "0.6.2",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/06/26/010657",
      "changes": [
        "\u8a2d\u5b9a\u753b\u9762\u3078\u306e\u30ea\u30f3\u30af\u304c\u8868\u793a\u3055\u308c\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30a4\u30d9\u30f3\u30c8\u306e\u7279\u8a2d\u30da\u30fc\u30b8(e.g. /event_starfestival2011.php)\u3067\u52d5\u4f5c\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/05/21",
      "version": "0.6.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/05/21/030509",
      "changes": [
        "Opera10.1x\u3067\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u30bf\u30b0\u691c\u7d22(ex. /tags.php?tag=pixiv)\u3067\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30a8\u30e9\u30fc\u8868\u793a\u306e\u52d5\u4f5c\u304c\u5909\u3060\u3063\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "conf.popup_ranking_log\u3092\u524a\u9664\u3002",
        "\u65b0\u7740\u30da\u30fc\u30b8\u3067\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "conf.locate_recommend_right\u304c\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/05/13",
      "version": "0.6.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/05/13/120515",
      "changes": [
        "\u30ad\u30fc\u30d0\u30a4\u30f3\u30c9\u306e\u30ab\u30b9\u30bf\u30de\u30a4\u30ba\u6a5f\u80fd\u3092\u8ffd\u52a0\u3002",
        "\u30a4\u30e9\u30b9\u30c8\u30da\u30fc\u30b8\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u306e\u51e6\u7406\u304c\u52d5\u4f5c\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30e9\u30a4\u30bb\u30f3\u30b9\u3092Apache License 2.0\u306b\u5909\u66f4\u3002",
        "Webkit\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30d5\u30a9\u30fc\u30e0\u306e\u8868\u793a\u304c\u5909\u3060\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u3092\u30d0\u30c3\u30af\u30a2\u30c3\u30d7\u3059\u308b\u6a5f\u80fd\u3092\u8ffd\u52a0(\u5fa9\u6d3b)\u3002",
        "Chrome\u3067\u30bb\u30f3\u30bf\u30fc\u30af\u30ea\u30c3\u30af\u306b\u3082\u53cd\u5fdc\u3057\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "Webkit\u3067\u306e\u30ad\u30fc\u64cd\u4f5c\u3092\u6539\u5584\u3002",
        "\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30d5\u30a9\u30fc\u30e0\u306a\u3069\u306e\u52d5\u4f5c\u304c\u5909\u306b\u306a\u3063\u3066\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u691c\u7d22\u30da\u30fc\u30b8\u3067\u52d5\u304b\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/03/26",
      "version": "0.5.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/03/26/010347",
      "changes": [
        "\u304a\u3059\u3059\u3081\u30a4\u30e9\u30b9\u30c8\u304c\u975e\u8868\u793a\u306e\u6642\u3082conf.locate_recommend_right\u304c\u52d5\u4f5c\u3057\u3066\u3057\u307e\u3046\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "conf.extagedit\u3092\u5ec3\u6b62\u3057\u3066conf.bookmark_form\u306b\u5909\u66f4\u3002",
        "pixiv\u306e\u8a00\u8a9e\u8a2d\u5b9a\u304c\u65e5\u672c\u8a9e\u4ee5\u5916\u306e\u6642\u306b\u30de\u30f3\u30ac\u304c\u95b2\u89a7\u3067\u304d\u306a\u304b\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30de\u30f3\u30ac\u306e\u898b\u958b\u304d\u8868\u793a\u3092\u4fee\u6b63\u3002",
        "Firefox4\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7de8\u96c6\u753b\u9762\u3067\u30bf\u30b0\u3092\u9078\u629e\u3067\u304d\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u30d6\u30c3\u30af\u30de\u30fc\u30af\u6e08\u307f\u306e\u30a4\u30e9\u30b9\u30c8\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30dc\u30bf\u30f3\u304c\u8868\u793a\u3055\u308c\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/02/15",
      "version": "0.5.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/02/15/110202",
      "changes": [
        "conf.extension\u3092\u5ec3\u6b62\u3002Opera\u62e1\u5f35\u7248\u306e\u30c4\u30fc\u30eb\u30d0\u30fc\u30a2\u30a4\u30b3\u30f3\u3092\u524a\u9664\u3002",
        "Firefox\u3067\u30b3\u30e1\u30f3\u30c8\u8868\u793a\u6a5f\u80fd\u304c\u52d5\u4f5c\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "Firefox\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7de8\u96c6\u30d5\u30a9\u30fc\u30e0\u3067\u30a2\u30ed\u30fc\u30ad\u30fc\u3067\u30bf\u30b0\u9078\u629e\u3092\u884c\u3046\u6642\u306b\u5165\u529b\u5c65\u6b74\u304c\u8868\u793a\u3055\u308c\u308b\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u306e\u30bf\u30b0\u7de8\u96c6\u306eUI\u3092\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7de8\u96c6\u3068\u540c\u3058\u306b\u5909\u66f4\u3002",
        "\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3067\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7de8\u96c6\u30e2\u30fc\u30c9\u306e\u307e\u307e\u4ed6\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u79fb\u52d5\u3059\u308b\u3068\u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u304c\u8868\u793a\u3055\u308c\u306a\u304f\u306a\u308b\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u30de\u30f3\u30ac\u30e2\u30fc\u30c9\u3067\u3082\u53ef\u80fd\u306a\u3089\u539f\u5bf8\u306e\u753b\u50cf\u3092\u4f7f\u7528\u3059\u308b\u3088\u3046\u306b\u5909\u66f4\u3002",
        "\u30e1\u30f3\u30d0\u30fc\u30a4\u30e9\u30b9\u30c8\u30da\u30fc\u30b8\u306a\u3069\u3092\u958b\u3044\u305f\u6642\u306b\u8a55\u4fa1\u306a\u3069\u304c\u51fa\u6765\u306a\u3044\u5834\u5408\u304c\u3042\u308b\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u8a2d\u5b9a\u753b\u9762\u306e\u30c7\u30b6\u30a4\u30f3\u3092\u5909\u66f4\u3002",
        "Opera10.1x\u3067\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3092\u958b\u3044\u305f\u6642\u306b\u753b\u50cf\u304c\u8868\u793a\u3055\u308c\u306a\u3044\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u5c0f\u8aac\u30da\u30fc\u30b8\u3067\u8a55\u4fa1\u3067\u304d\u306a\u304b\u3063\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "conf.expand_novel\u3092\u524a\u9664\u3002",
        "\u4ed6\u30e6\u30fc\u30b6\u30fc\u306e\u30d6\u30c3\u30af\u30de\u30fc\u30af\u30da\u30fc\u30b8\u3067\u52d5\u304b\u306a\u304f\u306a\u3063\u3066\u305f\u306e\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/02/04",
      "version": "0.4.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/02/04/130234",
      "changes": [
        "pixivreader\u3068\u885d\u7a81\u3059\u308b\u3089\u3057\u3044\u306e\u3067\u3001exclude\u306b\u8ffd\u52a0\u3002",
        "\u8a2d\u5b9a\u307e\u308f\u308a\u3092\u4f5c\u308a\u76f4\u3057\u3002Chrome/Safari\u62e1\u5f35\u7248\u306b\u30aa\u30d7\u30b7\u30e7\u30f3\u30da\u30fc\u30b8\u8ffd\u52a0\u3002\u8a2d\u5b9a\u304c\u5f15\u304d\u7d99\u304c\u308c\u306a\u3044\u3002",
        "OperaExtension\u7248\u3067\u52d5\u4f5c\u3057\u306a\u3044\u5834\u5408\u304c\u3042\u308b\u30d0\u30b0\u3092\u305f\u3076\u3093\u4fee\u6b63\u3002",
        "\u95b2\u89a7\u3067\u304d\u306a\u3044\u30de\u30f3\u30ac\u304c\u3042\u3063\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u30ba\u30fc\u30e0\u6a5f\u80fd\u3067Firefox\u3092\u30b5\u30dd\u30fc\u30c8\u3002",
        "\u4f01\u753b\u76ee\u9332\u95a2\u9023\u30da\u30fc\u30b8\u306b\u5bfe\u5fdc\u3002",
        "\u30de\u30f3\u30ac\u30da\u30fc\u30b8\u306e\u5909\u66f4(\u898b\u958b\u304d\u8868\u793a\u306a\u3069)\u306b\u5bfe\u5fdc\u3002\u305d\u308c\u306b\u4f34\u3063\u3066conf.default_manga_type\u3068conf.popup_manga_tb\u3092\u524a\u9664\u3002",
        "\u4f5c\u54c1\u7ba1\u7406\u30da\u30fc\u30b8\u3067\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "Chrome/Safari\u3067AutoPatchWork\u306b\u5bfe\u5fdc\u3002"
      ]
    },

    {
      "date": "2011/01/15",
      "version": "0.3.2",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/01/14/150150",
      "changes": [
        "\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7ba1\u7406\u30da\u30fc\u30b8\u3067\u4e0a\u624b\u304f\u52d5\u4f5c\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2011/01/14",
      "version": "0.3.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2011/01/14/090139",
      "changes": [
        "Opera\u4ee5\u5916\u306e\u30d6\u30e9\u30a6\u30b6\u306b\u304a\u3044\u3066\u4e00\u90e8\u306e\u30da\u30fc\u30b8\u3067\u8a55\u4fa1\u3084\u30b3\u30e1\u30f3\u30c8\u8868\u793a\u306a\u3069\u306e\u6a5f\u80fd\u306e\u52d5\u4f5c\u304c\u5909\u3060\u3063\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "conf.popup.rate_key=true\u306e\u6642\u3001Shift\u30ad\u30fc\u306a\u3057\u3067\u8a55\u4fa1\u3067\u304d\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "ChromeExtension/SafariExtension\u7248\u3067\u81ea\u52d5\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8\u306b\u5bfe\u5fdc\u3002",
        "OperaExtension\u7248\u306e\u30aa\u30d7\u30b7\u30e7\u30f3\u30da\u30fc\u30b8\u3067\u6570\u5024\u304cNaN\u306b\u306a\u308b\u5834\u5408\u304c\u3042\u308b\u30d0\u30b0\u3092\u305f\u3076\u3093\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2010/12/26",
      "version": "0.3.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2010/12/26/011246",
      "changes": [
        "conf.fast_user_bookmark\u8ffd\u52a0\u3002",
        "\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u753b\u50cf\u306e\u5de6\u4e0a\u306b\u30a2\u30a4\u30b3\u30f3(\u30c1\u30a7\u30c3\u30af:\u304a\u6c17\u306b\u5165\u308a/\u30cf\u30fc\u30c8:\u76f8\u4e92/\u65d7:\u30de\u30a4\u30d4\u30af)\u3092\u8868\u793a\u3059\u308b\u6a5f\u80fd(conf.popup.author_status_icon)\u8ffd\u52a0\u3002",
        "\u30b3\u30e1\u30f3\u30c8\u8868\u793a\u6a5f\u80fd\u3092\u8ffd\u52a0\u3002",
        "\u30a2\u30f3\u30b1\u30fc\u30c8\u7d50\u679c\u306e\u8868\u793a\u3092\u5909\u66f4\u3002",
        "\u95b2\u89a7\u30fb\u8a55\u4fa1\u30fb\u30b3\u30e1\u30f3\u30c8\u5c65\u6b74\u30da\u30fc\u30b8\u306b\u5bfe\u5fdc\u3002",
        "\u30ad\u30fc\u30d0\u30a4\u30f3\u30c9\u3092\u5909\u66f4\u3002Shift+c:\u30b3\u30e1\u30f3\u30c8\u8868\u793a/d:\u30a2\u30f3\u30b1\u30fc\u30c8/a:\u623b\u308b",
        "\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u306e\u30a4\u30d9\u30f3\u30c8API\u3092Popup.on*\u306e\u307f\u306b\u5909\u66f4\u3002",
        "conf.expand_novel\u8ffd\u52a0\u3002",
        "\u30e9\u30f3\u30ad\u30f3\u30b0\u30ab\u30ec\u30f3\u30c0\u30fc\u306b\u5bfe\u5fdc\u3002conf.popup_ranking_log\u8ffd\u52a0\u3002",
        "\u30a4\u30d9\u30f3\u30c8\u8a73\u7d30/\u53c2\u52a0\u8005\u30da\u30fc\u30b8\u306b\u5bfe\u5fdc\u3002",
        "Extension\u7248\u306b\u30c4\u30fc\u30eb\u30d0\u30fc\u30dc\u30bf\u30f3\u3068\u8a2d\u5b9a\u753b\u9762\u3092\u8ffd\u52a0\u3002conf.extension.*\u8ffd\u52a0\u3002",
        "\u30bf\u30b0\u306e\u4e26\u3079\u66ff\u3048\u3092\u8a2d\u5b9a\u3057\u3066\u3044\u306a\u3044\u6642\u3001\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7de8\u96c6\u306e\u52d5\u4f5c\u304c\u304a\u304b\u3057\u304b\u3063\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2010/12/01",
      "version": "0.2.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2010/12/01/091212",
      "changes": [
        "Extension\u7248\u3067\u30a2\u30f3\u30b1\u30fc\u30c8\u306b\u7b54\u3048\u3089\u308c\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u306e\u30ec\u30a4\u30a2\u30a6\u30c8\u3092\u30d0\u30c3\u30af\u30a2\u30c3\u30d7\u3059\u308b\u6a5f\u80fd\u8ffd\u52a0\u3002",
        "Extension\u7248\u306e\u81ea\u52d5\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8\u306b\u5bfe\u5fdc\u3002",
        "\u4e0a\u4e0b\u30ad\u30fc\u3067\u30ad\u30e3\u30d7\u30b7\u30e7\u30f3\u3092\u30b9\u30af\u30ed\u30fc\u30eb\u3059\u308b\u3088\u3046\u306b\u5909\u66f4\u3002conf.popup.scroll_height\u8ffd\u52a0\u3002",
        "\u753b\u50cf\u3092\u62e1\u5927/\u7e2e\u5c0f\u3059\u308b\u30ad\u30fc\u3092o/i\u304b\u3089+/-\u306b\u5909\u66f4\u3002",
        "d\u30ad\u30fc(\u524d\u306e\u30a4\u30e9\u30b9\u30c8\u306b\u623b\u308b)\u3092\u30ad\u30fc\u30d0\u30a4\u30f3\u30c9\u306b\u8ffd\u52a0\u3002"
      ]
    },

    {
      "date": "2010/11/14",
      "version": "0.1.2",
      "releasenote": "http://crckyl.hatenablog.com/entry/2010/11/14/141112",
      "changes": [
        "\u4e00\u90e8\u306e\u30da\u30fc\u30b8\u3067\u30a2\u30f3\u30b1\u30fc\u30c8\u7d50\u679c\u3092\u8868\u793a\u51fa\u6765\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u30a2\u30f3\u30b1\u30fc\u30c8\u306b\u7b54\u3048\u305f\u5f8c\u3001\u9078\u629e\u80a2\u304c\u8868\u793a\u3055\u308c\u305f\u307e\u307e\u306b\u306a\u3063\u3066\u3044\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u30b9\u30bf\u30c3\u30af\u30d5\u30a3\u30fc\u30c9\u4e0a\u3067\u8a55\u4fa1\u3084\u30bf\u30b0\u7de8\u96c6\u304c\u51fa\u6765\u306a\u304b\u3063\u305f\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "\u30de\u30a6\u30b9\u64cd\u4f5c\u7528UI\u306e\u8868\u793a\u3092\u5909\u66f4\u3002",
        "conf.popup.overlay_control\u8ffd\u52a0\u3002",
        "\u30de\u30f3\u30ac\u30da\u30fc\u30b8(mode=manga)\u3067\u6539\u30da\u30fc\u30b8\u51fa\u6765\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002",
        "\u8a55\u4fa1\u51fa\u6765\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u4e0d\u5177\u5408\u3092\u4fee\u6b63\u3002"
      ]
    },

    {
      "date": "2010/11/02",
      "version": "0.1.1",
      "releasenote": "http://crckyl.hatenablog.com/entry/2010/11/02/091131",
      "changes": [
        "\u30a4\u30d9\u30f3\u30c8\u30da\u30fc\u30b8(e.g. http://www.pixiv.net/event_halloween2010.php)\u7528\u306e\u6c4e\u7528\u30b3\u30fc\u30c9\u8ffd\u52a0\u3002",
        "conf.locate_recommend_right\u304c2\u306e\u6642\u3001\u4e0a\u624b\u304f\u52d5\u4f5c\u3057\u306a\u3044\u5834\u5408\u304c\u3042\u308b\u30d0\u30b0\u3092\u4fee\u6b63\u3002",
        "pixiv\u306e\u5909\u66f4(\u8a55\u4fa1\u3001\u30e9\u30f3\u30ad\u30f3\u30b0\u3001etc)\u306b\u5bfe\u5fdc\u3002"
      ]
    },

    {
      "date": "2010/10/27",
      "version": "0.1.0",
      "releasenote": "http://crckyl.hatenablog.com/entry/2010/10/27/121045",
      "changes": [
        "Opera11\u306eExtension\u306b\u5bfe\u5fdc\u3002",
        "\u30d6\u30c3\u30af\u30de\u30fc\u30af\u7ba1\u7406\u30da\u30fc\u30b8\u3067\u30ec\u30b3\u30e1\u30f3\u30c9\u3092\u53f3\u5074\u306b\u4e26\u3079\u308b\u6a5f\u80fd\u304c\u52d5\u4f5c\u3057\u306a\u304f\u306a\u3063\u3066\u3044\u305f\u306e\u3092\u4fee\u6b63\u3002",
        "AutoPatchWork\u306b\u5bfe\u5fdc\u3002"
      ]
    }
    // __CHANGELOG_END__
  ];

  /* __DATA_END__ */

  _.run();
});
