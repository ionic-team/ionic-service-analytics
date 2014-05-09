angular.module('ionic.analytics', [])

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
      $ionicTrack.send({
        eventName: '_click',
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

      $ionicTrack.send({
        eventName: '_click',
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


.factory('$ionicTrack', ['$q', '$timeout', function($q, $timeout) {
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
    send: function(data) {
      var q = $q.defer();

      $timeout(function() {
        console.log('Sending', {
          'status': 'sent',
          'message': data
        });
        q.resolve({
          'status': 'sent',
          'message': data
        });
      });

      return q.promise;
    },
    track: function(eventName, data) {
      return this.send({
        eventName: eventName,
        data: data
      });
    },

    trackClick: function(x, y, data) {
      return this.send({
        eventName: '_click',
        coords: {
          x: x,
          y: y
        },
        data: data
      });
    }

  }
}])

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
