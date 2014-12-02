/*!
 * Ionic Analytics Client
 * Copyright 2014 Drifty Co. http://drifty.com/
 * See LICENSE in this repository for license information
 */
(function(){
!function(name, context, definition){if (typeof define == "function" && define.amd) {define("keen", [], function(lib){ return definition(); });}if ( typeof module === "object" && typeof module.exports === "object" ) {module.exports = definition();} else {context[name] = definition();}}("Keen", this, function(Keen) {"use strict";

/*!
 * ----------------------
 * Keen IO Core
 * ----------------------
 */

function Keen(config) {
  this.configure(config || {});
}

Keen.version = "3.1.0"; // replaced

Keen.utils = {};

Keen.canXHR = false;
if (typeof XMLHttpRequest === "object" || typeof XMLHttpRequest === "function") {
  if ("withCredentials" in new XMLHttpRequest()) {
    Keen.canXHR = true;
  }
}

Keen.urlMaxLength = 16000;
if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0) {
  Keen.urlMaxLength = 2000;
}

Keen.enabled = true;

Keen.loaded = true;
Keen.ready = function(callback){
  if (Keen.loaded) {
    callback();
  } else {
    Keen.on('ready', callback);
  }
};

Keen.debug = false;
Keen.log = function(message) {
  if (Keen.debug && typeof console == "object") {
    console.log('[Keen IO]', message);
  }
};

var Events = Keen.Events = {
  on: function(name, callback) {
    this.listeners || (this.listeners = {});
    var events = this.listeners[name] || (this.listeners[name] = []);
    events.push({callback: callback});
    return this;
  },
  once: function(name, callback, context) {
    var self = this;
    var once = _once(function() {
      self.off(name, once);
      callback.apply(this, arguments);
    });
    once._callback = callback;
    return self.on(name, once, context);
  },
  off: function(name, callback, context) {
    if (!this.listeners) return this;

    // Remove all callbacks for all events.
    if (!name && !callback && !context) {
      this.listeners = void 0;
      return this;
    }

    var names = [];
    if (name) {
      names.push(name);
    } else {
      _each(this.listeners, function(value, key){
        names.push(key);
      });
    }

    for (var i = 0, length = names.length; i < length; i++) {
      name = names[i];

      // Bail out if there are no events stored.
      var events = this.listeners[name];
      if (!events) continue;

      // Remove all callbacks for this event.
      if (!callback && !context) {
        delete this.listeners[name];
        continue;
      }

      // Find any remaining events.
      var remaining = [];
      for (var j = 0, k = events.length; j < k; j++) {
        var event = events[j];
        if (
          callback && callback !== event.callback &&
          callback !== event.callback._callback ||
          context && context !== event.context
        ) {
          remaining.push(event);
        }
      }

      // Replace events if there are any remaining.  Otherwise, clean up.
      if (remaining.length) {
        this.listeners[name] = remaining;
      } else {
        delete this.listeners[name];
      }
    }

    return this;
  },
  trigger: function(name) {
    if (!this.listeners) return this;
    var args = Array.prototype.slice.call(arguments, 1);
    var events = this.listeners[name] || [];
    for (var i = 0; i < events.length; i++) {
      events[i]['callback'].apply(this, args);
    }
    return this;
  }
};

function _once(func) {
  var ran = false, memo;
  return function() {
    if (ran) return memo;
    ran = true;
    memo = func.apply(this, arguments);
    func = null;
    return memo;
  };
}

_extend(Keen.prototype, Events);
_extend(Keen, Events);

function _loadAsync(){
  var loaded = window['Keen'],
      cached = window['_' + 'Keen'] || {},
      clients,
      ready;

  if (loaded && cached) {
    clients = cached['clients'] || {},
    ready = cached['ready'] || [];

    for (var instance in clients) {
      if (clients.hasOwnProperty(instance)) {
        var client = clients[instance];

        // Map methods to existing instances
        for (var method in Keen.prototype) {
          if (Keen.prototype.hasOwnProperty(method)) {
            loaded.prototype[method] = Keen.prototype[method];
          }
        }

        // Map additional methods as necessary
        loaded.Query = (Keen.Query) ? Keen.Query : function(){};
        loaded.Visualization = (Keen.Visualization) ? Keen.Visualization : function(){};

        // Run Configuration
        if (client._config) {
          client.configure.call(client, client._config);
          client._config = undefined;
          try{
            delete client._config;
          }catch(e){}
        }

        // Add Global Properties
        if (client._setGlobalProperties) {
          var globals = client._setGlobalProperties;
          for (var i = 0; i < globals.length; i++) {
            client.setGlobalProperties.apply(client, globals[i]);
          }
          client._setGlobalProperties = undefined;
          try{
            delete client._setGlobalProperties;
          }catch(e){}
        }

        // Send Queued Events
        if (client._addEvent) {
          var queue = client._addEvent || [];
          for (var i = 0; i < queue.length; i++) {
            client.addEvent.apply(client, queue[i]);
          }
          client._addEvent = undefined;
          try{
            delete client._addEvent;
          }catch(e){}
        }

        // Create "on" Events
        var callback = client._on || [];
        if (client._on) {
          for (var i = 0; i < callback.length; i++) {
            client.on.apply(client, callback[i]);
          }
          client.trigger('ready');
          client._on = undefined;
          try{
            delete client._on;
          }catch(e){}
        }

      }
    }

    for (var i = 0; i < ready.length; i++) {
      var callback = ready[i];
      Keen.once('ready', function(){
        callback();
      });
    };
  }
}

Keen.prototype.addEvent = function(eventCollection, payload, success, error) {
  var response;
  if (!eventCollection || typeof eventCollection !== "string") {
    response = "Event not recorded: Collection name must be a string";
    Keen.log(response);
    if (error) error.call(this, response);
    return;
  }
  _uploadEvent.apply(this, arguments);
};

Keen.prototype.configure = function(cfg){
  var config = cfg || {};

  if (!Keen.canXHR && config.requestType === "xhr") {
    config.requestType = "jsonp";
  }

  if (config["host"]) {
    config["host"].replace(/.*?:\/\//g, '');
  }

  if (config.protocol && config.protocol === "auto") {
    config["protocol"] = location.protocol.replace(/:/g, '');
  }

  this.config = {
    projectId   : config.projectId,
    writeKey    : config.writeKey,
    readKey     : config.readKey,
    masterKey   : config.masterKey,
    requestType : config.requestType || "jsonp",
    host        : config["host"]     || "api.keen.io/3.0",
    protocol    : config["protocol"] || "https",
    globalProperties: null
  };

  this.trigger('ready');
  Keen.trigger('client', this, config);
};

Keen.prototype.masterKey = function(str){
  if (!arguments.length) return this.config.masterKey;
  this.config.masterKey = (str ? String(str) : null);
  return this;
};

Keen.prototype.projectId = function(str){
  if (!arguments.length) return this.config.projectId;
  this.config.projectId = (str ? String(str) : null);
  return this;
};

Keen.prototype.readKey = function(str){
  if (!arguments.length) return this.config.readKey;
  this.config.readKey = (str ? String(str) : null);
  return this;
};

Keen.prototype.setGlobalProperties = function(newGlobalProperties) {
  if (newGlobalProperties && typeof(newGlobalProperties) == "function") {
    this.config.globalProperties = newGlobalProperties;
  } else {
    Keen.log('Invalid value for global properties: ' + newGlobalProperties);
  }
};

Keen.prototype.trackExternalLink = function(jsEvent, eventCollection, payload, timeout, timeoutCallback){

  var evt = jsEvent,
      target = (evt.currentTarget) ? evt.currentTarget : (evt.srcElement || evt.target),
      timer = timeout || 500,
      triggered = false,
      targetAttr = "",
      callback,
      win;

  if (target.getAttribute !== void 0) {
    targetAttr = target.getAttribute("target");
  } else if (target.target) {
    targetAttr = target.target;
  }

  if ((targetAttr == "_blank" || targetAttr == "blank") && !evt.metaKey) {
    win = window.open("about:blank");
    win.document.location = target.href;
  }

  if (target.nodeName === "A") {
    callback = function(){
      if(!triggered && !evt.metaKey && (targetAttr !== "_blank" && targetAttr !== "blank")){
        triggered = true;
        window.location = target.href;
      }
    };
  } else if (target.nodeName === "FORM") {
    callback = function(){
      if(!triggered){
        triggered = true;
        target.submit();
      }
    };
  } else {
    Keen.log("#trackExternalLink method not attached to an <a> or <form> DOM element");
  }

  if (timeoutCallback) {
    callback = function(){
      if(!triggered){
        triggered = true;
        timeoutCallback();
      }
    };
  }
  _uploadEvent.call(this, eventCollection, payload, callback, callback);

  setTimeout(callback, timer);

  if (!evt.metaKey) {
    return false;
  }
};

Keen.prototype.url = function(path){
  return this.config.protocol + "://" + this.config.host + path;
};

Keen.prototype.writeKey = function(str){
  if (!arguments.length) return this.config.writeKey;
  this.config.writeKey = (str ? String(str) : null);
  return this;
};

function _clone(target) {
  return JSON.parse(JSON.stringify(target));
}
function _each(o, cb, s){
  var n;
  if (!o){
    return 0;
  }
  s = !s ? o : s;
  if (o instanceof Array){
    // Indexed arrays, needed for Safari
    for (n=0; n<o.length; n++) {
      if (cb.call(s, o[n], n, o) === false){
        return 0;
      }
    }
  } else {
    // Hashtables
    for (n in o){
      if (o.hasOwnProperty(n)) {
        if (cb.call(s, o[n], n, o) === false){
          return 0;
        }
      }
    }
  }
  return 1;
}
_extend(Keen.utils, { each: _each });

function _extend(target){
  for (var i = 1; i < arguments.length; i++) {
    for (var prop in arguments[i]){
      target[prop] = arguments[i][prop];
    }
  }
  return target;
}
_extend(Keen.utils, { extend: _extend });

function _parseParams(str){
  // via: http://stackoverflow.com/a/2880929/2511985
  var urlParams = {},
      match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = str.split("?")[1];

  while (!!(match=search.exec(query))) {
    urlParams[decode(match[1])] = decode(match[2]);
  }
  return urlParams;
}
_extend(Keen.utils, { parseParams: _parseParams });

function _sendBeacon(url, params, success, error){
  var successCallback = success,
      errorCallback = error,
      loaded = false,
      img = document.createElement("img");

  success = null;
  error = null;

  img.onload = function() {
    loaded = true;
    if ('naturalHeight' in this) {
      if (this.naturalHeight + this.naturalWidth === 0) {
        this.onerror();
        return;
      }
    } else if (this.width + this.height === 0) {
      this.onerror();
      return;
    }
    if (successCallback) {
      successCallback({created: true});
      successCallback = errorCallback = null;
    }
  };
  img.onerror = function() {
    loaded = true;
    if (errorCallback) {
      errorCallback();
      successCallback = errorCallback = null;
    }
  };
  img.src = url + "&c=clv1";
}

function _sendJsonp(url, params, success, error){
  var timestamp = new Date().getTime(),
      successCallback = success,
      errorCallback = error,
      script = document.createElement("script"),
      parent = document.getElementsByTagName("head")[0],
      callbackName = "keenJSONPCallback",
      loaded = false;

  success = null;
  error = null;

  callbackName += timestamp;
  while (callbackName in window) {
    callbackName += "a";
  }
  window[callbackName] = function(response) {
    if (loaded === true) return;
    loaded = true;
    if (successCallback && response) {
      successCallback(response);
    };
    cleanup();
  };

  script.src = url + "&jsonp=" + callbackName;
  parent.appendChild(script);

  // for early IE w/ no onerror event
  script.onreadystatechange = function() {
    if (loaded === false && this.readyState === "loaded") {
      loaded = true;
      if (errorCallback) {
        errorCallback();
      }
    }
  };

  // non-ie, etc
  script.onerror = function() {
    // on IE9 both onerror and onreadystatechange are called
    if (loaded === false) {
      loaded = true;
      if (errorCallback) {
        errorCallback();
      }
      cleanup();
    }
  };

  function cleanup(){
    window[callbackName] = undefined;
    try{
      delete window[callbackName];
    }catch(e){}
    successCallback = errorCallback = null;
    parent.removeChild(script);
  }
}

function _sendXhr(method, url, headers, body, success, error){
  var ids = ['MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP', 'Microsoft.XMLHTTP'],
      successCallback = success,
      errorCallback = error,
      payload,
      xhr;

  success = null;
  error = null;

  if (window.XMLHttpRequest) {
    xhr = new XMLHttpRequest();
  }
  else {
    // Legacy IE support: look up alts if XMLHttpRequest is not available
    for (var i = 0; i < ids.length; i++) {
      try {
        xhr = new ActiveXObject(ids[i]);
        break;
      } catch(e) {}
    }
  }

  xhr.onreadystatechange = function() {
    var response;
    if (xhr.readyState == 4) {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          response = JSON.parse(xhr.responseText);
        } catch (e) {
          Keen.log("Could not parse HTTP response: " + xhr.responseText);
          if (errorCallback) {
            errorCallback(xhr, e);
            successCallback = errorCallback = null;
          }
        }
        if (successCallback && response) {
          successCallback(response);
          successCallback = errorCallback = null;
        }
      } else {
        Keen.log("HTTP request failed.");
        if (errorCallback) {
          errorCallback(xhr, null);
          successCallback = errorCallback = null;
        }
      }
    }
  };

  xhr.open(method, url, true);

  _each(headers, function(value, key){
    xhr.setRequestHeader(key, value);
  });

  if (body) {
    payload = JSON.stringify(body);
  }

  if (method && method.toUpperCase() === "GET") {
    xhr.send();
  } else if (method && method.toUpperCase() === "POST") {
    xhr.send(payload);
  }

}

function _uploadEvent(eventCollection, payload, success, error) {
  var urlBase, urlQueryString, reqType, data;

  if (!Keen.enabled) {
    Keen.log("Event not recorded: Keen.enabled = false");
    return;
  }

  if (!this.projectId()) {
    Keen.log("Event not recorded: Missing projectId property");
    return;
  }

  if (!this.writeKey()) {
    Keen.log("Event not recorded: Missing writeKey property");
    return;
  }

  urlBase = this.url("/projects/" + this.projectId() + "/events/" + eventCollection);
  urlQueryString = "";
  reqType = this.config.requestType;
  data = {};

  // Add properties from client.globalProperties
  if (this.config.globalProperties) {
    data = this.config.globalProperties(eventCollection);
  }

  // Add properties from user-defined event
  _each(payload, function(value, key){
    data[key] = value;
  });

  if (reqType !== "xhr") {
    urlQueryString += "?api_key="  + encodeURIComponent( this.writeKey() );
    urlQueryString += "&data="     + encodeURIComponent( Keen.Base64.encode( JSON.stringify(data) ) );
    urlQueryString += "&modified=" + encodeURIComponent( new Date().getTime() );

    if ( String(urlBase + urlQueryString).length < Keen.urlMaxLength ) {
      if (reqType === "jsonp") {
        _sendJsonp(urlBase + urlQueryString, null, success, error);
      } else {
        _sendBeacon(urlBase + urlQueryString, null, success, error);
      }
      return;
    }
  }
  if (Keen.canXHR) {
    _sendXhr("POST", urlBase, { "Authorization": this.writeKey(), "Content-Type": "application/json" }, data, success, error);
  } else {
    Keen.log("Event not sent: URL length exceeds current browser limit, and XHR (POST) is not supported.");
  }
  return;
};

/*!
  * ----------------------------------------
  * Keen IO Base64 Transcoding
  * ----------------------------------------
  */

  Keen.Base64 = {
    map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode: function (n) {
      "use strict";
      var o = "", i = 0, m = this.map, i1, i2, i3, e1, e2, e3, e4;
      n = this.utf8.encode(n);
      while (i < n.length) {
        i1 = n.charCodeAt(i++); i2 = n.charCodeAt(i++); i3 = n.charCodeAt(i++);
        e1 = (i1 >> 2); e2 = (((i1 & 3) << 4) | (i2 >> 4)); e3 = (isNaN(i2) ? 64 : ((i2 & 15) << 2) | (i3 >> 6));
        e4 = (isNaN(i2) || isNaN(i3)) ? 64 : i3 & 63;
        o = o + m.charAt(e1) + m.charAt(e2) + m.charAt(e3) + m.charAt(e4);
      } return o;
    },
    decode: function (n) {
      "use strict";
      var o = "", i = 0, m = this.map, cc = String.fromCharCode, e1, e2, e3, e4, c1, c2, c3;
      n = n.replace(/[^A-Za-z0-9\+\/\=]/g, "");
      while (i < n.length) {
        e1 = m.indexOf(n.charAt(i++)); e2 = m.indexOf(n.charAt(i++));
        e3 = m.indexOf(n.charAt(i++)); e4 = m.indexOf(n.charAt(i++));
        c1 = (e1 << 2) | (e2 >> 4); c2 = ((e2 & 15) << 4) | (e3 >> 2);
        c3 = ((e3 & 3) << 6) | e4;
        o = o + (cc(c1) + ((e3 != 64) ? cc(c2) : "")) + (((e4 != 64) ? cc(c3) : ""));
      } return this.utf8.decode(o);
    },
    utf8: {
      encode: function (n) {
        "use strict";
        var o = "", i = 0, cc = String.fromCharCode, c;
        while (i < n.length) {
          c = n.charCodeAt(i++); o = o + ((c < 128) ? cc(c) : ((c > 127) && (c < 2048)) ?
          (cc((c >> 6) | 192) + cc((c & 63) | 128)) : (cc((c >> 12) | 224) + cc(((c >> 6) & 63) | 128) + cc((c & 63) | 128)));
          } return o;
      },
      decode: function (n) {
        "use strict";
        var o = "", i = 0, cc = String.fromCharCode, c2, c;
        while (i < n.length) {
          c = n.charCodeAt(i);
          o = o + ((c < 128) ? [cc(c), i++][0] : ((c > 191) && (c < 224)) ?
          [cc(((c & 31) << 6) | ((c2 = n.charCodeAt(i + 1)) & 63)), (i += 2)][0] :
          [cc(((c & 15) << 12) | (((c2 = n.charCodeAt(i + 1)) & 63) << 6) | ((c3 = n.charCodeAt(i + 2)) & 63)), (i += 3)][0]);
        } return o;
      }
    }
  };

/*! 
  * --------------------------------------------
  * JSON2.js
  * https://github.com/douglascrockford/JSON-js
  * --------------------------------------------
  */

  // Create a JSON object only if one does not already exist. We create the
  // methods in a closure to avoid creating global variables.

  if (typeof JSON !== 'object') {
    JSON = {};
  }

  (function () {
    'use strict';

    function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
    };

    if (typeof Date.prototype.toJSON !== 'function') {
      Date.prototype.toJSON = function (key) {
        return isFinite(this.valueOf())
            ? this.getUTCFullYear()     + '-' +
            f(this.getUTCMonth() + 1) + '-' +
            f(this.getUTCDate())      + 'T' +
            f(this.getUTCHours())     + ':' +
            f(this.getUTCMinutes())   + ':' +
            f(this.getUTCSeconds())   + 'Z'
            : null;
      };
      String.prototype.toJSON =
        Number.prototype.toJSON =
          Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
          };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {  // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
      },
      rep;

    function quote(string) {
      // If the string contains no control characters, no quote characters, and no
      // backslash characters, then we can safely slap some quotes around it.
      // Otherwise we must also replace the offending characters with safe escape
      // sequences.
      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string'
          ? c
          : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
    };

    function str(key, holder) {
      // Produce a string from holder[key].
      var i, // The loop counter.
          k, // The member key.
          v, // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];

      // If the value has a toJSON method, call it to obtain a replacement value.
      if (value && typeof value === 'object' &&
        typeof value.toJSON === 'function') {
        value = value.toJSON(key);
      }

      // If we were called with a replacer function, then call the replacer to
      // obtain a replacement value.
      if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
      }
    
      // What happens next depends on the value's type.
      switch (typeof value) {
        case 'string':
          return quote(value);
        case 'number':
          // JSON numbers must be finite. Encode non-finite numbers as null.
          return isFinite(value) ? String(value) : 'null';
        case 'boolean':
        case 'null':
          // If the value is a boolean or null, convert it to a string. Note:
          // typeof null does not produce 'null'. The case is included here in
          // the remote chance that this gets fixed someday.
          return String(value);
        // If the type is 'object', we might be dealing with an object or an array or null.
        case 'object':
          // Due to a specification blunder in ECMAScript, typeof null is 'object',
          // so watch out for that case.
          if (!value) {
            return 'null';
          }
          // Make an array to hold the partial results of stringifying this object value.
          gap += indent;
          partial = [];
          // Is the value an array?
          if (Object.prototype.toString.apply(value) === '[object Array]') {
            // The value is an array. Stringify every element. Use null as a placeholder
            // for non-JSON values.
            length = value.length;
            for (i = 0; i < length; i += 1) {
              partial[i] = str(i, value) || 'null';
            }
            // Join all of the elements together, separated with commas, and wrap them in brackets.
            v = partial.length === 0
              ? '[]'
              : gap
              ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
              : '[' + partial.join(',') + ']';
            gap = mind;
            return v;
          }
          // If the replacer is an array, use it to select the members to be stringified.
          if (rep && typeof rep === 'object') {
            length = rep.length;
            for (i = 0; i < length; i += 1) {
              if (typeof rep[i] === 'string') {
                k = rep[i];
                v = str(k, value);
                if (v) {
                  partial.push(quote(k) + (gap ? ': ' : ':') + v);
                }
              }
            }
          } else {
            // Otherwise, iterate through all of the keys in the object.
            for (k in value) {
              if (Object.prototype.hasOwnProperty.call(value, k)) {
                v = str(k, value);
                if (v) {
                  partial.push(quote(k) + (gap ? ': ' : ':') + v);
                }
              }
            }
          }
          // Join all of the member texts together, separated with commas,
          // and wrap them in braces.
          v = partial.length === 0
              ? '{}'
              : gap
              ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
              : '{' + partial.join(',') + '}';
          gap = mind;
          return v;
        }
      }
    
      // If the JSON object does not yet have a stringify method, give it one.
      if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {
          // The stringify method takes a value and an optional replacer, and an optional
          // space parameter, and returns a JSON text. The replacer can be a function
          // that can replace values, or an array of strings that will select the keys.
          // A default replacer method can be provided. Use of the space parameter can
          // produce text that is more easily readable.
          var i;
          gap = '';
          indent = '';

          // If the space parameter is a number, make an indent string containing that
          // many spaces.
          if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
              indent += ' ';
            }
            // If the space parameter is a string, it will be used as the indent string.
          } else if (typeof space === 'string') {
            indent = space;
          }

          // If there is a replacer, it must be a function or an array.
          // Otherwise, throw an error.
          rep = replacer;
          if (replacer && typeof replacer !== 'function' && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
            throw new Error('JSON.stringify');
          }
        
          // Make a fake root object containing our value under the key of ''.
          // Return the result of stringifying the value.
          return str('', {'': value});
        };
      }

      // If the JSON object does not yet have a parse method, give it one.
      if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {
          // The parse method takes a text and an optional reviver function, and returns
          // a JavaScript value if the text is a valid JSON text.
          var j;
          function walk(holder, key) {
            // The walk method is used to recursively walk the resulting structure so
            // that modifications can be made.
            var k, v, value = holder[key];
            if (value && typeof value === 'object') {
              for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                  v = walk(value, k);
                  if (v !== undefined) {
                    value[k] = v;
                  } else {
                    delete value[k];
                  }
                }
              }
            }
            return reviver.call(holder, key, value);
          }

          // Parsing happens in four stages. In the first stage, we replace certain
          // Unicode characters with escape sequences. JavaScript handles many characters
          // incorrectly, either silently deleting them, or treating them as line endings.
          text = String(text);
          cx.lastIndex = 0;
          if (cx.test(text)) {
            text = text.replace(cx, function (a) {
              return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
          }

          // In the second stage, we run the text against regular expressions that look
          // for non-JSON patterns. We are especially concerned with '()' and 'new'
          // because they can cause invocation, and '=' because it can cause mutation.
          // But just to be safe, we want to reject all unexpected forms.

          // We split the second stage into 4 regexp operations in order to work around
          // crippling inefficiencies in IE's and Safari's regexp engines. First we
          // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
          // replace all simple value tokens with ']' characters. Third, we delete all
          // open brackets that follow a colon or comma or that begin the text. Finally,
          // we look to see that the remaining characters are only whitespace or ']' or
          // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.
          if (/^[\],:{}\s]*$/
              .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
              .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
              .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

                // In the third stage we use the eval function to compile the text into a
                // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
                // in JavaScript: it can begin a block or an object literal. We wrap the text
                // in parens to eliminate the ambiguity.
                j = eval('(' + text + ')');

                // In the optional fourth stage, we recursively walk the new structure, passing
                // each name/value pair to a reviver function for possible transformation.
                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
          }

          // If the text is not JSON parseable, then a SyntaxError is thrown.
          throw new SyntaxError('JSON.parse');
      };
    }
  }());
