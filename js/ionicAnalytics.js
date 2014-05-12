angular.module('ionic.services.analytics', ['ionic.services.common'])

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
.factory('$ionicTrack', ['$q', '$timeout', '$ionicApp', function($q, $timeout, $ionicApp) {
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

      data = angular.extend(data, {
        _app: app
      });

      $timeout(function() {
        console.log('Sending', {
          'status': 'sent',
          'message': data
        });
        Keen.addEvent(eventName, data);
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
      $document.on('click', function(e) {
        var i, j, type, _types = $ionicTrack.getTypes();
        for(i = 0, j = _types.length; i < j; i++) {
          type = _types[i];
          if(type.handle(event) === false) {
            return false;
          }
        }
      });
    }
  }
}])
