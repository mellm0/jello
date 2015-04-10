'use strict';

var $env = require('./lib/env'),
    $ = require('gulp-load-plugins')();

module.exports = function(gulp) {
    if(!gulp)
        gulp = require('gulp');

    $env.start(function () {
        require('./tasks/utilities')(gulp, $, $env);
        require('./tasks/css')(gulp, $, $env);
        require('./tasks/git')(gulp, $, $env);
    });
};