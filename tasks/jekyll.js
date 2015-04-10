module.exports = function(gulp, $, $env) {
    var $helpers = require("../lib/helpers")($env),
        jekyllIsAvailable = function() {
            return $env.shell.which('jekyll') && $env.shell.test('-f', '_config.yml');
        },
        args = function(args) {
            if(!args)
                args = [];

            if ($env.project().hasOwnProperty('jekyll')) {
                if ($env.project().hasOwnProperty('src'))
                    args.push('--source ' + $env.project().jekyll.src);

                if ($env.project().jekyll.hasOwnProperty('dest'))
                    args.push('--destination ' + $env.project().jekyll.dest);
            }

            return args.join(' ');
        };

    // Run jekyll if applicable
    gulp.task('jekyll', ['start'], function (done) {
        if (jekyllIsAvailable()) {
            $env.shell.exec('jekyll build' + args(), function () {
                $env.server.reload();
                done();
            });
        }
        else
            done();
    });

    // Serve jekyll (this only builds once, better to use watch)
    gulp.task('jekyll:serve', ['start', 'build'], function (done) {
        if (jekyllIsAvailable()) {
            $env.shell.exec('jekyll serve' + args(['--watch']), function () {
                $env.server.reload();
                $helpers.notify('You can now view this website at http://localhost:4000');
                done();
            });
        }
        else
            done();
    });
};