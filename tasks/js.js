module.exports = function (gulp, $, $env) {
    var defaults = {
            src:  [
                '_assets/js/**/*',
                '!_assets/js/_*',
                '!_assets/js/_*/**/*'
            ],
            watch: [
                '_assets/js/**/*'
            ],
            dest: 'public/js'
        },
        $helpers = require("../lib/helpers")(gulp, $, $env),
        $transform = require("../lib/transformers")(gulp, $, $env);

    // Delete JS files
    gulp.task('js:clean', ['start'], function (done) {
        $env.apply_to_config(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            incrementUpdates();

            $env.delete($helpers.config.getDeleteGlob(configuration), function () {
                incrementFinished();
                ifDone();
            });
        }, done, false, 'js', false, $helpers.config.canDelete, defaults);
    });

    // Process JS files, including uglify and coffee script
    gulp.task('js', ['start', 'js:clean'], function (done) {
        return $env.apply_to_config_and_stream(function (configuration, addToStream) {
            configuration = $helpers.config.add_filename(configuration, 'js');

            addToStream(
                gulp.src(configuration.src)
                    .pipe($transform.js(configuration)())
                    .pipe(gulp.dest(configuration.dest))
                //.pipe($env.server.reload({stream: true}))
            );
        }, done, 'js', false, false, defaults);
    });

    // Lint JS files
    gulp.task('js:lint', ['start'], function (done) {
        return $env.apply_to_config_and_stream(function (configuration, addToStream) {
            configuration = $helpers.config.add_filename(configuration, 'js');

            addToStream(
                gulp.src(configuration.lint)
                    .pipe($transform.js_lint(configuration)())
            );
        }, done, 'js', false, function(configuration) {
            return configuration.hasOwnProperty('lint');
        }, defaults);
    });
};