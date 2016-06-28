module.exports = function (gulp, $, $env) {
    var $helpers = require("../lib/helpers")(gulp, $, $env);

    gulp.task('clean:all', ['copy:clean', 'css:clean', 'html:clean', 'images:clean', 'js:clean', 'sprites:clean']);

    gulp.task('clean:installed', ['start'], function(done) {
        $env.execute_on_modules_then_project({
            command   : function(folder) {
                if(!folder || folder === undefined) {
                    if($.util.env.modulesOnly) {
                        return 'echo ""';
                    }

                    folder = '.';
                }
                else {
                    folder = $helpers.rtrim(folder, '/');
                }

                return [
                    "if [ -d '" + folder + "/node_modules' ]; then rm -rf " + folder + "/node_modules; fi",
                    "if [ -d '" + folder + "/bower_components' ]; then rm -rf " + folder + "/bower_components; fi"
                ].join(' && ');
            },
            before    : function() {
                $.util.log('Cleaning all packages');
            },
            after     : function( folder, cleaned ) {
                if (!folder) {
                    cleaned.push('project directory');
                    $helpers.notify('Cleaned packages for: ' + cleaned.join(', '));
                }
            }
        }, done);
    });
};
