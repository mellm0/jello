var $server = require('browser-sync'),
    $delete = require('del'),
    $shell = require('shelljs'),
    $mergeStream = require("merge-stream"),
    $gUtils = require("gulp-util");

module.exports = function (gulp, $, settings) {
    var exports = {},
        events = {},
        $helpers = require("./helpers")(gulp, $),
        $defaults = require("./defaults")(gulp, $);

    settings = settings || {};

    var getConfigFile = function () {
            var args = Array.prototype.slice.call(arguments);

            if (!args.length) {
                args.push($defaults.env.configFile);
            }

            return $helpers.parent_directory.apply(this, args);
        },
        getAllConfigurations = function (callback) {
            var configs = settings.hasOwnProperty('configuration_override') && settings.configuration_override ? [settings.configuration_override] : [$env];

            if(settings.hasOwnProperty('configuration_override')) {
                if (callback) {
                    callback($env, configs);
                }

                return configs;
            }

            if (!loadedModules) {
                buildModules(function ($modules) {
                    for (var module in $modules) {
                        if ($modules.hasOwnProperty(module)) {
                            configs.push($modules[module]);
                        }
                    }

                    loadedModules = true;

                    if (callback) {
                        callback($env, configs);
                    }
                });
            }
            else {
                for (var module in $modules) {
                    if ($modules.hasOwnProperty(module)) {
                        configs.push($modules[module]);
                    }
                }

                if (callback) {
                    callback($env, configs);
                }
            }

            return configs;
        },
        addFolderToAllVars = function (folder, configuration, direct) {
            var variables = ['css', 'js', 'images', 'html', 'copy', 'sprites'],
                globs = ['watch', 'src', 'dest', 'lint'];

            appendFolderToGlob = function(config) {
                globs.forEach(function (glob) {
                    if(!config.hasOwnProperty(glob)) return;
                    config[glob] = $helpers.append_folder_to_glob(folder, config[glob]);
                });
            };

            if(direct) {
                appendFolderToGlob(configuration);
            }
            else {
                variables.forEach(function (variable) {
                    if (!configuration.hasOwnProperty(variable)) return;

                    if (Array.isArray(configuration[variable])) {
                        configuration[variable].forEach(function (config) {
                            appendFolderToGlob(config);
                        });
                    }
                    else {
                        appendFolderToGlob(configuration[variable]);
                    }
                });
            }

            return configuration;
        },
        getEvents = function(event) {
            return events.hasOwnProperty(event) ? events[event] : [];
        },
        buildModules = function (callback) {
            if ($gUtils.env.ignoreModules) {
                if (callback) {
                    callback();
                }
            }
            else {
                var modules = ($env.hasOwnProperty('git') && $env.git.hasOwnProperty('modules')) ? $env.git.modules : {},
                    updateModules = function (mods) {
                        for (var name in mods) {
                            if ((
                                    !$gUtils.env.module || $gUtils.env.module == name
                                ) && mods.hasOwnProperty(name)) {
                                var configFile = getConfigFile(name, $defaults.env.configFile);

                                if ($shell.test('-d', name) && $shell.test('-f', configFile)) {
                                    delete require.cache[require.resolve(configFile)];
                                    $modules[name] = require(configFile);
                                    configFiles.push(configFile);
                                    $modules[name].configurationFile = configFile;
                                    $modules[name] = addFolderToAllVars(name, $modules[name]);
                                }
                                else {
                                    $modules[name] = {};
                                }

                                $modules[name].moduleFolder = name;

                                for (var modOption in mods[name]) {
                                    if (mods[name].hasOwnProperty(modOption)) {
                                        $modules[name][modOption] = mods[name][modOption];
                                    }
                                }
                            }
                        }
                    };

                if (Object.keys(modules).length) {
                    updateModules(modules);
                    if (callback) {
                        callback(modules);
                    }
                }
                else if (!exports.get('no-external-modules') && ($env.modulesUrl || $defaults.env.modulesUrl)) {
                    var url = $defaults.env.modulesUrl;

                    require('request')(
                        url,
                        $defaults.env.modulesUrlSettings,
                        function (error, response, body) {
                            if (!error && response.statusCode === 200) {
                                modules = JSON.parse(body);
                                updateModules(modules);
                                if (callback) {
                                    callback(modules);
                                }
                            }
                            else {
                                $helpers.notify('No modules found at url: ' + url);
                                if (callback) {
                                    callback(modules);
                                }
                            }
                        });
                }
                else {
                    if (callback) {
                        callback(modules);
                    }
                }
            }
        };

    var configFiles = [getConfigFile()],
        $modules = {},
        loadedModules = false;

    var $env = $shell.test('-f', configFiles[0]) ? require(configFiles[0]) : {};

    if($env.hasOwnProperty('defaults'))
        $defaults.merge_in($env.defaults);

    // Get project environment
    exports.project = function () {
        return $env;
    };

    // Get all configurations, including modules
    exports.start = getAllConfigurations;

    // Set an environment var
    exports.set = function (key, value) {
        settings[key] = value;
    };

    // Get an environment var
    exports.get = function (key) {
        return settings.hasOwnProperty(key) ? settings[key] : null;
    };

    // Add a callback to an event
    exports.on = function (event, callback) {
        if(!events.hasOwnProperty(event))
            events[event] = [];

        events[event].push(callback);

        return this;
    };

    // Remove from an event
    exports.off = function (event, callback) {
        var callbacks = getEvents(event);

        if(callbacks.indexOf(callback) !== -1) {
            callbacks.splice(callbacks.indexOf(callback), 1);
        }

        return this;
    };

    // Get callbacks for an event
    exports.trigger = function (event, args) {
        var callbacks = getEvents(event);

        for(var i=0;i<callbacks.length;i++) {
            callbacks[i].apply(this, args);
        }

        return this;
    };

    // Refresh the configuration for env
    exports.refresh = function (callback) {
        var currConfig = $gUtils.env.config ? $gUtils.env.config : $defaults.env.configFile,
            moduleConfigFile;

        delete require.cache[require.resolve(getConfigFile(currConfig))];
        $env = require(getConfigFile(currConfig));

        for (var module in $modules) {
            if ($modules.hasOwnProperty(module) && $modules[module].hasOwnProperty('configurationFile')) {
                moduleConfigFile = $modules[module].configurationFile;

                delete require.cache[require.resolve(moduleConfigFile)];
                $modules[module] = require(moduleConfigFile);
                $modules[module].configurationFile = moduleConfigFile;
            }
        }

        return getAllConfigurations(callback);
    };

    // shell in a parent directory
    $shell.cd($helpers.parent_directory());
    exports.shell = $shell;

    // Get a shell variable from a command
    exports.shell_var = function (command) {
        return $shell.exec(command, {silent: true}).output.trim();
    };

    // Add folder to all specific configuration variables
    exports.add_folder_to_all_vars = addFolderToAllVars;

    // Build modules configuration
    exports.build_modules = buildModules;

    // Execute a function on all configurations (no streaming)
    exports.apply_to_all = function (fn, done, sync) {
        getAllConfigurations(function (env, configs) {
            $helpers.apply_to_array_or_one(configs,
                function(configuration, incrementUpdates, incrementFinished, ifDone, forceDone) {
                    if (!configuration) {
                        configuration = env;
                    }

                    fn(configuration, incrementUpdates, incrementFinished, ifDone, forceDone);
                }, done, sync);
        });
    };

    // Execute a function on all configuration items (no streaming)
    exports.apply_to_config = function (fn, done, sync, key, canFn, canItemFn, defaults) {
        exports.apply_to_all(function(configuration, incrementUpdates, incrementFinished, ifDone) {
            if((key && !configuration.hasOwnProperty(key)) || (canFn && !canFn(key, configuration)))
                return;

            var configToUse = key ? configuration[key] : configuration;

            incrementUpdates();

            $helpers.apply_to_array_or_one(configToUse, function (itemConfig, itemUpdate, itemFinished, itemDone, itemForceDone) {
                    if(defaults) {
                        if(configuration.hasOwnProperty('moduleFolder')) {
                            itemConfig = $helpers.merge_objects(addFolderToAllVars(configuration.moduleFolder, $helpers.merge_objects({}, defaults), true), itemConfig);
                        }
                        else
                            itemConfig = $helpers.merge_objects(defaults, itemConfig);
                    }

                    if(canItemFn && !canItemFn(itemConfig)) {
                        return;
                    }

                    fn(itemConfig, itemUpdate, itemFinished, itemDone, itemForceDone);
                },
                function () {
                    incrementFinished();
                    ifDone();
                }
            );

        }, done, sync);
    };

    // Execute a function and return a merged stream (must be called after env has started)
    exports.apply_to_all_and_stream = function (fn, done) {
        var streams = [],
            configs = getAllConfigurations(),
            addToStream = function (stream) {
                streams.push(stream)
            },
            configFn = function (configuration) {
                if (!configuration) {
                    configuration = $env;
                }

                fn(configuration, addToStream);
            };

        for (var i = 0; i < configs.length; i++) {
            configFn(configs[i]);
        }

        return streams.length ? $mergeStream(streams) : done ? done() : null;
    };

    // Execute a function on all configuration items and return a merged stream (must be called after env has started)
    exports.apply_to_config_and_stream = function (fn, done, key, canFn, canItemFn, defaults) {
        return exports.apply_to_all_and_stream(function(configuration, addToStream) {
            if((key && !configuration.hasOwnProperty(key)) || (canFn && !canFn(key, configuration)))
                return;

            var configToUse = key ? configuration[key] : configuration;

            $helpers.apply_to_array_or_one(configToUse, function (itemConfig, itemUpdate, itemFinished, itemDone) {
                    if(defaults) {
                        if(configuration.hasOwnProperty('moduleFolder')) {
                            itemConfig = $helpers.merge_objects(addFolderToAllVars(configuration.moduleFolder, $helpers.merge_objects({}, defaults), true), itemConfig);
                        }
                        else
                            itemConfig = $helpers.merge_objects(defaults, itemConfig);
                    }

                    if(canItemFn && !canItemFn(itemConfig)) {
                        return;
                    }

                    itemUpdate();

                    fn(itemConfig, addToStream);
                    itemFinished();
                    itemDone();
                }
                , false, true);

        }, done);
    };

    exports.execute_on_modules_then_project = function(options, callback) {
        var done = [],
            isExecutingFinalCallback = false;

        exports.apply_to_all(function (configuration, incrementUpdates, incrementFinished, ifDone) {
            var folder = configuration.hasOwnProperty('moduleFolder') ? configuration.moduleFolder + '/' : '',
                command = options.hasOwnProperty('command') ? options.command(folder) : 'ls';

            incrementUpdates();

            if (folder && (!options.hasOwnProperty('canExecute') || options.canExecute(folder))) {
                if(options.hasOwnProperty('before'))
                    options.before(folder);

                $shell.exec(command, function () {
                    done.push(folder);

                    if(options.hasOwnProperty('after'))
                        options.after(folder, done);

                    incrementFinished();
                    ifDone();
                });
            }
            else {
                incrementFinished();
                ifDone();
            }
        }, function () {
            if(isExecutingFinalCallback) return;

            isExecutingFinalCallback = true;

            if (!options.hasOwnProperty('canExecute') || options.canExecute()) {
                var command = options.hasOwnProperty('command') ? options.command() : 'ls';

                if(options.hasOwnProperty('before'))
                    options.before();

                $shell.exec(command, function () {
                    if(options.hasOwnProperty('after'))
                        options.after('', done);

                    if(callback)
                        callback();
                });
            }
            else if (done.length) {
                if(options.hasOwnProperty('after'))
                    options.after('', done);

                if(callback)
                    callback();
            }
            else if(callback)
                callback();
        }, true);
    };

    // Serve an environment wide browser
    exports.server = $server;

    // Reload server with callback
    exports.reload_server = function (done) {
        $server.reload();
        if (done) {
            done();
        }
    };

    // Delete from parent directory
    exports.delete = $delete;

    // Get settings of environment
    exports.settings = settings;

    // Get loaded configuration files
    exports.configuration_files = configFiles;

    // Add folder to all vars
    exports.add_folder_to_all_vars = addFolderToAllVars;

    return exports;
};