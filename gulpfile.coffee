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
rsync = require('rsyncwrapper').rsync
pkg = require './package.json'
cfg = require './config.json'
async = require 'async'

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


gulp.task 'clean', ->
  gulp.src(compiledDir+'/*').pipe(clean())
  gulp.src(distDir+'/*').pipe(clean())

gulp.task 'copy-static', ['clean'], ->
  gulp.src('./static/**/*').pipe(gulp.dest(compiledDir))
  gulp.src('./static/**/*').pipe(gulp.dest(distDir))

gulp.task 'copy-fonts', ->
  gulp.src('./node_modules/font-awesome/css/font-awesome.min.css').pipe(gulp.dest(compiledDir+'/font-awesome/css'))
  gulp.src('./node_modules/font-awesome/fonts/*').pipe(gulp.dest(compiledDir+'/font-awesome/fonts'))

  gulp.src('./node_modules/font-awesome/css/font-awesome.min.css').pipe(gulp.dest(distDir+'/font-awesome/css'))
  gulp.src('./node_modules/font-awesome/fonts/*').pipe(gulp.dest(distDir+'/font-awesome/fonts'))

gulp.task 'copy-images', ->
  gulp.src('./node_modules/hilib/images/**/*').pipe(gulp.dest(compiledDir+'/images/hilib'))
  gulp.src('./node_modules/hilib/images/**/*').pipe(gulp.dest(distDir+'/images/hilib'))

gulp.task 'copy-index', -> gulp.src(compiledDir+'/index.html').pipe(gulp.dest(distDir))

gulp.task 'compile', ['copy-static'], ->
  gulp.start 'copy-images'
  gulp.start 'copy-fonts'
  gulp.start 'browserify'
  gulp.start 'jade'
  gulp.start 'stylus'

# Doens't work because of dep compile and gulp.start. :(
#gulp.task 'build', ['compile'], ->
#  gulp.start 'copy-index'
#  gulp.start 'uglify'
#  gulp.start 'minify-css'

# First run `gulp compile`. Can't be a dep because of async gulp.start. :(
gulp.task 'deploy-test', (done) ->
  rsync
    src: 'compiled/',
    dest: cfg['remote-destination'],
    recursive: true,
  ,
    (error,stdout,stderr,cmd) ->
      if error
        new gutil.PluginError('test', 'something broke', showStack: true)
      else
        console.log stdout, stderr, cmd
        done()

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