module.exports = function(gulp, $, $env) {
    var $helpers = require("../lib/helpers")($env);

    gulp.task('start', function (done) {
        $env.start(done);
    });

    gulp.task('reconfigure', function (done) {
        $env.refresh(done);
    });

    gulp.task('notify', function (done) {
        var message = $.util.env.message ? $.util.env.message.replace('_', ' ') : 'BOO!';
        $helpers.notify(message, $.util.env.important);
        done();
    });
};