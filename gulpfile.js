const __hasProp = {}.hasOwnProperty;
const gulp = require('gulp');
const gutil = require('gulp-util');
const jade = require('gulp-jade');
const concat = require('gulp-concat');
const clean = require('gulp-clean');
const stylus = require('gulp-stylus');
const browserify = require('browserify');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const minifyCss = require('gulp-minify-css');
const source = require('vinyl-source-stream');
const watchify = require('watchify');
const nib = require('nib');
const preprocess = require('gulp-preprocess');
const rsync = require('rsyncwrapper').rsync;
const pkg = require('./package.json');
const cfg = require('./config.json');
const async = require('async');
const exec = require('child_process').exec;
const rimraf = require('rimraf');
const browserSync = require('browser-sync');
const modRewrite = require('connect-modrewrite');
// const connectRewrite = require('./connect-rewrite');
const developmentDir = './development';
const productionDir = './production';
const configDir = "./src/coffee/config/";

const baseDir = process.env.NODE_ENV === 'production' ? productionDir : developmentDir;

const env = process.env.NODE_ENV != null ? process.env.NODE_ENV : 'development';

const context = {
	VERSION: pkg.version,
	ENV: env,
	BASEDIR: baseDir
};

const paths = {
	stylus: ['./node_modules/hilib/src/views/**/*.styl', './src/stylus/**/*.styl']
};

const cssFiles = cfg['css-files'].slice();
cssFiles.push(developmentDir + "/css/hilib-" + context.VERSION + ".css");
cssFiles.push(developmentDir + "/css/src-" + context.VERSION + ".css");

const createCss = gulp.series(
	function () {
		return compileStylus('hilib', './node_modules/hilib/src/views/**/*.styl');
	},
	function () {
		return compileStylus('src', './src/stylus/main.styl');
	},
	() => gulp.src(cssFiles)
		.pipe(concat("main-" + context.VERSION + ".css"))
		.pipe(gulp.dest(developmentDir + "/css"))
		.pipe(browserSync.reload({ stream: true }))
)

function copyEnvConfig() {
	return gulp.src("" + configDir + env + ".coffee")
		.pipe(rename("env.coffee"))
		.pipe(gulp.dest(configDir))
}

gulp.task('link', function (done) {
	var linkModules, removeModules;
	removeModules = function (cb) {
		var modulePaths;
		modulePaths = cfg['local-modules'].map(function (module) {
			return "./node_modules/" + module;
		});
		return async.each(modulePaths, rimraf, function (err) {
			return cb();
		});
	};
	linkModules = function (cb) {
		var moduleCommands;
		moduleCommands = cfg['local-modules'].map(function (module) {
			return "npm link " + module;
		});
		return async.each(moduleCommands, exec, function (err) {
			return cb();
		});
	};
	return async.series([removeModules, linkModules], function (err) {
		if (err != null) {
			return gutil.log(err);
		}
		return done();
	});
});

gulp.task('unlink', function (done) {
	var installModules, unlinkModules;
	unlinkModules = function (cb) {
		var moduleCommands;
		moduleCommands = cfg['local-modules'].map(function (module) {
			return "npm unlink " + module;
		});
		return async.each(moduleCommands, exec, function (err) {
			return cb();
		});
	};
	installModules = function (cb) {
		return exec('npm i', cb);
	};
	return async.series([unlinkModules, installModules], function (err) {
		if (err != null) {
			return gutil.log(err);
		}
		return done();
	});
});


function watch() {
	gulp.watch(['./src/index.jade'], jade);
	gulp.watch(paths.stylus, createCss);
	gulp.watch([developmentDir + "/index.html"], function () {
		return browserSync.reload();
	});
	gulp.watch(cfg['css-files'], createCss);
}

gulp.task(
	'default', 
	gulp.series(
		createCss,
		watch,
		copyEnvConfig,
		() => createBundle(true),
		server,
	)
)

gulp.task(
	'browserify',
	gulp.series(
		copyEnvConfig,
		() => createBundle(false)
	)
)

gulp.task('compile-jade', function () {
	return gulp.src('./src/index.jade').pipe(jade()).pipe(rename({
		basename: 'index-tmp'
	})).pipe(gulp.dest(developmentDir));
});

gulp.task(
	'jade',
	gulp.series(
		'compile-jade',
		() => gulp.src(developmentDir + '/index-tmp.html')
			.pipe(clean())
			.pipe(preprocess({ context: context }))
			.pipe(rename({ basename: 'index' }))
			.pipe(gulp.dest(developmentDir))
	)
)

