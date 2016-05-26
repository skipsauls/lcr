var gulp = require('gulp');
var header = require('gulp-header');
var footer = require('gulp-footer');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var order = require('gulp-order');
var jshint = require('gulp-jshint');
var cached = require('gulp-cached');
var beautify = require('gulp-beautify');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var remember = require('gulp-remember');

var scriptsGlob = 'src/wave/*.js';

gulp.task('scripts', function() {
  return gulp.src(scriptsGlob)
    //.pipe(jshint('.jshintrc'))
    //.pipe(jshint.reporter('default'))
    .pipe(order([
    	'core.js',
    	'wave.js',
    	'Base.js',
    	'Dataset.js',
    	'Lens.js',
    	'Widget.js',
    	'Dashboard.js',
    	'Step.js',
    	'App.js',
    ]))
    .pipe(concat('test.js'))
    .pipe(gulp.dest('dist/assets/js'))
    .pipe(gulp.dest('public/javascripts'))
    .pipe(rename({suffix: '.min'}))
    //.pipe(uglify())
    .pipe(uglify().on('error', function(e){
            console.log(e);
         }))
    .pipe(gulp.dest('dist/assets/js'))
    .pipe(gulp.dest('public/javascrt\ipts'))
    .pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task('watch', function () {
  var watcher = gulp.watch(scriptsGlob, ['scripts']); // watch the same files in our scripts task
  watcher.on('change', function (event) {
    if (event.type === 'deleted') {                   // if a file is deleted, forget about it
      delete cached.caches.scripts[event.path];       // gulp-cached remove api
      remember.forget('scripts', event.path);         // gulp-remember remove api
    }
  }).on('error', function(err) {
  	console.error(err);
  	this.emit('end');
  });
});


/*
gulp.task('scripts', function() {
  return gulp.src(scriptsGlob)
      .pipe(cached('scripts'))        // only pass through changed files
      .pipe(jshint())                 // do special things to the changed files...
      .pipe(header('(function () {')) // e.g. jshinting ^^^
      .pipe(footer('})();'))          // and some kind of module wrapping
      .pipe(remember('scripts'))      // add back all files to the stream
      .pipe(concat('test.js'))         // do things that require all files
      .pipe(gulp.dest('public/'));
});

gulp.task('watch', function () {
  var watcher = gulp.watch(scriptsGlob, ['scripts']); // watch the same files in our scripts task
  watcher.on('change', function (event) {
    if (event.type === 'deleted') {                   // if a file is deleted, forget about it
      delete cached.caches.scripts[event.path];       // gulp-cached remove api
      remember.forget('scripts', event.path);         // gulp-remember remove api
    }
  });
});

*/