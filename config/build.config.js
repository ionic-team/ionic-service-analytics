var fs = require('fs');
var pkg = require('../package.json');

module.exports = {
  banner:
    '/*!\n' +
    ' * Ionic Analytics Client\n' +
    ' * Copyright 2014 Drifty Co. http://drifty.com/\n' +
    ' * See LICENSE in this repository for license information\n' +
    ' */\n',
  closureStart: '(function(){\n',
  closureEnd: '\n})();',

  dist: '.',

  jsFiles: ['lib/keen-js/dist/keen-tracker.js', 'src/js/**/*.js'],

  versionData: {
    version: pkg.version
  }
};
