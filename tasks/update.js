module.exports = function(gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        allTasks = [
            'update:bower',
            'update:npm',
            'update:composer'
        ];

    // Update bower packages
    gulp.task('update:bower', function(done) {
        if($env.shell.which('bower')) {
            var installed = [];

            $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
                var folder = configuration.moduleFolder ? configuration.moduleFolder + '/' : '',
                    command = folder ? '(cd ' + folder + ' && bower update)' : 'bower update';

                if ($env.shell.test('-f', folder + 'bower.json')) {
                    incrementUpdates();

                    $.util.log('Updating bower packages for folder: ' + folder);

                    $env.shell.exec(command, function () {
                        installed.push(configuration.moduleFolder ? configuration.moduleFolder : '(project directory)');
                        incrementFinished();
                        ifDone();
                    });
                }
            }, function() {
                if(installed.length) {
                    $helpers.notify('Updated bower packages for: ' + installed.join(', '));
                }

                done();
            });
        }
        else {
            done();
        }
    });

    // Update node packages
    gulp.task('update:npm', function(done) {
        if($env.shell.which('npm') && $env.shell.test('-f', 'package.json')) {
            $.util.log('Updating node packages');
            $env.shell.exec('npm update', function() {
                $helpers.notify('Updated node packages');
                done();
            });
        }
        else {
            done();
        }
    });

    // Update composer packages
    gulp.task('update:composer', function(done) {
        if($env.shell.which('composer') && $env.shell.test('-f', 'composer.json')) {
            $.util.log('Updating composer packages');
            $env.shell.exec('composer update', function() {
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