/*!
  * domready (c) Dustin Diaz 2012 - License MIT
  * Modified header to work internally w/ Keen lib
  */
(function(root, factory) {
  root.utils.domready = factory();
}(Keen, function (ready) {

  var fns = [], fn, f = false
    , doc = document
    , testEl = doc.documentElement
    , hack = testEl.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , addEventListener = 'addEventListener'
    , onreadystatechange = 'onreadystatechange'
    , readyState = 'readyState'
    , loadedRgx = hack ? /^loaded|^c/ : /^loaded|c/
    , loaded = loadedRgx.test(doc[readyState])

  function flush(f) {
    loaded = 1
    while (f = fns.shift()) f()
  }

  doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
    doc.removeEventListener(domContentLoaded, fn, f)
    flush()
  }, f)


  hack && doc.attachEvent(onreadystatechange, fn = function () {
    if (/^c/.test(doc[readyState])) {
      doc.detachEvent(onreadystatechange, fn)
      flush()
    }
  })

  return (ready = hack ?
    function (fn) {
      self != top ?
        loaded ? fn() : fns.push(fn) :
        function () {
          try {
            testEl.doScroll('left')
          } catch (e) {
            return setTimeout(function() { ready(fn) }, 50)
          }
          fn()
        }()
    } :
    function (fn) {
      loaded ? fn() : fns.push(fn)
    })
}));
if (Keen.loaded) {setTimeout(function(){Keen.utils.domready(function(){Keen.trigger("ready");});}, 0);}_loadAsync();

