'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.MultiHash = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ipfsUnixfs = require(' ');

var _ipfsUnixfs2 = _interopRequireDefault(_ipfsUnixfs);

var _ipldDagPb = require('ipld-dag-pb');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MultiHash = function () {
    function MultiHash() {
        _classCallCheck(this, MultiHash);
    }

    _createClass(MultiHash, null, [{
        key: 'getMultiHash',


        /**
         *  Generates offline IPFS's multi-hash of a buffered data 
         *
         *  @param    {Object}                  buffer  Buffered content
         *  @return   {Promise<String, Error>}          A promise that resolves with the multihash or rejects with an error
         */
        value: function getMultiHash(buffer) {
            var unixFs = new _ipfsUnixfs2.default("file", buffer);
            return new Promise(function (resolve, reject) {
                _ipldDagPb.DAGNode.create(unixFs.marshal(), function (err, dagNode) {
                    if (err) reject(err);else resolve(dagNode.toJSON().multihash);
                });
            });
        }
    }]);

    return MultiHash;
}();

exports.MultiHash = MultiHash;