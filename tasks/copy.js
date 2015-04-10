module.exports = function(gulp, $, $env) {
    // Clean copied files
    gulp.task('copy:clean', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('copy')) {
                for (var i = 0; i < configuration.copy.length; i++) {
                    if(configuration.copy[i].hasOwnProperty('dest')) {
                        incrementUpdates();

                        $env.delete(configuration.copy[i].dest, function () {
                            incrementFinished();
                            ifDone();
                        });
                    }
                }
            }
        }, done);
    });

    // Copy files to other destination
    gulp.task('copy', ['start', 'copy:clean'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('copy')) {
                for (var i = 0; i < configuration.copy.length; i++) {
                    if(configuration.copy[i].hasOwnProperty('src') && configuration.copy[i].hasOwnProperty('dest')) {
                        addToStream(gulp.src(configuration.copy[i].src)
                                .pipe(use.plumber())
                                .pipe(gulp.dest(configuration.copy[i].dest))
                                .pipe($env.server.reload({stream: true}))
                        );
                    }
                }
            }
        }, done);
    });
};