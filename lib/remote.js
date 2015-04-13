var $ssh = require('ssh2');

module.exports = function(gulp, $, $env) {
    var defaults = {
            options: {
                include:   ['/.htaccess'],
                exclude:   ['.git', '.idea', '/assets', 'assets.json', 'bower.json', 'gulpfile.js', 'package.json', 'README.md', '/.*', 'bower_components', 'node_modules', 'cache', '*.bak', 'atlassian-ide-plugin.xml'],
                compress:  true,
                verbose:   true,
                recursive: true,
                relative:  true,
                update:    true,
                delete:    true,
                progress:  true,
                partial:   true
            },
            validArguments: ['checksum', 'ignore-times', 'size-only', 'archive', 'recursive', 'backup', 'backup-dir', 'suffix', 'update', 'links', 'copy-unsafe-links', 'copy-links', 'safe-links', 'hard-links', 'perms', 'whole-file', 'owner', 'group', 'times', 'dry-run', 'sparse', 'one-file-system', 'existing', 'max-delete', 'delete', 'delete-excluded', 'filter', 'delete-after', 'ignore-errors', 'force', 'block-size', 'rsh', 'rsync-path', 'exclude', 'exclude-from', 'include', 'include-from', 'cvs-exclude', 'csum-length', 'temp-dir', 'compare-dest', 'compress', 'numeric-ids', 'timeout', 'daemon', 'no-detach', 'address', 'config', 'port', 'blocking-io', 'log-format', 'stats', 'partial', 'progress', 'password-file', 'bw-limit', 'read-batch', 'write-batch', 'itemize-changes']
        },
        $helpers = require("./helpers")(gulp, $, $env),
        $shell = $env.shell;

    var findTarget = function(target) {
            if (!$env.project().hasOwnProperty('targets') || $env.project().targets.hasOwnProperty(target))
                return false;

            // Check project for driver, or use a different driver specified in its settings (so you can use same details for multiple drivers)
            else if($env.project().targets[target].hasOwnProperty('target') && target != $env.project().targets[target].target) {
                return findTarget($env.project().targets[target].target);
            }

            else
                return $env.project().targets[target];
        },

        replaceVars = function(content, vars) {
            for (var $var in vars) {
                if (vars.hasOwnProperty($var)) {
                    content = content.replace('{$' + $var + '}', vars[$var]);
                }
            }

            return content;
        },

        configHasOneOfArrayAsProperty = function(possibleProps, config) {
            for(var i=0;i<possibleProps.length;i++) {
                if(config.hasOwnProperty(possibleProps[i]))
                    return possibleProps[i];
            }

            return false;
        },

        validRsyncArgs = function(options) {
            var args = [];

            for (var option in options) {
                if (options.hasOwnProperty(option)) {
                    if (defaults.validArguments.indexOf(option) === -1)
                        continue;

                    if (options[option] === true) {
                        args.push('--' + option);
                    }
                    else if (Array.isArray(options[option])) {
                        for (var i = 0; i < options[option].length; i++) {
                            args.push('--' + option + "='" + options[option][i] + "'");
                        }
                    }
                    else if (options[option] !== false) {
                        args.push('--' + option + "='" + options[option] + "'");
                    }
                }
            }

            return args;
        },

        reverseSrcAndDest = function(configuration) {
            var options = {};

            for (var option in configuration) {
                if (configuration.hasOwnProperty(option)) {
                    options[option] = configuration[option];
                }
            }

            delete options.dest;
            delete options.host;
            delete options.username;
            delete options.src;
            delete options.srcHost;
            delete options.srcUsername;

            options.include = [];
            options.exclude = ['.backup.*'];

            options.src = configuration.dest;

            if(configuration.hasOwnProperty('host')) {
                options.srcHost = configuration.host;

                if(configuration.hasOwnProperty('username')) {
                    options.srcUsername = configuration.username;
                }
            }

            return options;
        },

        sync = function(configuration, callback, backups, noCommands) {
            if(backups && Array.isArray(backups) && configHasOneOfArrayAsProperty(configuration, backups)) {
                backup(configuration, callback, null, null, backups);
            }
            else if(backups && configuration.hasOwnProperty(backups)) {
                backup(configuration, callback, backups);
            }
            else {
                var option,
                    options = defaults.options,
                    pwd = $helpers.rtrim($shell.pwd(), '/'),
                    vars = {
                        'PWD':  pwd,
                        'HOME': $helpers.home()
                    };

                for (option in configuration) {
                    if (configuration.hasOwnProperty(option)) {
                        options[option] = configuration[option];
                    }
                }

                var args = validRsyncArgs(options);

                if (configuration.hasOwnProperty('dest')) {
                    var dest = $helpers.rtrim(replaceVars(configuration.dest, vars), '/'),
                        src = configuration.hasOwnProperty('src') ? $helpers.rtrim(replaceVars(configuration.src), '/')+ '/' : pwd + '/';

                    options.dest = dest;
                    options.src = src;

                    if (configuration.hasOwnProperty('host')) {
                        dest = configuration.host + ':' + dest;

                        if (configuration.hasOwnProperty('username')) {
                            dest = configuration.username + '@' + dest;
                        }
                    }
                    else {
                        dest = dest + '/';
                    }

                    if (configuration.hasOwnProperty('srcHost')) {
                        src = configuration.srcHost + ':' + src;

                        if (configuration.hasOwnProperty('srcUsername')) {
                            src = configuration.srcUsername + '@' + src;
                        }
                        else if (configuration.hasOwnProperty('username')) {
                            src = configuration.username + '@' + src;
                        }
                    }

                    if(noCommands) {
                        $shell.exec('rsync ' + args.join(' ') + ' ' + src + ' ' + dest, function (code, output) {
                            if(callback)
                                callback.apply(this, [dest, src, configuration, code, output]);
                        });
                    }
                    else {
                        before(dest, src, options, function () {
                            $shell.exec('rsync ' + args.join(' ') + ' ' + src + ' ' + dest, function () {
                                $.util.beep();
                                after(dest, src, options, callback);
                            });
                        });
                    }
                }
            }
        },

        backup = function(configuration, callback, backupsProperty, noSync, onEachCb) {
            var backupOptions,
                backupsPropertyToUse = function() {
                    if(Array.isArray(backupsProperty))
                        return configHasOneOfArrayAsProperty(backupsProperty);
                    else
                        return backupsProperty
                }(),
                options = reverseSrcAndDest(configuration),
                pwd = $helpers.rtrim($shell.pwd(), '/'),
                vars = {
                    'PWD': pwd,
                    'HOME': $helpers.home()
                },
                finished = 0,
                time = new Date().toISOString(),
                ifDone = function() {
                    if(finished >= configuration[backupsPropertyToUse].length) {
                        if(noSync && callback)
                            callback();
                        else if(!noSync)
                            sync(configuration, callback);
                    }
                };

            for (var i=0;i<configuration[backupsPropertyToUse].length;i++) {
                backupOptions = options;

                for (var option in configuration[backupsPropertyToUse][i]) {
                    if (configuration[backupsPropertyToUse][i].hasOwnProperty(option)) {
                        backupOptions[option] = configuration[backupsPropertyToUse][i][option];
                    }
                }

                if(backupOptions.hasOwnProperty('host') || backupOptions.hasOwnProperty('srcHost')) {
                    backupOptions.dest = $helpers.rtrim(replaceVars(backupOptions.dest, vars), '/') + '/';

                    if(backupOptions.hasOwnProperty('itemize-changes')) {
                        if (backupOptions.hasOwnProperty('name'))
                            backupOptions.dest = backupOptions.dest + backupOptions.name;
                    }
                    else
                        backupOptions.dest = backupOptions.dest + time;

                    sync(options, function (dest, src, backupOptions, code, output) {
                        if(onEachCb)
                            onEachCb(dest, src, backupOptions, code, output);

                        $helpers.notify(src + ' has been backed up to ' + dest);
                        finished++;

                        if(backupOptions.hasOwnProperty('itemize-changes')) {
                            execute(["echo '" + output + "' > " + dest + '.backup.' + time + '.txt'], backupOptions, ifDone, dest);
                        }
                        else
                            ifDone();
                    }, true, true);
                }
                else {
                    backupOptions.dest = $helpers.rtrim(replaceVars(backupOptions.dest, vars), '/') + '/.backup.' + time + '.tar.gz';

                    $shell.exec('tar -zhcvf \'' + backupOptions.dest + '\' ' + backupOptions.src, function(backupOpts) {
                        if(onEachCb)
                            onEachCb(backupOpts.dest, backupOpts.src, backupOpts);

                        $helpers.notify(backupOpts.src + ' has been backed up to ' + backupOpts.dest);
                        finished++;

                        ifDone();
                    }(backupOptions));
                }
            }
        },

        before = function(dest, src, configuration, callback) {
            executeCommands('dest-commands-before', 'src-commands-before', dest, src, configuration, callback);
        },

        after = function(dest, src, configuration, callback) {
            executeCommands('dest-commands-after', 'src-commands-after', dest, src, configuration, callback);
        },

        executeCommands = function(destCommandsKey, srcCommandsKey, dest, src, configuration, callback) {
            var Client = $ssh.Client,
                client = new Client(),
                all = 0,
                done = 0,
                ifDone = function() {
                    done++;

                    if(callback && done >= all)
                        callback.apply(this, [dest, src, configuration]);
                };

            if(configuration.hasOwnProperty(destCommandsKey))
                all++;

            if(configuration.hasOwnProperty(srcCommandsKey))
                all++;

            if(configuration.hasOwnProperty(destCommandsKey)) {
                $.log('Executing commands on destination: ' + dest);
                execute(configuration[destCommandsKey], configuration, function() {
                    ifDone();
                }, client, dest);
            }

            if(configuration.hasOwnProperty(srcCommandsKey)) {
                $.log('Executing commands on source: ' + src);

                var srcConfiguration = JSON.parse(JSON.stringify(configuration));

                if(srcConfiguration.hasOwnProperty('srcHost')) {
                    srcConfiguration.destHost = configuration.host;
                    srcConfiguration.host = configuration.srcHost;
                }
                else {
                    srcConfiguration.host = null;
                }

                execute(srcConfiguration[srcCommandsKey], srcConfiguration, function() {
                    ifDone();
                }, client, dest);
            }

            if(!all)
                ifDone();
        },

        execute = function(commands, configuration, callback, client, dest) {
            if(commands && commands.length) {
                for(var i=0;i<commands.length;i++) {
                    commands[i] = replaceVars(commands[i], {
                        'PWD': configuration.dest,
                        'SRC': configuration.src,
                        'HOME': $helpers.home(),
                        'TMPDIR': process.env.TMPDIR
                    });
                }

                if(configuration.hasOwnProperty('host') && configuration.host) {
                    if(configuration.hasOwnProperty('dry-run')) {
                        $.log('Will execute the following commands on ' + dest + "\n" + commands.join("\n"));

                        if(callback)
                            callback.apply(this);
                    }
                    else {
                        configuration = $helpers.attach_private_key(configuration);

                        if (!client) {
                            var Client = $ssh.Client;
                            client = new Client();
                        }

                        client.on('ready', function () {
                            $helpers.notify('Connected to: ' + dest);
                            client.exec(commands.join(' && '), function (err, stream) {
                                if (err) throw err;
                                stream.on('close', function (code, signal) {
                                    console.log('Connection closed');
                                    client.end();

                                    if (callback)
                                        callback.apply(this, [code, signal, stream]);
                                }).on('data', function (data) {
                                    console.log('STDOUT: ' + data);
                                }).stderr.on('data', function (data) {
                                        console.log('STDERR: ' + data);
                                    });
                            });
                        }).connect(configuration);
                    }
                }
                else if(configuration.hasOwnProperty('dry-run')) {
                    $.log('Will execute the following commands in current directory' + "\n" + commands.join("\n"));

                    if(callback)
                        callback.apply(this);
                }
                else {
                    $shell.exec(commands.join(' && '), function (code, output) {
                        if(callback)
                            callback.apply(this, [code, output]);
                    });
                }
            }
        };

    // Check if git is available
    exports.is_available = function () {
        if (!$shell.which('rsync')) {
            $helpers.notify('Rsync is not installed.');
            return false;
        }

        return true;
    };

    // Find a target from the project settings
    exports.find_target = findTarget;

    // Collect rsync args that are valid
    exports.rsync_args = validRsyncArgs;

    // Backup a folder according to settings
    exports.backup = backup;

    // Reverse the source and destination
    exports.reverse_src_and_dest = reverseSrcAndDest;

    return exports;
};