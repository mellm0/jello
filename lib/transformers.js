var $later = require('lazypipe');

module.exports = function($, $env) {
    var exports = {};

    exports.css = function (concatToFile) {
        var lessFilter = $.filter('**/*.less'),
            sassFilter = $.filter('**/*.scss');

        return $later()
            //.pipe(function() { return use.plumber(use.notify.onError("Error: <%= error.message %>")); })
            //.pipe(use.cached('css'))
            .pipe(function () {
                return lessFilter;
            })
            .pipe(function () {
                return $.less({compress: false, cleancss: false, lint: true});
            })
            .pipe(function () {
                return lessFilter.restore();
            })
            .pipe(function () {
                return sassFilter;
            })
            .pipe($.sass)
            .pipe(function () {
                return sassFilter.restore();
            })
            .pipe($env.project().hasOwnProperty('css') && $env.project().css.hasOwnProperty('minify') ? function () {
                return $.uncss($env.project().css.minify);
            } : $.util.noop)
            .pipe($.util.env.dev ? $.util.noop : function () {
                return $.minifyCss({
                    keepSpecialComments: 0,
                    processImport:       false
                });
            })
            .pipe(function () {
                return $.autoprefixer('last 10 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4');
            })
            .pipe(concatToFile ? function() { return $.concat(concatToFile); } : $.util.noop)
            //.pipe(use.remember('css'))
            ;
    };

    exports.js = function (concatToFile) {
        return $later()
            //.pipe(function() { return use.plumber(use.notify.onError("Error: <%= error.message %>")); })
            //.pipe(use.cached('js'))
            .pipe(concatToFile ? function() { return $.concat(concatToFile); } : $.util.noop)
            .pipe($.util.env.dev ? $.util.noop : $.uglify)
            //.pipe(use.remember('js'))
            ;
    };

    return exports;
};