return Keen; 

});
var IonicServiceAnalyticsModule = angular.module('ionic.services.analytics', ['ionic.services.core']);

IonicServiceAnalyticsModule

/**
 * @private
 * When the app runs, add some heuristics to track for UI events.
 */
.run(['$ionicTrack', 'scopeClean', '$timeout', function($ionicTrack, scopeClean, $timeout) {
  // Load events are how we track usage
  $timeout(function() {
    $ionicTrack.send('load', {});
  }, 2000);

  $ionicTrack.addType({
    name: 'button',
    shouldHandle: function(event) {
    },
    handle: function(event, data) {
      if(!event.type === 'click' || !event.target || !event.target.classList.contains('button')) {
        return;
      }
      $ionicTrack.trackClick(event.pageX, event.pageY, event.target);
    }
  });

  $ionicTrack.addType({
    name: 'tab-item',
    handle: function(event, data) {
      console.log(event);
      if(!event.type === 'click' || !event.target) {
        return;
      }
      var item = ionic.DomUtil.getParentWithClass(event.target, 'tab-item', 3);
      if(!item) {
        return;
      }

      var itemScope = angular.element(item).scope();

      $ionicTrack.trackClick(event.pageX, event.pageY, event.target, {
        scope: scopeClean(itemScope)
      });
    }
  });
}])

