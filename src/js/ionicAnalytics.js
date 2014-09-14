angular.module('ionic.services.analytics', ['ionic.services.common'])


.provider('$ionicAnalytics', function() {

  var client = new Keen({
    projectId: "5377805cd97b857fed00003f",
    writeKey: "c751ed888fe2688d67e58462ca3ee4c2fba4a0185da6112bd9689281cee7c03439b9478a1fb5445c3db788f69867fb91f19a98f15715e335eebd4e992078c4e16b657866e6b13b74c11a683c3aa07f3da988ef731379352b06882d831ca64c24c546ceee5ce337127b608db73d1fb8f4",
  });

  return {
    $get: [function() {
      return {
        getClient: function() {
          return client;
        }
      }
    }]
  }
})

/**
 * @private
 * Clean a given scope (for sending scope data to the server for analytics purposes.
 * This removes things we don't care about and tries to just expose
 * useful scope data.
 */
.factory('scopeClean', function() {
  return function(scope) {
    var obj = {};
    for(var i in scope) {
      if(i === 'constructor' || i === 'this') {
        continue;
      }
      if(typeof scope[i] === 'function') {
        continue;
      }
      if(i.indexOf('$') == -1) {
        obj[i] = scope[i];
      }
    }
    return obj;
  }
})

/**
 * @private
 * When the app runs, add some heuristics to track for UI events.
 */
.run(['$ionicTrack', 'scopeClean', function($ionicTrack, scopeClean) {
  $ionicTrack.addType({
    name: 'button',
    shouldHandle: function(event) {
    },
    handle: function(event, data) {
      if(!event.type === 'click' || !event.target || !event.target.classList.contains('button')) {
        return;
      }
      var data = {};
      $ionicTrack.send('tap', {
        coords: {
          x: event.pageX,
          y: event.pageY
        }
      });
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

      $ionicTrack.send('tap', {
        type: 'tab-item',
        scope: scopeClean(itemScope),
        coords: {
          x: event.pageX,
          y: event.pageY
        }
      });
    }
  });
}])

.factory('$ionicUser', [
  '$q',
  '$timeout',
function($q, $timeout) {
  var user;

  return {
    identify: function(userData) {
      user = userData;
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
function($q, $timeout, $state, $ionicApp, $ionicUser, $ionicAnalytics) {
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
      var q = $q.defer();

      var app = $ionicApp.getApp();

      var user;

      console.log("Current state:", $state.current.name);

      data = angular.extend(data, {
        activeState: $state.current.name,
        _app: app
      });

      user = $ionicUser.get();

      if(user) {
        data = angular.extend(data, {
          user: user
        });
      }
      console.trace();

      $timeout(function() {
        console.log('Sending', {
          'status': 'sent',
          'message': data
        });
        $ionicAnalytics.getClient().addEvent(eventName, data);
        q.resolve({
          'status': 'sent',
          'message': data
        });
      });

      return q.promise;
    },
    track: function(eventName, data) {
      return this.send(eventName, {
        data: data
      });
    },

    trackClick: function(x, y, data) {
      return this.send('tap', {
        coords: {
          x: x,
          y: y
        },
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
.directive('ionTrackClick', ['$ionicTrack', 'scopeClean', function($ionicTrack, scopeClean) {
  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {
      var eventName = $attr.ionTrackEvent;
      $element.bind('click', function(e) {
        $ionicTrack.trackClick(e.pageX, e.pageY, {
          target: e.target,
          scope: scopeClean(angular.element(e.target).scope())
        });
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

        $ionicTrack.trackClick(event.pageX, event.pageY, {});
      });
    }
  }
}])
