angular.module('ionic.services.common', [])

/**
 * A core Ionic account identity provider. 
 *
 * Usage:
 * angular.module('myApp', ['ionic', 'ionic.services.common'])
 * .config(['$ionicAppProvider', function($ionicAccountProvider) {
 *   $ionicAppProvider.identify({
 *     app_id: 'x34dfxjydi23dx'
 *   });
 * }]);
 */
.provider('$ionicApp', function() {
  var app = {};

  // Return account information
  this.getApp = function() {
    return app;
  };

  this.identify = function(opts) {
    app = opts;
  };

  this.$get = [function() {
    return function() {
    }
  }];
});
