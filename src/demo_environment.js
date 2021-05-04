const Web3 = require('web3');
//provider
const localProviderUrl = 'http://localhost:8545'
const localProvider = new Web3.providers.WebsocketProvider(localProviderUrl)
const web3 = new Web3(localProvider)
//uniswap
const IRouter = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json')
const uRouter = new web3.eth.Contract(IRouter.abi,'0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')
//sushiswap
const sRouter = new web3.eth.Contract(IRouter.abi,'0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F')
//tokens
const ERC20PresetMinterPauser = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
let token0 = new web3.eth.Contract(ERC20PresetMinterPauser.abi,'',{data:ERC20PresetMinterPauser.bytecode})
let token1 = new web3.eth.Contract(ERC20PresetMinterPauser.abi,'',{data:ERC20PresetMinterPauser.bytecode})
//arbitrager
const Arbitrager = require('../build/contracts/Arbitrager.json')
const arbitrager = new web3.eth.Contract(Arbitrager.abi,'',{data:Arbitrager.bytecode})
//addresses
const addr0 = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'//sushiswap factory
const addr1 = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'//uniswap router
//utils
const Utils = require('../build/contracts/Utils.json')
const utils = new web3.eth.Contract(Utils.abi,'',{data:Utils.bytecode})

async function liquidity(amount0,amount1,amount2,amount3,amount4) {

    myAccount = (await web3.eth.getAccounts())[0]

    //deploying token0
    let gasLimit, receipt, aux
    gasLimit = await token0.deploy({arguments: ['Pineapple', 'PNA']}).estimateGas()
    receipt = await token0.deploy({arguments: ['Pineapple', 'PNA']}).send({from: myAccount,gas: gasLimit})
    token0.options.address = receipt._address

    //deploying token1
    gasLimit = await token1.deploy({arguments: ['Watermelon', 'WTM']}).estimateGas()
    receipt = await token1.deploy({arguments: ['Watermelon', 'WTM']}).send({from: myAccount,gas: gasLimit})
    token1.options.address = receipt._address

    if (token0.options.address>token1.options.address) {aux=token0; token0=token1; token1=aux}
    
    //prints
    const token0Name = await token0.methods.name().call()
    const token0Symbol = await token0.methods.symbol().call()
    const token1Name = await token1.methods.name().call()
    const token1Symbol = await token1.methods.symbol().call()
    console.log(
        `\n${token0Name} (${token0Symbol}) {token0}\n`+
        `Deployed at ${token0.options.address}\n\n`+
        `${token1Name} (${token1Symbol}) {token1}\n`+
        `Deployed at ${ token1.options.address}\n`
        )

    //minting token0
    amount4 = web3.utils.toWei(web3.utils.toBN(amount4))
    gasLimit = await token0.methods.mint(myAccount, amount4).estimateGas()
    await token0.methods.mint(myAccount, amount4).send({from:myAccount, gas:gasLimit})
    console.log(`${web3.utils.fromWei(amount4)} ${token0Symbol} minted`)
    
    //minting token1
    gasLimit = await token1.methods.mint(myAccount, amount4).estimateGas()
    await token1.methods.mint(myAccount, amount4).send({from:myAccount, gas:gasLimit})
    console.log(`${web3.utils.fromWei(amount4)} ${token1Symbol} minted\n`)

    //creating pair
    const deadline = Math.round(Date.now()/1000)+60*60 

    //on uniswap
    amount0 = web3.utils.toWei(web3.utils.toBN(amount0),'ether')
    amount1 = web3.utils.toWei(web3.utils.toBN(amount1),'ether')
    gasLimit = await token0.methods.approve(uRouter.options.address,amount0).estimateGas()
    await token0.methods.approve(uRouter.options.address,amount0).send({from:myAccount, gas:gasLimit})
    gasLimit = await token1.methods.approve(uRouter.options.address,amount1).estimateGas()
    await token1.methods.approve(uRouter.options.address,amount1).send({from:myAccount, gas:gasLimit})

    gasLimit = await uRouter.methods.addLiquidity(
        token0.options.address,
        token1.options.address,
        amount0,
        amount1,
        0,
        0,
        myAccount,
        deadline
    ).estimateGas()
    await uRouter.methods.addLiquidity(
        token0.options.address,
        token1.options.address,
        amount0,
        amount1,
        0,
        0,
        myAccount,
        deadline
    ).send({from:myAccount,gas:gasLimit})
    console.log(
        `Uniswap ${token0Symbol}/${token1Symbol} pair created\n`+
        `Reserves: ${web3.utils.fromWei(amount0)} ${token0Symbol} | ${web3.utils.fromWei(amount1)} ${token1Symbol}\n`+
        `Price: ${(amount0/amount1).toFixed(2)} ${token0Symbol}/${token1Symbol}\n`
        )

    //on sushiswap
    amount2 = web3.utils.toWei(web3.utils.toBN(amount2),'ether')
    amount3 = web3.utils.toWei(web3.utils.toBN(amount3),'ether')
    gasLimit = await token1.methods.approve(sRouter.options.address,amount2).estimateGas()
    await token0.methods.approve(sRouter.options.address,amount2).send({from:myAccount, gas:gasLimit})
    gasLimit = await token1.methods.approve(sRouter.options.address,amount3).estimateGas()
    await token1.methods.approve(sRouter.options.address,amount3).send({from:myAccount, gas:gasLimit})
    gasLimit = await sRouter.methods.addLiquidity(
        token0.options.address,
        token1.options.address,
        amount2,
        amount3,
        0,
        0,
        myAccount,
        deadline
    ).estimateGas()
    await sRouter.methods.addLiquidity(
        token0.options.address,
        token1.options.address,
        amount2,
        amount3,
        0,
        0,
        myAccount,
        deadline
    ).send({from:myAccount,gas:gasLimit})
    console.log(
        `Sushiswap ${token0Symbol}/${token1Symbol} pair created\n`+
        `Reserves: ${web3.utils.fromWei(amount2)} ${token0Symbol} | ${web3.utils.fromWei(amount3)} ${token1Symbol}\n`+
        `Price: ${(amount2/amount3).toFixed(2)} ${token0Symbol}/${token1Symbol}\n`
        )

}

async function deploy(amount0,amount1,amount2,amount3,amount4) {

    await liquidity(amount0,amount1,amount2,amount3,amount4)

    myAccount = (await web3.eth.getAccounts())[0]

    //arbitrager
    let gasLimit, receipt
    gasLimit = await arbitrager.deploy({arguments: [addr0, addr1]}).estimateGas()
    receipt = await arbitrager.deploy({arguments: [addr0, addr1]}).send({from: myAccount,gas: gasLimit})
    arbitrager.options.address = receipt._address

    console.log(`Arbitrager contract deployed at ${arbitrager.options.address}\n`)

    //utils
    gasLimit = await utils.deploy().estimateGas()
    receipt = await utils.deploy().send({from: myAccount,gas: gasLimit})
    utils.options.address = receipt._address

    console.log(`Utils contract deployed at ${utils.options.address}\n`)

}

if (process.argv[2]=='-a') { //case A: token1 cheaper on sushiswap

    deploy(10e2,5e2,1e4,10e4,1e6).then(()=>{process.exit(0)})

} 

if (process.argv[2]=='-b'){ //case B: token1 cheaper on uniswap

    deploy(1e2,10e2,3e4,10e4,1e6).then(()=>{process.exit(0)})

}

