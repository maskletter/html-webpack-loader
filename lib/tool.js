
const CleanCSS = require('../rely/clean-css');
const UglifyJS = require('../rely/uglify-js');
const loaderUtils = require("loader-utils");
const fs = require('fs');
const tss = require('typescript-simple');
const sass = require('node-sass');
const options =  loaderUtils.getOptions(this) || {};
let cleanCss = new CleanCSS({ level: 2 });
let tscofnig = require('./tscofnig.json');

const single = '_html_loader_static_single';		//单引号转义
const double = '_html_loader_static_double';		//双引号转义

class Replace{

	constructor(){}

	assemble(content, pathurl){
		method.save.script = [];
		content = method.include(content, pathurl);
		content = method._import_transform(content);
		content = content.replace(Regular.script, method._save_script);
		
		this._remove_script(content);

		
		content = content.replace(Regular.qm, single);
		content = content;

		Object.keys(Regular).forEach(reg => method[reg] && (content = content.replace(Regular[reg], method[reg])));

	
		content = this._replace_script(content);

		content = content.replace(Regular.escape_s,'\\"');

		return content.replace(Regular.format, "\\r\\n\\t");
		
	}

	_remove_script(content){
		content = content.replace(Regular.script, method._save_script);
		let script = method.save.script;
		for(let result of script){
			for(let data in result){
				if(result[data].content.replace(/\s/g,'') == '') continue;
				let str = method.script_method.ts_transform(result[data].content).replace(/\'/g,single);
				str = method.script_method.js_uglify(str);
				str = method.script_method.js_require(str);
				result[data].content = str.replace(/\\"/g,'\\\\"').replace(/"/g,'\\"').replace(/({%|%})/g,'"').replace(Regular.escape_s,"\\'");
			}
		}
	}
	_replace_script(content){
		let script = method.save.script;
		for(let result of script){
			for(let data in result){
				content = content.replace("${"+data+"}", `<script${result[data].attr}>${result[data].content}</script>`);
			}
		}
		return content;
	}

}

/**
	serious
	1.qm 2.style 3.background 4.script 5.attrsrc
*/
const Regular = {
	$style: /<style(([\s\S])*?)>(([\s\S])*?)<\/style>/g,
	$background: /.*background[^;"]+url\(([^\)]+)\).*/g,
	script: /<script(([\s\S])*?)>(([\s\S])*?)<\/script>/g,
	$attrsrc: /<([\-a-zA-Z0-9]+)\s.*?(src=[\\'\\"]*(.*?)[\\'\\"])(.*?)>/gi,
	format: /(\r\n)|(\n)/g,
	include_html: /<!--#include\sfile=['"](.*?)['"](.*?)-->/g,
	include_css_js: /\/\*#include\sfile=['"](.*?)['"](.*?)\*\//g,
	url: /^(http:\/\/|https:\/\/|\/\/).*?/gi,
	require: /require\((['"](.*?)['"]|_html_loader_static_single(.*?)_html_loader_static_single)\)/g,
	import: /import\s{0,}(.*?)\s{0,}from\s{0,}['"](.*?)['"](;|[\n\r])/g,
	qm: /\"/g,
	escape_s: new RegExp(single, 'g')
}


const method = {


	options: {
		cssmin: true,
		jsmin: true,
		element: ['img','video','audio','source'],
		ts:{
			enabled: true,
			options: tscofnig
		}
	},
	save: {
		//存储页面script标签内的内容
		script: []
	},
	//格式化页面内style标签元素
	$style: function(aims, index, str, str2) {
		if(str2.replace(/\s/g,'') == '') return aims;
		return `<style${ index }>${ method._scss_transform(str2) }</style>`
	},
	//格式化背景图的图片引用
	$background: function(aims, index){
		if(method.is_http(index)) return aims;
		return aims.replace(index, `" + require('./${index}') + "`);
	},
	//删除页面内的script标签换成${script#name}
	_save_script: function(aims, index, str, str2){
		let name = "script#"+(new Date().getTime()+Math.random());
		let _ = {};
		_[name] = { template: aims, content: 'declare const require: any;\r\n\t'+str2, attr: index.replace(Regular.qm, single) };
		method.save.script.push(_);
		return '${'+name+'}';
	},
	//script标签相关操作
	script_method: {
		//ts--->js转换
		ts_transform: function(str){
			let _ts = method.options.ts;
			if(_ts && (_ts == true || _ts.enabled == true)){
				return tss(str, ((_ts&&_ts.options) ? _ts.options : tscofnig));
			}
			return str;
		},
		//max--->min压缩
		js_uglify: function(str){
			let result = method.options.jsmin == true ? UglifyJS.minify(str) : {code: str};
			if(result.error) return result.error;
			return result.code;
		},
		//script内requrie资源引用
		js_require: function(str){
			str = str.replace(Regular.require, function(aims, index, str1, str2, str3){
				return `{%+require('html-webpack-loader/plugins')(require('./${(str1 || str2)}'))+%}`;
			})
			return str;
		}
	},
	//页面内标签元素引用
	$attrsrc: function(aims, index, str, str2){
		if(method.element(index)){
			if(method.is_http(str2)) return aims;
			return aims.replace(str2, `" + require('./${str2}') + "`);
		}else{
			return aims;
		}
	},
	//判断是否为需要src资源引用的元素
	element: function(status){
		return method.options.element.find(f => f == status) ? true : false;
	},
	//判断是否为http链接
	is_http: function(url){
		return Regular.url.test(url);
	},
	//ts字符串转换
	_ts_transform: function(str){
		let _ts = method.options.ts;
		if(_ts && (_ts == true || _ts.enabled == true)){
			return tss(str, ((_ts&&_ts.options) ? _ts.options : tscofnig));
		}else return str;
	},
	//sass字符串转换
	_scss_transform: function(str){
		return sass.renderSync({
			data: str, outputStyle: method.options.cssmin == true ? 'compressed' : 'expanded'
		}).css.toString();
	},
	//添加外部页面引用
	include: function(str, pathurl){
		let callback = function(aims, index){
			try {
				return fs.readFileSync(`${pathurl}\/${index}`,{encoding:'utf8'});
			} catch(e) {
				return e;
			}
		}
		return str.replace(Regular.include_html, callback).replace(Regular.include_css_js, callback);
	},
	//import引用转换require引用
	_import_transform: function(str){
		return str.replace(Regular.import, function(aims, index, str1){
			if(index[0] != '{'){
				if(index.indexOf('as') != -1){
					return re(index);
				}else{
					return re('* as '+index)
				}
			}else{
				let _tem = '';
				for(let data of index.replace(/({|})/g,'').split(',')) 
					_tem += re(data)+'\r\n\t';
				return _tem;
			}
			function re(data){
				data = data.split('as').map(f => f.replace(/ /g, ''));
				if(data.length == 2) return `const ${data[1]} = require("${str1}")${data[0]=='*'?'':'.'+data[0]};`;
				else return `const ${data[0]} = require("${str1}")${data[0]=='*'?'':'.'+data[0]};`;
			}
		})
			
	}
}

module.exports = {
	Regular: Regular,
	method: method,
	Replace: new Replace()
}