.provider('$ionicAnalytics', function() {
  return {
    $get: ['$ionicApp', function($ionicApp) {
      var client = new Keen({
        projectId: "5377805cd97b857fed00003f",
        writeKey: $ionicApp.getApiWriteKey()
      });

      return {
        getClient: function() {
          return client;
        }
      }
    }]
  }
})

.factory('domSerializer', function() {
  var getElementTreeXPath = function(element) {
    // Calculate the XPath of a given element
    var paths = [];

    // Use nodeName (instead of localName) so namespace prefix is included (if any).
    for (; element && element.nodeType == 1; element = element.parentNode)
    {
      var index = 0;
      for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling)
      {
        // Ignore document type declaration.
        if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
          continue;

        if (sibling.nodeName == element.nodeName)
          ++index;
      }

      var tagName = element.nodeName.toLowerCase();
      var pathIndex = (index ? "[" + (index+1) + "]" : "");
      paths.splice(0, 0, tagName + pathIndex);
    }

    return paths.length ? "/" + paths.join("/") : null;
  }

  return {
    serializeElement: function(element) {
      // Code appropriated from open source project FireBug
      if (element && element.id)
        return '//*[@id="' + element.id + '"]';
      else
        return getElementTreeXPath(element);
    },

    deserializeElement: function(xpath, context) {
      var searchResult = document.evaluate(xpath, context || document);
      return searchResult.iterateNext();
    }
  }
})


