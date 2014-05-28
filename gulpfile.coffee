gulp = require 'gulp'
gutil = require 'gulp-util'
connect = require 'gulp-connect'
jade = require 'gulp-jade'
concat = require 'gulp-concat'
clean = require 'gulp-clean'
stylus = require 'gulp-stylus'
browserify = require 'browserify'
rename = require 'gulp-rename'
uglify = require 'gulp-uglify'
minifyCss = require 'gulp-minify-css'
source = require 'vinyl-source-stream'
watchify = require 'watchify'
nib = require 'nib'
preprocess = require 'gulp-preprocess'
pkg = require './package.json'

connectRewrite = require './connect-rewrite'

compiledDir = './compiled'
distDir = './dist'
paths =
  jade: [
    './src/jade/**/*.jade'
    './src/index.jade'
    './node_modules/elaborate-modules/modules/**/*.jade'
  ]
  stylus: [
    './node_modules/hilib/src/views/**/*.styl'
    './node_modules/huygens-faceted-search/src/stylus/**/*.styl'
    './node_modules/elaborate-modules/modules/**/*.styl'
    './src/stylus/**/*.styl'
  ]

gulp.task 'connect', ->
  connect.server
    root: compiledDir,
    port: 9000,
    livereload: true
    middleware: connectRewrite

gulp.task 'connect-dist', ->
  connect.server
    root: distDir,
    port: 9002,
    middleware: connectRewrite

gulp.task 'compile-jade', ->
  gulp.src(paths.jade[1])
    .pipe(jade())
    .pipe(rename(basename:'index-tmp'))
    .pipe(gulp.dest(compiledDir))
    .pipe(connect.reload())

gulp.task 'jade', ['compile-jade'], ->
  gulp.src(compiledDir+'/index-tmp.html')
    .pipe(clean())
    .pipe(preprocess(context: VERSION: pkg.version))
    .pipe(rename(basename:'index'))
    .pipe(gulp.dest(compiledDir))

gulp.task 'concat-stylus', ->
  gulp.src(paths.stylus)
    .pipe(concat('concat.styl'))
    .pipe(gulp.dest('src/stylus'))

gulp.task 'stylus', ['concat-stylus'], (cb) ->
  gulp.src('src/stylus/concat.styl')
    .pipe(clean())
    .pipe(stylus(
      use: [nib()]
      errors: true
    ))
    .pipe(rename(basename:"main-#{pkg.version}"))
    .pipe(gulp.dest(compiledDir+'/css'))
    .pipe(connect.reload())

gulp.task 'uglify', ->
  gulp.src(compiledDir+'/js/main.js')
    .pipe(uglify())
    .pipe(gulp.dest(distDir+'/js'))

gulp.task 'minify-css', ->
  gulp.src(compiledDir+'/css/main.css')
    .pipe(minifyCss())
    .pipe(gulp.dest(distDir+'/css'))

gulp.task 'clean-compiled', -> gulp.src(compiledDir+'/*').pipe(clean())
gulp.task 'clean-dist', -> gulp.src(distDir+'/*').pipe(clean())

gulp.task 'copy-static-compiled', -> gulp.src('./static/**/*').pipe(gulp.dest(compiledDir))
gulp.task 'copy-static-dist', -> gulp.src('./static/**/*').pipe(gulp.dest(distDir))

gulp.task 'copy-fonts-compiled', ['copy-static-compiled'], (cb) -> 
  gulp.src('./node_modules/font-awesome/css/font-awesome.min.css').pipe(gulp.dest(compiledDir+'/font-awesome/css'))
  gulp.src('./node_modules/font-awesome/fonts/*').pipe(gulp.dest(compiledDir+'/font-awesome/fonts'))
  cb()

gulp.task 'copy-fonts-dist', ['copy-static-dist'], (cb) -> 
  gulp.src('./node_modules/font-awesome/fonts/*').pipe(gulp.dest(distDir+'/font-awesome/fonts'))
  cb()

gulp.task 'copy-images-compiled', ['copy-static-compiled'], -> gulp.src('./node_modules/hilib/images/**/*').pipe(gulp.dest(compiledDir+'/images/hilib'))
gulp.task 'copy-images-dist', ['copy-static-dist'], -> gulp.src('./node_modules/hilib/images/**/*').pipe(gulp.dest(distDir+'/images/hilib'))

gulp.task 'copy-index', -> gulp.src(compiledDir+'/index.html').pipe(gulp.dest(distDir))

gulp.task 'compile', ['clean-compiled'], ->
  gulp.start 'copy-images-compiled'
  gulp.start 'copy-fonts-compiled'
  gulp.start 'browserify'
  gulp.start 'jade'
  gulp.start 'stylus'

gulp.task 'build', ['clean-dist', 'compile'], ->
  gulp.start 'copy-images-dist'
  gulp.start 'copy-fonts-dist'
  gulp.start 'copy-index'
  gulp.start 'uglify'
  gulp.start 'minify-css'

gulp.task 'watch', ->
  gulp.watch [paths.jade[1]], ['jade']
  gulp.watch [paths.stylus], ['stylus']

createBundle = (watch=false) ->
  args =
    entries: './src/coffee/main.coffee'
    extensions: ['.coffee', '.jade']

  bundler = if watch then watchify(args) else browserify(args)

  bundler.transform('coffeeify')
  bundler.transform('jadeify')
  bundler.transform('envify')

  rebundle = ->
    bundler.bundle()
    .pipe(source("main-#{pkg.version}.js"))
    .pipe(gulp.dest(compiledDir+'/js'))
    .pipe(connect.reload())

  bundler.on('update', rebundle)

  rebundle()

gulp.task 'browserify', -> createBundle false
gulp.task 'watchify', -> createBundle true

gulp.task 'default', ['stylus', 'connect', 'watch', 'watchify']