"use strict";

var fs = require("graceful-fs");
var path = require("path");
var exec = require("child_process").exec;
var colors = require("colors");
var fmt = require("util").format;

// Read dir return images within as array of absolute pathes
var imagesInDir = exports.imagesInDir = function(dir, fn){
	fs.readdir(dir, function(err, files){

		if(!err){
			//filter = /\.(?:png|jpe?g)$/; // we only check for png for now
			var filter = /\.png$/; // we only check for png for now

			files = files.filter(function(filename){
				return filter.test(filename);
			}).map(function(filename){
				return path.resolve(dir, filename);
			});
		}

		fn(err, files);

	});
};

// Read dir return images within as array of absolute pathes
var resolve = exports.resolve = function(fileNames, dir){

	return fileNames.map(function( fileName ){
		return path.resolve( dir, fileName );
	});

};


// Create a temporary directory in /tmp
// returns an object with
// 	'path' – Path to the newly created directory
// 	'cleanup' – function to cleanup (remove) the directory again
var tmpDir = exports.tmpDir = function(fn){

	var dir = "/tmp/text-dance-" + (+new Date) + ~~(Math.random()*1e5);

	exec("mkdir -p "+dir, function(err){
		fn(err, {
			path: dir,
			cleanup: function(fn){
				fn = fn || function(){};
				exec("rm -rf "+dir, fn);
			}
		});
	});
};


// Convert desired FPS to a number that works with #requestAnimFrame (1/60)
// Sorry for that :P
var fitFPS = exports.fitFPS = function(fps){

	var f;
	fps = !isNaN(+fps) ? +fps : 1;
	while(f = 60/fps, f !== ~~f){
		fps -= 1;
	}

	return fps;
};

var imagePathToData = exports.imagePathToData = function(path, format){

	format = format || (format  = path.split('.'), format[format.length-1]);

	return fmt('data:image/%s;base64,%s',format, fs.readFileSync(path).toString('base64'));
};


var loadFile = exports.loadFile = function(path, format){
	var file = fs.readFileSync(path);

	return format ? file.toString(format) : file;
};

// simple mapper of strings to obj
// e.g.:
// obj = {
// 	level1: {
//	  level2: {
//     level3: 5
//	  }
// 	}
// }
//
// str = 'level1.level2.level3'
//
// => mapStringToObjValue(obj, str) === 5
var mapStringToObj = exports.mapStringToObj = function(obj, str){
	return str.split('.').reduce(function(prev, cur){ return prev && prev[cur]; },obj);
};

// replace anything inside double curly brackets with the value specified by the selector in the brackets
var pseudoTemplate = exports.pseudoTemplate = function(target, obj){
	return target.replace(/\{\{([^\}]+)\}\}/g, function(withBrackets, selector){
		return mapStringToObj(obj, selector);
	});
};


var escape = exports.escape = function(str){
	return str.replace(/(?:'|"|<|>|\/)/g, function(c){return '\\'+c;});
};

var singleLine = exports.singleLine = function(str){
	return str.replace(/\n/g, ' ').replace(/\s+/g, ' ');
};

