"use strict";

var path = require('path');
var Builder = require( 'node-spritesheet' ).Builder;
var config = require('../config');

var SPRITE_IMAGE = config.sprite.files.image;
var SPRITE_CSS = config.sprite.files.css;
var SPRITE_SELECTOR = config.sprite.selector;

// Simple wrap for "node-spritesheet"
module.exports = function(outputPath, imagePaths, cb){

	var options = {
		outputDirectory: outputPath,
		outputCss: SPRITE_CSS,
		outputImage: SPRITE_IMAGE,
		selector: SPRITE_SELECTOR,
		images: imagePaths,
		log: true
	};
	// Build the sprite and the sprite.css
	// TODO: Support retina resolution?
	new Builder(options).build(function(err) {
		cb(err, options);
	});
};



