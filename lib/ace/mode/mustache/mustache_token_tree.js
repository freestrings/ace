define(function(require, exports, module) {
"use strict";

var MustacheNode = require("./mustache_node").MustacheNode;
var NodeList = require("./mustache_node").NodeList;
var MustacheAST = require("./mustache_node").MustacheAST;
var MustacheNodeGroupIterator = require("./mustache_node_group_iterator").MustacheNodeGroupIterator;

var MustacheTokenTree = function(doc, tokenizer) {
    this.doc = doc;
    this.tokenizer = tokenizer;
    this.list = new NodeList();
};

(function() {

    /*
     * traverse all the token until match to given token type
     * @startRange : {row, column}
     * @endRange : {row, column}
     */
    this.traverse = function(startRange, endRange, tokenType) {
        var iter = new MustacheNodeGroupIterator(this.list, startRange, endRange);
        var result;
        iter.iterate(function(node) {
            if(node.getType() === tokenType) {
                result = node;
                return false;
            }
        });
        return result;
    }

    this.reverseTraverse = function(startRange, endRange, tokenType) {
        var iter = new MustacheNodeGroupIterator(this.list, startRange, endRange);
        var result;
        iter.reverseIterate(function(node, tokenRow, tokenColumn) {
            if(node.getType() === tokenType) {
                result = node;
                return false;
            }
        });
        return result;
    }

    this.partialParse = function(startRange, endRange) {
        var group = this.list.get(endRange.row);
        var node, c = 0;

        //find start node;
        for(var i = 0 ; i < group.size() ; i++) {
            node = group.get(i);
            c += node.getTokenLength();
            if(c >= endRange.column) {
                break;
            }
        }

        if(!node) {
            new Exception("NotFound start {" + startRange.row + ", " + startRange.column + "} ~ end {" + endRange.row + ", " + endRange.column + "}");
        }

        var iter = new MustacheNodeGroupIterator(this.list, startRange, { row : endRange.row, column : c});
        var root = new MustacheAST();
        var ast, stack = [root], peek, peekNode;
        iter.iterate(function(node) {

            if(stack.length === 0) {
                return false;
            }

            ast = new MustacheAST(node);
            peek = stack[stack.length - 1];
            peekNode = peek.getNode();

            if(node.isComment()) {
                //do nothing
            } else if(node.isEndBlock() && (peekNode/*node of root is null*/ && peekNode.getTokenValue() === node.getTokenValue())) {
                stack.pop();
            } else if(node.isBlock()) {
                peek.appendChild(ast);
                ast.setParent(peek);
                stack.push(ast);
            } else {
                peek.appendChild(ast);
                ast.setParent(peek);
            }

        });

        return root;
    }

    this.change = function(range) {
        var start = range.start;
        var end = range.end;
        var text, result, tokens, token, group, oldGroup;

        for(var i = start.row ; i <= end.row ; i++) {
            text = this.doc.getLine(i);
            // console.log("# ", text);
            result = this.tokenizer.getLineTokens(text);
            tokens = result.tokens;
            group = new NodeList();
            for(var j = 0 ; j < tokens.length ; j++) {
                token = tokens[j];
                group.add(new MustacheNode(token));
            }
            
            oldGroup = this.list.get(i);

            if(group.size() > 0) {
                this.list.insertAt(i, group);    
            } else {
                this.list.removeAt(i);    
            }

        }


        
        // console.log("<----------------");
        // this.list.iterate(function(idx, d) {
        //     console.log(idx, d);
        // });
        // console.log("\n\n");
    }

    this.getTokenList = function() {
        return this.list;
    }

}).call(MustacheTokenTree.prototype);

exports.MustacheTokenTree = MustacheTokenTree;
});

