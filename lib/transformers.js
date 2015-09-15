var $later = require('lazypipe');

module.exports = function (gulp, $, $env) {
    var exports = {},
        $helpers = require("../lib/helpers")(gulp, $, $env),

        debug = function () {
            return $.util.env.debug && $helpers.require('gulp-debug') !== null ? function () {
                return $helpers.require('gulp-debug')();
            } : $.util.noop;
        },

        cache = function (key) {
            return !$.util.env.noCache && $helpers.require('gulp-cache') !== null ? function () {
                return $helpers.require('gulp-cache')(key);
            } : $.util.noop;
        },

        remember = function (key) {
            return !$.util.env.noCache && $helpers.require('gulp-remember') !== null ? function () {
                return $helpers.require('gulp-remember')(key);
            } : $.util.noop;
        },

        babel = function (configuration) {
            return $helpers.require('gulp-babel') !== null ? function () {
                return $helpers.require('gulp-babel')(configuration);
            } : $.util.noop;
        },

        sourcemaps = function () {
            return $helpers.require('gulp-sourcemaps') !== null ? function () {
                return $helpers.require('gulp-sourcemaps')();
            } : null;
        };

    exports.css = function (configuration) {
        var lessFilter = $.filter('**/*.less'),
            sassFilter = $.filter('**/*.scss');

        return $later()
            .pipe($helpers.error_handler)
            //.pipe(cache('css'))
            .pipe(debug())
            .pipe(function () {
                return lessFilter;
            })
            .pipe(function () {
                return $.less(configuration.less);
            })
            .pipe(function () {
                return lessFilter.restore();
            })
            .pipe(function () {
                return sassFilter;
            })
            .pipe(function () {
                return $.sass(configuration.sass);
            })
            .pipe(function () {
                return sassFilter.restore();
            })
            .pipe($.util.env.dev ? $.util.noop : (configuration.hasOwnProperty('uncss') && $helpers.require('uncss') ? function () {
                return $.uncss(configuration.uncss);
            } : $.util.noop))
            .pipe($.util.env.dev ? $.util.noop : function () {
                return $.minifyCss(configuration.minify);
            })
            .pipe(function () {
                return $.autoprefixer(configuration.autoprefix);
            })
            .pipe(configuration.hasOwnProperty('filename') ? function () {
                return $.concat(configuration.filename);
            } : $.util.noop)
            //.pipe(remember('css'))
            ;
    };

    exports.js = function (configuration) {
        var sourcemaps = $.util.env.dev && configuration.hasOwnProperty('filename') ? sourcemaps() : null;

        return $later()
            .pipe($helpers.error_handler)
            //.pipe(cache('js'))
            .pipe(debug())
            .pipe(sourcemaps ? sourcemaps.init() : $.util.noop)
            .pipe(configuration.hasOwnProperty('es6') ? babel(configuration.es6) : $.util.noop)
            .pipe(configuration.hasOwnProperty('filename') ? function () {
                return $.concat(configuration.filename);
            } : $.util.noop)
            .pipe($.util.env.dev ? $.util.noop : $.uglify)
            .pipe(sourcemaps ? sourcemaps.init() : $.util.noop)
            //.pipe(remember('js'))
            ;
    };

    exports.js_lint = function (configuration) {
        return $later()
            .pipe($helpers.error_handler)
            .pipe(debug())
            .pipe(cache('js.lint'))
            .pipe(function () {
                return $.jshint();
            })
            .pipe(remember('js.lint'))
            .pipe(function () {
                return $.jshint.reporter('default');
            })
            ;
    };

    exports.images = function (configuration) {
        var imagesOnly = $.filter(['**/*.jpg', '**/*.gif', '**/*.png']),
            svgOnly = $.filter('**/*.svg'),
            imageMinify = configuration.hasOwnProperty('minify') ? configuration.minify : {},
            svgMinify = configuration.hasOwnProperty('svg-minify') ? configuration['svg-minify'] : {};

        return $later()
            .pipe($helpers.error_handler)
            .pipe(debug())
            //.pipe(cache('images'))
            .pipe(function () {
                return imagesOnly;
            })
            .pipe($.util.env.dev ? $.util.noop : function () {
                return $.imagemin(imageMinify);
            })
            .pipe(function () {
                return imagesOnly.restore();
            })
            .pipe(function () {
                return svgOnly;
            })
            .pipe($.util.env.dev ? $.util.noop : function () {
                return $.svgmin(svgMinify);
            })
            .pipe(function () {
                return svgOnly.restore();
            })
            //.pipe(remember('images'))
            ;
    };

    exports.sprites = function (configuration) {
        return $later()
            .pipe($helpers.error_handler)
            .pipe(debug())
            //.pipe(cache('sprites'))
            .pipe(function () {
                return $.svgSprite(configuration.config);
            })
            //.pipe(remember('sprites'))
            ;
    };

    return exports;
};