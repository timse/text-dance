"use strict";

var fs = require('graceful-fs');
var path = require('path');
var fmt = require('util').format;
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

var async = require('async');
var colors = require('colors');

var utils = require('./utils');
var FrameDifference = require('./FrameDifference');
var config = require('./config');

var CanvasHelper = require('./helper/CanvasHelper');
var ffmpeg = require('./helper/ffmpeg');
var spriter = require('./helper/sprite');
var imagemagick = require('./helper/imagemagick');


module.exports = TextDance;
inherits(TextDance, EventEmitter);

function TextDance(options){

	EventEmitter.call(this);

	// enable logging if desired
	if(options.debug){
		this.debug = true;
	}


	// No Video or Frames ? – No Text Dance
	this.video = options.video;
	this.frames = options.frames;
	if(!this.video && !this.frames){
		var paramsMissing =  'No video or frames specified!';
		this.log(paramsMissing.red);
		throw new Error(paramsMissing);
	}


	// for more detailed information on the config check 'config.js'

	// Make FPS working for a  1/60 sec animationFrame
	this.fps = utils.fitFPS(options.fps || config.options.fps);

	// Export Format PNG or JP[E]G
	this.format =  /(?:png|jpe?g)/.test(options.format) ? options.format : config.options.format;

	// Classname for the wrapper iframe
	this.className = options.className || config.options.className;

	// Set tolerance levels
	this.tolerance = options.tolerance || {};

	var t;
	for(t in config.options.tolerance){
		if(isNaN(this.tolerance[t])){
			this.tolerance[t] = config.options.tolerance[t];
		}
	}

	// define anchor element to which to append the wrapper iframe to
	// falls back to document.body
	this.anchor = options.anchor || config.options.anchor;

	// quality of the exported images (currently works for jpg only)
	this.quality = options.quality || config.options.quality;

	this.rendered = {};

}

TextDance.prototype.log = function(args){
	this.debug && console.log(args);
};

/* Creates a temporary Folder at "/tmp" to store all temporary data (u dont say?)
 */
TextDance.prototype.createTmpDir = function(err, tmpDir){

	utils.tmpDir(function(err, tmpDir){

		if(err){
			this.log(fmt('Failed to create a temporary directory. %s', err).red);
			return this.cb(err);
		}

		this.tmpDir = tmpDir;

		this.log(fmt('Create temporary directory at %s \n', tmpDir.path).green);
		this.emit('tmpDir', tmpDir);
	}.bind(this));
};

/* Extract frames from Video and returns a list with absolute path to the extracted frames (stored as PNG images)
 * This will be ignored if frames were already passed in as an option to the constructor
 * */
TextDance.prototype.videoFrames = function(){

	// If frames where passed in to the contructor, we take those and ignore the video
	if(this.frames){
		return process.nextTick(function(){
			this.emit('frames', this.frames);
		}.bind(this));
	}

	// use ffmpeg-Helper to extract frames from the video
	ffmpeg.videoToFrames( this.video, this.fps, this.tmpDir.path, function(err){

		if(err){
			this.log(fmt('Failed to extract frames from video "%s". %s', this.video, err).red);
			return this.cb(err);
		}

		// Get a list of all the images that were created
		// store them as 'this.frames'
		utils.imagesInDir(this.tmpDir.path, function(err, imageList){
			if(err){
				return this.cb(err);
			}

			this.frames = imageList;

			this.log(fmt('Extracted "%s" frames from the video "%s" \n', this.frames.length, this.video).green);
			this.emit('frames', this.frames);

		}.bind(this));

	}.bind(this));
};

/* Import all frames as canvases inside a CanvasHelper
 * the CanvasHelper offers a couple of helper functions to interact with the underlying canvas (see lib/helper/CanvasHelper)
 * */
TextDance.prototype.importAsCanvases = function(){

	function pathToData(path, done){
		var canvasHelper = new CanvasHelper();
		canvasHelper.fromImagePath(path, function(err){
			done(err, canvasHelper);
		});
	}

	// take all the frames-paths and load them as a canvas
	// finaly store them as 'this.frameCanvases'
	async.mapSeries(this.frames, pathToData, function(err, canvases){
		if(err){
			this.log(fmt('Failed to import frames to Canvases. %s', err).red);
			return this.cb(err);
		}

		this.frameCanvases = canvases;
		this.log('Imported frames to Canvases. \n'.green);
		this.emit('importedCanvas', canvases);

	}.bind(this));
};

