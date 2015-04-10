var defaults = {
        configFile: 'assets.json',
        modulesUrl: 'http://packages.dev/modules.json'
    };

var $path = require("path"),
    $helpers = require("./helpers"),
    $mergeStream = require("merge-stream"),
    $gUtils = require("gulp-util");

var getConfigFile = function(configFile) {
        if(!configFile)
            configFile = defaults.configFile;

        return $path.join(__dirname, '..', '..', configFile);
    },
    getAllConfigurations = function () {
        var configs = [$env];

        if(!loadedModules) {
            buildModules(function () {
                for (var module in $modules) {
                    if ($modules.hasOwnProperty(module)) {
                        configs.push($modules[module]);
                    }
                }
            });
        }
        else {
            for (var module in $modules) {
                if ($modules.hasOwnProperty(module)) {
                    configs.push($modules[module]);
                }
            }
        }

        return configs;
    },
    addFolderToAllVars = function (folder, configuration) {
        var variables = ['css', 'js', 'images', 'html', 'copy'],
            globs = ['all', 'src', 'dest', 'lint'];

        variables.forEach(function (variable) {
            if (configuration.hasOwnProperty(variable)) {
                globs.forEach(function (glob) {
                    if (configuration[variable].hasOwnProperty(glob))
                        configuration[variable][glob] = $helpers.append_folder_to_glob(folder, configuration[variable][glob]);
                });
            }
        });

        return configuration;
    },
    buildModules = function (callback) {
        if ($gUtils.env.ignoreModules) {
            if (callback) callback();
        }
        else {
            var shell = require('shelljs'),
                modules = ($env.hasOwnProperty('git') && $env.git.hasOwnProperty('modules')) ? $env.git.modules : {},
                updateModules = function (mods) {
                    for (var name in mods) {
                        if ((
                            !$gUtils.env.module || $gUtils.env.module == name
                            ) && mods.hasOwnProperty(name)) {
                            var configFile = getConfigFile(name + '/' + defaults.configFile);

                            if (shell.test('-d', name) && shell.test('-f', configFile)) {
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
                if(callback) callback();
            }
            else if (defaults.modulesUrl) {
                require('request')(defaults.modulesUrl, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        modules = JSON.parse(body);
                        updateModules(modules);
                        if(callback) callback();
                    }
                    else {
                        $helpers.notify('No modules found at url: ' + defaults.modulesUrl);
                        if(callback) callback();
                    }
                });
            }
            else {
                if(callback) callback();
            }
        }
    };

var configFiles = [getConfigFile()],
    $env = configFiles[0],
    $modules = {},
    loadedModules = false;

// Get project environment
module.exports.project = function () {
    return $env;
};

// Get all configurations, including modules
module.exports.all = getAllConfigurations;

// Refresh the configuration for env
module.exports.refresh = function () {
    var currConfig = $gUtils.env.config ? $gUtils.env.config : configFile,
        moduleConfigFile;

    delete require.cache[require.resolve(getConfigFile(currConfig))];
    $env = require(getConfigFile(currConfig));

    for (var module in $modules) {
        if ($modules.hasOwnProperty(module) && $modules[module].hasOwnProperty(['configurationFile'])) {
            moduleConfigFile = $modules[module].configurationFile;

            delete require.cache[require.resolve(getConfigFile(moduleConfigFile))];
            $modules[module] = require(getConfigFile(moduleConfigFile));
            $modules[module].configurationFile = moduleConfigFile;
        }
    }
};

// Add folder to all specific configuration variables
module.exports.add_folder_to_all_vars = addFolderToAllVars;

// Build modules configuration
module.exports.build_modules = buildModules;

// Execute a function on all configurations (no streaming)
module.exports.apply_to_all = function (fn, done) {
    var updates = 0, finished = 0, configs = getAllConfigurations();

    var incrementUpdates = function () {
            updates++;
        },
        incrementFinished = function () {
            finished++;
        },
        ifDone = function () {
            if (done && updates === finished)
                done();
        },
        configFn = function (configuration) {
            if (!configuration)
                configuration = $env;

            fn(configuration, incrementUpdates, incrementFinished, ifDone);
        };

    for (var i = 0; i < configs.length; i++) {
        configFn(configs[i]);
    }

    if (done && updates === 0)
        done();
};

// Execute a function and return a merged stream
module.exports.apply_to_all_and_stream = function (fn, done) {
    var configs = getAllConfigurations(), streams = [];

    var addToStream = function (stream) {
            streams.push(stream)
        },
        configFn = function (configuration) {
            if (!configuration)
                configuration = $env;

            fn(configuration, addToStream);
        };

    for (var i = 0; i < configs.length; i++) {
        configFn(configs[i]);
    }

    return streams.length ? $mergeStream(streams) : done ? done() : null;
};