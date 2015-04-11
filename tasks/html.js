module.exports = function(gulp, $, $env) {
    // Delete templates/html files
    gulp.task('html:clean', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('html')) {
                for (var i = 0; i < configuration.html.length; i++) {
                    if(configuration.html[i].hasOwnProperty('dest')) {
                        incrementUpdates();

                        $env.delete(configuration.html[i].dest, function () {
                            incrementFinished();
                            ifDone();
                        });
                    }
                }
            }
        }, done);
    });

    // Minimise html
    gulp.task('html', ['start', 'html:clean'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('html')) {
                for (var i = 0; i < configuration.html.length; i++) {
                    if(configuration.html[i].hasOwnProperty('src') && configuration.html[i].hasOwnProperty('dest')) {
                        addToStream(gulp.src(configuration.html[i].src)
                                .pipe($.plumber())
                                .pipe(gulp.dest(configuration.html[i].dest))
                                .pipe($env.server.reload({stream: true}))
                        );
                    }
                }
            }
        }, done);
    });
};