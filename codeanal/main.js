define(function(require, exports, module) {

require("ace/lib/fixoldbrowsers");
require("ace/config").init();

var Editor = require("ace/editor").Editor;
var Renderer = require("ace/virtual_renderer").VirtualRenderer;

var editor = new Editor(new Renderer(document.getElementById("editor"), require("ace/theme/textmate")));
editor.resize();
editor.setTheme("ace/theme/twilight");
editor.session.setMode("ace/mode/mustache");

});