/**
 * @private
 * Clean a given scope (for sending scope data to the server for analytics purposes.
 * This removes things we don't care about and tries to just expose
 * useful scope data.
 */
.factory('scopeClean', function() {
  var clean = function(scope) {
    // Make a container object to store all our cloned properties
    var cleaned = angular.isArray(scope) ? [] : {};

    for (var key in scope) {
      // Check that the property isn't inherited
      if (!scope.hasOwnProperty(key))
        continue;

      var val = scope[key];

      // Filter out bad property names / values
      if (key === 'constructor' || key === 'this' ||
          typeof val === 'function' ||
          key.indexOf('$') != -1 ) {
        continue;
      }

      // Recurse if we're looking at an object or array
      if (typeof val === 'object') {
        cleaned[key] = clean(val);
      } else {
        // Otherwise just pop it onto the cleaned object
        cleaned[key] = val;
      }
    }
    return cleaned;
  }
  return clean;
})


/**
 * @ngdoc service
 * @name $ionicUser
 * @module ionic.services.analytics
 * @description
 *
 * An interface for storing data to a user object which will be sent with all analytics tracking.
 *
 * Add tracking data to the user by passing objects in to the identify function.
 * Identify a user with a user_id (from, e.g., logging in) to track a single user's
 * activity over multiple devices.
 *
 * @usage
 * ```javascript
 * $ionicUser.get();
 *
 * // Add info to user object
 * $ionicUser.identify({
 *   username: "Timmy"
 * });
 *
 * $ionicUser.identify({
 *   user_id: 123
 * });
 * ```
 */
