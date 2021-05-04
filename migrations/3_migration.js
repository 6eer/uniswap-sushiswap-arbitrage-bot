//const AuxiliaryMath = artifacts.require("AuxiliaryMath");
const Arbitrager = artifacts.require("Arbitrager");

module.exports = function (deployer) {
//    deployer.deploy(AuxiliaryMath);
    deployer.deploy(Arbitrager,
    '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
};
