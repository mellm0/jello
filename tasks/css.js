module.exports = function(gulp, $, $env) {
    var defaults = {
            src: [
                '_assets/css'
            ],
            dest: 'public/css'
        },
        $helpers = require("../lib/helpers")(gulp, $, $env),
        $transform = require("../lib/transformers")($, $env);

    // Delete CSS files (single, not merged)
    gulp.task('css:clean', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('css')) {
                incrementUpdates();

                var destDir = configuration.css.hasOwnProperty('dest') ? configuration.css.dest : defaults.dest,
                    src = configuration.css.hasOwnProperty('merged') ? [destDir + '/**/*'].concat($helpers.get_merged_files(configuration.css.merged, destDir, 'css', true)) : [destDir];

                $env.delete(src, function () {
                    incrementFinished();
                    ifDone();
                });
            }
        }, done);
    });

    // Delete merged CSS files
    gulp.task('css:clean:merged', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('css') && configuration.css.hasOwnProperty('merged')) {
                incrementUpdates();

                var destDir = configuration.css.hasOwnProperty('dest') ? configuration.css.dest : defaults.dest,
                    src = $helpers.get_merged_files(configuration.css.merged, destDir, 'css');

                $env.delete(src, function () {
                    incrementFinished();
                    ifDone();
                });
            }
        }, done);
    });

    // Process css files, including less and scss, and minify
    gulp.task('css:single', ['start', 'css:clean'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('css')) {
                var src = configuration.css.hasOwnProperty('src') ? configuration.css.src : defaults.src,
                    dest = configuration.css.hasOwnProperty('dest') ? configuration.css.dest : defaults.dest;

                addToStream(gulp.src(src)
                        .pipe($transform.css()())
                        .pipe(gulp.dest(dest))
                        //.pipe($env.server.reload({stream: true}))
                );
            }
        }, done);
    });

    // Process css files and merge files
    gulp.task('css:merged', ['start', 'css:clean:merged'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('css') && configuration.css.hasOwnProperty('merged')) {
                var destDir = configuration.css.hasOwnProperty('dest') ? configuration.css.dest : defaults.dest;

                for (var key in configuration.css.merged) {
                    if (configuration.css.merged.hasOwnProperty(key)) {
                        var src = configuration.css.merged[key].hasOwnProperty('src') ? configuration.css.merged[key].src : [defaults.src[0] + '/' + key],
                            concatToFile = configuration.css.merged[key].hasOwnProperty('file') ? configuration.css.merged[key].file : key + '.css';

                        addToStream(gulp.src(src)
                                .pipe($transform.css(concatToFile)())
                                .pipe(gulp.dest(destDir))
                                //.pipe($env.server.reload({stream: true}))
                        );
                    }
                }
            }
        }, done);
    });
};