!function(win, doc){

	var wrapper = document.createElement("iframe");
	wrapper.className = '{{wrapper.className}}';
	var id;
	wrapper.width = '{{wrapper.width}}';
	wrapper.height = '{{wrapper.height}}';
	wrapper.frameBorder = 0;
	wrapper.allowTransparency = true;
	wrapper.id = id = 'textDance' + ~~(1e7*Math.random());

	function writeContent(){

		var content = '{{content}}';

		/* hopefully we dont colide here */
		win.frames[id].document.write(content);
	}

	(function check(){
		var selector = '{{selector}}' || 'body';
		var elem = doc.querySelector(selector);
		if(elem){
			elem.appendChild(wrapper);
			writeContent();

		}else if(!/loaded|complete/.test(doc.readyState)){
			setTimeout(check, 20);
		}

	}());



}(window, window.document);