.factory('$ionicUser', [
  '$q',
  '$timeout',
  '$window',
  '$ionicApp',
function($q, $timeout, $window, $ionicApp) {
  // User object we'll use to store all our user info
  var storageKeyName = 'ionic_analytics_user_' + $ionicApp.getApp().app_id;;
  var user = getObject(storageKeyName) || {};

  // Generate a device and user ids if we don't have them already
  var isUserDirty = false;
  if (!user.user_id) {
    user.user_id = generateGuid();
    isUserDirty = true;
  }
  if (!user.device_id) {
    user.device_id = generateGuid();
    isUserDirty = true;
  }

  // Write to local storage if we changed anything on our user object
  if (isUserDirty) {
    storeObject(storageKeyName, user);
  }

  function generateGuid() {
    // Some crazy bit-twiddling to generate a random guid
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
  }

  function storeObject(objectName, object) {
    // Convert object to JSON and store in localStorage
    var jsonObj = JSON.stringify(object);
    $window.localStorage.setItem(objectName, jsonObj);
  }

  function getObject(objectName) {
    // Deserialize the object from JSON and return
    var jsonObj = $window.localStorage.getItem(objectName);
    if (jsonObj == null) { // null or undefined, return null
      return null;
    }
    try {
      return JSON.parse(jsonObj);
    } catch (err) {
      return null;
    }
  }

  return {
    identify: function(userData) {
      // Copy all the data into our user object
      angular.extend(user, userData);

      // Write the user object to our local storage
      storeObject(storageKeyName, user);
    },
    get: function() {
      return user;
    }
  }
}])