TextDance.prototype.calculateDifferences = function(){

	// 'reduce' all clusters within the frames to a single flat array of diffences
	// each 'difference' is a object containing:
	//  - canvas :  a canvas containing a rectangle of imageData that is different between the two frames that were checked
	//  - boundary: an object containing the boundary of the difference rectangle
	//  - frame: # of the frame
	//  - cluster: # of the cluster within the frame
	this.differences = this.frameCanvases.reduce(function(diffs, _, i){
		if(i === 0){
			return diffs;
		}

		// frame before 'used as background'
		var prev = this.frameCanvases[i-1];
		// current frame – used to extract differences
		var curr = this.frameCanvases[i];

		// create a new instance of FrameDifference to calculate boundaries of the differences
		var frameDifference = new FrameDifference( prev, curr, this.tolerance);

		// get the boundaries of the clusters within the new frame ('curr') compared to the old frame ('prev')
		// boundary object contains:
		// 	 - data: array of indizes of pixel within the cluster that were different between 'prev' and 'curr'
		// 	 - left: the left bound of the cluster
		// 	 - top: the top bound of the cluster
		// 	 - width: the width of the cluster
		// 	 - height: the height of the cluster
		var boundaries = frameDifference.getBoundaries();
		var _diffs = boundaries.filter(function(b){
			// filter out all clusters that are too small (contain too few different points)
			return b.data.length > this.tolerance.points;
		}.bind(this)).map(function(b, j){
			// if a cluster is passes the filter create a canvas from it
			// also store the frame number 'i', the number of the cluster within this frame 'j' and its boundary 'b'
			return {
				canvas: new CanvasHelper()
					.fill( curr.toImageData( b.left, b.top, b.width, b.height ) ),
				cluster: j,
				frame: i,
				boundary: b
			};
		});

		// add all differences to a flat array
		diffs.push.apply(diffs, _diffs);
		return diffs;


	}.bind(this), []);

	// make this async (for no good reason)
	process.nextTick(function(){
		this.log(fmt('Calculated %s difference clusters for %s frames \n', this.differences.length, this.frames.length ).green);
		this.emit('differenceCanvases', this.differences);
	}.bind(this));

};

TextDance.prototype.createSprites = function(){

	function spriteImage(diff, done){

		var id = [diff.frame, diff.cluster].join('-');
		var fmts = config.fmt.sprite;

		// name of the file for this sprite (also used by node-spritesheet to define the selector for this sprite
		var name = fmt(fmts.file, id);
		// regex to later find this sprite again, based on the fact that node-spritsheet used the filename as a selector
		var regex = new RegExp( fmt(fmts.regex, id) );
		// absolute path to this sprite-file
		var spritePath = path.resolve(this.tmpDir.path, name);
		// css selector for this sprite – needed to redefine the sprite.css produced by node-spritesheet
		var selector = fmt(fmts.selector, id, diff.frame);
		// css and selector to be injected into the style.css of node-spritesheet to define the position of this sprite and additional classes
		var css = fmt(fmts.css, selector, diff.boundary.left, diff.boundary.top);
		// simple div that contains this sprite and later shows it during 'text dance'
		var html = fmt(fmts.html, id, diff.frame);

		// export each difference to a file – required for node-spritesheet
		diff.canvas.exportImage(spritePath, function(err){
			done(err, {
				name: name,
				path: spritePath,
				selector: selector,
				html: html,
				css: css,
				regex: regex
			});
		});
	}

	// create sprites from the differences and store them as 'this.sprites'
	async.map(this.differences, spriteImage.bind(this), function(err, sprites){
		if(err){
			this.log(fmt('Failed to create sprites. %s', err).red);
			return this.cb(err);
		}
		this.sprites = sprites;
		this.log(fmt('Created %s sprites from the differences. \n', sprites.length).green);
		this.emit('sprites', sprites);
	}.bind(this));

};

// use the sprites to create one spritesheet with node-spritesheet
TextDance.prototype.createSpritesheet = function(){
	this.log('Creating spritesheet from sprites. This might take a while...'.white);
	// extract the pathes to the exported differences (sprites)
	var spritePaths = this.sprites.map(function(sprite){ return sprite.path; });

	// export them to a single file
	// store 'this.spritesheet' containing:
	//  - imagePath - the path to the spritesheet image containing all the differences
	//  - cssPath - the path to the stylesheet containing all the background-positions for the sprites
	spriter(this.tmpDir.path, spritePaths, function(err, res){
		if(err){
			this.log(fmt('Failed to create the spritesheet. %s', err).red);
			return this.cb(err);
		}

		this.spritesheet = {
			imagePath: path.resolve(res.outputDirectory, res.outputImage),
			cssPath: path.resolve(res.outputDirectory, res.outputCss)
		};

		this.log(fmt('Created spritesheet image at %s and css file at %s. \n', this.spritesheet.imagePath, this.spritesheet.cssPath).green);
		this.emit('spritesheet', this.spritesheet);

	}.bind(this));
};

// export the first canvas as the background
TextDance.prototype.createBackground = function(){
	
	var backgroundPath = path.resolve( this.tmpDir.path, config.sprite.files.background);

	this.frameCanvases[0].exportImage( backgroundPath, function(err){
		if(err){
			this.log(fmt('Failed to export background. %s', err).red);
			return this.cb(err);
		}

		this.backgroundPath = backgroundPath;

		this.log(fmt('Exported first frame as background to %s and css file at %s. \n', backgroundPath).green);
		this.emit('background', backgroundPath);
	}.bind(this));
};

