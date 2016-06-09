module.exports = function (gulp, $, $env) {
    var $helpers = require('../lib/helpers')(gulp, $, $env),

        /* These are the default settings for every assets.json file */
        defaults = {
            env: {
                configFile: 'assets.json',
                modulesPath: '{$HOME}/WEB/milkyway-multimedia/packages.mwm.id.au/web/modules.json',
                modulesUrl: 'http://packages.dev/modules.json',
                modulesUrlSettings: {
                    auth: {
                        user: 'is_a',
                        pass: 'secret'
                    }
                }
            },

            git: {
                options: {
                    origin: 'origin',
                    branch: 'master'
                }
            },

            remote: {
                options: {
                    include: ['.htaccess'],
                    exclude: ['.DS_Store', '_notes', '.git', '.idea', '/_assets', '/assets', 'assets.json', 'bower.json', 'gulpfile.js', 'package.json', 'README.md', '/.*', 'bower_components', 'node_modules', '/cache', '*.bak', 'atlassian-ide-plugin.xml'],
                    compress: true,
                    verbose: true,
                    recursive: true,
                    relative: true,
                    update: true,
                    delete: true,
                    progress: true,
                    partial: true
                },
                backupOptions: {
                    include: ['/.htaccess'],
                    exclude: ['.backup.*']
                },
                validArguments: ['checksum', 'ignore-times', 'size-only', 'archive', 'recursive', 'backup', 'backup-dir', 'suffix', 'update', 'links', 'copy-unsafe-links', 'copy-links', 'safe-links', 'hard-links', 'perms', 'whole-file', 'owner', 'group', 'times', 'dry-run', 'sparse', 'one-file-system', 'existing', 'max-delete', 'delete', 'delete-excluded', 'filter', 'delete-after', 'ignore-errors', 'force', 'block-size', 'rsh', 'rsync-path', 'exclude', 'exclude-from', 'include', 'include-from', 'cvs-exclude', 'csum-length', 'temp-dir', 'compare-dest', 'compress', 'numeric-ids', 'timeout', 'daemon', 'no-detach', 'address', 'config', 'port', 'blocking-io', 'log-format', 'stats', 'partial', 'progress', 'password-file', 'bw-limit', 'read-batch', 'write-batch', 'itemize-changes']
            },

            css: {
                src: [
                    '_assets/css/**/*',
                    '!_assets/css/_*',
                    '!_assets/css/_*/**/*'
                ],
                dest: 'public/css',
                autoprefix: {
                    browsers: [
                        'last 10 versions', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'
                    ]
                },
                less: {
                    compress: false,
                    cleancss: false,
                    lint: true
                },
                sass: {},
                minify: {
                    keepSpecialComments: 0,
                    processImport: false
                }
            },

            images: {
                src: [
                    '_assets/images/**/*',
                    '!_assets/images/_*',
                    '!_assets/images/_*/**/*'
                ],
                dest: 'public/images'
            },

            js: {
                src: [
                    '_assets/js/**/*',
                    '!_assets/js/_*',
                    '!_assets/js/_*/**/*'
                ],
                dest: 'public/js'
            },

            server: {
                options: {
                    server: {
                        baseDir: 'public'
                    },
                    reloadDelay: 500
                }
            },

            php: {
                host: '127.0.0.1:8010'
            },

            sprites: {
                src: [
                    '_assets/sprites/**/*',
                    '!_assets/sprites/_*',
                    '!_assets/sprites/_*/**/*'
                ],
                dest: 'public/sprites',
                config: {}
            },

            jekyll: {
                config_file: '_config.yml',
                env_production: 'production',
                env_development: ''
            }
        },
        hasAttachedEvent = false;

    /**
     * This will merge in defaults when gulp has been started
     */
    if ($env && $env.hasOwnProperty('on') && !hasAttachedEvent) {
        hasAttachedEvent = true;

        $env.on('start', function (env) {
            if (env && env.hasOwnProperty('defaults')) {
                defaults.merge_in(env.defaults);
            }
        });
    }

    /**
     * merge in new defaults if they exist
     * @param newDefaults
     */
    defaults.merge_in = function (newDefaults) {
        if (newDefaults.hasOwnProperty('merge_in'))
            delete newDefaults.merge_in;

        defaults = $helpers.merge_objects(defaults, newDefaults);

        for (var prop in newDefaults) {
            if (!defaults.hasOwnProperty(prop) || !newDefaults.hasOwnProperty(prop)) {
                continue;
            }

            defaults[prop] = $helpers.merge_objects(defaults[prop], newDefaults[prop]);
        }
    };

    return defaults;
};