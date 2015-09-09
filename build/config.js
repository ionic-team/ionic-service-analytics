var fs = require('fs');
var pkg = require('../package.json');

module.exports = {
  banner:
    '/*!\n' +
    ' * Ionic Analytics Client\n' +
    ' * Copyright 2015 Drifty Co. http://drifty.com/\n' +
    ' * See LICENSE in this repository for license information\n' +
    ' */\n',

  dist: '.',

  jsFiles: [
    'src/js/storage.js',
    'src/js/serializers.js',
    'src/js/analytics.js',
    'src/js/angular-integration.js'
  ],

  versionData: {
    version: pkg.version
  }
};
