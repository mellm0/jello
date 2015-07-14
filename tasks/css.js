module.exports = function (gulp, $, $env) {
    var $defaults = require("../lib/defaults")(gulp, $, $env),
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
        }, done, false, 'css', false, $helpers.config.canDelete, $defaults.css);
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
        }, done, 'css', false, false, $defaults.css);
    });
};