gulp.task('uglify', function () {
	var src;
	src = [developmentDir + "/js/libs-" + context.VERSION + ".js", developmentDir + "/js/src-" + context.VERSION + ".js"];
	return gulp.src(src).pipe(concat("main-" + context.VERSION + ".js")).pipe(uglify()).pipe(gulp.dest(productionDir + '/js'));
});

gulp.task('minify-css', function () {
	return gulp.src(developmentDir + "/css/main-" + context.VERSION + ".css").pipe(minifyCss()).pipe(gulp.dest(productionDir + '/css'));
});

gulp.task('clean', function () {
	gulp.src(developmentDir + '/*').pipe(clean());
	return gulp.src(productionDir + '/*').pipe(clean());
});

gulp.task('copy-static', 
	gulp.series(
		'clean',
		function () {
			gulp.src('./static/**/*').pipe(gulp.dest(developmentDir))
			gulp.src('./static/**/*').pipe(gulp.dest(productionDir))
		}
	)
)

gulp.task('copy-fonts', function () {
	gulp.src('./node_modules/font-awesome/css/font-awesome.min.css').pipe(gulp.dest(developmentDir + '/font-awesome/css'));
	gulp.src('./node_modules/font-awesome/fonts/*').pipe(gulp.dest(developmentDir + '/font-awesome/fonts'));
	gulp.src('./node_modules/font-awesome/css/font-awesome.min.css').pipe(gulp.dest(productionDir + '/font-awesome/css'));
	return gulp.src('./node_modules/font-awesome/fonts/*').pipe(gulp.dest(productionDir + '/font-awesome/fonts'));
});

gulp.task('copy-images', function () {
	gulp.src('./node_modules/hilib/images/**/*').pipe(gulp.dest(developmentDir + '/images/hilib'));
	return gulp.src('./node_modules/hilib/images/**/*').pipe(gulp.dest(productionDir + '/images/hilib'));
});

gulp.task('copy-index', function () {
	return gulp.src(developmentDir + '/index.html').pipe(gulp.dest(productionDir));
});

gulp.task('compile', 
	gulp.series(
		'copy-static',
		function () {
			gulp.start('copy-images');
			gulp.start('copy-fonts');
			gulp.start('browserify-libs');
			gulp.start('browserify');
			gulp.start('jade');
			gulp.start('create-css');
		}
	)
)

gulp.task('build', function () {
	gulp.start('copy-index');
	gulp.start('uglify');
	return gulp.start('minify-css');
});

gulp.task('deploy-test', function (done) {
	return rsync({
		src: 'development/',
		dest: cfg['remote-destination'],
		recursive: true
	}, function (error, stdout, stderr, cmd) {
		if (error) {
			return new gutil.PluginError('test', 'something broke', {
				showStack: true
			});
		} else {
			return done();
		}
	});
});

gulp.task('browserify-libs', function () {
	var bundler, id, libPaths, libs, path;
	libs = {
		jquery: './node_modules/jquery/dist/jquery',
		backbone: './node_modules/backbone/backbone',
		underscore: './node_modules/underscore/underscore'
	};
	libPaths = Object.keys(libs).map(function (key) {
		return libs[key];
	});
	bundler = browserify(libPaths);
	for (id in libs) {
		if (!__hasProp.call(libs, id)) continue;
		path = libs[id];
		bundler.require(path, {
			expose: id
		});
	}
	gutil.log('Browserify: bundling libs');
	return bundler.bundle().pipe(source("libs-" + pkg.version + ".js")).pipe(gulp.dest(developmentDir + '/js'));
});

function createBundle(watch) {
	var args, bundler, rebundle;
	if (watch == null) {
		watch = false;
	}
	args = {
		entries: './src/coffee/main.coffee',
		extensions: ['.coffee', '.jade']
	};
	bundler = watch ? watchify(args) : browserify(args);
	bundler.transform('coffeeify');
	bundler.transform('jadeify');
	bundler.transform('envify');
	bundler.exclude('jquery');
	bundler.exclude('underscore');
	bundler.exclude('backbone');
	rebundle = function () {
		if (watch) {
			gutil.log('Watchify: start rebundling');
		}
		return bundler.bundle().pipe(source("src-" + pkg.version + ".js")).pipe(gulp.dest(developmentDir + '/js')).pipe(browserSync.reload({
			stream: true,
			once: true
		}));
	};
	bundler.on('update', rebundle);
	return rebundle();
};

function compileStylus(name, src) {
	return gulp.src(src).pipe(stylus({
		use: [nib()],
		errors: true
	})).pipe(concat(name + "-" + context.VERSION + ".css")).pipe(gulp.dest(developmentDir + '/css'));
};

function server() {
	return browserSync.init(null, {
		server: {
			baseDir: "./development",
			middleware: [modRewrite(['^[^\\.]*$ /index.html [L]'])]
		},
		notify: false
	});
};
