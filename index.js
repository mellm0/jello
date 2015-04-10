'use strict';

var $env = require('./lib/env'),
    $ = require('gulp-load-plugins')();

module.exports = function(gulp) {
    if(!gulp)
        gulp = require('gulp');

    $env.start(function (env, configs) {
        require('./tasks/git')(gulp, $, $env, env, configs);
    });
};