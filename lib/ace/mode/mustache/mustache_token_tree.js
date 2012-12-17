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
     * @private
     */
    this._endBlock = function(astNode, peak, stack) {
        var peakNode = peak.getNode();
        var node = astNode.getNode();
        if(peakNode/*token of documentAstNode is null*/ && 
            peakNode.getTokenValue() === node.getTokenValue()) {
            astNode.setParent(peak); // to find match node easily
            stack.pop();
            return true;
        } else {
            var processed = false, tempNode;
            if(!peakNode) {
                var children = peak.getChildren();
                for(var i = children.length - 1 ; i > -1 ; i--) {
                    tempNode = children[i].getNode();
                    if(tempNode.isBlock()) {
                        if(tempNode.getTokenValue() === node.getTokenValue()) {
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

    this._removeDirty = function(startRange, endRange, nodeList, tokens) {
        var dirtyFrom = -1, dirtyTo = tokens.length, tempLength = 0;

        var len = nodeList.size();
        if(startRange.row === endRange.row) {
            var from = null, to = null;
            for(var j = 0 ; j < len ; j++) {
                tempLength += nodeList.get(j).getNode().getTokenLength();
                if(tempLength > startRange.column && from == null) {
                    from = j;
                    dirtyFrom = from;
                } else if(tempLength > endRange.column) {
                    to = j;
                    dirtyTo = to + 1;
                    break;
                }
            }

            if(from != null && to != null) {
                this._emit("changed", {event : "remove", object : nodeList.removeAt(from, to)});
            }

        } else if(i === startRange.row) {
            var from = len, to = -1;
            for(var j = 0 ; j < len ; j++) {
                tempLength += nodeList.get(j).getNode().getTokenLength();
                if(tempLength > startRange.column) {
                    if(dirtyFrom == -1) {
                        dirtyFrom = j;
                    }
                    from = Math.min(j, from);
                    to = Math.max(j, to);
                }
            }
            this._emit("changed", {event : "remove", object : nodeList.removeAt(from, to)});
        } else if(i === endRange.row) {
            var sum = 0;
            for(var j = 0 ; j < len ; j++) {
                sum += nodeList.get(j).getNode().getTokenLength();
            }
            var from = len, to = -1;
            for(var j = len - 1 ; j > - 1 ; j--) {
                tempLength += nodeList.get(j).getNode().getTokenLength();
                if(sum - tempLength <= endRange.column) {
                    if(dirtyFrom == -1) {
                        dirtyFrom = j;
                    }
                    from = Math.min(j, from);
                    to = Math.max(j, to);
                }
            }

            this._emit("changed", {event : "remove", object : nodeList.removeAt(from, to)});
        }
        return {from : dirtyFrom, to : dirtyTo};
    }

    /**
     *
     * @param startRange : {row, column}
     * @param endRange : {row, column}
     */
    this.partialParse = function(startRange, endRange, action) {
        var nodeList, tokens, token, astNode, peak, text, tempLength, dirtyFrom, dirtyTo,
        c // sum of column length
        ;

        var parentAstNode = new InsertAwareMustacheAST(
            this.getParent(startRange.row, startRange.column),
            //new ast node inserted before old ast of new input positoin.
            this.get(startRange.row, startRange.column));

        //keep track token of block type
        var stack = [parentAstNode]; 

        // var oldList = this.list.clone();
        // this._clearDirty(startRange, endRange);
        for(var i = startRange.row ; i <= endRange.row ; i++) {

            nodeList = this.list.get(i);

            if(!nodeList) {
                nodeList = new NodeList();
                this.list.insertAt(i, nodeList);
            }

            text = this.doc.getLine(i);
            tokens = this.tokenizer.getLineTokens(text).tokens;

            c = 0, dirtyFrom = -1, dirtyTo = tokens.length, tempLength = 0;

            if(action === "insertText") {
                if(startRange.row === endRange.row) {
                    for(var j = 0 ; j < tokens.length ; j++) {
                        tempLength += tokens[j].value.length;
                        if(tempLength > startRange.column && dirtyFrom == -1) {
                            dirtyFrom = j;
                        } else if(tempLength > endRange.column) {
                            dirtyTo = j;
                            break;
                        }
                    }

                    astNode = this.traverse(startRange, endRange, function(_astNode, row, col) {
                        if(col >= startRange.column) {
                            return true;
                        }
                    });

                    if(astNode && astNode.getNode().getType() === tokens[dirtyFrom].type) {
                        //
                        // copy value
                        astNode.getNode().token.value = tokens[dirtyFrom].value;
                        //
                        // ignore process
                        return ;
                    } else if(astNode){
                        astNode.getParent().removeChild(astNode);
                    }

                } else if(i === startRange.row) {
                    text = text.substring(startRange.column, text.length);
                } else if(i === endRange.row) {
                    text = text.substring(0, endRange.column);
                }
            } else if(action === "insertLines") {

            } else if (action === "removeLines") { 
                var len = nodeList.size();
                for(var j = 0 ; j < len ; j++) {
                    this._emit("changed", {event : "remove", object : nodeList.removeAt(j)});
                }
                dirtyFrom = 0, dirtyTo = token.length;
            } else if (action === "removeText") {
                var info = this._removeDirty(startRange, endRange, nodeList, tokens);
                dirtyFrom = info.from;
                dirtyTo = info.to;
            }

            for(var j = dirtyFrom ; j < dirtyTo; j++) {

                token = tokens[j];

                if(!token) {
                    continue;
                }

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

                //this._emit("changed", { event : "new", object : astNode });
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
    this.change = function(action, range, text) {
        console.log(action, range, text);
        // this.printChangedText(range);
        this.partialParse(range.start, range.end, action);
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

    this.printList = function() {
        for(var i = 0 ; i < this.list.size() ; i++) {
            var group = this.list.get(i);
            if(group) {
                console.log(i, group.data);
            }
        }
    }

}).call(MustacheTokenTree.prototype);

exports.MustacheTokenTree = MustacheTokenTree;
});

