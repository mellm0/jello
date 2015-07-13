module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        validItem = function(configuration) {
            return configuration.hasOwnProperty('src') && configuration.hasOwnProperty('dest');
        };

    // Delete templates/html files
    gulp.task('html:clean', ['start'], function (done) {
        $env.apply_to_config(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            incrementUpdates();

            $env.delete($helpers.config.getDeleteGlob(configuration), function () {
                incrementFinished();
                ifDone();
            });
        }, done, false, 'html', false, $helpers.config.canDelete);
    });

    // Minimise html
    gulp.task('html', ['start', 'html:clean'], function (done) {
        return $env.apply_to_config_and_stream(function (configuration, addToStream) {
            addToStream(
                gulp.src(configuration.src)
                    .pipe($helpers.error_handler())
                    .pipe(gulp.dest(configuration.dest))
                //.pipe($env.server.reload({stream: true}))
            );
        }, done, 'html', false, validItem);
    });
};