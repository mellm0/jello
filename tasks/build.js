module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        tasks = {
            assets: {
                'build:css':     ['css'],
                'build:js':      ['js'],
                'build:html':    ['html'],
                'build:images':  ['images'],
                'build:sprites': ['sprites'],
                'build:copy':    ['copy']
            },
            build: [
                'build:css',
                'build:js',
                'build:html',
                'build:images',
                'build:sprites',
                'build:copy'
            ]
        },

        buildTasksHasBeenReset = false,

        syncOrNot = function (done) {
            var callback = function () {
                $env.server.reload();
                $env.trigger('built');
                done();
            };

            if ($env.get('disable_sync')) {
                callback();
            }
            else {
                $helpers.sequence.use(gulp)('jekyll', callback);
            }
        },

        startAssetTasks = function() {
            for (var task in tasks.assets) {
                if (tasks.assets.hasOwnProperty(task)) {
                    gulp.task(task, tasks.assets[task], syncOrNot);
                }
            }
        },

        // Build all assets
        startBuildTasks = function() {
            var buildTasks = tasks.build;

            if(buildTasks.indexOf('start') === -1)
                buildTasks.unshift('start');

            gulp.task('build', buildTasks);

            return true;
        }

        resetGulp = function() {
            gulp.on('stop', function () {
                if(buildTasksHasBeenReset === false) {
                    var commandLineTasks = $.util.env._.length ? $.util.env._ : ['default'];
                    gulp.start(commandLineTasks);
                }
                buildTasksHasBeenReset = true;
            });

            gulp.stop(false, true);
        };

    $env.on('start', function(env, configs) {
        var task;

        if(!env.hasOwnProperty('tasks'))
            return;

        if(env.tasks.hasOwnProperty('assets')) {
            for (task in env.tasks.assets) {
                if (env.tasks.assets.hasOwnProperty(task)) {
                    tasks.assets[task] = env.tasks.assets[task];
                }
            }
            startAssetTasks();
        }

        if(env.tasks.hasOwnProperty('build')) {
            tasks.build = env.tasks.build;
            startBuildTasks();
        }

        if(env.tasks.hasOwnProperty('assets') || env.tasks.hasOwnProperty('build')) {
            resetGulp();
        }
    });

    startAssetTasks();
    startBuildTasks();
};