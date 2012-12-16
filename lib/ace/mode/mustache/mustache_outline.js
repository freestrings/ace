define(function (require, exports, module) {
    "use strict";

    var oop = require("../../lib/oop");

    var NodeUtil = {
        create:function (html) {
            var frag = document.createDocumentFragment(),
                temp = document.createElement('div');
            temp.innerHTML = html;
            frag.appendChild(temp.firstChild);
            return frag;
        }
    }

    var _Element = function () {
    };

    (function () {
        this.appendTo = function (element) {
            var node = NodeUtil.create(this.template);
            this.make(node);
            element.appendChild(node);
        }
        this.refresh = function () {
            this.make(target);
        }
        this.make = function () {
        }

    }).call(_Element.prototype);

    var TreeItem = function (data) {
        this.data = data;
        this.template = "<li></li>";
    };

    oop.inherits(TreeItem, _Element);

    (function () {
        this.make = function (node) {
            var target;
            if (node.nodeType == node.DOCUMENT_FRAGMENT_NODE) {
                target = node.querySelector("li");
            } else {
                target = node;
            }
            target.innerHTML = "";
            target.appendChild(document.createTextNode(this.text));
        }
    }).call(TreeItem.prototype);

    var Tree = function() {
    };
    (function() {
        this.computePath = function(ast) {
            var n = ast, indexes = [];
            while(n.parent) {
                var children = n.parent.children;
                for(var i =0 ; i < children.length ; i++) {
                    if(children[i] === ast) {
                        indexes.push(i);
                        break;
                    }
                }
                n = n.parent;
            }
            console.log(indexes);
        }

        this.insertAt = function(model, treeItem) {

        }

        this.append = function(model, treeItem) {

        }

        this.remove = function(depth, index) {

        }

    }).call(Tree.prototype);

    var MustacheOutlineView = function () {
        this.containerId = "outline";
        this.tree = new Tree();
    };

    (function () {

        this.inputChanged = function (event, object) {
            console.log("MustacheOutlineView.inputChanged ", event, object);
            if (event === "remove") {
//                this._remove(object);
            } else if (event === "new") {
                this.tree.computePath(object);
//                this._new(object);
            }
        }

        this.computePath = function (pathInfo) {
            var path = [""];
            for (var i = 1; i < pathInfo.depth; i++) {
                path.push("ul")
            }
            path.push("li:nth-child(" + ( pathInfo.index + 1 ) + ")");
            console.log("#" + this.containerId + path.join(">"));
            return "#" + this.containerId + path.join(">");
        }

        this._remove = function (object) {
            var path, e;
            for (var i = 0; i < object.length; i++) {
                path = this.computePath(object[i]);
                e = document.querySelector(path);
                e.parentNode.removeChild(e);
            }
        }

        this._new = function (object) {
            var ast, n = object, path = [], index = 0;
            while (n.parent.node) {
                path.push("ul");
                n = n.parent;
            }
            var wrap = document.querySelector("#" + this.containerId + (path.length > 0 ? ">" + path.join(">") : ""));
            var children = object.parent.children;
            var childNodes = wrap.childNodes;
            for (var i = 0; i < children.length; i++) {
                if (children[i] === object) {
                    if (childNodes[i]) {
                        new TreeItem(object.node.token.value).set(childNodes[i]);
                    } else {
                        new TreeItem(object.node.token.value).append(wrap);
                    }
                }
            }
        }

    }).call(MustacheOutlineView.prototype);

    exports.MustacheOutlineView = MustacheOutlineView;

});