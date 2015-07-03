module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        allTasks = [
            'install:bower',
            'install:npm',
            'install:composer'
        ];

    // Install bower packages
    gulp.task('install:bower', function (done) {
        if ($env.shell.which('bower')) {
            var installed = [];

            $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
                var folder = configuration.hasOwnProperty('moduleFolder') ? configuration.moduleFolder + '/' : '',
                    command = folder ? '(cd ' + folder + ' && bower install)' : 'bower install';

                if (folder && $env.shell.test('-f', folder + 'bower.json')) {
                    incrementUpdates();

                    $.util.log('Installing bower packages for folder: ' + folder);

                    $env.shell.exec(command, function () {
                        installed.push(configuration.moduleFolder ? configuration.moduleFolder : '(project directory)');
                        incrementFinished();
                        ifDone();
                    });
                }
            }, function () {
                if ($env.shell.test('-f', 'bower.json')) {
                    $.util.log('Installing bower packages for project directory');

                    $env.shell.exec('bower install', function () {
                        installed.push('(project directory)');
                        $helpers.notify('Installed bower packages for: ' + installed.join(', '));
                        done();
                    });
                }
                else if (installed.length) {
                    $helpers.notify('Installed bower packages for: ' + installed.join(', '));
                    done();
                }
            });
        }
        else {
            done();
        }
    });

    // Install node packages
    gulp.task('install:npm', function (done) {
        if ($env.shell.which('npm') && $env.shell.test('-f', 'package.json')) {
            $.util.log('Installing node packages');
            $env.shell.exec('npm install', function () {
                $helpers.notify('Installed node packages');
                done();
            });
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