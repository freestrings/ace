if (typeof process !== "undefined") {
    require("amd-loader");
}

define(function(require, exports, module) {
"use strict";

var lang = require("../../lib/lang");
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

function buildWrapTree(root) {
    function _(o) {
        for(var i = 0 ; i < o.d.children.length ; i++) {
            var c = new Object();
            o.children.push(c);
            c.parent = o;

            c.d = o.d.children[i];
            c.children = [];
            _(c);
        }
    }

    var _root = new Object();
    _root.d = root;
    _root.children = [];
    _(_root);
    return _root;
}

function traverseWrapTree(root, func) {
    var b = [root];
    for(var i = 0 ; i < b.length ; i++) {
        if(b[i].d.node && func(b[i].d) === false) {
            break;
        }
        for(var j =  0 ; j < b[i].children.length ; j++) {
            b.push(b[i].children[j]);
        }
    }
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
        debugger;
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
        this.mustacheTokenTree.print();
    },

    "test: partialParse 1" : function() {
        var text = "{{#aaa}}{{a}}{{/aaa}}{{AAA}}{{#BBB}}{{/BBB}}{{/ccc}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);
        var text2 = "{{#aaa}}{{a}}{{/aaa}}{{AAA}}{{#BBB}}{{/BBB}}{{#ccc}}{{/ccc}}"
        this.doc.setValue(text2);
        
        debugger;
        this.mustacheTokenTree.partialParse({row : 0, column : 44}, {row : 0, column : 52});

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

        this.mustacheTokenTree.partialParse({row : 2, column : 0}, {row : 3, column : lines[2].length});

        this.mustacheTokenTree.print();

        var root = this.mustacheTokenTree.getDocumentElement();
        var children = root.getChildren();
        assert.equal(children.length, 2);

        var ccc = children[1].getNode();
        assert.equal(ccc.isBlock(), true);
        assert.equal(ccc.getTokenValue(), "ccc");
    },

    "test: partialParse 4" : function() {
        var text = "{{#a}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var text2 = "{{#a}}\n{{#b}}";
        this.doc.setValue(text2);
        this.mustacheTokenTree.partialParse({row : 1, column : 0}, {row : 1, column : "{{#b}}".length});
        this.mustacheTokenTree.print();

        var root = this.mustacheTokenTree.getDocumentElement();
        assert.equal(root.getChildren().length, 1);
    },

    "test: remove 1" : function() {
        var text = "{{";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var text2 = "{";
        this.doc.setValue(text2);

        var wrapTree = buildWrapTree(this.mustacheTokenTree.getDocumentElement());

        this.mustacheTokenTree.on("changed", function(e) {
            if(e.event === "remove") {
                var object = e.object;
                traverseWrapTree(wrapTree, function(a) {
                    assert.equal(object.length, 1);
                    assert.equal(object[0].node.token.value, "{{");
                });

            }
        });

        this.mustacheTokenTree.partialParse({row : 0, column : 0}, {row : 0, column : 1});
        this.mustacheTokenTree.print();

    },

    "test: remove 2" : function() {
        var text = "{{}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var text2 = "{{}";
        this.doc.setValue(text2);

        var wrapTree = buildWrapTree(this.mustacheTokenTree.getDocumentElement());

        this.mustacheTokenTree.on("changed", function(e) {
            if(e.event === "remove") {
                var object = e.object;
                traverseWrapTree(wrapTree, function(a) {
                    assert.equal(object.length, 1);
                    assert.equal(object[0].node.token.value, "{{}}");
                    assert.equal(object[0].node.token.type, "mu.single");
                });

            }
        });

        this.mustacheTokenTree.partialParse({row : 0, column : 0}, {row : 0, column : 1});
        this.mustacheTokenTree.print();

    },

    "test: remove 3" : function() {
        var text = "{{#aa}}{{/bb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var text2 = "{{}";
        this.doc.setValue(text2);

        var wrapTree = buildWrapTree(this.mustacheTokenTree.getDocumentElement());

        this.mustacheTokenTree.on("changed", function(e) {
            if(e.event === "remove") {
                var object = e.object;
                traverseWrapTree(wrapTree, function(a) {
                    assert.equal(object.length, 2);
                    assert.equal(object[0].node.token.value, "{{#aa}}");
                    assert.equal(object[0].node.token.type, "mu.block");
                    assert.equal(object[1].node.token.value, "{{/bb}}");
                    assert.equal(object[1].node.token.type, "mu.endblock");
                });
            }
        });

        this.mustacheTokenTree.partialParse({row : 0, column : 0}, {row : 0, column : 1});
        this.mustacheTokenTree.print();

    },

    "test: remove 4" : function() {
        var text = "{{#aa}}\n{{/aa}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var text2 = "{{";
        this.doc.setValue(text2);

        var wrapTree = buildWrapTree(this.mustacheTokenTree.getDocumentElement());

        this.mustacheTokenTree.on("changed", function(e) {
            if(e.event === "remove") {
                var object = e.object;
                traverseWrapTree(wrapTree, function(a) {
                    assert.equal(object.length, 1);
                    assert.equal(object[0].node.token.value, "{{#aa}}");
                    assert.equal(object[0].node.token.type, "mu.block");
                });
            }
        });

        this.mustacheTokenTree.partialParse({row : 0, column : 0}, {row : 0, column : 1});
        var root = this.mustacheTokenTree.getDocumentElement();
        assert.equal(root.getChildren().length, 1);

        this.mustacheTokenTree.print();

    },

    "test: remove 5" : function() {
        var text = "{{#aa}}{{/aa}}{{b}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var text2 = "{{#aa}}{{b}}";
        this.doc.setValue(text2);

        var wrapTree = buildWrapTree(this.mustacheTokenTree.getDocumentElement());

        this.mustacheTokenTree.on("changed", function(e) {
            if(e.event === "remove") {
                var object = e.object;
                traverseWrapTree(wrapTree, function(a) {
                    assert.equal(object.length, 3);
                });
            }
        });

        // debugger;
        this.mustacheTokenTree.partialParse({row : 0, column : 7}, {row : 0, column : 14});
        var root = this.mustacheTokenTree.getDocumentElement();
        this.mustacheTokenTree.print();
        assert.equal(root.getChildren().length, 1);

    }

};

});

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec();
}