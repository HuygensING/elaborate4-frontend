gulp = require 'gulp'
gutil = require 'gulp-util'
stylus = require 'gulp-stylus'
rename = require 'gulp-rename'
changed = require 'gulp-changed'
concat = require 'gulp-concat'

paths =
	stylus: ['./src/**/*.styl']

		
gulp.task 'stylus', ->
	gulp.src(paths.stylus)
		.pipe(stylus())
		.pipe(concat('main.css'))
		.pipe(gulp.dest(__dirname))
	

gulp.task 'watch', ->
	gulp.watch [paths.stylus], ['stylus']

gulp.task 'default', ['watch']