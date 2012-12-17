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
    //
    // the row value of list match real text line number;
    // token wrappers that are MustacheNode or MustacheAST or InsertAwareMustacheAST are stored.
    this.list = new NodeList();
    this.documetAstNode = new MustacheAST(null);
};

(function() {    

    oop.implement(this, EventEmitter);

    /**
     * traverse all the MustacheAST until match to given condition
     * @param direction : if true, forward. unless true, backward
     * @param startPosition : {row, column}
     * @param endPosition : {row, column}
     * @param condition : function type argument
     * @return matched MustacheAST
     * @private
     */
    this._traverse = function(direction, startPosition, endPosition, condition) {
        var iter = new MustacheNodeGroupIterator(this.list, startPosition, endPosition);
        var result;
        var func = direction === true ? iter.iterate : iter.reverseIterate;

        func.call(iter, function(node, tokenRow, tokenColumn, lastEmptyLine) {
            if(condition(node, tokenRow, tokenColumn, lastEmptyLine) === true) {
                result = node;
                return false;
            }
        });
        return result;
    }

    this.traverse = function(startPosition, endPosition, condition) {
        return this._traverse(true, startPosition, endPosition, condition);
    }

    this.reverseTraverse = function(startPosition, endPosition, condition) {
        return this._traverse(false, startPosition, endPosition, condition);
    }

    this.getTokenInfo = function(row, column) {
        var tokens = this.tokenizer.getLineTokens(this.doc.getLine(row)).tokens;
        var c = 0;
        for(var i = 0 ; i < tokens.length ; i++) {
            c += tokens[i].value.length;
            if(c > column) {
                return {token : tokens[i], index : i};
            }
        }
        return {token : tokens[tokens.length - 1], index : tokens.length - 1};
    }

    /**
     * compute a parent from old ast
     *
     * @param row position of current token
     * @param column position of current token
     */
    this.getParent = function(row, column) {
        var tokenInfo = this.getTokenInfo(row, column);
        var inputNode = new MustacheNode(tokenInfo.token);
        var previousAst = this.getPreviousSibling(row, column);

        if(!previousAst.isRoot() && // node of root is null
            // Is it a matched block?
            previousAst.getNode().isBlock() && inputNode.isEndBlock() &&
            inputNode.getTokenValue() === previousAst.getNode().getTokenValue()) {
            return previousAst.getParent() ? previousAst.getParent() : this.documetAstNode;
        } else if(!previousAst.isRoot() && previousAst.getNode().isBlock()){
            return previousAst;
        } else if(!previousAst.isRoot() && previousAst.getNode().isEndBlock()){
            var parent = previousAst.getParent();
            if(!previousAst.isRoot() && parent.getNode().isBlock()) {
                return parent.getParent();
            } else {
                return parent;
            }
        } else {
            return previousAst.getParent() ? previousAst.getParent() : this.documetAstNode;
        }
    }

    this.getPreviousSibling = function(row, column) {
        var astNode, first = false;
        this.reverseTraverse({row : 0, column : 0}, {row : row, column : column}, 
            function(_astNode, tokenRow, tokenColumn, lastEmptyLine) {
                if(lastEmptyLine === -1 && first === false) {
                    first = true;
                } else {
                    astNode = _astNode;
                    return true;
                }
        });
        return astNode ? astNode : this.documetAstNode;
    }

    /**
     * @param row position of current token
     * @param column position of current token
     */
    this.getNextSibling = function(row, column) {
        var astNode, first = false;
        var docLength = this.doc.getLength();
        this.traverse({row : row, column : column}, {row : docLength - 1, column : this.doc.getLine(docLength - 1).length},
            function(_astNode, tokenRow, tokenColumn, lastEmptyLine) {
                if(first === false) {
                    first = true;
                } else {
                    astNode = _astNode;
                    return true;
                }
            });
        return astNode ? astNode : this.documetAstNode;
    }

    this.get = function(row, column) {
        var astNode;
        this.traverse({row : row, column : column}, {row : row, column : column},
            function(_astNode, tokenRow, tokenColumn) {
                astNode = _astNode;
                return true;
                
            });
        return astNode ? astNode : this.documetAstNode;    
    }

    /**
     * filtering a nodes that are passed to a outline view.
     *
     * TODO it be moved to mustache_workers.js to use a thread of Worker.
     * @private
     */
    this._refine = function(effectives, astNode) {
        var n = astNode;
        //
        // If exist ancestor of ast in changed set, ignore it.
        while(n) {
            for(var i = 0 ; i < effectives.length ; i++) {
                if(effectives[i] !== n) {
                    return effectives;
                }
            }
            n = n.getParent();
        }

        var removed = {};
        //
        // If exist child of ast in changed set, ignore it.
        for(var i = 0 ; i < effectives.length ; i++) {
            n = effectives[i].getParent();
            while(n) {
                if(astNode === n) {
                    removed[i] = true;
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
        _new.push(astNode);
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

        var oldNodeList, effectives = [], removed = [], oldNode, len;

        for(var i = startRange.row ; i <= endRange.row ; i++) {
            oldNodeList = this.list.get(i);
            if(oldNodeList) {
                var removedIndex = [];
                for(var j = 0 ; j < oldNodeList.size() ; j++) {

                    oldNode = oldNodeList.get(j);
                    len += oldNode.getNode() ? oldNode.getNode().getTokenLength() : 0;

                    if(i === startRange.row && len < startRange.column) {
                        continue;
                    }

                    if(i === endRange.row && len >= endRange.column) {
                        continue;
                    }
                    removedIndex.push(j);
                    removed.push(oldNode);
                    effectives = this._refine(effectives, oldNode);
                }
                for(var j = 0 ; j < removedIndex.length ; j++) {
                    oldNode.removeAt(j);
                }
                if(oldNode.size() === 0) {
                    this.list.removeAt(i);
                }
            }
        }
        //
        // reference of parent is not removed because it is needed to rebuild tree.
        // and parent reference is reassigned during the rebuild.
        for(var i = 0 ; i < removed.length ; i++) {
            removed[i].getParent().removeChild(removed[i]);
        }
        this._emit("changed", {event : "remove", object : removed});
    }

    /**
     * @private
     */
    this._endBlock = function(astNode, peak, stack) {
        var peakNode = peak.getNode();
        var node = astNode.getNode();
        if(peakNode/*token of documentAstNode is null*/ && peakNode.getTokenValue() === node.getTokenValue()) {
            astNode.setParent(peak); // to find match node easily
            stack.pop();
            return true;
        } else {
            var processed = false;
            if(!peakNode) {
                var children = peak.getChildren();
                for(var i = children.length - 1 ; i > -1 ; i--) {
                    if(children[i].getNode().isBlock()){
                        if(children[i].getNode().getTokenValue() === node.getTokenValue()) {
                            processed = true;
                            astNode.setParent(peak);
                        }
                        break;
                    }
                }
            }
            if(!processed) {
                peak.appendChild(astNode);
            }
        }
    }
    /**
     *
     * @param startRange : {row, column}
     * @param endRange : {row, column}
     */
    this.partialParse = function(startRange, endRange) {

        var nodeList, tokens, token, astNode, peak, 
        c // sum of column length
        ;

        var parentAstNode = new InsertAwareMustacheAST(this.getParent(startRange.row, startRange.column),
            //
            //new ast node inserted before old ast of new input positoin.
            this.get(startRange.row, startRange.column));

        var stack = [parentAstNode]; //keep track token of block type

        var oldList = this.list.clone();
        this._clearDirty(startRange, endRange);

        var currentRow, curentColumn;

        for(var i = startRange.row ; i <= endRange.row ; i++) {

            nodeList = this.list.get(i);
            if(!nodeList) {
                nodeList = new NodeList();
                this.list.insertAt(i, nodeList);
            }

            c = 0;

            var text = this.doc.getLine(i);
            if(startRange.row === endRange.row) {
                text = text.substring(startRange.column, endRange.column);
            } else if(i === startRange.row) {
                text = text.substring(startRange.column, text.length);
            } else if(i === endRange.row) {
                text = text.substring(0, startRange.column);
            }

            tokens = this.tokenizer.getLineTokens(text).tokens;

            for(var j = 0 ; j < tokens.length ; j++) {

                token = tokens[j];

                astNode = new MustacheAST(new MustacheNode(token));
                //
                // to debug
                astNode.r = i;
                astNode.c = j;

                nodeList.add(astNode);
                peak = stack[stack.length - 1];

                if(!peak) {
                    peak = new InsertAwareMustacheAST(this.getParent(i, c), this.get(i, c));
                    stack.push(peak);
                }

                if(astNode.getNode().isComment()) {
                    //do nothing
                } else if(astNode.getNode().isEndBlock()) {
                    this._endBlock(astNode, peak, stack);
                } else if(astNode.getNode().isBlock()) {
                    peak.appendChild(astNode);
                    stack.push(astNode);
                } else {
                    peak.appendChild(astNode);
                }

                c += token.value.length;

                this._emit("changed", { event : "new", object : astNode });
            }

            if(nodeList.size() === 0) {
                this.list.removeAt(i);
            }
        }
    }

    /**
     * main text event listener
     * @param range
     */
    this.change = function(range) {
        console.log(range);
        this.printChangedText(range);
        this.partialParse(range.start, range.end);
        this.print();
    }

    this.getAstList = function() {
        return this.list;
    }

    this.getDocumentElement = function() {
        return this.documetAstNode;
    }

    this.printChangedText = function(range) {
        console.log("<changed text--------------------------------------------");
        for(var i = range.start.row ; i <= range.end.row ; i++) {
            console.log(i, this.doc.getLine(i));
        }
        console.log("-------------------------------------------->\n");
    }

    this._print = function(ast, depth) {
        var tab = []
        for(var i = 0 ; i < depth ; i++) {
            tab.push("\t");
        }
        console.log(tab.join("") + "[" + ast.getNode().token.value.replace(/^\s+|\s+$/g,'') + "]", ast.getNode().getType());
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

