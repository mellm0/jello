module.exports = function (gulp, $, $env) {
    var $fs = require("fs"),
        $git = require("../lib/git")(gulp, $, $env),
        $helpers = require("../lib/helpers")(gulp, $, $env),
        excludedDirectories = [
            'bower_components',
            'node_modules'
        ],

        checkIfCanDeployViaGit = function () {
            return $env.project().hasOwnProperty('deploy') && $env.project().deploy.hasOwnProperty('git') && $git.is_available_currently();
        };

    gulp.task('git:pull', function (done) {
        if ($git.is_available() && $env.project().hasOwnProperty('git')) {
            var options = Array.isArray($env.project().git) ? $git.options($env.project().git[0]) : $git.options($env.project().git),
                filesWatched = {},
                filesDone = 0,
                ifDone = function () {
                    if (Object.keys(filesWatched).length == filesDone) {
                        done();
                    }
                };

            $helpers.notify('Downloading from ' + options.origin + '/' + options.branch + ' to ' + $helpers.parent_directory());

            // Change branch to master if head is bad
            if (options.branch === 'HEAD') {
                $.util.beep();
                $env.shell.exec('git checkout master');
                options.branch = 'master';
            }

            if ($.util.env.reset) {
                // Reset changes
                $.util.log('Resetting changes');
                $env.shell.exec('git reset --hard');
            }

            if ($env.shell.which('bower') && $env.shell.test('-f', $helpers.parent_directory('bower.json'))) {
                filesWatched[$helpers.parent_directory('bower.json')] = $fs.statSync($helpers.parent_directory('bower.json')).mtime;

                $fs.watchFile($helpers.parent_directory('bower.json'), function () {
                    $.util.log('Installing bower packages');

                    $env.shell.exec('bower install', function () {
                        filesDone++;
                        $fs.unwatchFile($helpers.parent_directory('bower.json'));
                        ifDone();
                    });
                });
            }

            if ($env.shell.which('npm') && $env.shell.test('-f', $helpers.parent_directory('package.json'))) {
                filesWatched[$helpers.parent_directory('package.json')] = $fs.statSync($helpers.parent_directory('package.json')).mtime;

                $fs.watchFile($helpers.parent_directory('package.json'), function () {
                    $.util.log('Installing node packages');

                    $env.shell.exec('npm install', function () {
                        filesDone++;
                        $fs.unwatchFile($helpers.parent_directory('package.json'));
                        ifDone();
                    });
                });
            }

            if ($env.shell.which('composer') && shell.test('-f', $helpers.parent_directory('composer.json'))) {
                filesWatched[$helpers.parent_directory('composer.json')] = $fs.statSync($helpers.parent_directory('composer.json')).mtime;

                $fs.watchFile($helpers.parent_directory('composer.json'), function () {
                    $.util.log('Updating composer packages');

                    $env.shell.exec('composer update', function () {
                        filesDone++;
                        $fs.unwatchFile($helpers.parent_directory('composer.json'));
                        ifDone();
                    });
                });
            }

            $env.shell.exec('git pull ' + options.origin + ' ' + options.branch, function () {
                $helpers.notify('Downloaded from ' + options.origin + '/' + options.branch);

                ifDone();

                for (var file in filesWatched) {
                    if (filesWatched.hasOwnProperty(file) && filesWatched[file] == $fs.statSync(file).mtime) {
                        $fs.unwatchFile(file);
                        filesDone++;
                        ifDone();
                    }
                }
            });
        }
        else {
            done();
        }
    });

    gulp.task('git:push', ['start'], function (done) {
        $git.commit_and_push_project(done);
    });

    gulp.task('git:status', ['start'], function (done) {
        $git.project_status(done);
    });

    gulp.task('git:deploy', function (done) {
        if (checkIfCanDeployViaGit()) {
            $helpers.notify('Please do not make any changes to files whilst the project is deploying...');

            var currentBranch = $git.current_branch(),
                currentOrigin = $git.current_origin(currentBranch),
                deployedTo = [],
                beginDeployment = function () {
                    // Fetch from remote for missing branches
                    $env.shell.exec('git fetch --all && git pull --all');

                    $helpers.apply_to_array_or_one($env.project().deploy.git, function (configuration, incrementUpdates, incrementFinished, ifDone, forceDone) {
                        incrementUpdates();

                        var options = $git.options(configuration),
                            from = options.hasOwnProperty('develop') ? options.develop : currentBranch,
                            fromOrigin = options.hasOwnProperty('develop-origin') ? options['develop-origin'] : currentOrigin,
                            commands = [];

                        // If branch exists, checkout normally, otherwise create new branch
                        if (!$env.shell_var('git branch --list ' + options.branch)) {
                            commands.push('git checkout -B ' + options.origin + '/' + options.branch);
                            commands.push('git push ' + options.origin + ' ' + options.branch);
                        }

                        // Create from branch and pull from current branch and origin
                        if (from && !$env.shell_var('git branch --list ' + options.branch)) {
                            commands.push('git checkout -B ' + fromOrigin + '/' + from);
                            commands.push('git pull ' + currentOrigin + ' ' + currentBranch);
                            commands.push('git push ' + fromOrigin + ' ' + from);
                            commands.push('git checkout -B ' + options.origin + '/' + options.branch);
                        }

                        commands.push('git pull ' + fromOrigin + ' ' + from);
                        commands.push('git push ' + options.origin + ' ' + options.branch);
                        commands.push('git checkout -B ' + currentOrigin + '/' + currentBranch);

                        $env.shell.exec(commands.join(' && '), function () {
                            if ('HEAD' == $env.shell_var('git rev-parse --abbrev-ref HEAD 2>/dev/null')) {
                                $helpers.notify(
                                    'There was an error pulling and merging from branch ' + from + ' which has detached your head! ' +
                                    'BAD! Please review using git/SourceTree, and resolve conflicts. ' +
                                    'Or you can use "gulp git:deploy:fix" ' +
                                    'And run your deploy command again'
                                    , true);

                                forceDone();
                            }
                            else {
                                deployedTo.push(options.origin + '/' + options.branch);

                                $helpers.notify('Project has been successfully deployed to ' + options.origin + '/' + options.branch);

                                incrementFinished();
                                ifDone();
                            }
                        });
                    }, function (error) {
                        if (deployedTo.length) {
                            $helpers.notify('Project has been successfully deployed to ' + "\n" + deployedTo.join("\n"), true);
                        }

                        if (error) {
                            $env.set('deploy-error', true);
                            $helpers.notify('There was an error in deployment, please use "gulp git:deploy:fix"', true);
                        }

                        done();
                    });
                };

            if ($env.project().hasOwnProperty('git')) {
                $git.commit_and_push_project(function () {
                    beginDeployment();
                });
            }
            else {
                beginDeployment();
            }
        }
        else {
            done();
        }
    });

    gulp.task('git:deploy:fix', function (done) {
        if (checkIfCanDeployViaGit()) {
            var accept = $.util.env.ours ? ' --ours' : ' --theirs';

            $env.shell.exec('grep -lr \'<<<<<<<\' . --exclude-dir=' + excludedDirectories.join(' --exclude-dir=') + ' | xargs git checkout' + accept);

            if ($.util.env.deploy) {
                $helpers.sequence('deploy', done());
            }
            else if ($.util.env.gitDeploy) {
                $helpers.sequence('git:deploy', done());
            }
            else {
                done();
            }
        }
        else {
            done();
        }
    });
};