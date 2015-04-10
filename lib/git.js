var defaults = {
    options: {
        origin: 'origin',
        branch: 'master'
    }
};

var $path = require("path"),
    $helpers = require("./helpers"),
    $env = require("./env"),
    $shell = $helpers.shell,
    $gUtils = require("gulp-util");

var isAvailable = function() {
        if (!$shell.which('git')) {
            $helpers.notify('Git is not installed.');
            return false;
        }

        return true;
    },
    getOptionsForGit = function (configuration, overrides) {
        var args = [],
            options = defaults.options;

        options.folder = configuration.hasOwnProperty('moduleFolder') ? configuration.moduleFolder + '/' : '';
        options.name = options.folder ? options.folder : 'project directory';

        if(options.folder) {
            args.push('--git-dir=' + options.folder + '.git');
            args.push('--work-tree=' + options.folder);
        }

        if(overrides) {
            for (var option in overrides) {
                if (overrides.hasOwnProperty(option)) {
                    options[option] = overrides[option];
                }
            }
        }

        if(configuration.hasOwnProperty(args)) {
            args = args.concat($helpers.args_from_json(configuration.args));
        }

        if(overrides.hasOwnProperty(args)) {
            args = args.concat($helpers.args_from_json(overrides.args));
        }

        options.args = args.join(' ');

        if (!options.folder && $gUtils.env.origin) {
            options.origin = $gUtils.env.origin;
        }
        else if ((!overrides || (overrides && !overrides.hasOwnProperty('origin'))) && configuration.hasOwnProperty('origin')) {
            options.origin = configuration.git.origin;
        }

        if (!options.folder && $gUtils.env.branch) {
            options.branch = $gUtils.env.branch;
        }
        else if ((!overrides || (overrides && !overrides.hasOwnProperty('branch'))) && configuration.hasOwnProperty('branch')) {
            options.branch = configuration.branch;
        }
        else {
            options.branch = $shell.exec('git rev-parse --abbrev-ref HEAD' + options.args + ' 2>/dev/null', {silent: true}).output.trim();
        }

        return options;
    },
    commitAndPush = function(configuration, callback) {
        var message = $gUtils.env.message ? $gUtils.env.message.replace('_', ' ') : 'Uploading changes at ' + new Date().toUTCString(),
            pwd = $shell.pwd(),
            options = getOptionsForGit(configuration);

        if (options.branch === 'HEAD') {
            $helpers.notify('Your current branch is on HEAD - which is a bad idea!! Changing to master...', true);
            $shell.exec('git checkout master ' + options.args);
            options.branch = 'master';
        }

        console.log('Updating ' + options.name);

        $shell.exec('(cd ' + options.folder + ' && git add . -A && git commit -m "' + message + '" && git pull ' + options.origin + ' ' + options.branch + ' && git push ' + options.origin + ' ' + options.branch + ' && cd ' + pwd + ')', function () {
            use.util.beep();
            if (callback) callback(options);
        });
    };

// Check if git is available
module.exports.is_available = isAvailable;

// Get options from commands or environment, and process defaults
module.exports.options = getOptionsForGit;

// Command for committing and pushing via git
module.exports.commit_and_push = commitAndPush;

// Commit and push the current project
module.exports.commit_and_push_project = function(callback, gitConfigs) {
    if (!isAvailable()) {
        if(callback) callback();
        return;
    }

    var modules = [],
        uploadProject = function() {
            if(gitConfigs || $env.project().hasOwnProperty('git')) {
                $helpers.apply_to_array_or_one(gitConfigs ? gitConfigs : $env.project().git, function(configuration, incrementUpdates, incrementFinished, ifDone) {
                    incrementUpdates();

                    commitAndPush(configuration, function (options) {
                        $helpers.notify('Project has been uploaded to ' + options.origin + '/' + options.branch);

                        incrementFinished();
                        ifDone();
                    });
                }, callback ? callback(modules) : null);
            }
            else {
                if(callback)
                    callback(modules);
            }
        };

    $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
        var folder = configuration.hasOwnProperty('moduleFolder') ? configuration.moduleFolder + '/' : '';

        if (
            folder &&
            $shell.test('-d', folder + '.git') &&
            (configuration.hasOwnProperty('git') || configuration.hasOwnProperty('package'))
        ) {
            incrementUpdates();

            commitAndPush(configuration, function () {
                if (configuration.hasOwnProperty('package'))
                    modules.push(configuration.package);

                incrementFinished();
                ifDone();
            });
        }
    }, function () {
        if ($gUtils.env.modulesOnly) {
            if(callback) callback(modules);
        }
        else {
            if ($shell.which('composer') && $shell.test('-d', 'composer.json')) {
                var updateCommand = modules.length ? 'composer update --prefer-source ' + modules.join(' ') : 'composer update';
                $shell.exec(updateCommand, function () {
                    $helpers.notify('Modules updated: ' + modules.length);
                    console.log('Updating packages after uploading module changes');

                    uploadProject();
                });
            }
            else {
                uploadProject();
            }
        }
    });
};

// Commit and push the current project
module.exports.project_status = function(callback) {
    if (!isAvailable()) {
        if(callback) callback();
        return;
    }

    var modulesWithChanges = [];

    $env.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
        var folder = configuration.hasOwnProperty('moduleFolder') ? configuration.moduleFolder + '/' : '';

        if ($shell.test('-d', folder + '.git')) {
            incrementUpdates();

            $helpers.apply_to_array_or_one(configuration.hasOwnProperty('git') ? configuration.git : configuration, function(configurationForGit, incrementUpdatesForGit, incrementFinishedForGit, ifDoneForGit) {
                var options = getOptionsForGit(configurationForGit);

                incrementUpdatesForGit();

                $shell.exec('echo "## STATUS FOR: ' + options.name + '" && git' + options.args + ' status', function () {
                    $shell.exec('git' + options.args + ' status -s', function (code, output) {
                        if (output) {
                            var message = options.folder ? options.name + ' (' + options.folder + ')' : options.name + ' (./)';
                            modulesWithChanges.push(message);
                        }

                        incrementFinishedForGit();
                        ifDoneForGit();
                    }, {silent: true});
                });
            }, function() {
                incrementFinished();
                ifDone();
            });
        }
    }, function () {
        if (modulesWithChanges.length) {
            console.log("\n");
            $helpers.notify('Folders with changes: ' + "\n" + modulesWithChanges.join("\n"), true);
        }

        if(callback) callback();
    });
};