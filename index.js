'use strict';

var $env = require('./lib/env');

module.exports.$env = $env.all();

console.log($env.all());