module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        allTasks = [
            'update:bower',
            'update:npm',
            'update:composer'
        ],

        getOptionsForExecution = function(commandFn, packageFile, packageType) {
            return {
                command: commandFn,
                canExecute: function(folder) {
                    if(typeof folder === 'undefined')
                        folder = '';

                    return $env.shell.test('-f', folder + packageFile);
                },
                before: function(folder) {
                    folder = folder ? 'folder: ' + folder : 'project directory';

                    $.util.log('Updating ' + packageType + ' for ' + folder);
                },
                after: function(folder, installed) {
                    if(folder)
                        $.util.log('Updated ' + packageType + ' for ' + folder);
                    else if(installed) {
                        installed.push('project directory');
                        $helpers.notify('Updated ' + packageType + ' for: ' + installed.join(', '));
                    }
                }
            };
        };

    // Update bower packages
    gulp.task('update:bower', function (done) {
        if ($env.shell.which('bower')) {
            $env.execute_on_modules_then_project(getOptionsForExecution(function(folder) {
                return $helpers.get_sub_shelled_command(['bower update'], folder);
            }, 'bower.json', 'bower packages'), done);
        }
        else {
            done();
        }
    });

    // Update node packages
    gulp.task('update:npm', function (done) {
        if ($env.shell.which('npm') && $env.shell.test('-f', 'package.json')) {
            $.util.log('Updating node packages');
            $env.shell.exec('npm update', function () {
                $helpers.notify('Updated node packages');
                done();
            });
        }
        else {
            done();
        }
    });

    // Update composer packages
    gulp.task('update:composer', function (done) {
        if ($env.shell.which('composer') && $env.shell.test('-f', 'composer.json')) {
            $.util.log('Updating composer packages');
            $env.shell.exec('composer update', function () {
                $helpers.notify('Updated composer packages');
                done();
            });
        }
        else {
            done();
        }
    });

    // Update all
    gulp.task('update', allTasks);
};