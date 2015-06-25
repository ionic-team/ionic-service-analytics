/*!
 * Ionic Analytics Client
 * Copyright 2014 Drifty Co. http://drifty.com/
 * See LICENSE in this repository for license information
 */
(function(){
angular.module('ionic.service.analytics', ['ionic.service.core'])

/**
 * @ngdoc service
 * @name $ionicAnalytics
 * @module ionic.services.analytics
 * @description
 *
 * A simple yet powerful analytics tracking system.
 *
 * The simple format is eventName, eventData. Both are arbitrary but the eventName
 * should be the same as previous events if you wish to query on them later.
 *
 * @usage
 * ```javascript
 * $ionicAnalytics.track('order', {
 *   price: 39.99,
 *   item: 'Time Machine'
 * });
 *
 */
.provider('$ionicAnalytics', function() {

  this.$get = [
    '$q', 
    '$timeout', 
    '$state', 
    '$ionicApp', 
    '$ionicUser', 
    '$interval',
    '$http', 
    'persistentStorage',
  function($q, $timeout, $state, $ionicApp, $ionicUser, $interval, $http, persistentStorage) {

    var options = {};

    function log(message) {
      if (options.silent) {
        return;
      }

      console.log('Ionic Analytics: ' + message);
    }

    var api = {
      getAppId: function() {
        return $ionicApp.getApp().app_id;
      },
      getApiKey: function() {
        return $ionicApp.getApiKey();
      },
      getApiServer: function() {
        return $ionicApp.getValue('analytics_api_server');
      },
      getAnalyticsKey: function() {
        return this.analyticsKey;
      },
      setAnalyticsKey: function(v) {
        this.analyticsKey = v;
      },
      hasAnalyticsKey: function() {
        return !!this.analyticsKey;
      },
      requestAnalyticsKey: function() {

        var req = {
          method: 'GET',
          url: $ionicApp.getApiUrl() + '/api/v1/app/' + this.getAppId() + '/keys/write',
          headers: {
            'Authorization': "basic " + btoa(this.getAppId() + ':' + this.getApiKey())
          },
		  withCredentials: false
        };
        return $http(req);
      },
      postEvent: function(name, data) {
        var payload = {
          name: [data]
        };

        var analyticsKey = this.getAnalyticsKey();
        if (!analyticsKey) {
          throw Error('Cannot send events to the analytics server without an Analytics key.')
        }

        var req = {
          method: 'POST',
          url: this.getApiServer() + '/api/v1/events/' + this.getAppId(),
          data: payload,
          headers: {
            "Authorization": analyticsKey,
            "Content-Type": "application/json"
          },
		  withCredentials: false
        }

        return $http(req);
      },
      postEvents: function(events) {
        var analyticsKey = this.getAnalyticsKey();
        if (!analyticsKey) {
          throw Error('Cannot send events to the analytics server without an Analytics key.')
        }

        var req = {
          method: 'POST',
          url: this.getApiServer() + '/api/v1/events/' + this.getAppId(),
          data: events,
          headers: {
            "Authorization": analyticsKey,
            "Content-Type": "application/json"
          },
		  withCredentials: false
        }

        return $http(req);
      }
    }

    var cache = {
      get: function(key) {
        key = this.scopeKey(key);
        return persistentStorage.retrieveObject(key);
      },
      set: function(key, value) {
        key = this.scopeKey(key);
        return persistentStorage.storeObject(key, value);
      },
      scopeKey: function(key) {
        return 'ionic_analytics_' + key + '_' + api.getAppId();
      }
    };

    var useEventCaching = true,
        dispatchInterval,
        dispatchIntervalTime;

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
      var eventQueue = cache.get('event_queue') || {};

      if (Object.keys(eventQueue).length === 0) return;
      if (!connectedToNetwork()) return;



      persistentStorage.lockedAsyncCall(cache.scopeKey('event_dispatch'), function() {

        // Send the analytics data to the proxy server
        return api.postEvents(eventQueue);
      }).then(function(data) {

        // Success from proxy server. Erase event queue.
        log('sent events', eventQueue);
        cache.set('event_queue', {});

      }, function(err) {

        if (err === 'in_progress') {
        } else if (err === 'last_call_interrupted') {
          cache.set('event_queue', {});
        } else {

          // If we didn't connect to the server at all -> keep events
          if (!err.status) {
            console.error('Error sending analytics data: Failed to connect to analytics server.');
          }

          // If we connected to the server but our events were rejected -> erase events
          else {
            console.error('Error sending analytics data: Server responded with error', eventQueue, {
              'status': err.status,
              'error': err.data
            });
            cache.set('event_queue', {});
          }
        }
      });
    }

    function enqueueEvent(collectionName, eventData) {
      if (options.dryRun) {
        log('event recieved but not sent (dryRun active):', collectionName, eventData);
        return;
      } 

      log('enqueuing event to send later:', collectionName, eventData);

      // Add timestamp property to the data
      if (!eventData.keen) {
        eventData.keen = {};
      }
      eventData.keen.timestamp = new Date().toISOString();

      // Add the data to the queue
      var eventQueue = cache.get('event_queue') || {};
      if (!eventQueue[collectionName]) {
        eventQueue[collectionName] = [];
      }
      eventQueue[collectionName].push(eventData);

      // Write the queue to disk
      cache.set('event_queue', eventQueue);
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
        dispatchInterval = $interval(function() { dispatchQueue(); }, value * 1000);
        useEventCaching = true;
      } else {
        useEventCaching = false;
      }
    }

    function getDispatchInterval() {
      return dispatchIntervalTime;
    }


    return {

      // Register to get an analytics key
      register: function(optionsParam) {

        if (!api.getAppId() || !api.getApiKey()) {
          var msg = 'You need to provide an app id and api key before calling $ionicAnalytics.register().\n    ' +
                    'See http://docs.ionic.io/v1.0/docs/io-quick-start';
          throw new Error(msg);
        }

        options = optionsParam || {};
        if (options.dryRun) {
          log('dryRun mode is active. Analytics will not send any events.')
        }

        // Request Analytics key from server.
        var promise = api.requestAnalyticsKey().then(function(resp) {

          var key = resp.data.write_key;
          api.setAnalyticsKey(key);
          return resp;

        }, function(err) {

          if (err.status == 401) {
            var msg = 'The api key and app id you provided did not register on the server.\n    ' +
                      'See http://docs.ionic.io/v1.0/docs/io-quick-start';
            console.error(msg)
          } else if (err.status == 404) {
            var msg = 'The app id you provided ("' + api.getAppId() + '") was not found on the server.\n    ' +
                      'See http://docs.ionic.io/v1.0/docs/io-quick-start';
            console.error(msg);
          } else {
            console.error('Error registering your api key with the server.', err);
          }

          return $q.reject(err);
        });

        var self = this;
        promise.then(function() {
          log('successfully registered analytics key');

          self.track('load');

          setDispatchInterval(30);
          $timeout(function() {
            dispatchQueue();
          });
        });

        return promise;
      },
      setDispatchInterval: function(v) {
        return setDispatchInterval(v);
      },
      getDispatchInterval: function() {
        return getDispatchInterval();
      },
      track: function(eventName, data) {

        if (!api.getAppId() || !api.getApiKey()) {
          var msg = 'You must provide an app id and api key to identify your app before tracking analytics data.\n    ' +
                    'See http://docs.ionic.io/v1.0/docs/io-quick-start'
          throw new Error(msg)
        }

        if (!data) data = {};
        data._app = {
          app_id: api.getAppId()
        };
        data._user = angular.copy($ionicUser.get());

        if (!data._ui) data._ui = {};
        data._ui.active_state = $state.current.name;

        if (useEventCaching) {
          enqueueEvent(eventName, data);
        } else {
          if (options.dryRun) {
            console.log('dryRun active, will not send event: ', eventName, data);
          } else {
            api.postEvent(eventName, data);            
          }
        }
      },
    };
  }];
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


angular.module('ionic.service.analytics')

/**
 * @ngdoc service
 * @name $ionicAutoTrack
 * @module ionic.service.analytics
 * @description
 *
 * Utility for auto tracking events. Every DOM event will go through a
 * list of hooks which extract meaningful data and add it to an event to Keen.
 *
 * Hooks should take a DOM event and return a dictionary of extracted properties, if any.
 *
 * @usage
 * ```javascript
 * $ionicAutoTrack.addHook(function(event) {
 *   if (event.type !== 'click') return;
 *
 *   return {
 *     my_extra_tracking_data: event.pageX
 *   };
 * });
 * ```
 */
.factory('$ionicAutoTrack', ['domSerializer', function(domSerializer) {

  // Array of handlers that events will filter through.
  var hooks = [];

  // Add a few handlers to start off our hooks
  // Handler for general click events
  hooks.push(function(event) {

    if (event.type !== 'click') return;

    // We want to also include coordinates as a percentage relative to the target element
    var x = event.pageX,
        y = event.pageY,
        box = event.target.getBoundingClientRect(),
        width = box.right - box.left,
        height = box.bottom - box.top,
        normX = (x - box.left) / width,
        normY = (y - box.top) / height;

    // Now get an xpath reference to the target element
    var elementSerialized = domSerializer.serializeElement(event.target);

    var tapData = {
      coords: {
        x: x,
        y: y
      },
      element: elementSerialized
    };

    if (isFinite(normX) && isFinite(normY)) {
      tapData.coords.x_norm = normX;
      tapData.coords.y_norm = normY;
    }

    return tapData;
  });

  // TODO fix handler for tab-item clicks
  // hooks.push(function(event) {
  //   if (event.type !== 'click') return;

  //   var item = ionic.DomUtil.getParentWithClass(event.target, 'tab-item', 3);
  //   if(!item) {
  //     return;
  //   }
  // });

  return {
    addHook: function(hook) {
      hooks.push(hook);
    },

    runHooks: function(domEvent) {

      // Event we'll actually send for analytics
      var trackingEvent;

      // Run the event through each hook
      for (var i = 0; i < hooks.length; i++) {
        var hookResponse = hooks[i](domEvent);
        if (hookResponse) {

          // Append the hook response to our tracking data
          if (!trackingEvent) trackingEvent = {};
          trackingEvent = angular.extend(trackingEvent, hookResponse);
        }
      }

      return trackingEvent;
    }
  };
}])


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
 * @module ionic.service.analytics
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
.directive('ionTrackAuto', ['$document', '$ionicAnalytics', '$ionicAutoTrack', function($document, $ionicAnalytics, $ionicAutoTrack) {
  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {

      // Listen for events on the document body.
      // In the future we can listen for all kinds of events.
      $document.on('click', function(event) {
        var uiData = $ionicAutoTrack.runHooks(event);
        if (uiData) {
          var trackingEvent = {
            _ui: uiData
          }
          $ionicAnalytics.track('tap', trackingEvent);
        }
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
  return ['$ionicAnalytics', '$ionicGesture', function($ionicAnalytics, $ionicGesture) {

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
            $ionicAnalytics.track(eventName, eventData);
          } else {
            $ionicAnalytics.trackClick(e.pageX, e.pageY, e.target, {
              data: eventData
            });
          }
        }
      }
    }
  }];
}

})();