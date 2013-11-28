connect_middleware = require 'my-grunt-modules/connect-middleware'

module.exports = (grunt) ->
	require('load-grunt-tasks') grunt
	require('my-grunt-modules/create-symlinks') grunt

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
				command: 'groc'

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
			,
				src: '~/Projects/hilib'
				dest: 'compiled/lib/hilib'
			,
				src: 'compiled/lib/hilib/images'
				dest: 'images/hilib'
			# ,
			# 	src: 'compiled/lib/hilib/images/views/modal'
			# 	dest: 'images/modal'
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
					'compiled/lib/faceted-search/stage/css/main.css'
					'compiled/lib/hilib/compiled/**/*.css'
				]
				dest:
					'compiled/css/main.css'

		cssmin:
			dist:
				files:
					'dist/css/main.css': 'compiled/css/main.css'

		### JS ###

		coffee:
			compile:
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

		### OTHER ###

		concurrent:
			compile: ['coffee:compile', 'jade:index', 'jade', 'stylus']
			documentation: ['shell:groc', 'plato']
		
		plato:
			run:
				files: 'compiled/plato': ['compiled/js/**/*.js']

		requirejs:
			compile:
				options:
					baseUrl: "compiled/js"
					name: '../lib/almond/almond'
					include: 'main'
					exclude: ['text']
					preserveLicenseComments: false
					out: "dist/js/main.js"
					optimize: 'none'
					paths:
						'jquery': '../lib/jquery/jquery.min'
						'underscore': '../lib/underscore-amd/underscore'
						'backbone': '../lib/backbone-amd/backbone'
						'text': '../lib/requirejs-text/text'
						'domready': '../lib/requirejs-domready/domReady'
						'faceted-search': '../lib/faceted-search/stage/js/main'
						'jade': '../lib/jade/runtime'
						'classList': '../lib/classList.js/classList'
						'dom': '../lib/dom'
						'hilib': '../lib/hilib/compiled'
						'tpls': '../templates'
					wrap: true

		watch:
			options:
				livereload: true
				nospawn: true
			coffeetest:
				files: 'test/**/*.coffee'
				tasks: ['coffee:test', 'shell:mocha']
			coffee:
				files: 'src/coffee/**/*.coffee'
				tasks: 'newer:coffee:compile'
			jade:
				files: ['src/index.jade', 'src/jade/**/*.jade']
				tasks: 'newer:jade'
			stylus:
				files: ['src/stylus/**/*.styl']
				tasks: ['newer:stylus', 'concat:css']
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

	grunt.registerTask 'default', ['shell:mocha']

	# Generate docs
	grunt.registerTask 'docs', 'concurrent:documentation'
	grunt.registerTask 'd', 'docs'

	grunt.registerTask 'compile', [
		'shell:emptycompiled' # rm -rf compiled/
		'shell:bowerinstall' # Get dependencies first, cuz css needs to be included (and maybe images?)
		'createSymlinks:compiled'
		'concurrent:compile'
		'concat:css'
		'concurrent:documentation'
	]
	grunt.registerTask 'c', 'compile'

	grunt.registerTask 'build', [
		'shell:emptydist'
		'createSymlinks:dist'
		'replace:html' # Copy and replace index.html
		'cssmin:dist'
		'requirejs:compile' # Run r.js
		'shell:rsync' # Rsync to test server
	]
	grunt.registerTask 'b', 'build'

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