// if 'this.format' is jpeg convert the background and the spritesheet accordingly
TextDance.prototype.convertToJPG = function(){
	var newImagePath = this.spritesheet.imagePath.replace( /png$/, 'jpg' );
	var newBackgroundPath = this.backgroundPath.replace( /png$/, 'jpg' );
	imagemagick.convert( this.spritesheet.imagePath , this.quality, newImagePath, function(err){
		if(err){
			return this.cb(err);
		}
		this.spritesheet.imagePath = newImagePath;

		imagemagick.convert( this.backgroundPath , this.quality, newBackgroundPath, function(err){
			if(err){
				this.log(fmt('Failed to convert files to JPG. %s', err).red);
				return this.cb(err);
			}
			this.backgroundPath = newBackgroundPath;

			this.log('Converted spritesheet and background to JPG \n'.green);
			this.emit('converted', [newImagePath, newBackgroundPath]);
		}.bind(this));
	}.bind(this));
};

// put it all together
TextDance.prototype.compileOutput = function(){

	// if we need jpgs do so first, otherwise just compile
	if( /jpe?g/.test(this.format) ){
		this.convertToJPG();
		this.on('converted', compile.bind(this));
	}else{
		compile.call(this);
	}

	function compile(){

		this.log('Start compiling...\n'.white);
		// compile the css by injecting additional classes and position information
		compileCss.call(this);
		this.log('Compiled css'.green);

		// render the javascript needed for the animation loop
		compileAnimationJs.call(this);
		this.log('Compiled js'.green);

		// render the content of the iframe (icluding animationJs and css)
		compileContent.call(this);
		this.log('Compiled content'.green);

		this.log('\n Merge everything into the wrapper'.white);
		// render the wrapper js that creates the content iframe and fills the content into it
		compileWrapper.call(this);
		this.log('... we have a text dance\n'.green);

		this.log(fmt('Clean up temporary directory %s\n', this.tmpDir.path).white);
		this.tmpDir.cleanup();

		this.log(fmt('Successfully created Text Dance from %s\n - at %s FPS \n - in format %s \n - with a quality of %s% \n - with %s frames \n - and %s different sprites',
			this.video,
			this.fps,
			this.format,
			this.quality,
			this.frames.length,
			this.sprites.length).green);
		this.cb(null, this.rendered.wrapper);

	}

	function compileCss(){

		var spriteCss = utils.loadFile( this.spritesheet.cssPath, 'utf-8');
		var spriteImage = utils.imagePathToData( this.spritesheet.imagePath, this.format);

		this.sprites.forEach(function(sprite){
			spriteCss = spriteCss.replace(sprite.regex, sprite.css);
		});
		spriteCss = spriteCss.replace(config.sprite.files.image, spriteImage );

		var frameSelectors = this.differences.map(function(diff){
			return fmt(config.fmt.frame.selector, diff.frame, diff.frame);
		}).join(',');
		var frameCss = fmt(config.fmt.frame.css, frameSelectors);

		var templateCss = utils.loadFile( config.template.css, 'utf8' );
		return this.rendered.css = utils.pseudoTemplate(templateCss, {
			frameCss: frameCss,
			spriteCss: spriteCss
		});
	}

	function compileAnimationJs(){
		var rAFPolyfill = utils.loadFile(config.template.rAF, 'utf8');
		var animationJs = utils.loadFile(config.template.animate, 'utf8');

		var vals = {
			polyfill: {
				rAF: rAFPolyfill
			},
			animate: {
				loop: this.frames.length,
				freq: 60/this.fps
			}
		};

		return this.rendered.animationJs = utils.pseudoTemplate(animationJs, vals);

	}

	function compileContent(js){

		var content = utils.loadFile(config.template.content, 'utf-8');
		var background = utils.imagePathToData( this.backgroundPath, this.format);

		var spriteHtml = this.sprites.map(function(sprite){
			return sprite.html;
		}).join('');

		var vals = {
			background: background,
			spriteHtml: spriteHtml,
			js: this.rendered.animationJs,
			css: this.rendered.css
		};

		content = utils.pseudoTemplate( content, vals );
		content = utils.singleLine(content);
		content = utils.escape(content);

		return this.rendered.content = content;

	}

	function compileWrapper(){

		var wrapper = utils.loadFile(config.template.wrapper, 'utf-8');

		var vals = {
			selector: this.anchor,
			wrapper: {
				className: this.className,
				width: this.frameCanvases[0].canvas.width,
				height: this.frameCanvases[0].canvas.height
			},
			content: this.rendered.content
		};

		wrapper = utils.pseudoTemplate( wrapper, vals );
		wrapper = utils.singleLine(wrapper);
		return this.rendered.wrapper = wrapper;
	}
};

TextDance.prototype.build = function(cb){

	this.cb = cb;

	this.createTmpDir();

	this.on('tmpDir', this.videoFrames.bind(this));

	this.on('frames', this.importAsCanvases.bind(this));

	this.on('importedCanvas', this.calculateDifferences.bind(this));

	this.on('differenceCanvases', this.createSprites.bind(this));

	this.on('sprites', this.createSpritesheet.bind(this));

	this.on('spritesheet', this.createBackground.bind(this));

	this.on('background', this.compileOutput.bind(this));

};

