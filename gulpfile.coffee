gulp = require 'gulp'
gutil = require 'gulp-util'
# connect = require 'gulp-connect'
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
exec = require('child_process').exec
rimraf = require 'rimraf'
browserSync = require 'browser-sync'
modRewrite = require 'connect-modrewrite'

connectRewrite = require './connect-rewrite'

developmentDir = './development'
productionDir = './production'
configDir = "./src/coffee/config/"

baseDir = if process.env.NODE_ENV is 'production' then productionDir else developmentDir
env = if process.env.NODE_ENV? then process.env.NODE_ENV else 'development'

context =
	VERSION: pkg.version
	ENV: env
	BASEDIR: baseDir

paths =
	stylus: [
		'./node_modules/hilib/src/views/**/*.styl'
		'./src/stylus/**/*.styl'
	]

cssFiles = cfg['css-files'].slice()
cssFiles.push "#{developmentDir}/css/hilib-#{context.VERSION}.css"
cssFiles.push "#{developmentDir}/css/src-#{context.VERSION}.css"

gulp.task 'copy-env-config', ->
	gulp.src("#{configDir}#{env}.coffee")
		.pipe(rename("env.coffee"))
		.pipe(gulp.dest(configDir))

gulp.task 'link', (done) ->
	removeModules = (cb) ->
		modulePaths = cfg['local-modules'].map (module) -> "./node_modules/#{module}"
		async.each modulePaths , rimraf, (err) -> cb()

	linkModules = (cb) ->
		moduleCommands = cfg['local-modules'].map (module) -> "npm link #{module}"
		async.each moduleCommands, exec, (err) -> cb()

	async.series [removeModules, linkModules], (err) ->
		return gutil.log err if err?
		done()

gulp.task 'unlink', (done) ->
	unlinkModules = (cb) ->
		moduleCommands = cfg['local-modules'].map (module) -> "npm unlink #{module}"
		async.each moduleCommands, exec, (err) -> cb()

	installModules = (cb) ->
		exec 'npm i', cb

	async.series [unlinkModules, installModules], (err) ->
		return gutil.log err if err?
		done()

# gulp.task 'connect', ->
# 	connect.server
# 		root: developmentDir,
# 		port: 9000,
# 		livereload: true
# 		middleware: connectRewrite

# gulp.task 'connect-dist', ->
# 	connect.server
# 		root: productionDir,
# 		port: 9002,
# 		middleware: connectRewrite

server = ->
	browserSync.init null,
		server:
			baseDir: "./development"
			middleware: [
				modRewrite([
					'^[^\\.]*$ /index.html [L]'
				])
			]
		notify: false

gulp.task 'watch-n-serve', ['create-css', 'watch', 'watchify'], -> server()
gulp.task 'server', -> server()

gulp.task 'compile-jade', ->
	gulp.src('./src/index.jade')
		.pipe(jade())
		.pipe(rename(basename:'index-tmp'))
		.pipe(gulp.dest(developmentDir))

gulp.task 'jade', ['compile-jade'], ->
	gulp.src(developmentDir+'/index-tmp.html')
		.pipe(clean())
		.pipe(preprocess(context: context))
		.pipe(rename(basename:'index'))
		.pipe(gulp.dest(developmentDir))

# gulp.task 'concat-stylus', ->
# 	gulp.src(paths.stylus)
# 		.pipe(concat('concat.styl'))
# 		.pipe(gulp.dest('src/stylus'))

compileStylus = (name, src) ->
	gulp.src(src)
		# .pipe(clean())
		.pipe(stylus(
			use: [nib()]
			errors: true
		))
		.pipe(concat("#{name}-#{context.VERSION}.css"))
		.pipe(gulp.dest(developmentDir+'/css'))

gulp.task 'compile-hilib-stylus', ->
	compileStylus 'hilib', './node_modules/hilib/src/views/**/*.styl'

gulp.task 'compile-main-stylus', ->
	compileStylus 'src', './src/stylus/main.styl'

# gulp.task 'stylus', ['concat-stylus'], (cb) ->
# 	gulp.src('src/stylus/concat.styl')
# 		# .pipe(clean())
# 		.pipe(stylus(
# 			use: [nib()]
# 			errors: true
# 		))
# 		.pipe(rename(basename:"src-#{context.VERSION}"))
# 		.pipe(gulp.dest(developmentDir+'/css'))

gulp.task 'create-css', ['compile-hilib-stylus', 'compile-main-stylus'], ->
	gulp.src(cssFiles)
		.pipe(concat("main-#{context.VERSION}.css"))
		.pipe(gulp.dest("#{developmentDir}/css"))
		.pipe(browserSync.reload(stream: true))

