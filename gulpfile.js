var gulp = require('gulp'),
  buildConfig = require('./build/config.js'),
  gutil = require('gulp-util'),
  concat = require('gulp-concat'),
  footer = require('gulp-footer'),
  header = require('gulp-header'),
  watch = require('gulp-watch'),
  browserify = require("browserify"),
  babelify = require("babelify"),
  eslint = require("gulp-eslint"),
  fs = require("fs"),
  replace = require('gulp-replace');

gulp.task('build', ['lint'], function () {
  browserify({
    entries: buildConfig.jsFiles,
    debug: false,
    transform: [babelify]
  }).bundle()
  .on("error", function (err) { console.log("Error : " + err.message); })
  .pipe(fs.createWriteStream("ionic-analytics.js"))
  .on('finish', function() {
    gulp.src("ionic-analytics.js")
      .pipe(replace('ANALYTICS_VERSION_STRING', buildConfig.versionData.version))
      .pipe(gulp.dest(buildConfig.dist))
      .on('end', function() { console.log('\n    Build Finished\n    Version: ' + buildConfig.versionData.version + "\n"); })
  })
});

gulp.task('lint', function () {
  return gulp.src(buildConfig.jsFiles)
    .pipe(eslint())
    .pipe(eslint.failOnError())
    .pipe(eslint.formatEach());
});

gulp.task('watch', ['build'], function() {
  gulp.watch(['src/**/*.js'], ['build']);
});

gulp.task('default', ['build']);
