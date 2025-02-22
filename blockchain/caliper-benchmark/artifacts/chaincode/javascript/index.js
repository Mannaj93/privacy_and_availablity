'use strict';

const chaincode = require('./lib/myChainCode');

module.exports.AssetTransfer = chaincode;
module.exports.contracts = [chaincode];
