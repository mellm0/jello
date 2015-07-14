module.exports = function (gulp, $, $env) {
    var $defaults = require("../lib/defaults")(gulp, $, $env);

    // Start a browser sync server
    gulp.task('server', ['jekyll'], function (done) {
        var options = $env.project().hasOwnProperty('server') ? $env.project().server : $defaults.server.options;

        $env.server(options, function () {
            done();
        });
    });

    // Reload server
    gulp.task('server:reload', function (done) {
        $env.server.reload();
        done();
    });
};