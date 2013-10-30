fs = require 'fs'
path = require 'path'

connect_middleware = (connect, options) ->
	[
		(req, res, next) ->
			contentTypeMap =
				'.html': 'text/html'
				'.css': 'text/css'
				'.js': 'application/javascript'
				'.map': 'application/javascript' # js source maps
				'.gif': 'image/gif'
				'.jpg': 'image/jpeg'
				'.jpeg': 'image/jpeg'
				'.png': 'image/png'
				'.ico': 'image/x-icon'
			
			sendFile = (reqUrl) ->
				filePath = path.join options.base, reqUrl
				
				res.writeHead 200,
					'Content-Type': contentTypeMap[extName] || 'text/html'
					'Content-Length': fs.statSync(filePath).size

				readStream = fs.createReadStream filePath
				readStream.pipe res
			
			extName = path.extname req.url

			# If request is a file and it doesnt exist, pass req to connect
			if contentTypeMap[extName]? and not fs.existsSync(options.base + req.url)
				next()
			else if contentTypeMap[extName]?
				sendFile req.url
			else
				sendFile 'index.html'
	]

module.exports = (grunt) ->

	##############
	### CONFIG ###
	##############

	grunt.initConfig

		### SHELL ###

		shell:
			options:
				stdout: true
				stderr: true
			mocha: 
				command: 'mocha-phantomjs -R dot http://localhost:4002/.test/index.html'
			emptydist:
				command: 'rm -rf dist/*'
			emptycompiled:
				command: 'rm -rf compiled/*'
			rsync:
				command: 'rsync --copy-links --compress --archive --verbose --checksum --exclude=.svn --chmod=a+r dist/ elaborate4@hi14hingtest.huygens.knaw.nl:elab4testFE/'
			bowerinstall:
				command: 'bower install'
			groc:
				command: 'groc "src/coffee/**/*.coffee" --out=compiled/docs'

		createSymlinks:
			compiled: [
				src: 'images'
				dest: 'compiled/images'
			,
				src: '~/Projects/faceted-search'
				dest: 'compiled/lib/faceted-search'
			,
				src: '~/Projects/faceted-search/images'
				dest: 'images/faceted-search'
			# ,
			# 	src: '~/Projects/supertinyeditor'
			# 	dest: 'compiled/lib/supertinyeditor'
			# ,
			# 	src: '~/Projects/helpers'
			# 	dest: 'compiled/lib/helpers2'
			# ,
			# 	src: '~/Projects/managers'
			# 	dest: 'compiled/lib/managers2'
			# ,
			# 	src: '~/Projects/views'
			# 	dest: 'compiled/lib/views2'
			,
				src: '~/Projects/hilib'
				dest: 'compiled/lib/hilib'
			# ,
			,
				src: 'compiled/lib/hilib/images/views/supertinyeditor'
				dest: 'images/supertinyeditor'
			# ,
			# 	src: '~/Projects/helpers'
			# 	dest: 'compiled/lib/helpers2'
			]
			dist: [{
				src: 'images'
				dest: 'dist/images'
			}]

		### SERVER ###

		connect:
			keepalive:
				options:
					port: 4000
					base: 'compiled'
					middleware: connect_middleware
					keepalive: true
			compiled:
				options:
					port: 4000
					base: 'compiled'
					middleware: connect_middleware
			dist:
				options:
					port: 4001
					base: 'dist'
					middleware: connect_middleware
			test:
				options:
					port: 4002
					base: ''
					middleware: connect_middleware

		### HTML ###

		jade:
			index:
				files: 'compiled/index.html': 'src/index.jade'
			compile:
				files: 'compiled/templates.js': 'src/jade/**/*.jade'
				options:
					compileDebug: false
					client: true
					amd: true
					processName: (filename) -> filename.substring(9, filename.length-5)


		# jade:
		# 	init:
		# 		files: [
		# 			expand: true
		# 			cwd: 'src/jade'
		# 			src: '**/*.jade'
		# 			dest: 'compiled/html'
		# 			rename: (dest, src) -> 
		# 				dest + '/' + src.replace(/.jade/, '.html') # Use rename to preserve multiple dots in filenames (nav.user.coffee => nav.user.js)
		# 		,
		# 			'compiled/index.html': 'src/index.jade'
		# 		]
		# 	compile:
		# 		options:
		# 			pretty: false


		replace:
			html:
				src: 'compiled/index.html'
				dest: 'dist/index.html'
				replacements: [
					from: '<script data-main="/js/main" src="/lib/requirejs/require.js"></script>'
					to: '<script src="/js/main.js"></script>'
				]

		### CSS ###

		stylus:
			compile:
				options:
					paths: ['src/stylus/import']
					import: ['variables', 'functions']
				files:
					'compiled/css/project.css': [
						'src/stylus/**/*.styl'
						'!src/stylus/import/*.styl'
					]
		
		concat:
			css:
				src: [
					'compiled/lib/normalize-css/normalize.css'
					'compiled/css/project.css'
					'compiled/lib/faceted-search/dev/css/main.css'
					# 'compiled/lib/supertinyeditor/main.css'
					'compiled/lib/hilib/compiled/**/*.css'
					# '!compiled/lib/hilib/compiled/lib/**/*.css'
				]
				dest:
					'compiled/css/main.css'

		cssmin:
			dist:
				files:
					'dist/css/main.css': 'compiled/css/main.css'

		### JS ###

		coffee:
			init:
				files: [
					expand: true
					cwd: 'src/coffee'
					src: '**/*.coffee'
					dest: 'compiled/js'
					rename: (dest, src) -> 
						dest + '/' + src.replace(/.coffee/, '.js') # Use rename to preserve multiple dots in filenames (nav.user.coffee => nav.user.js)
				,
					'.test/tests.js': ['.test/head.coffee', 'test/**/*.coffee']
				]
			test:
				options:
					bare: true
					join: true
				files: 
					'.test/tests.js': ['.test/head.coffee', 'test/**/*.coffee']
			compile:
				options:
					bare: false # UglyHack: set a property to its default value to be able to call coffee:compile

		### OTHER ###

		requirejs:
			compile:
				options:
					baseUrl: "compiled/js"
					name: '../lib/almond/almond'
					include: 'main'
					preserveLicenseComments: false
					out: "dist/js/main.js"
					optimize: 'none'
					paths:
						'jquery': '../lib/jquery/jquery.min'
						'underscore': '../lib/underscore-amd/underscore'
						'backbone': '../lib/backbone-amd/backbone'
						# 'text': '../lib/requirejs-text/text'
						'domready': '../lib/requirejs-domready/domReady'
						'faceted-search': '../lib/faceted-search/stage/js/main'
						# 'supertinyeditor': '../lib/supertinyeditor/main'
						# 'views2': '../lib/views/compiled'
						# 'managers': '../lib/managers/dev'
						# 'managers2': '../lib/managers2/dev'
						# 'helpers': '../lib/helpers/dev'
						# 'helpers2': '../lib/helpers2/dev'
						# 'html': '../html'
						# 'viewshtml': '../lib/views2/compiled'
						'hilib': '../lib/hilib/compiled'
					wrap: true
					# wrap:
					# 	startFile: 'wrap.start.js'
					# 	endFile: 'wrap.end.js'

		watch:
			options:
				livereload: true
				nospawn: true
			coffeetest:
				files: 'test/**/*.coffee'
				tasks: ['coffee:test', 'shell:mocha']
			coffee:
				files: 'src/coffee/**/*.coffee'
				tasks: 'coffee:compile'
			jade:
				files: ['src/index.jade', 'src/jade/**/*.jade']
				tasks: ['jade:index', 'jade:compile']
			stylus:
				files: ['src/stylus/**/*.styl']
				tasks: ['stylus:compile', 'concat:css']
			html: 
				files: ['compiled/lib/hilib/touch/html']
			css:
				files: ['compiled/lib/faceted-search/dev/css/main.css', 'compiled/lib/hilib/touch/css']
				tasks: ['concat:css']
			js:
				files: ['compiled/lib/hilib/touch/js']

	#############
	### TASKS ###
	#############

	grunt.loadNpmTasks 'grunt-contrib-coffee'
	grunt.loadNpmTasks 'grunt-contrib-stylus'
	grunt.loadNpmTasks 'grunt-contrib-jade'
	grunt.loadNpmTasks 'grunt-contrib-watch'
	grunt.loadNpmTasks 'grunt-contrib-requirejs'
	grunt.loadNpmTasks 'grunt-contrib-copy'
	grunt.loadNpmTasks 'grunt-contrib-uglify'
	grunt.loadNpmTasks 'grunt-contrib-cssmin'
	grunt.loadNpmTasks 'grunt-contrib-concat'
	grunt.loadNpmTasks 'grunt-contrib-connect'
	grunt.loadNpmTasks 'grunt-shell'
	grunt.loadNpmTasks 'grunt-text-replace'

	grunt.registerTask('default', ['shell:mocha']);

	# Generate docs
	grunt.registerTask 'd', ['shell:groc']

	grunt.registerTask 'c', 'compile'
	grunt.registerTask 'compile', [
		'shell:emptycompiled' # rm -rf compiled/
		'shell:bowerinstall' # Get dependencies first, cuz css needs to be included (and maybe images?)
		'createSymlinks:compiled'
		'coffee:init'
		'jade:index'
		'jade:compile'
		'stylus:compile'
		'concat:css'
	]

	grunt.registerTask 'b', 'build'
	grunt.registerTask 'build', [
		'shell:emptydist'
		'createSymlinks:dist'
		'replace:html' # Copy and replace index.html
		'cssmin:dist'
		'requirejs:compile' # Run r.js
		'shell:rsync' # Rsync to test server
	]

	grunt.registerTask 's', 'server'
	grunt.registerTask 'server', [
		'connect:keepalive'
	]

	grunt.registerTask 'sw', [
		'connect:compiled'
		'connect:dist'
		'connect:test'
		'watch'
	]

	grunt.registerTask 'all', [
		'compile'
		'build'
		'sw'
	]



	grunt.registerMultiTask 'createSymlinks', 'Creates a symlink', ->
		for own index, config of this.data

			src = config.src
			dest = config.dest

			src = process.env.HOME + src.substr(1) if src[0] is '~'
			dest = process.env.HOME + dest.substr(1) if dest[0] is '~'

			src = process.cwd() + '/' + src if src[0] isnt '/'
			dest = process.cwd() + '/' + dest if dest[0] isnt '/'

			grunt.log.writeln 'ERROR: source dir does not exist!' if not fs.existsSync(src) # Without a source, all is lost.

			# We have to put lstatSync in a try, because it gives an error when dest isn't found. We can use fs.lstat, but
			# we would have to change the for loop to a function call.			
			try 
				stats = fs.lstatSync dest
				fs.unlinkSync(dest) if stats.isSymbolicLink()

			fs.symlinkSync src, dest





	##############
	### EVENTS ###
	##############

	grunt.event.on 'watch', (action, srcPath) ->
		if srcPath.substr(0, 3) is 'src' # Make sure file comes from src/		
			type = 'coffee' if srcPath.substr(-7) is '.coffee'
			# type = 'jade' if srcPath.substr(-5) is '.jade'

			if type is 'coffee'
				testDestPath = srcPath.replace 'src/coffee', 'test'
				destPath = 'compiled'+srcPath.replace(new RegExp(type, 'g'), 'js').substr 3

			# if type is 'jade'
			# 	destPath = 'compiled'+srcPath.replace(new RegExp(type, 'g'), 'html').substr 3

			if type? and action is 'changed' or action is 'added'
				data = {}
				data[destPath] = srcPath

				grunt.config [type, 'compile', 'files'], data
				grunt.file.copy '.test/template.coffee', testDestPath if testDestPath? and not grunt.file.exists(testDestPath)

			if type? and action is 'deleted'
				grunt.file.delete destPath
				grunt.file.delete testDestPath

		if srcPath.substr(0, 4) is 'test' and action is 'added'
			return false