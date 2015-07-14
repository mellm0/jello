module.exports = function (gulp, $, $env) {
    var $defaults = require("../lib/defaults")(gulp, $, $env),
        $transform = require("../lib/transformers")(gulp, $, $env),
        $helpers = require("../lib/helpers")(gulp, $, $env),
        validItem = function (configuration) {
            return configuration.hasOwnProperty('src') && configuration.hasOwnProperty('dest');
        };

    // Clean Sprites
    gulp.task('sprites:clean', ['start'], function (done) {
        $env.apply_to_config(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            incrementUpdates();

            $env.delete($helpers.config.getDeleteGlob(configuration), function () {
                incrementFinished();
                ifDone();
            });
        }, done, false, 'sprites', false, $helpers.config.canDelete, $defaults.sprites);
    });

    // Merge SVG sprites into one file
    gulp.task('sprites', ['start', 'sprites:clean'], function (done) {
        return $env.apply_to_config_and_stream(function (configuration, addToStream) {
            addToStream(
                gulp.src(configuration.src)
                    .pipe($transform.sprites(configuration)())
                    .pipe(gulp.dest(configuration.dest))
                //.pipe($env.server.reload({stream: true}))
            );
        }, done, 'sprites', false, validItem, $defaults.sprites);
    });
};