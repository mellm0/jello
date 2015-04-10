module.exports = function(gulp, $, $env, env, configs) {
    var $fs = require("fs"),
        $git = require("../lib/git")($env, env, configs),
        $run = require('run-sequence'),
        $helpers = require("../lib/helpers")($env, env, configs),
        excludedDirectories = [
            'bower_components',
            'node_modules'
        ],

        checkIfCanDeployViaGit = function() {
            return $git.is_available() && env.hasOwnProperty('deploy') && env.deploy.hasOwnProperty('git');
        };

    gulp.task('git:pull', function(done) {
        if($git.is_available() && env.hasOwnProperty('git')) {
            var options = Array.isArray(env.git) ? $git.options(env.git[0]) : $git.options(env.git),
                filesWatched = {},
                filesDone = 0,
                ifDone = function () {
                    if (Object.keys(filesWatched).length == filesDone)
                        done();
                };

            $helpers.notify('Downloading from ' + options.origin + '/' + options.branch + ' to ' + $helpers.parent_directory());

            // Change branch to master if head is bad
            if (options.branch === 'HEAD') {
                $.util.beep();
                $helpers.shell.exec('git checkout master');
                options.branch = 'master';
            }

            if ($.util.env.reset) {
                // Reset changes
                console.log('Resetting changes');
                $helpers.shell.exec('git reset --hard');
            }

            if ($helpers.shell.which('bower') && $helpers.shell.test('-f', $helpers.parent_directory('bower.json'))) {
                filesWatched[$helpers.parent_directory('bower.json')] = $fs.statSync($helpers.parent_directory('bower.json')).mtime;

                $fs.watchFile($helpers.parent_directory('bower.json'), function () {
                    console.log('Installing bower packages');

                    $helpers.shell.exec('bower install', function () {
                        filesDone++;
                        $fs.unwatchFile($helpers.parent_directory('bower.json'));
                        ifDone();
                    });
                });
            }

            if ($helpers.shell.which('npm') && $helpers.shell.test('-f', $helpers.parent_directory('package.json'))) {
                filesWatched[$helpers.parent_directory('package.json')] = $fs.statSync($helpers.parent_directory('package.json')).mtime;

                $fs.watchFile($helpers.parent_directory('package.json'), function () {
                    console.log('Installing node packages');

                    $helpers.shell.exec('npm install', function () {
                        filesDone++;
                        $fs.unwatchFile($helpers.parent_directory('package.json'));
                        ifDone();
                    });
                });
            }

            if (shell.which('composer') && shell.test('-f', $helpers.parent_directory('composer.json'))) {
                filesWatched[$helpers.parent_directory('composer.json')] = $fs.statSync($helpers.parent_directory('composer.json')).mtime;

                $fs.watchFile($helpers.parent_directory('composer.json'), function () {
                    console.log('Updating composer packages');

                    $helpers.shell.exec('composer update', function () {
                        filesDone++;
                        $fs.unwatchFile($helpers.parent_directory('composer.json'));
                        ifDone();
                    });
                });
            }

            $helpers.shell.exec('git pull ' + options.origin + ' ' + options.branch, function () {
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
        else
            done();
    });

    gulp.task('git:push', function(done) {
        $git.commit_and_push_project(done);
    });

    gulp.task('git:status', function(done) {
        $git.project_status(done);
    });

    gulp.task('git:deploy', function(done) {
        if(checkIfCanDeployViaGit()) {
            $helpers.notify('Please do not make any changes to files whilst the project is deploying...');

            var currentBranch = $git.current_branch(),
                currentOrigin = $git.current_origin(currentBranch),
                deployedTo = [],
                beginDeployment = function() {
                // Fetch from remote for missing branches
                $helpers.shell.exec('git fetch --all && git pull --all');

                $helpers.apply_to_array_or_one(env.deploy.git, function (configuration, incrementUpdates, incrementFinished, ifDone, forceDone) {
                    incrementUpdates();

                    var options = $git.options(configuration),
                        from = options.hasOwnProperty('develop') ? options.develop : currentBranch,
                        fromOrigin = options.hasOwnProperty('develop-origin') ? options['develop-origin'] : currentOrigin,
                        commands = [];

                    // If branch exists, checkout normally, otherwise create new branch
                    if (!$helpers.shell.exec('git branch --list ' + options.branch, {silent: true}).output.trim()) {
                        commands.push('git checkout -B ' + options.origin + '/' + options.branch);
                        commands.push('git push ' + options.origin + ' ' + options.branch);
                    }

                    // Create from branch and pull from current branch and origin
                    if (from && !$helpers.shell.exec('git branch --list ' + options.branch, {silent: true}).output.trim()) {
                        commands.push('git checkout -B ' + fromOrigin + '/' + from);
                        commands.push('git pull ' + currentOrigin + ' ' + currentBranch);
                        commands.push('git push ' + fromOrigin + ' ' + from);
                        commands.push('git checkout -B ' + options.origin + '/' + options.branch);
                    }

                    commands.push('git pull ' + fromOrigin + ' ' + from);
                    commands.push('git push ' + options.origin + ' ' + options.branch);
                    commands.push('git checkout -B ' + currentOrigin + '/' + currentBranch);

                    $helpers.shell.exec(commands.join(' && '), function() {
                        if ('HEAD' == $helpers.shell.exec('git rev-parse --abbrev-ref HEAD 2>/dev/null', {silent: true}).output.trim()) {
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
                }, function(error) {
                    if(deployedTo.length) {
                        $helpers.notify('Project has been successfully deployed to ' + "\n" + deployedTo.join("\n"), true);
                    }

                    if(error) {
                        $env.set('deploy-error', true);
                        $helpers.notify('There was an error in deployment, please use "gulp git:deploy:fix"', true);
                    }

                    done();
                });
            };

            if(env.hasOwnProperty('git')) {
                $git.commit_and_push_project(function () {
                    beginDeployment();
                });
            }
            else {
                beginDeployment();
            }
        }
        else
            done();
    });

    gulp.task('git:deploy:fix', function (done) {
        if (checkIfCanDeployViaGit()) {
            var accept = $.util.env.ours ? ' --ours' : ' --theirs';

            $helpers.shell.exec('grep -lr \'<<<<<<<\' . --exclude-dir=' + excludedDirectories.join(' --exclude-dir=') + ' | xargs git checkout' + accept);

            if($.util.env.deploy) {
                $run('deploy', done());
            }
            else if($.util.env.gitDeploy) {
                $run('git:deploy', done());
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