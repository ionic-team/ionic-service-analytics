(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function () {

  var ApiRequest = ionic.io.util.ApiRequest;
  var DeferredPromise = ionic.io.util.DeferredPromise;
  var Logger = ionic.io.util.Logger;
  var Settings = new ionic.io.core.Settings();

  var ANALYTICS_KEY = null;
  var options = {};
  var globalProperties = {};
  var globalPropertiesFns = [];

  var Analytics = (function () {
    function Analytics() {
      _classCallCheck(this, Analytics);

      this._dispatcher = null;
      this._dispatchIntervalTime = 30;
      this._useEventCaching = true;
      this._serviceHost = Settings.getURL('analytics');

      this.logger = new Logger({
        'prefix': 'Ionic Analytics:'
      });

      this.logger._silence = true;

      this.storage = ionic.io.core.main.storage;
      this.cache = new ionic.io.analytics.BucketStorage('ionic_analytics');
      this._addGlobalPropertyDefaults();
    }

    _createClass(Analytics, [{
      key: '_addGlobalPropertyDefaults',
      value: function _addGlobalPropertyDefaults() {
        var self = this;
        self.setGlobalProperties(function (eventCollection, eventData) {
          // eventData._user = JSON.parse(JSON.stringify($ionicUser.get());
          eventData._app = {
            "app_id": Settings.get('app_id'), // eslint-disable-line
            "analytics_version": ionic.io.analytics.version
          };
        });
      }
    }, {
      key: '_enqueueEvent',
      value: function _enqueueEvent(collectionName, eventData) {
        var self = this;
        if (options.dryRun) {
          self.logger.info('event recieved but not sent (dryRun active):');
          self.logger.info(collectionName);
          self.logger.info(eventData);
          return;
        }

        self.logger.info('enqueuing event to send later:');
        self.logger.info(collectionName);
        self.logger.info(eventData);

        // Add timestamp property to the data
        if (!eventData.keen) {
          eventData.keen = {};
        }
        eventData.keen.timestamp = new Date().toISOString();

        // Add the data to the queue
        var eventQueue = self.cache.get('event_queue') || {};
        if (!eventQueue[collectionName]) {
          eventQueue[collectionName] = [];
        }
        eventQueue[collectionName].push(eventData);

        // Write the queue to disk
        self.cache.set('event_queue', eventQueue);
      }
    }, {
      key: '_requestAnalyticsKey',
      value: function _requestAnalyticsKey() {
        var requestOptions = {
          "method": 'GET',
          "json": true,
          "uri": Settings.getURL('api') + '/api/v1/app/' + Settings.get('app_id') + '/keys/write',
          'headers': {
            'Authorization': "basic " + btoa(Settings.get('app_id') + ':' + Settings.get('api_key'))
          }
        };

        return new ApiRequest(requestOptions);
      }
    }, {
      key: '_postEvent',
      value: function _postEvent(name, data) {
        var self = this;
        var payload = {
          "name": [data]
        };

        if (!ANALYTICS_KEY) {
          self.logger.error('Cannot send events to the analytics server without an Analytics key.');
        }

        var requestOptions = {
          "method": 'POST',
          "url": self._serviceHost + '/api/v1/events/' + Settings.get('app_id'),
          "body": payload,
          "json": true,
          "headers": {
            "Authorization": ANALYTICS_KEY
          }
        };

        return new ApiRequest(requestOptions);
      }
    }, {
      key: '_postEvents',
      value: function _postEvents(events) {
        var self = this;
        if (!ANALYTICS_KEY) {
          self.logger.info('Cannot send events to the analytics server without an Analytics key.');
        }

        var requestOptions = {
          "method": 'POST',
          "url": self._serviceHost + '/api/v1/events/' + Settings.get('app_id'),
          "body": events,
          "json": true,
          "headers": {
            "Authorization": ANALYTICS_KEY
          }
        };

        return new ApiRequest(requestOptions);
      }
    }, {
      key: '_dispatchQueue',
      value: function _dispatchQueue() {
        var self = this;
        var eventQueue = this.cache.get('event_queue') || {};

        if (Object.keys(eventQueue).length === 0) {
          return;
        }

        if (!ionic.io.core.main.deviceConnectedToNetwork()) {
          return;
        }

        self.storage.lockedAsyncCall(self.cache.scopedKey('event_dispatch'), function () {
          return self._postEvents(eventQueue);
        }).then(function () {
          self.cache.set('event_queue', {});
          self.logger.info('sent events');
          self.logger.info(eventQueue);
        }, function (err) {
          self._handleDispatchError(err, this, eventQueue);
        });
      }
    }, {
      key: '_getRequestStatusCode',
      value: function _getRequestStatusCode(request) {
        var responseCode = false;
        if (request && request.requestInfo._lastResponse && request.requestInfo._lastResponse.statusCode) {
          responseCode = request.requestInfo._lastResponse.statusCode;
        }
        return responseCode;
      }
    }, {
      key: '_handleDispatchError',
      value: function _handleDispatchError(error, request, eventQueue) {
        var self = this;
        var responseCode = this._getRequestStatusCode(request);
        if (error === 'last_call_interrupted') {
          self.cache.set('event_queue', {});
        } else {
          // If we didn't connect to the server at all -> keep events
          if (!responseCode) {
            self.logger.error('Error sending analytics data: Failed to connect to analytics server.');
          } else {
            self.cache.set('event_queue', {});
            self.logger.error('Error sending analytics data: Server responded with error');
            self.logger.error(eventQueue);
          }
        }
      }
    }, {
      key: '_handleRegisterError',
      value: function _handleRegisterError(error, request) {
        var responseCode = this._getRequestStatusCode(request);
        var docs = ' See http://docs.ionic.io/v1.0/docs/io-quick-start';

        switch (responseCode) {
          case 401:
            self.logger.error('The api key and app id you provided did not register on the server. ' + docs);
            break;

          case 404:
            self.logger.error('The app id you provided ("' + Settings.get('app_id') + '") was not found.' + docs);
            break;

          default:
            self.logger.log('Unable to request analytics key.');
            self.logger.log(error);
            break;
        }
      }

      /**
       * Registers an analytics key
       *
       * @param {object} opts Registration options
       * @return {Promise} The register promise
       */
    }, {
      key: 'register',
      value: function register(opts) {

        var self = this;
        var deferred = new DeferredPromise();

        if (!this.hasValidSettings) {
          deferred.reject(false);
          return deferred.promise;
        }

        options = opts || {};
        if (options.silent) {
          this.logger._silence = true;
        } else {
          this.logger._silence = false;
        }

        if (options.dryRun) {
          this.logger.log('dryRun mode is active. Analytics will not send any events.');
        }

        this._requestAnalyticsKey().then(function (result) {
          ANALYTICS_KEY = result.payload.write_key;
          self.logger.info('successfully registered analytics key');
          self.dispatchInterval = self.dispatchInterval;
          deferred.resolve(true);
        }, function (error) {
          self._handleRegisterError(error, this);
          deferred.reject(false);
        });

        return deferred.promise;
      }
    }, {
      key: 'setGlobalProperties',
      value: function setGlobalProperties(prop) {
        var self = this;
        var propType = typeof prop;
        switch (propType) {
          case 'object':
            for (var key in prop) {
              if (!prop.hasOwnProperty(key)) {
                continue;
              }
              globalProperties[key] = prop[key];
            }
            break;

          case 'function':
            globalPropertiesFns.push(prop);
            break;

          default:
            self.logger.error('setGlobalProperties parameter must be an object or function.');
            break;
        }
      }
    }, {
      key: 'track',
      value: function track(eventCollection, eventData) {
        var self = this;
        if (!this.hasValidSettings) {
          return false;
        }
        if (!eventData) {
          eventData = {};
        }

        for (var key in globalProperties) {
          if (!globalProperties.hasOwnProperty(key)) {
            continue;
          }

          if (eventData[key] === void 0) {
            eventData[key] = globalProperties[key];
          }
        }

        for (var i = 0; i < globalPropertiesFns.length; i++) {
          var fn = globalPropertiesFns[i];
          fn.call(null, eventCollection, eventData);
        }

        if (this._useEventCaching) {
          self._enqueueEvent(eventCollection, eventData);
        } else {
          if (options.dryRun) {
            self.logger.info('dryRun active, will not send event');
            self.logger.info(eventCollection);
            self.logger.info(eventData);
          } else {
            self._postEvent(eventCollection, eventData);
          }
        }
      }
    }, {
      key: 'unsetGlobalProperty',
      value: function unsetGlobalProperty(prop) {
        var self = this;
        var propType = typeof prop;
        switch (propType) {
          case 'string':
            delete globalProperties[prop];
            break;

          case 'function':
            var i = globalPropertiesFns.indexOf(prop);
            if (i === -1) {
              self.logger.error('The function passed to unsetGlobalProperty was not a global property.');
            }
            globalPropertiesFns.splice(i, 1);
            break;

          default:
            self.logger.error('unsetGlobalProperty parameter must be a string or function.');
            break;
        }
      }
    }, {
      key: 'hasValidSettings',
      get: function get() {
        if (!Settings.get('app_id') || !Settings.get('api_key')) {
          var msg = 'A valid app_id and api_key are required before you can utilize ' + 'analytics properly. See http://docs.ionic.io/v1.0/docs/io-quick-start';
          this.logger.info(msg);
          return false;
        }
        return true;
      }
    }, {
      key: 'dispatchInterval',
      set: function set(value) {
        var self = this;
        // Set how often we should send batched events, in seconds.
        // Set this to 0 to disable event caching
        this._dispatchIntervalTime = value;

        // Clear the existing interval
        if (this._dispatcher) {
          window.clearInterval(this.dispatcher);
        }

        if (value > 0) {
          this._dispatcher = window.setInterval(function () {
            self._dispatchQueue();
          }, value * 1000);
          this._useEventCaching = true;
        } else {
          this._useEventCaching = false;
        }
      },
      get: function get() {
        return this._dispatchIntervalTime;
      }
    }]);

    return Analytics;
  })();

  ionic.io.register('analytics');
  ionic.io.analytics.AnalyticsService = Analytics;
  ionic.io.analytics.version = '0.3.0';
})();

},{}],2:[function(require,module,exports){
// Add Angular integrations if Angular is available
'use strict';

if (typeof angular === 'object' && angular.module) {

  /**
   * Generic directive to create auto event handling analytics directives like:
   *
   * <button ion-track-click="eventName">Click Track</button>
   * <button ion-track-hold="eventName">Hold Track</button>
   * <button ion-track-tap="eventName">Tap Track</button>
   * <button ion-track-doubletap="eventName">Double Tap Track</button>
   *
   * @param {string} domEventName The DOM event name
   * @return {array} Angular Directive declaration
   */

  var ionTrackDirective = function ionTrackDirective(domEventName) {
    // eslint-disable-line
    return ['$ionicAnalytics', '$ionicGesture', function ($ionicAnalytics, $ionicGesture) {

      var gestureDriven = ['drag', 'dragstart', 'dragend', 'dragleft', 'dragright', 'dragup', 'dragdown', 'swipe', 'swipeleft', 'swiperight', 'swipeup', 'swipedown', 'tap', 'doubletap', 'hold', 'transform', 'pinch', 'pinchin', 'pinchout', 'rotate'];
      // Check if we need to use the gesture subsystem or the DOM system
      var isGestureDriven = false;
      for (var i = 0; i < gestureDriven.length; i++) {
        if (gestureDriven[i] === domEventName.toLowerCase()) {
          isGestureDriven = true;
        }
      }
      return {
        "restrict": 'A',
        "link": function link($scope, $element, $attr) {
          var capitalized = domEventName[0].toUpperCase() + domEventName.slice(1);
          // Grab event name we will send
          var eventName = $attr['ionTrack' + capitalized];

          if (isGestureDriven) {
            var gesture = $ionicGesture.on(domEventName, handler, $element);
            $scope.$on('$destroy', function () {
              $ionicGesture.off(gesture, domEventName, handler);
            });
          } else {
            $element.on(domEventName, handler);
            $scope.$on('$destroy', function () {
              $element.off(domEventName, handler);
            });
          }

          function handler(e) {
            var eventData = $scope.$eval($attr.ionTrackData) || {};
            if (eventName) {
              $ionicAnalytics.track(eventName, eventData);
            } else {
              $ionicAnalytics.trackClick(e.pageX, e.pageY, e.target, {
                "data": eventData
              });
            }
          }
        }
      };
    }];
  };

  angular.module('ionic.service.analytics', ['ionic']).value('IONIC_ANALYTICS_VERSION', ionic.io.analytics.version).factory('$ionicAnalytics', [function () {
    var io = ionic.io.init();
    return io.analytics;
  }]).factory('domSerializer', [function () {
    return new ionic.io.analytics.serializers.DOMSerializer();
  }]).run(['$ionicAnalytics', '$state', function ($ionicAnalytics, $state) {
    $ionicAnalytics.setGlobalProperties(function (eventCollection, eventData) {
      if (!eventData._ui) {
        eventData._ui = {};
      }
      eventData._ui.active_state = $state.current.name; // eslint-disable-line
    });
  }]);

  angular.module('ionic.service.analytics').provider('$ionicAutoTrack', [function () {

    var trackersDisabled = {},
        allTrackersDisabled = false;

    this.disableTracking = function (tracker) {
      if (tracker) {
        trackersDisabled[tracker] = true;
      } else {
        allTrackersDisabled = true;
      }
    };

    this.$get = [function () {
      return {
        "isEnabled": function isEnabled(tracker) {
          return !allTrackersDisabled && !trackersDisabled[tracker];
        }
      };
    }];
  }])

  // ================================================================================
  // Auto trackers
  // ================================================================================

  .run(['$ionicAutoTrack', '$ionicAnalytics', function ($ionicAutoTrack, $ionicAnalytics) {
    if (!$ionicAutoTrack.isEnabled('Load')) {
      return;
    }
    $ionicAnalytics.track('Load');
  }]).run(['$ionicAutoTrack', '$document', '$ionicAnalytics', 'domSerializer', function ($ionicAutoTrack, $document, $ionicAnalytics, domSerializer) {
    if (!$ionicAutoTrack.isEnabled('Tap')) {
      return;
    }

    $document.on('click', function (event) {
      // want coordinates as a percentage relative to the target element
      var box = event.target.getBoundingClientRect(),
          width = box.right - box.left,
          height = box.bottom - box.top,
          normX = (event.pageX - box.left) / width,
          normY = (event.pageY - box.top) / height;

      var eventData = {
        "coordinates": {
          "x": event.pageX,
          "y": event.pageY
        },
        "target": domSerializer.elementSelector(event.target),
        "target_identifier": domSerializer.elementName(event.target)
      };

      if (isFinite(normX) && isFinite(normY)) {
        eventData.coordinates.x_norm = normX; // eslint-disable-line
        eventData.coordinates.y_norm = normY; // eslint-disable-line
      }

      $ionicAnalytics.track('Tap', {
        "_ui": eventData
      });
    });
  }]).run(['$ionicAutoTrack', '$ionicAnalytics', '$rootScope', function ($ionicAutoTrack, $ionicAnalytics, $rootScope) {
    if (!$ionicAutoTrack.isEnabled('State Change')) {
      return;
    }

    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      // eslint-disable-line
      $ionicAnalytics.track('State Change', {
        "from": fromState.name,
        "to": toState.name
      });
    });
  }])

  // ================================================================================
  // ion-track-$EVENT
  // ================================================================================

  /**
   * @ngdoc directive
   * @name ionTrackClick
   * @module ionic.service.analytics
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

  .directive('ionTrackClick', ionTrackDirective('click')).directive('ionTrackTap', ionTrackDirective('tap')).directive('ionTrackDoubletap', ionTrackDirective('doubletap')).directive('ionTrackHold', ionTrackDirective('hold')).directive('ionTrackRelease', ionTrackDirective('release')).directive('ionTrackDrag', ionTrackDirective('drag')).directive('ionTrackDragLeft', ionTrackDirective('dragleft')).directive('ionTrackDragRight', ionTrackDirective('dragright')).directive('ionTrackDragUp', ionTrackDirective('dragup')).directive('ionTrackDragDown', ionTrackDirective('dragdown')).directive('ionTrackSwipeLeft', ionTrackDirective('swipeleft')).directive('ionTrackSwipeRight', ionTrackDirective('swiperight')).directive('ionTrackSwipeUp', ionTrackDirective('swipeup')).directive('ionTrackSwipeDown', ionTrackDirective('swipedown')).directive('ionTrackTransform', ionTrackDirective('hold')).directive('ionTrackPinch', ionTrackDirective('pinch')).directive('ionTrackPinchIn', ionTrackDirective('pinchin')).directive('ionTrackPinchOut', ionTrackDirective('pinchout')).directive('ionTrackRotate', ionTrackDirective('rotate'));
}

},{}],3:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function () {
  var DOMSerializer = (function () {
    function DOMSerializer() {
      _classCallCheck(this, DOMSerializer);
    }

    _createClass(DOMSerializer, [{
      key: 'elementSelector',
      value: function elementSelector(element) {
        // iterate up the dom
        var selectors = [];
        while (element.tagName !== 'HTML') {
          var selector = element.tagName.toLowerCase();

          var id = element.getAttribute('id');
          if (id) {
            selector += "#" + id;
          }

          var className = element.className;
          if (className) {
            var classes = className.split(' ');
            for (var i = 0; i < classes.length; i++) {
              var c = classes[i];
              if (c) {
                selector += '.' + c;
              }
            }
          }

          if (!element.parentNode) {
            return null;
          }
          var childIndex = Array.prototype.indexOf.call(element.parentNode.children, element);
          selector += ':nth-child(' + (childIndex + 1) + ')';

          element = element.parentNode;
          selectors.push(selector);
        }

        return selectors.reverse().join('>');
      }
    }, {
      key: 'elementName',
      value: function elementName(element) {
        // 1. ion-track-name directive
        var name = element.getAttribute('ion-track-name');
        if (name) {
          return name;
        }

        // 2. id
        var id = element.getAttribute('id');
        if (id) {
          return id;
        }

        // 3. no unique identifier --> return null
        return null;
      }
    }]);

    return DOMSerializer;
  })();

  ionic.io.register('analytics.serializers');
  ionic.io.analytics.serializers.DOMSerializer = DOMSerializer;
})();

},{}],4:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function () {

  var Settings = new ionic.io.core.Settings();

  var BucketStorage = (function () {
    function BucketStorage(name) {
      _classCallCheck(this, BucketStorage);

      this.name = name;
      this.baseStorage = ionic.io.core.main.storage;
    }

    _createClass(BucketStorage, [{
      key: 'get',
      value: function get(key) {
        return this.baseStorage.retrieveObject(this.scopedKey(key));
      }
    }, {
      key: 'set',
      value: function set(key, value) {
        return this.baseStorage.storeObject(this.scopedKey(key), value);
      }
    }, {
      key: 'scopedKey',
      value: function scopedKey(key) {
        return this.name + '_' + key + '_' + Settings.get('app_id');
      }
    }]);

    return BucketStorage;
  })();

  ionic.io.register('analytics');
  ionic.io.analytics.BucketStorage = BucketStorage;
})();

},{}]},{},[4,3,1,2]);
