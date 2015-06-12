angular.module('ionic.service.analytics', ['ionic.service.core'])

/**
 * @private
 * When the app runs, add some heuristics to track for UI events.
 */
.run(['$ionicAnalytics', function($ionicAnalytics) {
  // Load events are how we track usage
  $ionicAnalytics.track('load', {});
}])


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
 *   item: 'Time Machine',
 * });
 *
 * $ionicAnalytics.identify('favorite_things', {
 *   fruit: 'pear',
 *   animal: 'lion'
 * });
 * ```
 */
.provider('$ionicAnalytics', function() {
  var settings = {
    apiServer: 'https://analytics.ionic.io'
  };

  this.setApiServer = function(server) {
    settings.apiServer = server;
  };

  this.$get = ['$q', '$timeout', '$state', '$ionicApp', '$ionicUser', '$interval',
        '$http', 'domSerializer', 'persistentStorage',
        function($q, $timeout, $state, $ionicApp, $ionicUser, $interval,
          $http, domSerializer, persistentStorage) {

    // Configure api endpoint based on app id
    if (!apiEndpoint)
    var appId = $ionicApp.getApp().app_id,
        apiEndpoint = settings.apiServer
                    + '/api/v1/events/'
                    + appId,
        apiKey = $ionicApp.getApiKey();

    var queueKey = 'ionic_analytics_event_queue_' + appId,
        dispatchKey = 'ionic_analytics_event_queue_dispatch_' + appId,
        apiWriteKeyKey = 'ionic_analytics_write_key_key_' + appId;

    var useEventCaching = true,
        dispatchInterval,
        dispatchIntervalTime;
    setDispatchInterval(30);
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

    // Returns a promise which resolves to the analytics key
    function requestApiWriteKey() {

      // Return the cached key if we have one.
      var deferred = $q.defer();
      var cachedKey = persistentStorage.retrieveObject(apiWriteKeyKey);
      if (cachedKey) {
        deferred.resolve(cachedKey);
        return deferred.promise;
      }

      // Request the write key for this app.
      var req = {
        method: 'GET',
        url: $ionicApp.getApiUrl() + '/api/v1/app/' + appId + '/keys/write',
        headers: {
          'Authorization': "basic " + btoa(appId + ':' + apiKey)
        }
      };
      $http(req).then(function(resp){
        writeKey = resp.data.write_key;
        persistentStorage.storeObject(apiWriteKeyKey, writeKey);
        deferred.resolve(writeKey);

      }, function(err){
        console.log('Error grabbing write key, continuing without.');
      });

      return deferred.promise;
    }

    function dispatchQueue() {
      var eventQueue = persistentStorage.retrieveObject(queueKey) || {};
      if (Object.keys(eventQueue).length === 0) return;
      if (!connectedToNetwork()) return;

      console.log('dispatching queue', eventQueue);

      persistentStorage.lockedAsyncCall(dispatchKey, function() {

        // Send the analytics data to the proxy server
        return addEvents(eventQueue);
      }).then(function(data) {

        // Success from proxy server. Erase event queue.
        persistentStorage.storeObject(queueKey, {});

      }, function(err) {

        if (err === 'in_progress') {
        } else if (err === 'last_call_interrupted') {
          persistentStorage.storeObject(queueKey, {});
        } else {

          // If we didn't connect to the server at all -> keep events
          if (!err.status) {
            console.log('Error sending analytics data: Failed to connect to analytics server.');
          }

          // If we connected to the server but our events were rejected -> erase events
          else {
            console.log('Error sending analytics data: Server responded with error', eventQueue, {
              'status': err.status,
              'error': err.data
            });
            persistentStorage.storeObject(queueKey, {});
          }
        }
      });
    }

    function enqueueEvent(collectionName, eventData) {
      console.log('enqueueing event', collectionName, eventData);

      // Add timestamp property to the data
      if (!eventData.keen) {
        eventData.keen = {};
      }
      eventData.keen.timestamp = new Date().toISOString();

      // Add the data to the queue
      var eventQueue = persistentStorage.retrieveObject(queueKey) || {};
      if (!eventQueue[collectionName]) {
        eventQueue[collectionName] = [];
      }
      eventQueue[collectionName].push(eventData);

      // Write the queue to disk
      persistentStorage.storeObject(queueKey, eventQueue);
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

    function addEvent(collectionName, eventData) {
      var payload = {
        collectionName: [eventData]
      };

      return requestApiWriteKey().then(function(apiWriteKey) {
        return $http.post(apiEndpoint, payload, {
          headers: {
            "Authorization": apiWriteKey,
            "Content-Type": "application/json"
          }
        });
      });
    }

    function addEvents(events) {
      return requestApiWriteKey().then(function(apiWriteKey) {

        return $http.post(apiEndpoint, events, {
          headers: {
            "Authorization": apiWriteKey,
            "Content-Type": "application/json"
          }
        });
      });
    }

    return {
      setDispatchInterval: setDispatchInterval,
      getDispatchInterval: getDispatchInterval,
      track: function(eventName, data) {
        // Copy objects so they can sit in the queue without being modified
        var app = $ionicApp.getApp(),
            user = angular.copy($ionicUser.get());

        if (!app.app_id) {
          var msg = 'You must provide an app_id to identify your app before tracking analytics data.\n    ' +
                    'See http://docs.ionic.io/v1.0/docs/io-quick-start'
          throw new Error(msg)
        }
        if (!apiKey) {
          var msg = 'You must specify an api key before sending analytics data.\n    ' +
                    'See http://docs.ionic.io/v1.0/docs/io-quick-start'
          throw new Error(msg)
        }

        // Don't expose api keys
        delete app.api_write_key;
        delete app.api_read_key;

        // Add user tracking data to everything sent to keen
        data._app = app;
        data._user = user;

        if (!data._ui) data._ui = {};
        data._ui.activeState = $state.current.name;

        if (useEventCaching) {
          enqueueEvent(eventName, data);
        } else {
          addEvent(eventName, data);
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

