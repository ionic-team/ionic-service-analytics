/*!
 * Ionic Analytics Client
 * Copyright 2014 Drifty Co. http://drifty.com/
 * See LICENSE in this repository for license information
 */
(function(){
!function(a,c,b){if(typeof define=="function"&&define.amd){define("keen",[],function(d){return b()})}if(typeof module==="object"&&typeof module.exports==="object"){module.exports=b()}else{c[a]=b()}}("Keen",this,function(Keen){
/*!
 * ----------------------
 * Keen IO Core
 * ----------------------
 */
;function Keen(config){this.configure(config||{})}Keen.version="3.1.0";Keen.utils={};Keen.canXHR=false;if(typeof XMLHttpRequest==="object"||typeof XMLHttpRequest==="function"){if("withCredentials" in new XMLHttpRequest()){Keen.canXHR=true}}Keen.urlMaxLength=16000;if(navigator.userAgent.indexOf("MSIE")!==-1||navigator.appVersion.indexOf("Trident/")>0){Keen.urlMaxLength=2000}Keen.loaded=true;Keen.ready=function(callback){if(Keen.loaded){callback()}else{Keen.on("ready",callback)}};Keen.log=function(message){if(typeof console=="object"){console.log("[Keen IO]",message)}};var Events=Keen.Events={on:function(name,callback){this.listeners||(this.listeners={});var events=this.listeners[name]||(this.listeners[name]=[]);events.push({callback:callback});return this},once:function(name,callback,context){var self=this;var once=_once(function(){self.off(name,once);callback.apply(this,arguments)});once._callback=callback;return self.on(name,once,context)},off:function(name,callback,context){if(!this.listeners){return this}if(!name&&!callback&&!context){this.listeners=void 0;return this}var names=[];if(name){names.push(name)}else{_each(this.listeners,function(value,key){names.push(key)})}for(var i=0,length=names.length;i<length;i++){name=names[i];var events=this.listeners[name];if(!events){continue}if(!callback&&!context){delete this.listeners[name];continue}var remaining=[];for(var j=0,k=events.length;j<k;j++){var event=events[j];if(callback&&callback!==event.callback&&callback!==event.callback._callback||context&&context!==event.context){remaining.push(event)}}if(remaining.length){this.listeners[name]=remaining}else{delete this.listeners[name]}}return this},trigger:function(name){if(!this.listeners){return this}var args=Array.prototype.slice.call(arguments,1);var events=this.listeners[name]||[];for(var i=0;i<events.length;i++){events[i]["callback"].apply(this,args)}return this}};function _once(func){var ran=false,memo;return function(){if(ran){return memo}ran=true;memo=func.apply(this,arguments);func=null;return memo}}_extend(Keen.prototype,Events);_extend(Keen,Events);function _loadAsync(){var loaded=window.Keen,cached=window._Keen||{},clients,ready;if(loaded&&cached){clients=cached.clients||{},ready=cached.ready||[];for(var instance in clients){if(clients.hasOwnProperty(instance)){var client=clients[instance];for(var method in Keen.prototype){if(Keen.prototype.hasOwnProperty(method)){loaded.prototype[method]=Keen.prototype[method]}}loaded.Query=(Keen.Query)?Keen.Query:function(){};loaded.Visualization=(Keen.Visualization)?Keen.Visualization:function(){};if(client._config){client.configure.call(client,client._config);delete client._config}if(client._setGlobalProperties){var globals=client._setGlobalProperties;for(var i=0;i<globals.length;i++){client.setGlobalProperties.apply(client,globals[i])}delete client._setGlobalProperties}if(client._addEvent){var queue=client._addEvent||[];for(var i=0;i<queue.length;i++){client.addEvent.apply(client,queue[i])}delete client._addEvent}var callback=client._on||[];if(client._on){for(var i=0;i<callback.length;i++){client.on.apply(client,callback[i])}client.trigger("ready");delete client._on}}}for(var i=0;i<ready.length;i++){var callback=ready[i];Keen.once("ready",function(){callback()})}}}Keen.prototype.addEvent=function(eventCollection,payload,success,error){var response;if(!eventCollection||typeof eventCollection!=="string"){response="Event not recorded: Collection name must be a string";Keen.log(response);if(error){error.call(this,response)}return}_uploadEvent.apply(this,arguments)};Keen.prototype.configure=function(cfg){var config=cfg||{};if(!Keen.canXHR&&config.requestType==="xhr"){config.requestType="jsonp"}if(config.host){config.host.replace(/.*?:\/\//g,"")}if(config.protocol&&config.protocol==="auto"){config.protocol=location.protocol.replace(/:/g,"")}this.config={projectId:config.projectId,writeKey:config.writeKey,readKey:config.readKey,masterKey:config.masterKey,requestType:config.requestType||"jsonp",host:config.host||"api.keen.io/3.0",protocol:config.protocol||"https",globalProperties:null};this.trigger("ready");Keen.trigger("client",this,config)};Keen.prototype.masterKey=function(str){if(!arguments.length){return this.config.masterKey}this.config.masterKey=(str?String(str):null);return this};Keen.prototype.projectId=function(str){if(!arguments.length){return this.config.projectId}this.config.projectId=(str?String(str):null);return this};Keen.prototype.readKey=function(str){if(!arguments.length){return this.config.readKey}this.config.readKey=(str?String(str):null);return this};Keen.prototype.setGlobalProperties=function(newGlobalProperties){if(newGlobalProperties&&typeof(newGlobalProperties)=="function"){this.config.globalProperties=newGlobalProperties}else{Keen.log("Invalid value for global properties: "+newGlobalProperties)}};Keen.prototype.trackExternalLink=function(jsEvent,eventCollection,payload,timeout,timeoutCallback){var evt=jsEvent,target=(evt.currentTarget)?evt.currentTarget:(evt.srcElement||evt.target),timer=timeout||500,triggered=false,targetAttr="",callback,win;if(target.getAttribute!==void 0){targetAttr=target.getAttribute("target")}else{if(target.target){targetAttr=target.target}}if((targetAttr=="_blank"||targetAttr=="blank")&&!evt.metaKey){win=window.open("about:blank");win.document.location=target.href}if(target.nodeName==="A"){callback=function(){if(!triggered&&!evt.metaKey&&(targetAttr!=="_blank"&&targetAttr!=="blank")){triggered=true;window.location=target.href}}}else{if(target.nodeName==="FORM"){callback=function(){if(!triggered){triggered=true;target.submit()}}}else{Keen.log("#trackExternalLink method not attached to an <a> or <form> DOM element")}}if(timeoutCallback){callback=function(){if(!triggered){triggered=true;timeoutCallback()}}}_uploadEvent.call(this,eventCollection,payload,callback,callback);setTimeout(callback,timer);if(!evt.metaKey){return false}};Keen.prototype.url=function(path){return this.config.protocol+"://"+this.config.host+path};Keen.prototype.writeKey=function(str){if(!arguments.length){return this.config.writeKey}this.config.writeKey=(str?String(str):null);return this};function _clone(target){return JSON.parse(JSON.stringify(target))}function _each(o,cb,s){var n;if(!o){return 0}s=!s?o:s;if(o instanceof Array){for(n=0;n<o.length;n++){if(cb.call(s,o[n],n,o)===false){return 0}}}else{for(n in o){if(o.hasOwnProperty(n)){if(cb.call(s,o[n],n,o)===false){return 0}}}}return 1}_extend(Keen.utils,{each:_each});function _extend(target){for(var i=1;i<arguments.length;i++){for(var prop in arguments[i]){target[prop]=arguments[i][prop]}}return target}_extend(Keen.utils,{extend:_extend});function _parseParams(str){var urlParams={},match,pl=/\+/g,search=/([^&=]+)=?([^&]*)/g,decode=function(s){return decodeURIComponent(s.replace(pl," "))},query=str.split("?")[1];while(!!(match=search.exec(query))){urlParams[decode(match[1])]=decode(match[2])}return urlParams}_extend(Keen.utils,{parseParams:_parseParams});function _sendBeacon(url,params,success,error){var successCallback=success,errorCallback=error,loaded=false,img=document.createElement("img");success=null;error=null;img.onload=function(){loaded=true;if("naturalHeight" in this){if(this.naturalHeight+this.naturalWidth===0){this.onerror();return}}else{if(this.width+this.height===0){this.onerror();return}}if(successCallback){successCallback({created:true});successCallback=errorCallback=null}};img.onerror=function(){loaded=true;if(errorCallback){errorCallback();successCallback=errorCallback=null}};img.src=url+"&c=clv1"}function _sendJsonp(url,params,success,error){var timestamp=new Date().getTime(),successCallback=success,errorCallback=error,script=document.createElement("script"),parent=document.getElementsByTagName("head")[0],callbackName="keenJSONPCallback",loaded=false;success=null;error=null;callbackName+=timestamp;while(callbackName in window){callbackName+="a"}window[callbackName]=function(response){if(loaded===true){return}loaded=true;if(successCallback&&response){successCallback(response)}cleanup()};script.src=url+"&jsonp="+callbackName;parent.appendChild(script);script.onreadystatechange=function(){if(loaded===false&&this.readyState==="loaded"){loaded=true;if(errorCallback){errorCallback()}}};script.onerror=function(){if(loaded===false){loaded=true;if(errorCallback){errorCallback()}cleanup()}};function cleanup(){delete window[callbackName];successCallback=errorCallback=null;parent.removeChild(script)}}function _sendXhr(method,url,headers,body,success,error){var ids=["MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],successCallback=success,errorCallback=error,payload,xhr;success=null;error=null;if(window.XMLHttpRequest){xhr=new XMLHttpRequest()}else{for(var i=0;i<ids.length;i++){try{xhr=new ActiveXObject(ids[i]);break}catch(e){}}}xhr.onreadystatechange=function(){var response;if(xhr.readyState==4){if(xhr.status>=200&&xhr.status<300){try{response=JSON.parse(xhr.responseText)}catch(e){Keen.log("Could not parse HTTP response: "+xhr.responseText);if(errorCallback){errorCallback(xhr,e);successCallback=errorCallback=null}}if(successCallback&&response){successCallback(response);successCallback=errorCallback=null}}else{Keen.log("HTTP request failed.");if(errorCallback){errorCallback(xhr,null);successCallback=errorCallback=null}}}};xhr.open(method,url,true);_each(headers,function(value,key){xhr.setRequestHeader(key,value)});if(body){payload=JSON.stringify(body)}if(method&&method.toUpperCase()==="GET"){xhr.send()}else{if(method&&method.toUpperCase()==="POST"){xhr.send(payload)}}}function _uploadEvent(eventCollection,payload,success,error){var urlBase,urlQueryString,reqType,data;if(!this.projectId()){Keen.log("Event not recorded: Missing projectId property");return}if(!this.writeKey()){Keen.log("Event not recorded: Missing writeKey property");return}urlBase=this.url("/projects/"+this.projectId()+"/events/"+eventCollection);urlQueryString="";reqType=this.config.requestType;data={};if(this.config.globalProperties){data=this.config.globalProperties(eventCollection)}_each(payload,function(value,key){data[key]=value});if(reqType!=="xhr"){urlQueryString+="?api_key="+encodeURIComponent(this.writeKey());urlQueryString+="&data="+encodeURIComponent(Keen.Base64.encode(JSON.stringify(data)));urlQueryString+="&modified="+encodeURIComponent(new Date().getTime());if(String(urlBase+urlQueryString).length<Keen.urlMaxLength){if(reqType==="jsonp"){_sendJsonp(urlBase+urlQueryString,null,success,error)}else{_sendBeacon(urlBase+urlQueryString,null,success,error)}return}}if(Keen.canXHR){_sendXhr("POST",urlBase,{Authorization:this.writeKey(),"Content-Type":"application/json"},data,success,error)}else{Keen.log("Event not sent: URL length exceeds current browser limit, and XHR (POST) is not supported.")}return}
/*!
  * ----------------------------------------
  * Keen IO Base64 Transcoding
  * ----------------------------------------
  */
;Keen.Base64={map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(n){var o="",i=0,m=this.map,i1,i2,i3,e1,e2,e3,e4;n=this.utf8.encode(n);while(i<n.length){i1=n.charCodeAt(i++);i2=n.charCodeAt(i++);i3=n.charCodeAt(i++);e1=(i1>>2);e2=(((i1&3)<<4)|(i2>>4));e3=(isNaN(i2)?64:((i2&15)<<2)|(i3>>6));e4=(isNaN(i2)||isNaN(i3))?64:i3&63;o=o+m.charAt(e1)+m.charAt(e2)+m.charAt(e3)+m.charAt(e4)}return o},decode:function(n){var o="",i=0,m=this.map,cc=String.fromCharCode,e1,e2,e3,e4,c1,c2,c3;n=n.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(i<n.length){e1=m.indexOf(n.charAt(i++));e2=m.indexOf(n.charAt(i++));e3=m.indexOf(n.charAt(i++));e4=m.indexOf(n.charAt(i++));c1=(e1<<2)|(e2>>4);c2=((e2&15)<<4)|(e3>>2);c3=((e3&3)<<6)|e4;o=o+(cc(c1)+((e3!=64)?cc(c2):""))+(((e4!=64)?cc(c3):""))}return this.utf8.decode(o)},utf8:{encode:function(n){var o="",i=0,cc=String.fromCharCode,c;while(i<n.length){c=n.charCodeAt(i++);o=o+((c<128)?cc(c):((c>127)&&(c<2048))?(cc((c>>6)|192)+cc((c&63)|128)):(cc((c>>12)|224)+cc(((c>>6)&63)|128)+cc((c&63)|128)))}return o},decode:function(n){var o="",i=0,cc=String.fromCharCode,c2,c;while(i<n.length){c=n.charCodeAt(i);o=o+((c<128)?[cc(c),i++][0]:((c>191)&&(c<224))?[cc(((c&31)<<6)|((c2=n.charCodeAt(i+1))&63)),(i+=2)][0]:[cc(((c&15)<<12)|(((c2=n.charCodeAt(i+1))&63)<<6)|((c3=n.charCodeAt(i+2))&63)),(i+=3)][0])}return o}}};
/*! 
  * --------------------------------------------
  * JSON2.js
  * https://github.com/douglascrockford/JSON-js
  * --------------------------------------------
  */
;if(typeof JSON!=="object"){JSON={}}(function(){function f(n){return n<10?"0"+n:n}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf()}}var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==="string"?c:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+string+'"'}function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==="object"&&typeof value.toJSON==="function"){value=value.toJSON(key)}if(typeof rep==="function"){value=rep.call(holder,key,value)}switch(typeof value){case"string":return quote(value);case"number":return isFinite(value)?String(value):"null";case"boolean":case"null":return String(value);case"object":if(!value){return"null"}gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==="[object Array]"){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||"null"}v=partial.length===0?"[]":gap?"[\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"]":"["+partial.join(",")+"]";gap=mind;return v}if(rep&&typeof rep==="object"){length=rep.length;for(i=0;i<length;i+=1){if(typeof rep[i]==="string"){k=rep[i];v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}else{for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}v=partial.length===0?"{}":gap?"{\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"}":"{"+partial.join(",")+"}";gap=mind;return v}}if(typeof JSON.stringify!=="function"){JSON.stringify=function(value,replacer,space){var i;gap="";indent="";if(typeof space==="number"){for(i=0;i<space;i+=1){indent+=" "}}else{if(typeof space==="string"){indent=space}}rep=replacer;if(replacer&&typeof replacer!=="function"&&(typeof replacer!=="object"||typeof replacer.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":value})}}if(typeof JSON.parse!=="function"){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==="object"){for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v}else{delete value[k]}}}}return reviver.call(holder,key,value)}text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}}());
/*!
  * domready (c) Dustin Diaz 2012 - License MIT
  * Modified header to work internally w/ Keen lib
  */
(function(root,factory){root.utils.domready=factory()}(Keen,function(ready){var fns=[],fn,f=false,doc=document,testEl=doc.documentElement,hack=testEl.doScroll,domContentLoaded="DOMContentLoaded",addEventListener="addEventListener",onreadystatechange="onreadystatechange",readyState="readyState",loadedRgx=hack?/^loaded|^c/:/^loaded|c/,loaded=loadedRgx.test(doc[readyState]);function flush(f){loaded=1;while(f=fns.shift()){f()}}doc[addEventListener]&&doc[addEventListener](domContentLoaded,fn=function(){doc.removeEventListener(domContentLoaded,fn,f);flush()},f);hack&&doc.attachEvent(onreadystatechange,fn=function(){if(/^c/.test(doc[readyState])){doc.detachEvent(onreadystatechange,fn);flush()}});return(ready=hack?function(fn){self!=top?loaded?fn():fns.push(fn):function(){try{testEl.doScroll("left")}catch(e){return setTimeout(function(){ready(fn)},50)}fn()}()}:function(fn){loaded?fn():fns.push(fn)})}));if(Keen.loaded){setTimeout(function(){Keen.utils.domready(function(){Keen.trigger("ready")})},0)}_loadAsync();return Keen});

angular.module('ionic.services.analytics', ['ionic.services.common'])

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

.factory('xPathUtil', function() {
  var getElementTreeXPath = function(element) {
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
    getElementXPath: function(element) {
      // Code appropriated from open source project FireBug
      if (element && element.id)
        return '//*[@id="' + element.id + '"]';
      else
        return getElementTreeXPath(element);
    },

    getElementByXPath: function(path, context) {
      var xResult = document.evaluate(path, context || document);
      return xResult.iterateNext();
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

.factory('$ionicUser', [
  '$q',
  '$timeout',
  '$window',
function($q, $timeout, $window) {
  // Some crazy bit-twiddling to generate a random guid
  function generateGuid() {
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

  // User object we'll use to store all our user info
  var storedUser = getObject('user');
  var user = storedUser || {};

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
    storeObject('user', user);
  }

  return {
    identify: function(userData) {
      // Copy all the data into our user object
      angular.extend(user, userData);

      // Write the user object to our local storage
      storeObject('user', user);
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
 * $ionicTrack.track('Load', {
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
  'xPathUtil',
function($q, $timeout, $state, $ionicApp, $ionicUser, $ionicAnalytics, xPathUtil) {
  var _types = [];

  return {
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

      console.trace();
      var deferred = $q.defer();
      $timeout(function() {
        console.log('Sending', eventName, {
          'status': 'sent',
          'message': data
        });
        $ionicAnalytics.getClient().addEvent(app.app_id + '-' + eventName, data);
        deferred.resolve({
          'status': 'sent',
          'message': data
        });
      });

      return deferred.promise;
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
      var xPath = xPathUtil.getElementXPath(target);

      return this.send('tap', {
        normCoords: {
          x: normX,
          y: normY
        },
        coords: {
          x: x,
          y: y
        },
        element: xPath,
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
.directive('ionTrack', ['$ionicTrack', 'scopeClean', function($ionicTrack, scopeClean) {
  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {
      var eventName = $attr.ionTrack;
      $element.on('click', function(e) {
        var eventData = $scope.$eval($attr.ionTrackData) || {};
        if(eventName) {
          //$ionicTrack.track(eventName, eventData);
        } else {
          $ionicTrack.trackClick(e.pageX, e.pageY, e.target, {
            data: eventData
            //scope: scopeClean(angular.element(e.target).scope())
          });
        }
      });
    }
  }
}])

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
}])

})();