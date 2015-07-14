var $later = require('lazypipe');

module.exports = function (gulp, $, $env) {
    var exports = {},
        $helpers = require("../lib/helpers")(gulp, $, $env);

    exports.css = function (configuration) {
        var lessFilter = $.filter('**/*.less'),
            sassFilter = $.filter('**/*.scss');

        return $later()
            .pipe($helpers.error_handler)
            //.pipe(use.cached('css'))
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
            .pipe(configuration.hasOwnProperty('uncss') ? function () {
                return $.uncss(configuration.uncss);
            } : $.util.noop)
            .pipe($.util.env.dev ? $.util.noop : function () {
                return $.minifyCss(configuration.minify);
            })
            .pipe(function () {
                return $.autoprefixer(configuration.autoprefix);
            })
            .pipe(configuration.hasOwnProperty('filename') ? function () {
                return $.concat(configuration.filename);
            } : $.util.noop)
            //.pipe(use.remember('css'))
            ;
    };

    exports.js = function (configuration) {
        return $later()
            .pipe($helpers.error_handler)
            //.pipe(use.cached('js'))
            .pipe(configuration.hasOwnProperty('filename') ? function () {
                return $.concat(configuration.filename);
            } : $.util.noop)
            .pipe($.util.env.dev ? $.util.noop : $.uglify)
            //.pipe(use.remember('js'))
            ;
    };

    exports.js_lint = function (configuration) {
        return $later()
            .pipe($helpers.error_handler)
            .pipe(function () {
                return $.cached('js.lint');
            })
            .pipe(function () {
                return $.jshint();
            })
            .pipe(function () {
                return $.remember('js.lint');
            })
            .pipe(function () {
                return $.jshint.reporter('default');
            })
            ;
    };

    exports.images = function (configuration) {
        var imagesOnly = $.filter(['**/*.jpg', '**/*.gif', '**/*.png']),
            svgOnly = $.filter('**/*.svg');

        return $later()
            .pipe($helpers.error_handler)
            //.pipe(use.cached('images'))
            .pipe(function () {
                return imagesOnly;
            })
            .pipe($.util.env.dev ? $.util.noop : $.imagemin)
            .pipe(function () {
                return imagesOnly.restore();
            })
            .pipe(function () {
                return svgOnly;
            })
            .pipe($.util.env.dev ? $.util.noop : $.svgmin)
            .pipe(function () {
                return svgOnly.restore();
            })
            //.pipe(use.remember('images'))
            ;
    };

    exports.sprites = function (configuration) {
        return $later()
            .pipe($helpers.error_handler)
            //.pipe(use.cached('images'))
            .pipe(function () {
                return $.svgSprite(configuration.config);
            })
            ;
    };

    return exports;
};