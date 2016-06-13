module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        tasks = {
            assets: {
                'build:css':     ['css'],
                'build:js':      ['js'],
                'build:html':    ['html'],
                'build:images':  ['images'],
                'build:sprites': ['sprites'],
                'build:copy':    ['copy'],
                'build:jekyll':  ['jekyll']
            },
            build: [
                'build:css',
                'build:js',
                'build:html',
                'build:images',
                'build:sprites',
                'build:copy',
                'build:jekyll'
            ],
            'build-after': ['build:jekyll']
        },

        buildTasksHasBeenReset = false,

        syncOrNot = function (done, task) {
            var callback = function () {
                var event = task ? 'built:' + task : 'built';
                $env.server.reload();
                $env.trigger(event);
                done();
            };

            if ($env.get('disable_sync') || !tasks['build-after'].length) {
                callback();
            }
            else {
                $helpers.sequence.use(gulp)(tasks['build-after'], callback);
            }
        },

        startAssetTasks = function() {
            for (var task in tasks.assets) {
                if (tasks.assets.hasOwnProperty(task)) {
                    gulp.task(task, tasks.assets[task], (function (task) { return function(done) {
                        syncOrNot(done, task);
                    };})(task));
                }
            }
        },

        // Build all assets
        startBuildTasks = function() {
            var buildTasks = tasks.build;

            if(buildTasks.indexOf('start') === -1)
                buildTasks.unshift('start');

            gulp.task('build', function(done) {
                $env.set('disable_sync', true);

                var cb = function() {
                    $env.set('disable_sync', false);
                    $env.server.reload();
                    $env.trigger('built');
                    done();
                };

                if(tasks['build-after'].length) {
                    $helpers.sequence.use(gulp)(buildTasks, tasks['build-after'], cb);
                }
                else {
                    $helpers.sequence.use(gulp)(buildTasks, cb);
                }
            });

            return true;
        },

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

    if($env.get('after_build_tasks')) {
        tasks['build-after'] = $env.get('after_build_tasks');
    }

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