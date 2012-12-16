define(function(require, exports, module) {
"use strict";

var oop = require("../../lib/oop");
var EventEmitter = require("../../lib/event_emitter").EventEmitter;
var MustacheNode = require("./mustache_node").MustacheNode;
var NodeList = require("./mustache_node").NodeList;
var MustacheAST = require("./mustache_node").MustacheAST;
var InsertAwareMustacheAST = require("./mustache_node").InsertAwareMustacheAST;
var MustacheNodeGroupIterator = require("./mustache_node_group_iterator").MustacheNodeGroupIterator;

var MustacheTokenTree = function(doc, tokenizer) {
    this.doc = doc;
    this.tokenizer = tokenizer;
    this.list = new NodeList();
    this.documetAstNode = new MustacheAST(null);
};

(function() {    

    oop.implement(this, EventEmitter);

    /**
     * traverse all the token until match to given token type
     * @param direction : if true, forward. unless true, backward
     * @param startRange : {row, column}
     * @param endRange : {row, column}
     * @param condition : function type argument
     * @return matched MustacheAST
     * @private
     */
    this._traverse = function(direction, startRange, endRange, condition) {
        var iter = new MustacheNodeGroupIterator(this.list, startRange, endRange);
        var result;
        var func = direction === true ? iter.iterate : iter.reverseIterate;
        func.call(iter, function(node, tokenRow, tokenColumn) {
            if(condition(node, tokenRow, tokenColumn)) {
                result = node;
                return false;
            }
        });
        return result;
    }

    this.traverse = function(startRange, endRange, condition) {
        return this._traverse(true, startRange, endRange, condition);
    }

    this.reverseTraverse = function(startRange, endRange, condition) {
        return this._traverse(false, startRange, endRange, condition);
    }

    /**
     * @param row position of current token
     * @param column position of current token
     */
    this.getParent = function(row, column) {
        var range = {row : row, column: column};
        var parentAstNode, rowIndex = 0, columnIndex = 0;
        this.reverseTraverse(range, range, function(astNode, tokenRow, tokenColumn) {
            if(!parentAstNode) {
                parentAstNode = astNode.getParent();
                rowIndex = row;
                columnIndex = column;
            } else if(!parentAstNode || !astNode) {
                return true;
            } else if(row === rowIndex && column === columnIndex) {
                return true;
            }
        });
        return { node : parentAstNode ? parentAstNode : this.documetAstNode, row : rowIndex , column : columnIndex };
    }

    this._getSibling = function(direction, row, column) {
        var range = {row : row, column: column};
        var astNode, rowIndex = 0, columnIndex = 0;
        var func = direction === true ? this.traverse : this.reverseTraverse;
        func.call(this, range, range, function(astNode, tokenRow, tokenColumn) {
            if(tokenRow !== row || tokenColumn !== column) {
                console.log(row, column, tokenRow, tokenColumn, astNode);
                astNode = astNode;
                rowIndex = tokenRow;
                columnIndex = tokenColumn;
                return false;
            }
        });
        return { node : astNode, row : rowIndex , column : columnIndex };
    }

    this.getPreviousSibling = function(row, column) {
        return this._getSibling(false, row, column);
    }

    /**
     * @param row position of current token
     * @param column position of current token
     */
    this.getNextSibling = function(row, column) {
        return this._getSibling(true, row, column);
    }

    /**
     * filtering a nodes that are passed to a outline view.
     *
     * TODO it be moved to mustache_workers.js to use a thread of Worker.
     * @private
     */
    this._refine = function(effectives, astNode) {
        var n = astNode;
        while(n) {
            for(var i = 0 ; i < effectives.length ; i++) {
                if(effectives[i] !== n) {
                    return ;
                }
            }
            n = n.getParent();
        }
        var removed = {};
        for(var i = 0 ; i < effectives.length ; i++) {
            n = effectives[i].getParent();
            while(n) {
                if(astNode === n) {
                    removed[i] = true ;
                    break;
                }
                n = n.getParent();
            }
        }
        var _new = [];
        for(var i = 0 ; i < effectives.length ; i++) {
            if(!remove[i]) {
                _new.push(effectives[i]);
            }
        }
        return _new;
    }

    /**
     * remove old ast nodes and refine changes
     *
     * @param startRange : {row, column}
     * @param endRange : {row, column}
     * @private
     */
    this._clearDirty = function(startRange, endRange) {
        var oldNodeList, astNode, tempParent, effectives = [];
        for(var i = startRange.row ; i <= endRange.row ; i++) {
            oldNodeList = this.list.get(i);
            if(oldNodeList) {
                for(var j = 0 ; j < oldNodeList.size() ; j++) {
                    astNode = oldNodeList.get(j);
                    tempParent = astNode.getParent();
                    tempParent.removeChild(astNode);
                    astNode.setParent(null);
                    effectives = this._refine(effectives, astNode);
                }
            }
        }
        this._emit("changed", {event : "remove", object : effectives});
    }

    this._endBlock = function(astNode, peek, stack) {
        var peekNode = peek.getNode();
        var node = astNode.getNode();
        if(peekNode/*token of documentAstNode is null*/ && peekNode.getTokenValue() === node.getTokenValue()) {
            astNode.setParent(peek);
            stack.pop();
        } else {
            var processed = false;
            if(!peekNode) {
                var children = peek.getChildren();
                for(var i = children.length - 1 ; i > -1 ; i--) {
                    if(children[i].getNode().isBlock()){
                        if(children[i].getNode().getTokenValue() === node.getTokenValue()) {
                            processed = true;
                        }
                        break;
                    }
                }
            }
            if(!processed) {
                peek.appendChild(astNode);
            }
        }
    }
    /**
     *
     * @param startRange : {row, column}
     * @param endRange : {row, column}
     */
    this.partialParse = function(startRange, endRange) {

        var nodeList, tokens, token, c, astNode, peek;

        var parentAstNode = new InsertAwareMustacheAST(this.getParent(startRange.row, startRange.column).node,
            this.getNextSibling(startRange.row, startRange.column).node);
        var stack = [parentAstNode]; //keep track token of block type

        this._clearDirty(startRange, endRange);

        for(var i = startRange.row ; i <= endRange.row ; i++) {

            tokens = this.tokenizer.getLineTokens(this.doc.getLine(i)).tokens;
            nodeList = new NodeList();

            c = 0;
            for(var j = 0 ; j < tokens.length ; j++) {
                token = tokens[j];
                astNode = new MustacheAST(new MustacheNode(token));
                nodeList.add(astNode);
                peek = stack[stack.length - 1];

                if(!peek) {
                    peek = new InsertAwareMustacheAST(this.getParent(i, c).node, this.getNextSibling(i, c).node);
                    stack.push(peek);
                }

                c += token.value.length;

                if(astNode.getNode().isComment()) {
                    //do nothing
                } else if(astNode.getNode().isEndBlock()) {
                    this._endBlock(astNode, peek, stack);
                } else if(astNode.getNode().isBlock()) {
                    peek.appendChild(astNode);
                    stack.push(astNode);
                } else {
                    peek.appendChild(astNode);
                }
                this._emit("changed", { event : "new", object : astNode});
            }

            if(nodeList.size() > 0) {
                this.list.insertAt(i, nodeList);
            } else {
                this.list.removeAt(i);
            }
        }
    }

    this.change = function(range) {
        for(var i = range.start.row ; i <= range.end.row ; i++) {
            console.log(i, this.doc.getLine(i));
        }
        this.partialParse(range.start, range.end);

        this.print();
    }

    this.getAstList = function() {
        return this.list;
    }

    this.getDocumentElement = function() {
        return this.documetAstNode;
    }

    this._print = function(ast, depth) {
        var tab = []
        for(var i = 0 ; i < depth ; i++) {
            tab.push(" ");
        }
        console.log(tab.join("") + ast.getNode().token.value, ast.getNode().getType());
        var children = ast.getChildren();
        for(var i = 0 ; i < children.length ; i++) {
            this._print(children[i], depth+1);
        }
    }

    this.print = function() {
        console.log("<--------------------------------------------");
        var children = this.documetAstNode.getChildren();
        for(var i = 0 ; i < children.length ; i++) {
            this._print(children[i], 0);
        }
        console.log("-------------------------------------------->\n");
    }

}).call(MustacheTokenTree.prototype);

exports.MustacheTokenTree = MustacheTokenTree;
});

