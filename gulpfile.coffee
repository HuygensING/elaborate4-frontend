gulp = require 'gulp'
gutil = require 'gulp-util'
connect = require 'gulp-connect'
jade = require 'gulp-jade'
concat = require 'gulp-concat'
clean = require 'gulp-clean'
stylus = require 'gulp-stylus'
browserify = require 'gulp-browserify'
rename = require 'gulp-rename'
connectRewrite = require './connect-rewrite'

paths =
	coffee: ['./src/**/*.coffee', './node_modules/elaborate-modules/modules/**/*.coffee']
	jade: ['./src/jade/**/*.jade', './src/index.jade', './node_modules/elaborate-modules/modules/**/*.jade']
	stylus: ['./node_modules/elaborate-modules/modules/**/*.styl', './src/stylus/**/*.styl', '!./src/stylus/import/*.styl']

gulp.task 'connect', connect.server
	root: __dirname + '/dist2',
	port: 9000,
	livereload: true
	middleware: connectRewrite

gulp.task 'jade', ->
	gulp.src(paths.jade[1])
		.pipe(jade())
		.pipe(gulp.dest('./dist2'))
		.pipe(connect.reload())

gulp.task 'browserify', ->
	gulp.src('./src/coffee/main.coffee', read: false)
		.pipe(browserify(
			transform: ['coffeeify', 'jadeify']
			extensions: ['.coffee', '.jade']
		))
		.pipe(rename(extname:'.js'))
		.pipe(gulp.dest('./dist2/js'))
		.pipe(connect.reload())

gulp.task 'stylus', ->
	gulp.src(paths.stylus)
		.pipe(stylus(
			use: ['nib']
		))
		.pipe(concat('main.css'))
		.pipe(gulp.dest('./dist2/css'))

gulp.task 'css', ['stylus'], ->
	gulp.src(['./dist2/css/main.css'])
		.pipe(concat('main.css'))
		.pipe(gulp.dest('./dist2/css'))
		.pipe(connect.reload())

gulp.task 'clean-dist2', -> gulp.src('./dist2/*').pipe(clean())

gulp.task 'copy-static', ['clean-dist2'], -> gulp.src('./src/static/**/*').pipe(gulp.dest('./dist2'))

gulp.task 'c', ['copy-static', 'browserify', 'jade', 'css']
	
gulp.task 'watch', ->
	gulp.watch [paths.coffee], ['browserify']
	gulp.watch [paths.jade[0], paths.jade[2]], ['browserify']
	gulp.watch [paths.jade[1]], ['jade']
	gulp.watch [paths.stylus], ['css']

gulp.task 'default', ['connect', 'watch']