/**
 * @ngdoc service
 * @name $ionicTrack
 * @module ionic.services.analytics
 * @description
 *
 * A simple yet powerful analytics tracking system.
 *
 * The simple format is eventName, eventData. Both are arbitrary but should be
 * the same as previous events if you wish to query on them later.
 *
 * @usage
 * ```javascript
 * $ionicTrack.track('open', {
 *   what: 'this'
 * });
 *
 * // Click tracking
 * $ionicTrack.trackClick(x, y, {
 *   thing: 'button'
 * });
 * ```
 */
.factory('$ionicTrack', [
  '$q',
  '$timeout',
  '$state',
  '$ionicApp',
  '$ionicUser',
  '$ionicAnalytics',
  '$interval',
  '$window',
  '$http',
  'domSerializer',
function($q, $timeout, $state, $ionicApp, $ionicUser, $ionicAnalytics, $interval, $window, $http, domSerializer) {
  var _types = [];

  var storedQueue = $window.localStorage.getItem('ionic_analytics_event_queue'),
      eventQueue;
  try {
    eventQueue = storedQueue ? JSON.parse(storedQueue) : {};
  } catch (e) {
    eventQueue = {};
  }

  var useEventCaching = true,
      dispatchInProgress = false,
      dispatchInterval,
      dispatchIntervalTime;
  setDispatchInterval(2 * 60);
  $timeout(function() {
    dispatchQueue();
  });

  function connectedToNetwork() {
    // Can't access navigator stuff? Just assume connected.
    if (typeof navigator.connection === 'undefined' ||
        typeof navigator.connection.type === 'undefined' ||
        typeof Connection === 'undefined') {
      return true;
    }

    // Otherwise use the PhoneGap Connection plugin to determine the network state
    var networkState = navigator.connection.type;
    return networkState == Connection.ETHERNET ||
           networkState == Connection.WIFI ||
           networkState == Connection.CELL_2G ||
           networkState == Connection.CELL_3G ||
           networkState == Connection.CELL_4G ||
           networkState == Connection.CELL;
  }

  function dispatchQueue() {
    if (Object.keys(eventQueue).length === 0) return;
    if (!connectedToNetwork()) return;
    if (dispatchInProgress) return;

    console.log('dipatching queue', eventQueue);
    dispatchInProgress = true;

    // Perform a bulk dispatch of all events in the event queue
    // https://keen.io/docs/data-collection/bulk-load/
    var client = $ionicAnalytics.getClient().client,
        url = client.endpoint + '/projects/' + client.projectId + '/events';
    $http.post(url, eventQueue, {
      headers: {
        "Authorization": client.writeKey,
        "Content-Type": "application/json"
      }
    })
    .success(function() {
      // Clear the event queue and write this change to disk.
      eventQueue = {};
      $window.localStorage.setItem('ionic_analytics_event_queue', JSON.stringify(eventQueue));
      dispatchInProgress = false;
    })
    .error(function(data, status, headers, config) {
      console.log("Error sending tracking data", data, status, headers, config);
      dispatchInProgress = false;
    });

  }

  function enqueueEvent(eventName, data) {
    console.log('enqueueing event', eventName, data);

    // Add timestamp property to the data
    if (!data.keen) {
      data.keen = {};
    }
    data.keen.timestamp = new Date().toISOString();

    // Add the data to the queue
    if (!eventQueue[eventName]) {
      eventQueue[eventName] = [];
    }
    eventQueue[eventName].push(data);

    // Write the queue to disk
    $window.localStorage.setItem('ionic_analytics_event_queue', JSON.stringify(eventQueue));
  }

  function setDispatchInterval(value) {
    // Set how often we should send batch events to Keen, in seconds.
    // Set this to a nonpositive number to disable event caching
    dispatchIntervalTime = value;

    // Clear the existing interval and set a new one.
    if (dispatchInterval) {
      $interval.cancel(dispatchInterval);
    }

    if (value > 0) {
      dispatchInterval = $interval(function() { dispatchQueue() }, value * 1000);
      useEventCaching = true;
    } else {
      useEventCaching = false;
    }
  }

  function getDispatchInterval() {
    return dispatchIntervalTime;
  }

  return {
    setDispatchInterval: setDispatchInterval,
    getDispatchInterval: getDispatchInterval,
    addType: function(type) {
      _types.push(type);
    },
    getTypes: function() {
      return _types;
    },
    getType: function(event) {
      var i, j, type;
      for(i = 0, j = _types.length; i < j; i++) {
        type = _types[i];
        if(type.shouldHandle(event)) {
          return type;
        }
      }
      return null;
    },
    send: function(eventName, data) {
      // Copy objects so we can add / remove properties without affecting the original
      var app = angular.copy($ionicApp.getApp());
      var user = angular.copy($ionicUser.get());

      // Don't expose api keys, etc if we don't have to
      delete app.api_write_key;
      delete app.api_read_key;

      // Add user tracking data to everything sent to keen
      data = angular.extend(data, {
        activeState: $state.current.name,
        _app: app
      });

      if(user) {
        data = angular.extend(data, {
          user: user
        });
      }

      if (useEventCaching) {
        enqueueEvent(app.app_id + '-' + eventName, data);
      } else {
        console.log('Immediate event dispatch', eventName, data);
        $ionicAnalytics.getClient().addEvent(app.app_id + '-' + eventName, data);
      }
    },
    track: function(eventName, data) {
      return this.send(eventName, {
        data: data
      });
    },

    trackClick: function(x, y, target, data) {
      // We want to also include coordinates as a percentage relative to the target element
      var box = target.getBoundingClientRect();
      var width = box.right - box.left,
          height = box.bottom - box.top;
      var normX = (x - box.left) / width,
          normY = (y - box.top) / height;

      // Now get an xpath reference to the target element
      var elementSerialized = domSerializer.serializeElement(target);

      return this.send('tap', {
        normCoords: {
          x: normX,
          y: normY
        },
        coords: {
          x: x,
          y: y
        },
        element: elementSerialized,
        data: data
      });
    },

    identify: function(userData) {
      $ionicUser.identify(userData);
    }
  }
}])

