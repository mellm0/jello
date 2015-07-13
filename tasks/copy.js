module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        validItem = function(configuration) {
            return configuration.hasOwnProperty('src') && configuration.hasOwnProperty('dest');
        };

    // Clean copied files
    gulp.task('copy:clean', ['start'], function (done) {
        $env.apply_to_config(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            incrementUpdates();

            $env.delete($helpers.config.getDeleteGlob(configuration), function () {
                incrementFinished();
                ifDone();
            });
        }, done, false, 'copy', false, $helpers.config.canDelete);
    });

    // Copy files to other destination
    gulp.task('copy', ['start', 'copy:clean'], function (done) {
        return $env.apply_to_config_and_stream(function (configuration, addToStream) {
            addToStream(
                gulp.src(configuration.src)
                    .pipe($helpers.error_handler())
                    .pipe(gulp.dest(configuration.dest))
                //.pipe($env.server.reload({stream: true}))
            );
        }, done, 'copy', false, validItem);
    });
};