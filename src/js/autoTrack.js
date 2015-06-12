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
