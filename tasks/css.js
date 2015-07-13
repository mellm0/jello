module.exports = function (gulp, $, $env) {
    var defaults = {
            src:  [
                '_assets/css/**/*',
                '!_assets/css/_*',
                '!_assets/css/_*/**/*'
            ],
            watch: [
                '_assets/css/**/*'
            ],
            dest: 'public/css',
            autoprefix: {
                browsers: [
                    'last 10 versions', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'
                ]
            },
            less: {
                compress: false,
                cleancss: false,
                lint: true
            },
            sass: {},
            minify: {
                keepSpecialComments: 0,
                processImport: false
            }
        },
        $helpers = require("../lib/helpers")(gulp, $, $env),
        $transform = require("../lib/transformers")(gulp, $, $env);

    // Delete CSS files (single, not merged)
    gulp.task('css:clean', ['start'], function (done) {
        $env.apply_to_config(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            incrementUpdates();

            $env.delete($helpers.config.getDeleteGlob(configuration), function () {
                incrementFinished();
                ifDone();
            });
        }, done, false, 'css', false, $helpers.config.canDelete, defaults);
    });

    // Process css files, including less and scss, and minify
    gulp.task('css', ['start', 'css:clean'], function (done) {
        return $env.apply_to_config_and_stream(function (configuration, addToStream) {
            configuration = $helpers.config.add_filename(configuration, 'css');

            addToStream(
                gulp.src(configuration.src)
                    .pipe($transform.css(configuration)())
                    .pipe(gulp.dest(configuration.dest))
                    //.pipe($env.server.reload({stream: true}))
            );
        }, done, 'css', false, false, defaults);
    });
};