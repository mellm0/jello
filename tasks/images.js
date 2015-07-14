module.exports = function (gulp, $, $env) {
    var $defaults = require("../lib/defaults")(gulp, $, $env),
        $helpers = require("../lib/helpers")(gulp, $, $env),
        $transform = require("../lib/transformers")(gulp, $, $env);

    // Delete Images
    gulp.task('images:clean', ['start'], function (done) {
        $env.apply_to_config(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            incrementUpdates();

            $env.delete($helpers.config.getDeleteGlob(configuration), function () {
                incrementFinished();
                ifDone();
            });
        }, done, false, 'images', false, $helpers.config.canDelete, $defaults.images);
    });

    // Minimise images
    gulp.task('images', ['start', 'images:clean'], function (done) {
        return $env.apply_to_config_and_stream(function (configuration, addToStream) {
            addToStream(
                gulp.src(configuration.src)
                    .pipe($transform.images(configuration)())
                    .pipe(gulp.dest(configuration.dest))
                //.pipe($env.server.reload({stream: true}))
            );
        }, done, 'images', false, false, $defaults.images);
    });
};