gulp.task 'uglify', ->
	src = [
		"#{developmentDir}/js/libs-#{context.VERSION}.js"
		"#{developmentDir}/js/src-#{context.VERSION}.js"
	]

	gulp.src(src)
		.pipe(concat("main-#{context.VERSION}.js"))
		.pipe(uglify())
		.pipe(gulp.dest(productionDir+'/js'))

gulp.task 'minify-css', ->
	gulp.src("#{developmentDir}/css/main-#{context.VERSION}.css")
		.pipe(minifyCss())
		.pipe(gulp.dest(productionDir+'/css'))

gulp.task 'clean', ->
	gulp.src(developmentDir+'/*').pipe(clean())
	gulp.src(productionDir+'/*').pipe(clean())

gulp.task 'copy-static', ['clean'], ->
	gulp.src('./static/**/*').pipe(gulp.dest(developmentDir))
	gulp.src('./static/**/*').pipe(gulp.dest(productionDir))

gulp.task 'copy-fonts', ->
	gulp.src('./node_modules/font-awesome/css/font-awesome.min.css').pipe(gulp.dest(developmentDir+'/font-awesome/css'))
	gulp.src('./node_modules/font-awesome/fonts/*').pipe(gulp.dest(developmentDir+'/font-awesome/fonts'))

	gulp.src('./node_modules/font-awesome/css/font-awesome.min.css').pipe(gulp.dest(productionDir+'/font-awesome/css'))
	gulp.src('./node_modules/font-awesome/fonts/*').pipe(gulp.dest(productionDir+'/font-awesome/fonts'))

gulp.task 'copy-images', ->
	gulp.src('./node_modules/hilib/images/**/*').pipe(gulp.dest(developmentDir+'/images/hilib'))
	gulp.src('./node_modules/hilib/images/**/*').pipe(gulp.dest(productionDir+'/images/hilib'))

gulp.task 'copy-index', -> gulp.src(developmentDir+'/index.html').pipe(gulp.dest(productionDir))

gulp.task 'compile', ['copy-static'], ->
	gulp.start 'copy-images'
	gulp.start 'copy-fonts'
	gulp.start 'browserify-libs'
	gulp.start 'browserify'
	gulp.start 'jade'
	gulp.start 'create-css'

# Doens't work because of dep compile and gulp.start. :(
gulp.task 'build', ->
	gulp.start 'copy-index'
	gulp.start 'uglify'
	gulp.start 'minify-css'

# First run `gulp compile`. Can't be a dep because of async gulp.start. :(
gulp.task 'deploy-test', (done) ->
	rsync
		src: 'development/',
		dest: cfg['remote-destination'],
		recursive: true,
	,
		(error,stdout,stderr,cmd) ->
			if error
				new gutil.PluginError('test', 'something broke', showStack: true)
			else
				done()

gulp.task 'watch', ->
	gulp.watch ['./src/index.jade'], ['jade']
	gulp.watch paths.stylus, ['create-css']
	gulp.watch ["#{developmentDir}/index.html"], -> browserSync.reload()
	gulp.watch cfg['css-files'], ['create-css']

createBundle = (watch=false) ->
	args =
		entries: './src/coffee/main.coffee'
		extensions: ['.coffee', '.jade']

	bundler = if watch then watchify(args) else browserify(args)

	bundler.transform('coffeeify')
	bundler.transform('jadeify')
	bundler.transform('envify')

	bundler.exclude 'jquery'
	bundler.exclude 'underscore'
	bundler.exclude 'backbone'

	rebundle = ->
		gutil.log('Watchify: start rebundling') if watch
		bundler.bundle()
			.pipe(source("src-#{pkg.version}.js"))
			.pipe(gulp.dest(developmentDir+'/js'))
			.pipe(browserSync.reload(stream: true, once: true))

	bundler.on 'update', rebundle

	rebundle()

gulp.task 'browserify', ['copy-env-config'], -> createBundle false
gulp.task 'watchify', ['copy-env-config'], -> createBundle true

gulp.task 'browserify-libs', ->
	libs =
		jquery: './node_modules/jquery/dist/jquery'
		backbone: './node_modules/backbone/backbone'
		underscore: './node_modules/underscore/underscore'

	libPaths = Object.keys(libs).map (key) ->
		libs[key]

	bundler = browserify libPaths

	for own id, path of libs
		bundler.require path, expose: id

	gutil.log('Browserify: bundling libs')
	bundler.bundle()
		.pipe(source("libs-#{pkg.version}.js"))
		.pipe(gulp.dest(developmentDir+'/js'))

gulp.task 'default', ['watch-n-serve']
#gulp.task 'default2', ['stylus', 'connect', 'watch', 'watchify']
