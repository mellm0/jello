module.exports = function(gulp, $, $env) {
    var defaults = {
            src: [
                '_assets/templates'
            ],
            dest: 'app/templates'
        };

    // Delete templates/html files
    gulp.task('html:clean', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('html') && configuration.html.hasOwnProperty('clean') && configuration.html.clean) {
                incrementUpdates();

                var src = configuration.html.hasOwnProperty('dest') ? configuration.html.dest : defaults.dest;

                $env.delete(src, function () {
                    incrementFinished();
                    ifDone();
                });
            }
        }, done);
    });

    // Minimise html
    gulp.task('html', ['start', 'html:clean'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('html')) {
                var src = configuration.html.hasOwnProperty('src') ? configuration.html.src : defaults.src,
                    dest = configuration.html.hasOwnProperty('dest') ? configuration.html.dest : defaults.dest;

                addToStream(gulp.src(src)
                        .pipe($.plumber())
                        .pipe($.htmlmin())
                        .pipe(gulp.dest(dest))
                        .pipe($env.server.reload({stream: true}))
                );
            }
        }, done);
    });
};