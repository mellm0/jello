module.exports = function(gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        assetTasks = {
            'build:css': ['css:single', 'css:merged'],
            'build:js': ['js:single', 'js:merged'],
            'build:html': ['html'],
            'build:images': ['images'],
            'build:sprites': ['sprites'],
            'build:copy': ['copy']
        },
        buildTasks = [
            'build:css',
            'build:js',
            'build:html',
            'build:images',
            'build:sprites',
            'build:copy'
        ],

        syncOrNot = function(done) {
            if($env.get('disable_sync'))
                $helpers.sequence(server.reload, done);
            else
                $helpers.sequence('jekyll', server.reload, done);
        };

    for(var task in assetTasks) {
        if(assetTasks.hasOwnProperty(task)) {
            gulp.task(task, assetTasks[task], syncOrNot);
        }
    }

    // Build all assets
    gulp.task('build', buildTasks);
};