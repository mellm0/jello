module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        deployTasks = [
            'git:deploy',
            'targets:deploy'
        ];

    // Execute all deploy tasks (it does it in sequence, so you can solve issues one at a time)
    gulp.task('deploy', function (done) {
        $helpers.sequence.apply(this, ['build'].concat(deployTasks).concat([done]));
    });
};