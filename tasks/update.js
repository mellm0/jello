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
                var command = $.util.env.dev ? 'bower update' : 'bower update --production',
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

    // Update node packages
    gulp.task('update:npm', function (done) {
        if ($env.shell.which('npm') && !$env.get('watching')) {
            $env.execute_on_modules_then_project(getOptionsForExecution(function(folder) {
                var command = $.util.env.dev ? 'npm update' : 'npm update --production',
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
