if (typeof process !== "undefined") {
    require("amd-loader");
}

define(function(require, exports, module) {
"use strict";


var Tokenizer = require("../../tokenizer").Tokenizer;
var Document = require("../../document").Document;
var MustacheRules = require("../mustache_rules").MustacheRules;
var MustacheTokenTree = require("./mustache_token_tree").MustacheTokenTree;
var assert = require("../../test/assertions");

function loadChange(mustacheTokenTree, text) {
    var lines = text.split("\n");
    mustacheTokenTree.change({
        start : {
            row : 0, column : 0
        },
        end : {
            row : lines.length - 1, column : lines[lines.length - 1]    .length
        }
    });
}

module.exports = {
    setUp : function() {
        this.doc = new Document("");
        this.tokenizer = new Tokenizer(MustacheRules.getRules());
        this.mustacheTokenTree = new MustacheTokenTree(this.doc, this.tokenizer);
    },

    "test: traverse": function() {
        var text = "{{#aaa}} {{a}} {{/bbb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var result = this.mustacheTokenTree.reverseTraverse(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf("{{a}}") + 1},
            function(astNode) {
                return astNode.getNode().getType() === "mu.block";
            }
        );

        assert.equal(result.getNode().getTokenValue(true), "{{#aaa}}");

        result = this.mustacheTokenTree.reverseTraverse(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf(" {{/bbb}}") + 1},
            function(astNode) {
                return astNode.getNode().getType() === "mu.block";
            }
        );

        assert.equal(result.getNode().getTokenValue(true), "{{#aaa}}");
    },

    "test: initialParse 1" : function() {
        var text = "{{#aaa}}{{a}}{{/bbb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var list = this.mustacheTokenTree.getAstList();
        assert.equal(list.size(), 1);
        var row1 = list.get(0);
        var aaa = row1.get(0).getChildren();
        assert.equal(aaa.length , 2);
        assert.equal(aaa[1].getNode().getTokenValue(), "bbb");
    },

    "test: initialParse 2" : function() {
        var text = "{{#aaa}}{{a}}{{/aaa}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);
        var list = this.mustacheTokenTree.getAstList();
        var row1 = list.get(0);
        var children = row1.get(0).getChildren();
        assert.equal(children.length, 1);
        assert.equal(children[0].getNode().getTokenValue(), "a");
    },

    "test: initialParse 3" : function() {
        var text = "{{#aaa}}{{a}}{{/aaa}}{{AAA}}{{#BBB}}{{/BBB}}{{/aaa}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);
        var root = this.mustacheTokenTree.getDocumentElement();
        var children = root.getChildren();
        assert.equal(children.length, 4);

        var aaa = children[3].getNode();
        assert.equal(aaa.isEndBlock(), true);
        assert.equal(aaa.getTokenValue(), "aaa");
    },

    "test: initialParse 4" : function() {
        var text = "{{#aaa}} {{a}}  \n{{/aaa}} \n {{AAA}}{{#BBB}} \n\n {{/BBB}}   \n{{/aaa}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);
        var root = this.mustacheTokenTree.getDocumentElement();
        var children = root.getChildren();
        assert.equal(children.length, 7);

        var aaa = children[6].getNode();
        assert.equal(aaa.isEndBlock(), true);
        assert.equal(aaa.getTokenValue(), "aaa");
    },

    "test: initialParse 5" : function() {
        var text = "{{#aaa}}\n{{/aaa}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);
        var root = this.mustacheTokenTree.getDocumentElement();

    },

    "test: partialParse 1" : function() {
        var text = "{{#aaa}}{{a}}{{/aaa}}{{AAA}}{{#BBB}}{{/BBB}}{{/ccc}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);
        var text2 = "{{#aaa}}{{a}}{{/aaa}}{{AAA}}{{#BBB}}{{/BBB}}{{#ccc}}{{/ccc}}"
        this.doc.setValue(text2);
        var columnIndex = text2.indexOf("{{#ccc}}");
        var columnIndex2 = columnIndex + "{{#ccc}}".length;

        this.mustacheTokenTree.partialParse({row : 0, column : columnIndex + 1}, {row : 0, column : columnIndex2});

        var root = this.mustacheTokenTree.getDocumentElement();
        var children = root.getChildren();
        assert.equal(children.length, 4);

        var aaa = children[3].getNode();
        assert.equal(aaa.isBlock(), true);
        assert.equal(aaa.getTokenValue(), "ccc");
    },

    "test: partialParse 2" : function() {
        var text = "{{#aaa}}\n{{a}}\n{{/aaa}}\n{{AAA}}\n{{#BBB}}\n{{/BBB}}\n{{/ccc}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);
        var text2 = "{{#aaa}}\n{{a}}\n{{/aaa}}\n{{AAA}}\n{{#BBB}}\n{{/BBB}}\n{{#ccc}}\n{{/ccc}}"
        this.doc.setValue(text2);
        var lines = text2.split("\n");

        this.mustacheTokenTree.partialParse({row : 6, column : 0}, {row : 6, column : lines[6].length});

        var root = this.mustacheTokenTree.getDocumentElement();
        var children = root.getChildren();
        assert.equal(children.length, 4);

        var aaa = children[3].getNode();
        assert.equal(aaa.isBlock(), true);
        assert.equal(aaa.getTokenValue(), "ccc");
    },

    "test: partialParse 3" : function() {
        var text = "{{#aaa}}\n{{bbb}}\n{{#ccc}}\n{{/ccc}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);
        var text2 = "{{#aaa}}\n{{bbb}}\n{{/aaa}}\n{{#ccc}}\n{{/ccc}}"
        this.doc.setValue(text2);
        var lines = text2.split("\n");

        this.mustacheTokenTree.partialParse({row : 2, column : 0}, {row : 6, column : lines[2].length});

        var root = this.mustacheTokenTree.getDocumentElement();
        var children = root.getChildren();
        assert.equal(children.length, 2);

        var ccc = children[1].getNode();
        assert.equal(ccc.isBlock(), true);
        assert.equal(ccc.getTokenValue(), "ccc");

        this.mustacheTokenTree.print();
    }
};

});

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec();
}