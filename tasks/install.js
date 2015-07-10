module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env),
        allTasks = [
            'install:bower',
            'install:npm',
            'install:composer'
        ],

        // Iterate through modules and install packages
        // And then install packages in project directory, to allow overrides
        installInModulesThenProject = function(packageFile, commandFn, packageType, callback, checkIfAlreadyAvailableFn) {
            if(!packageType)
                packageType = 'bower packages';

            var installed = [];

            $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
                var folder = configuration.hasOwnProperty('moduleFolder') ? configuration.moduleFolder + '/' : '',
                    command = commandFn(folder);

                incrementUpdates();

                if (folder && $env.shell.test('-f', folder + packageFile) && (!checkIfAlreadyAvailableFn || !checkIfAlreadyAvailableFn(packageFile, folder))) {
                    $.util.log('Installing ' + packageType + ' for folder: ' + folder);

                    $env.shell.exec(command, function () {
                        installed.push(configuration.moduleFolder ? configuration.moduleFolder : '(project directory)');
                        incrementFinished();
                        ifDone();
                    });
                }
                else {
                    incrementFinished();
                    ifDone();
                }
            }, function () {
                if ($env.shell.test('-f', packageFile) && (!checkIfAlreadyAvailableFn || !checkIfAlreadyAvailableFn(packageFile))) {
                    $.util.log('Installing ' + packageType + ' for project directory');

                    $env.shell.exec(commandFn(), function () {
                        installed.push('(project directory)');
                        $helpers.notify('Installed ' + packageType + ' for: ' + installed.join(', '));

                        if(callback)
                            callback();
                    });
                }
                else if (installed.length) {
                    $helpers.notify('Installed ' + packageType + ' for: ' + installed.join(', '));

                    if(callback)
                        callback();
                }
            }, true);
        },
        getSubShelledCommand = function(commands, folder) {
            if(folder)
                commands.unshift('cd ' + folder);

            return '(' + commands.join(' && ') + ')';
        };

    // Install bower packages
    gulp.task('install:bower', ['start'], function (done) {
        if ($env.shell.which('bower')) {
            installInModulesThenProject('bower.json', function(folder) {
                return folder ? getSubShelledCommand(['bower install'], folder) : 'bower install';
            }, 'bower packages', done);
        }
        else {
            done();
        }
    });

    // Install node packages
    gulp.task('install:npm', ['start'], function (done) {
        if ($env.shell.which('npm')) {
            installInModulesThenProject('package.json', function(folder) {
                return folder ? getSubShelledCommand([
                    $.util.env.installDevModules ? 'npm install' : 'npm install --production',
                    "if [ -d 'node_modules' ]; then rsync -av node_modules/ ../node_modules/; fi",
                    "if [ -d 'node_modules' ]; then rm -rf node_modules; fi"
                ], folder) : 'npm install';
            }, 'node packages', done);
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