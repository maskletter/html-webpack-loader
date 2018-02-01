
const loaderUtils = require("loader-utils");
const tool = require('./lib/tool');

const replaceHtml = tool.Replace;



const _html_Style_loader = function(content){


	

	(function(options){
		for(let i in options){
			tool.method.options[i] = options[i];
		}

	}(loaderUtils.getOptions(this) || {}))


	content = replaceHtml.assemble(content, this.context);
	


	return 'module.exports = "'+content+'"';
}

module.exports = _html_Style_loader;




