module.exports = function(gulp, $, $env) {
    var deployTasks = [
            'git:deploy',
            'targets:deploy'
        ];

    // Execute all deploy tasks
    gulp.task('deploy', deployTasks);
};