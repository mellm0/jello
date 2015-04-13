module.exports = function(gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        watchFiles = {
            'assets.json': ['reconfigure'],
            'bower.json':  ['install:bower'],
            'composer.json':  ['update:composer'],
            'package.json':    ['install:npm']
        },
        watchTasks = {
            'css':     ['build:css'],
            'js':      ['build:js'],
            'images':  ['build:images'],
            'copy':    ['build:copy'],
            'html':    ['build:html'],
            'sprites': ['build:sprites']
        };

    for(var file in watchFiles) {
        if(watchFiles.hasOwnProperty(file)) {
            gulp.task('watch:' + file, watchFiles[file], function(done) {
                $env.set('disable_sync', true);

                var callback = function() {
                    $env.set('disable_sync', false);
                    $env.server.reload();
                    done();
                };

                $helpers.sequence(
                    'build',
                    'jekyll',
                    callback
                );
            });
        }
    }

    // Disable sync when watching
    if(process.argv.indexOf('watch') !== -1 || process.argv.indexOf('default') !== -1 || process.argv.length <= 2) {
        $env.set('disable_sync', true);
    }

    gulp.task('watch', ['start', 'server', 'build'], function () {
        $env.set('disable_sync', false);
        $env.server.reload();

        var watchers = {},
            configurations = $env.start();

        for (var file in watchFiles) {
            if (watchFiles.hasOwnProperty(file)) {
                if (file === 'assets.json') {
                    watchers[file] = gulp.watch($env.configuration_files, ['watch:' + file]);
                }
                else {
                    watchers[file] = gulp.watch(file, ['watch:' + file]);
                }
            }
        }

        for (var task in watchTasks) {
            if (watchTasks.hasOwnProperty(task)) {
                var src = [];

                configurations.forEach(function (configuration) {
                    if (configuration.hasOwnProperty(task)) {
                        if (Array.isArray(configuration[task])) {
                            configuration[task].forEach(function (minorTask) {
                                if (minorTask.hasOwnProperty('watch'))
                                    src = src.concat(minorTask.watch);
                                else if (minorTask.hasOwnProperty('all'))
                                    src = src.concat(minorTask.all);
                                else if (minorTask.hasOwnProperty('src'))
                                    src = src.concat(minorTask.src);
                            });
                        }
                        else if (configuration[task].hasOwnProperty('watch'))
                            src = src.concat(configuration[task].watch);
                        else if (configuration[task].hasOwnProperty('all'))
                            src = src.concat(configuration[task].all);
                        else if (configuration[task].hasOwnProperty('src'))
                            src = src.concat(configuration[task].src);
                    }
                });

                if (src.length)
                    watchers[task] = gulp.watch(src, watchTasks[task]);
            }
        }

        if ($env.project().hasOwnProperty('refresh')) {
            watchers['refresh'] = gulp.watch($env.project().refresh, ['server:reload']);
        }

        if (Object.keys(watchers).length) {
            for (var key in watchers) {
                if (watchers.hasOwnProperty(key)) {
                    (
                        function (name) {
                            watchers[key].on('change', function (event) {
                                $.util.beep();
                                $.util.log('File ' + event.path + ' was ' + event.type + ', running tasks...');

                                if (event.type === 'deleted') {
                                    if ($.cached.caches.hasOwnProperty(name) && $.cached.caches[name].hasOwnProperty(event.path)) {
                                        delete $.cached.caches[name][event.path];
                                        $.remember.forget(name, event.path);
                                    }

                                    if (name == 'js' && $.cached.caches.hasOwnProperty('js:lint') && $.cached.caches['js:lint'].hasOwnProperty(event.path)) {
                                        delete $.cached.caches['js:lint'][event.path];
                                        $.remember.forget('js:lint', event.path);
                                    }
                                }
                            });
                        }(key)
                    );
                }
            }
        }
    });

    // Default task is to watch assets
    gulp.task('default', ['watch']);
};