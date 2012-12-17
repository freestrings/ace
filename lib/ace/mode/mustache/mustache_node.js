define(function(require, exports, module) {

var oop = require("../../lib/oop");
var lang = require("../../lib/lang");

/**
 * As Token facade object, it support some utilized method for token.
 *
 * @param token
 * @constructor
 */
var MustacheNode = function(token) {
    this.token = token;
};

(function() {
    this.getType = function() {
        return this.token.type;
    }
    this.isBlock = function() {
        return this.getType() === "mu.block" || this.getType() === "mu.inverseblock";
    }
    this.isSingle = function() {
        return this.getType() === "mu.single" || this.getType() === "mu.open-unescaped";
    }
    this.isComment = function() {
        return this.getType() === "mu.comment";
    }
    this.isEndBlock = function() {
        return this.getType() === "mu.endblock";
    }
    this.isMustache = function() {
        return typeof this.getType() === "string" && this.getType().indexOf("mu") === 0;
    }
    this.isComment = function() {
        return this.getType() === "mu.comment" || this.getType() === "mu.commentend";   
    }
    this.isCommentStart = function() {
        return this.getType() === "mu.commentstart";
    }
    this.getTokenLength = function() {
        return this.token.value.length;
    }
    this.getTokenValue = function(nostrip) {
        var value = this.token.value;
        if(nostrip) {
            return value;
        }
        if(this.isBlock() || this.isEndBlock()) {
            return value.replace(/{{[#^/]|}}/g, "");
        } else if(this.isSingle()) {
            return value.replace(/{|}/g, "");
        } else {
            return value;
        }
    }
    this.toString = function() {
        return this.getType() + ", " + this.token.value;
    }
}).call(MustacheNode.prototype);

//
// It's data property is converted into Array from Object. 
//
var NodeList = function() {
    this.data = [];
};

(function() {
    this.isArray = function(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    }
    this.clone = function() {
        var nodeList = new NodeList();
        nodeList.data = lang.copyObject(this.data);
        nodeList.length = this.length;
        return nodeList;
    }
    this.size = function() {
        return this.data.length;
    }
    this.add = function(obj) {
        var isArray = this.isArray(obj);
        if(typeof this.addLimitIndex === "number" && this.addLimitIndex > -1) {
            this.addAt(this.addLimitIndex, obj);
            if(isArray) {
                this.addLimitIndex = this.addLimitIndex + obj.length;
            } else {
                this.addLimitIndex++;
            }
        } else {
            if(isArray) {
                Array.prototype.push.apply(this.data, obj);
            } else {
                this.data.push(obj);
            }
        }
    }
    this.setAddLimit = function(index) {
        this.addLimitIndex = index;
    }
    this.addAt = function(index, obj) {
        if(this.isArray(obj)) {
            Array.prototype.splice.apply(this.data, [index, 0].concat(obj));
        } else {
            this.data.splice(index, 0, obj);
        }
    }
    this.insertAt = function(index, obj) {
        this.data[index] = obj;
    }
    this.removeAt = function(from, to) {
        if(arguments.length > 1 && from !== to) {
            return Array.prototype.splice(this.data, [from, to - from]);
        } else {
            return this.data.splice(from, 1);
        }
    }
    this.get = function(index) {
        return this.data[index];
    }
    this.iterate = function(func) {
        var d;
        for(var i = 0 ; i < this.data.length ; i++) {
            d = this.data[i];
            if(!d) {
                continue;
            }

            if(func(i, d) === false) {
                break;
            }
        }
    }
    this.reverseIterate = function() {
        var d;
        for(var i = this.data.length - 1 ; i > -1 ; i--) {
            d = this.data[i];
            if(!d) {
                continue;
            }

            if(func(i, d) === false) {
                break;
            }
        }
    }
}).call(NodeList.prototype);

/**
 * It is simple ast node for building a syntax tree.
 * @param node : instance of MustacheNode
 */
var MustacheAST = function(node) {
    this.node = node;
    this.parent;
    this.children = [];
};

(function() {
    this.isRoot = function() {
        return !this.node;
    }
    this.setParent = function(parent) {
        if(this.parent && parent !== this.parent) {
            this.parent.removeChild(this);
        }
        this.parent = parent;
    }
    this.getParent = function() {
        return this.parent;
    }
    this.removeChild = function(ast) {
        for(var i = 0 ; i < this.children.length ; i++) {
            if(this.children[i] === ast) {
                this.children.splice(i, 1);
                return ;
            }
        }
    }
    this.appendChild = function(ast) {
        if(ast instanceof InsertAwareMustacheAST) {
            ast = ast.astNode;
        }

        ast.setParent(this);
        this.children.push(ast);
    }
    this.insertBefore = function(newAst, refAst) {
        if(newAst instanceof InsertAwareMustacheAST) {
            newAst = newAst.astNode;
        }
        newAst.setParent(this);
        for(var i = 0 ; i < this.children.length ; i++) {
            if(refAst === this.children[i]) {
                this.children.splice(i, 0, newAst);
                return true;
            }
        }
        return false;
    }
    /**
     * insertBefore or appendChild
     */
    this.insertChild = function(newAst, refAst) {
        if(this.insertBefore(newAst, refAst) === false) {
            this.appendChild(newAst);
        }
    }
    this.getChildren = function() {
        return this.children;
    }
    this.getNode = function() {
        return this.node;
    }
}).call(MustacheAST.prototype);

/**
 *
 * @param MustacheAST decorator
 * @param refAst : It is base siblingNode of new children.
 */
var InsertAwareMustacheAST = function(astNode, refAst) {

    if(astNode instanceof InsertAwareMustacheAST) {
        astNode = astNode.astNode;
    }

    this.astNode = astNode;
    this.parent;
    this.children = [];
    this.refAst = refAst;
};

(function() {
    this.setParent = function(parent) {
        this.astNode.setParent(parent);
    }
    this.getParent = function() {
        return this.astNode.getParent();
    }
    this.insertBefore = function(newAst, refAst) {
        return this.astNode.insertBefore(newAst, refAst);
    }
    this.insertChild = function(newAst, refAst) {
        if(this.astNode.insertBefore(newAst, refAst) === false) {
            this.astNode.appendChild(newAst);
        }
    }
    this.getChildren = function() {
        return this.astNode.getChildren();
    }
    this.getNode = function() {
        return this.astNode.getNode();
    }
    /**
     * decorated method of MustacheAST.appendChild.
     */
    this.appendChild = function(ast) {
        this.astNode.insertChild(ast, this.refAst);
    }
    this.removeChild = function(ast) {
        this.astNode.removeChild(ast);
    }
}).call(InsertAwareMustacheAST.prototype);

exports.MustacheNode = MustacheNode;
exports.NodeList = NodeList;
exports.MustacheAST = MustacheAST;
exports.InsertAwareMustacheAST = InsertAwareMustacheAST;

});