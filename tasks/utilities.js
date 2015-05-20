module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env);

    gulp.task('start', function (done) {
        $env.start(function (env, configs) {
            if(!$env.get('started')) {
                $env.trigger('start', [env, configs]);
                $env.set('started', true);
            }

            done();
        });
    });

    gulp.task('reconfigure', function (done) {
        $env.refresh(function (env, configs) {
            $env.trigger('reconfigure', [env, configs]);
            done();
        });
    });

    gulp.task('notify', function (done) {
        var message = $.util.env.message ? $.util.env.message.replace('_', ' ') : 'BOO!';
        $helpers.notify(message, $.util.env.important);
        done();
    });
};