/**
 * @ngdoc directive
 * @name ionTrackClick
 * @module ionic.services.analytics
 * @restrict A
 * @parent ionic.directive:ionTrackClick
 *
 * @description
 *
 * A convenient directive to automatically track a click/tap on a button
 * or other tappable element.
 *
 * @usage
 * ```html
 * <button class="button button-clear" ion-track-click ion-track-event="cta-tap">Try now!</button>
 * ```
 */

.directive('ionTrackClick', ionTrackDirective('click'))
.directive('ionTrackTap', ionTrackDirective('tap'))
.directive('ionTrackDoubletap', ionTrackDirective('doubletap'))
.directive('ionTrackHold', ionTrackDirective('hold'))
.directive('ionTrackRelease', ionTrackDirective('release'))
.directive('ionTrackDrag', ionTrackDirective('drag'))
.directive('ionTrackDragLeft', ionTrackDirective('dragleft'))
.directive('ionTrackDragRight', ionTrackDirective('dragright'))
.directive('ionTrackDragUp', ionTrackDirective('dragup'))
.directive('ionTrackDragDown', ionTrackDirective('dragdown'))
.directive('ionTrackSwipeLeft', ionTrackDirective('swipeleft'))
.directive('ionTrackSwipeRight', ionTrackDirective('swiperight'))
.directive('ionTrackSwipeUp', ionTrackDirective('swipeup'))
.directive('ionTrackSwipeDown', ionTrackDirective('swipedown'))
.directive('ionTrackTransform', ionTrackDirective('hold'))
.directive('ionTrackPinch', ionTrackDirective('pinch'))
.directive('ionTrackPinchIn', ionTrackDirective('pinchin'))
.directive('ionTrackPinchOut', ionTrackDirective('pinchout'))
.directive('ionTrackRotate', ionTrackDirective('rotate'))


/**
 * @ngdoc directive
 * @name ionTrackAuto
 * @module ionic.services.analytics
 * @restrict A
 * @parent ionic.directive:ionTrackAuto
 *
 * @description
 *
 * Automatically track events on UI elements. This directive tracks heuristics to automatically detect
 * taps and interactions on common built-in Ionic components.
 *
 * None: this element should be applied on the body tag.
 *
 * @usage
 * ```html
 * <body ion-track-auto></body>
 * ```
 */
.directive('ionTrackAuto', ['$document', '$ionicTrack', 'scopeClean', function($document, $ionicTrack, scopeClean) {
  var getType = function(e) {
    if(e.target.classList) {
      var cl = e.target.classList;
      if(cl.contains('button')) {
        return ButtonType;
      }
    }
    return null;
  };
  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {
      $document.on('click', function(event) {
        var i, j, type, _types = $ionicTrack.getTypes();
        for(i = 0, j = _types.length; i < j; i++) {
          type = _types[i];
          if(type.handle(event) === false) {
            return false;
          }
        }

        $ionicTrack.trackClick(event.pageX, event.pageY, event.target, {});
      });
    }
  }
}]);

/**
 * Generic directive to create auto event handling analytics directives like:
 *
 * <button ion-track-click="eventName">Click Track</button>
 * <button ion-track-hold="eventName">Hold Track</button>
 * <button ion-track-tap="eventName">Tap Track</button>
 * <button ion-track-doubletap="eventName">Double Tap Track</button>
 */
function ionTrackDirective(domEventName) {
  return ['$ionicTrack', '$ionicGesture', 'scopeClean', function($ionicTrack, $ionicGesture, scopeClean) {

    var gesture_driven = [
      'drag', 'dragstart', 'dragend', 'dragleft', 'dragright', 'dragup', 'dragdown',
      'swipe', 'swipeleft', 'swiperight', 'swipeup', 'swipedown',
      'tap', 'doubletap', 'hold',
      'transform', 'pinch', 'pinchin', 'pinchout', 'rotate'
    ];
    // Check if we need to use the gesture subsystem or the DOM system
    var isGestureDriven = false;
    for(var i = 0; i < gesture_driven.length; i++) {
      if(gesture_driven[i] == domEventName.toLowerCase()) {
        isGestureDriven = true;
      }
    }
    return {
      restrict: 'A',
      link: function($scope, $element, $attr) {
        var capitalized = domEventName[0].toUpperCase() + domEventName.slice(1);
        // Grab event name we will send
        var eventName = $attr['ionTrack' + capitalized];

        if(isGestureDriven) {
          var gesture = $ionicGesture.on(domEventName, handler, $element);
          $scope.$on('$destroy', function() {
            $ionicGesture.off(gesture, domEventName, handler);
          });
        } else {
          $element.on(domEventName, handler);
          $scope.$on('$destroy', function() {
            $element.off(domEventName, handler);
          });
        }


        function handler(e) {
          var eventData = $scope.$eval($attr.ionTrackData) || {};
          if(eventName) {
            $ionicTrack.track(eventName, eventData);
          } else {
            $ionicTrack.trackClick(e.pageX, e.pageY, e.target, {
              data: eventData
              //scope: scopeClean(angular.element(e.target).scope())
            });
          }
        }
      }
    }
  }];
}

})();