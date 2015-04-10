module.exports = function(gulp, $, $env) {
    var defaults = {
            src: [
                '_assets/images'
            ],
            dest: 'public/images'
        };

    // Delete Images
    gulp.task('images:clean', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('images')) {
                incrementUpdates();

                var src = configuration.images.hasOwnProperty('dest') ? configuration.images.dest : defaults.dest;

                $env.delete(src, function () {
                    incrementFinished();
                    ifDone();
                });
            }
        }, done);
    });

    // Minimise images
    gulp.task('images', ['start', 'images:clean'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('images')) {
                var src = configuration.images.hasOwnProperty('src') ? configuration.images.src : defaults.src,
                    dest = configuration.images.hasOwnProperty('dest') ? configuration.images.dest : defaults.dest,
                    imagesOnly = $.filter(['**/*.jpg','**/*.gif','**/*.png']),
                    svgOnly = $.filter('**/*.svg');

                addToStream(gulp.src(src)
                        .pipe($.plumber())
                        //.pipe(use.cached('images'))
                        .pipe(imagesOnly)
                        .pipe($.imagemin())
                        .pipe(imagesOnly.restore())
                        .pipe(svgOnly)
                        .pipe($.svgmin())
                        .pipe(svgOnly.restore())
                        //.pipe(use.remember('images'))
                        .pipe(gulp.dest(dest))
                        .pipe($env.server.reload({stream: true}))
                );
            }
        }, done);
    });
};