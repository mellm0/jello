module.exports = function(gulp, $, $env) {
    var defaults = {
            src: [
                '_assets/sprites'
            ],
            dest: 'public/sprites'
        };

    // Delete Sprites
    gulp.task('sprites:clean', ['start'], function (done) {
        $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            if (configuration.hasOwnProperty('sprites')) {
                for (var i = 0; i < configuration.sprites.length; i++) {
                    if(configuration.sprites[i].hasOwnProperty('dest')) {
                        incrementUpdates();

                        $env.delete(configuration.sprites[i].dest, function () {
                            incrementFinished();
                            ifDone();
                        });
                    }
                }
            }
        }, done);
    });

    // Merge SVG sprites into one file
    gulp.task('sprites', ['start', 'sprites:clean'], function (done) {
        return $env.apply_to_all_and_stream(function (configuration, addToStream) {
            if (configuration.hasOwnProperty('sprites')) {
                for (var i = 0; i < configuration.sprites.length; i++) {
                    if (configuration.sprites[i].hasOwnProperty('src')) {
                        var config = configuration.sprites[i].hasOwnProperty('config') ? configuration.sprites[i].config : {},
                            src = configuration.sprites[i].src ? configuration.sprites[i].src : defaults.src,
                            dest = configuration.sprites[i].dest ? configuration.sprites[i].dest : defaults.dest,
                            svgOnly = $.filter('**/*.svg');

                        addToStream(gulp.src(src)
                                .pipe($.plumber())
                                .pipe($.svgSprite(config))
                                .pipe(svgOnly)
                                .pipe($.util.env.dev ? $.svgmin() : $.util.noop)
                                .pipe(svgOnly.restore())
                                .pipe(gulp.dest(dest))
                                .pipe($env.server.reload({stream: true}))
                        );
                    }
                }
            }
        }, done);
    });
};