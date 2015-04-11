module.exports = function(gulp, $, $env) {
    var defaults = {
            src: [
                '_assets/js'
            ],
            dest: 'public/js'
        },
        $helpers = require("../lib/helpers")(gulp, $, $env),
        $transform = require("../lib/transformers")($, $env);

    // Delete CSS files (single, not merged)
    gulp.task('js:clean', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('js')) {
                incrementUpdates();

                var destDir = configuration.js.hasOwnProperty('dest') ? configuration.js.dest : defaults.dest,
                    src = configuration.js.hasOwnProperty('merged') ? [destDir + '/**/*'].concat($helpers.get_merged_files(configuration.js.merged, destDir, 'js', true)) : [destDir];

                $env.delete(src, function () {
                    incrementFinished();
                    ifDone();
                });
            }
        }, done);
    });

    // Delete merged CSS files
    gulp.task('js:clean:merged', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('js') && configuration.js.hasOwnProperty('merged')) {
                incrementUpdates();

                var destDir = configuration.js.hasOwnProperty('dest') ? configuration.js.dest : defaults.dest,
                    src = $helpers.get_merged_files(configuration.js.merged, destDir, 'js');

                $env.delete(src, function () {
                    incrementFinished();
                    ifDone();
                });
            }
        }, done);
    });

    // Process JS files, including uglify and coffee script
    gulp.task('js:single', ['start', 'js:clean'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('js')) {
                var src = configuration.js.hasOwnProperty('src') ? configuration.js.src : defaults.src,
                    dest = configuration.js.hasOwnProperty('dest') ? configuration.js.dest : defaults.dest;

                addToStream(gulp.src(src)
                        .pipe($transform.js()())
                        .pipe(gulp.dest(dest))
                        .pipe($env.server.reload({stream: true}))
                );
            }
        }, done);
    });

    // Process JS merged files
    gulp.task('js:merged', ['start', 'js:clean:merged'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('js') && configuration.js.hasOwnProperty('merged')) {
                var destDir = configuration.js.hasOwnProperty('dest') ? configuration.js.dest : defaults.dest;

                for (var key in configuration.js.merged) {
                    if (configuration.js.merged.hasOwnProperty(key)) {
                        var src = configuration.js.merged[key].hasOwnProperty('src') ? configuration.js.merged[key].src : defaults.src[0] + '/' + key,
                            concatToFile = configuration.js.merged[key].hasOwnProperty('file') ? configuration.js.merged[key].file : key + '.js';

                        addToStream(gulp.src(src)
                                .pipe($transform.js(concatToFile)())
                                .pipe(gulp.dest(destDir))
                                .pipe($env.server.reload({stream: true}))
                        );
                    }
                }
            }
        }, done);
    });

    // Lint JS files
    gulp.task('js:lint', ['start'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('js')) {
                var src = configuration.js.hasOwnProperty('lint') ? configuration.js.lint : configuration.js.hasOwnProperty('src') ? configuration.js.src : defaults.src;

                addToStream(gulp.src(src)
                        .pipe($.plumber())
                        .pipe($.cached('js'))
                        .pipe($.jshint())
                        .pipe($.remember('js'))
                        .pipe($.jshint.reporter('default'))
                );
            }
        }, done);
    });
};