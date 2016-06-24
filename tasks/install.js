module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        allTasks = [
            'install:bower',
            'install:npm',
            'install:composer'
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

                    $.util.log('Installing ' + packageType + ' for ' + folder);
                },
                after: function(folder, installed) {
                    if(folder)
                        $.util.log('Installed ' + packageType + ' for ' + folder);
                    else if(installed) {
                        installed.push('project directory');
                        $helpers.notify('Installed ' + packageType + ' for: ' + installed.join(', '));
                    }
                }
            };
        };

    // Install bower packages
    gulp.task('install:bower', ['start'], function (done) {
        if ($env.shell.which('bower')) {
            $env.execute_on_modules_then_project(getOptionsForExecution(function(folder) {
                var command = $.util.env.dev ? 'bower install' : 'bower install --production',
                    commands = [];

                if(!folder || !$.util.env.deleteModuleDependencies) {
                    commands.push(command);
                }

                if(folder) {
                    var prefix = $helpers.get_relative_location_of_module(folder);
                    commands.push(command + " --config.directory='" + prefix + "'");
                }

                return $helpers.get_sub_shelled_command(commands, folder);
            }, 'bower.json', 'bower packages'), done);
        }
        else {
            done();
        }
    });

    // Install node packages
    gulp.task('install:npm', ['start'], function (done) {
        if ($env.shell.which('npm')) {
            $env.execute_on_modules_then_project(getOptionsForExecution(function(folder) {
                var command = $.util.env.dev ? 'npm install' : 'npm install --production',
                    commands = [];

                commands.push(command);

                if(folder) {
                    var prefix = $helpers.get_relative_location_of_module(folder);
                    commands.push("if [ -d 'node_modules' ]; then rsync -av node_modules/ " + prefix + "/node_modules/; fi");

                    if($.util.env.deleteModuleDependencies) {
                        commands.push("if [ -d 'node_modules' ]; then rm -rf node_modules; fi");
                    }
                }

                return $helpers.get_sub_shelled_command(commands, folder);
            }, 'package.json', 'node packages'), done);
        }
        else {
            done();
        }
    });

    // Install composer packages
    gulp.task('install:composer', function (done) {
        if ($env.shell.which('composer') && $env.shell.test('-f', 'composer.json')) {
            $.util.log('Installing composer packages');
            $env.shell.exec('composer install', function () {
                $helpers.notify('Installed composer packages');
                done();
            });
        }
        else {
            done();
        }
    });

    // Install all
    gulp.task('install', allTasks);
};
