require('dotenv').config()//for importing parameters
require('colors')//for console output
const Web3 = require('web3')

//ABIs
const IFactory = require('@uniswap/v2-core/build/IUniswapV2Factory.json')
const IPair = require('@uniswap/v2-core/build/IUniswapV2Pair.json')  
const IRouter = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json')
const Utils = require('../build/contracts/Utils.json')
const IERC20 = require('@uniswap/v2-periphery/build/IERC20.json')

//importing parameters from .env (mostly given)
const addrArbitrager = process.env.ADDR_ARBITRAGE_CONTRACT
const addrDai = process.env.ADDR_DAI
const addrEth = process.env.ADDR_ETH//indeed its weth, henceforth simply eth
const addrSFactory = process.env.ADDR_SFACTORY
const addrSRouter = process.env.ADDR_SROUTER
let addrToken0 = process.env.ADDR_TOKEN0
let addrToken1 = process.env.ADDR_TOKEN1
const addrUFactory = process.env.ADDR_UFACTORY
const addrURouter = process.env.ADDR_UROUTER
const addrUtils = process.env.ADDR_UTILS
const localDeplyment = process.env.LOCAL_DEPLOYMENT;
const priceToken0 = process.env.PRICE_TOKEN0
const priceToken1 = process.env.PRICE_TOKEN1
const privateKey = process.env.PRIVATE_KEY
const projectId = process.env.PROJECT_ID;
const validPeriod = process.env.VALID_PERIOD

if (addrToken0 > addrToken1) {aux=addrToken0; addrToken0=addrToken1; addrToken1=aux} //on uniswap pairs, tokens are sort by address, T0<T1

//setting up provider
let web3
if (localDeplyment) {

    const localProviderUrl = 'http://localhost:8545'
    const localProvider = new Web3.providers.WebsocketProvider(localProviderUrl)
    web3 = new Web3(localProvider)

} else {

    /* In this case we use an infura provider for mainnet, you could use whatever you want but 
    it cant be a http provider because it doesnt support web3 subscriptions (events).*/
    web3 = new Web3(`wss://mainnet.infura.io/ws/v3/${projectId}`)
}

//contracts
const uFactory = new web3.eth.Contract(IFactory.abi,addrUFactory)
const uRouter = new web3.eth.Contract(IRouter.abi,addrURouter)
const sFactory = new web3.eth.Contract(IFactory.abi,addrSFactory)//sushiswap, same ABIs, sushiswap forked uniswap so, basically same contracts
const sRouter = new web3.eth.Contract(IRouter.abi,addrSRouter)
const token0 = new web3.eth.Contract(IERC20.abi,addrToken0)//henceforth T0
const token1 = new web3.eth.Contract(IERC20.abi,addrToken1)//and T1
const utils = new web3.eth.Contract(Utils.abi, addrUtils)//because includes an support math function that its required

//asyncs variables
let uPair0,uPair1,sPair,myAccount,token0Name,token1Name,token0Symbol,token1Symbol
async function asyncsVar() {
    //will be used to determine eth price later
    uPair0 = new web3.eth.Contract(IPair.abi, (await uFactory.methods.getPair(addrEth, addrDai).call()) )
    //token pairs
    uPair1 = new web3.eth.Contract(IPair.abi, (await uFactory.methods.getPair(token0.options.address, token1.options.address).call()) )
    sPair = new web3.eth.Contract(IPair.abi, (await sFactory.methods.getPair(token0.options.address, token1.options.address).call()) )

    //account with you will be using to sign the transactions
    const accountObj = await web3.eth.accounts.privateKeyToAccount(privateKey)
    myAccount = accountObj.address

    token0Name = await token0.methods.name().call()
    token0Symbol = await token0.methods.symbol().call()
    token1Name = await token1.methods.name().call()
    token1Symbol = await token1.methods.symbol().call()
}

asyncsVar()

//listening for incoming new blocks
const newBlockEvent = web3.eth.subscribe('newBlockHeaders')

newBlockEvent.on('connected', () =>{console.log('\nBot listening!\n')})

//look up for a profit whenever a new block is minned
newBlockEvent.on('data', async function(blockHeader){

    try {

        let uReserves, uReserve0, uReserve1, sReserves, sReserve0, sReserve1

        //obtaining eth price from uniswap, pretty accurate
        uReserves = await uPair0.methods.getReserves().call()
        uReserve0 = uReserves[0] //dai
        uReserve1 = uReserves[1] //eth
        priceEth = (uReserve0/uReserve1) //dai per eth
            
        //token prices in eth, used bellow for determining if its possible to make a profit
        const priceToken0Eth = priceToken0*1/priceEth 
        const priceToken1Eth = priceToken1*1/priceEth 

        //tokens reserves on uniswap
        uReserves = await uPair1.methods.getReserves().call()
        uReserve0 = uReserves[0] //T0
        uReserve1 = uReserves[1] //T1
        
        //tokens reserves on sushiswap
        sReserves = await sPair.methods.getReserves().call()
        sReserve0 = sReserves[0] //T0
        sReserve1 = sReserves[1] //T1

        //compute amount that must be traded to maximize the profit and, trade direction; function provided by uniswap
        const result = await utils.methods.computeProfitMaximizingTrade(sReserve0,sReserve1,uReserve0,uReserve1).call()
        const aToB = result[0] //trade direction
        const amountIn = result[1]

        if (amountIn==0) {console.log(`No arbitrage opportunity on block ${blockHeader.number}\n`); return}
        
        if (aToB) { //T0->T1

            //amount of T1 received for swapping the precomputed amount of T0 on uniswap
            const amountOut = await uRouter.methods.getAmountOut(amountIn,uReserve0 ,uReserve1).call()

            //new reserves after trade
            const newUReserve0 = Number(uReserve0)+Number(amountIn)
            const newUReserve1 = Number(uReserve1)-Number(amountOut)

            //amount nedeed for repaying flashswap taken on sushiswap, used below
            const sAmountIn = await sRouter.methods.getAmountIn(amountIn,sReserve1 ,sReserve0).call()

            //sushiswap price
            const sPrice = 1/(sAmountIn/amountIn)//trade price

            //difference per T0 traded
            const difference =  amountOut/amountIn - 1/sPrice

            if (difference<=0) {console.log(`No arbitrage opportunity on block ${blockHeader.number}\n`); return}

            //total difference (difference*quantity traded)
            const totalDifference = difference*Math.round(amountIn/10**18)

            //time during the swap can be executed, after that it will be refused by uniswap
            const deadline = Math.round(Date.now()/1000)+validPeriod*60 
            
            //gas
            const gasNeeded = (0.3*10**6)*2 //previosly measured (line below), take to much time, overestimate 2x
            //const gasNeeded = await sPair.methods.swap(amountIn,0,addrArbitrager,abi).estimateGas()

            const gasPrice = await web3.eth.getGasPrice()
            const gasCost = Number(gasPrice)*gasNeeded/10**18

            //profitable?
            const profit = (totalDifference*priceToken1Eth)-gasCost

            console.log(
                `Block ${blockHeader.number}`.bgBlue+`\n\n`+
                `${token0Name} (${token0Symbol}) {T0} | ${token1Name} (${token1Symbol}) {T1} reserves\n\n`+
                `On Uniswap\n`+
                `${token0Symbol}: ${Math.round(uReserve0/10**18)} | ${token1Symbol}: ${Math.round(uReserve1/10**18)}\n\n`+
                `On Sushiswap\n`+
                `${token0Symbol}: ${Math.round(sReserve0/10**18)} | ${token1Symbol}: ${Math.round(sReserve1/10**18)}\n\n`+
                `Swap's direction\n`+
                `${token0Symbol} -> ${token1Symbol}\n\n`+
                `Uniswap's pool state\n`+
                `${token1Symbol} excess/${token0Symbol} shortage\n\n`+
                `On Uniswap\n`+
                `Mid price before swap: ${(uReserve0/uReserve1).toFixed(2)} ${token0Symbol}/${token1Symbol}\n`+
                `Mid price after swap: ${(newUReserve0/newUReserve1).toFixed(2)} ${token0Symbol}/${token1Symbol}\n`+
                `Swap ${Math.round(amountIn/10**18)} ${token0Symbol} for ${Math.round(amountOut/10**18)} ${token1Symbol}\n`+
                `Trade price: ${(1/(amountOut/amountIn)).toFixed(2)} ${token0Symbol}/${token1Symbol} (buy price)\n\n`+
                `Sushiswap price: ${(sPrice).toFixed(2)} ${token0Symbol}/${token1Symbol} (sell price)\n`+
                `Difference: ${(difference).toFixed(2)} ${token1Symbol}/${token0Symbol}\n`+
                `Total difference: ${(totalDifference*priceToken1Eth).toFixed(5)} ETH or ${totalDifference.toFixed(2)} ${token1Symbol}\n\n`+
                `Gas needed: ${gasNeeded/10**6}\n`+
                `Gas price: ${gasPrice/10**9} gwei\n`+
                `Gas cost: ${gasCost.toFixed(5)} ETH\n\n`+
                `${profit > 0 ? `Profit: ${profit.toFixed(5)} ETH or ${(profit*priceEth).toFixed(2)} DAI\n`.green: 
                `No profit! (gas cost higher than the total difference achievable)\n`.red}`
                )
            
            if (profit<=0) return;

            const abi = web3.eth.abi.encodeParameters(['uint256','uint256'], [sAmountIn,deadline])
            
            const tx = { //transaction
                from: myAccount, 
                to: sPair.options.address, 
                gas: gasNeeded, 
                data: sPair.methods.swap(amountIn,0,addrArbitrager,abi).encodeABI()
            }

            signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
            
            console.log('Tx pending')
            receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            
            console.log(
                `Tx mined, trade executed!\n`+
                `Tx hash: ${receipt.transactionHash}\n`
                )

        } else {//T1->T0

            const amountOut = await uRouter.methods.getAmountOut(amountIn,uReserve1,uReserve0).call()
            const newUReverve0 = Number(uReserve0)-Number(amountOut)
            const newUReverve1 = Number(uReserve1)+Number(amountIn)
            const sAmountIn = await sRouter.methods.getAmountIn(amountIn,sReserve0 ,sReserve1).call()
            const sPrice = sAmountIn/amountIn
            const difference = amountOut/amountIn - sPrice

            if (difference<=0) {console.log(`No arbitrage opportunity on block ${blockHeader.number}\n`); return}

            const totalDifference = difference*Math.round(amountIn/10**18)
            const deadline = Math.round(Date.now()/1000)+validPeriod*60 
            const gasNeeded = (0.3*10**6)*2
            const gasPrice = await web3.eth.getGasPrice()
            const gasCost = Number(gasPrice)*gasNeeded/10**18
            const profit = (totalDifference*priceToken0Eth)-gasCost

            console.log(
                `Block ${blockHeader.number}`.bgBlue+`\n\n`+
                `${token0Name} (${token0Symbol}) {T0} | ${token1Name} (${token1Symbol}) {T1} reserves\n\n`+
                `On Uniswap\n`+
                `${token0Symbol}: ${Math.round(uReserve0/10**18)} | ${token1Symbol}: ${Math.round(uReserve1/10**18)}\n\n`+
                `On Sushiswap\n`+
                `${token0Symbol}: ${Math.round(sReserve0/10**18)} | ${token1Symbol}: ${Math.round(sReserve1/10**18)}\n\n`+
                `Swap's direction\n`+
                `${token1Symbol} -> ${token0Symbol}\n\n`+
                `Uniswap's pool state\n`+
                `${token0Symbol} excess/${token1Symbol} shortage\n\n`+
                `On Uniswap\n`+
                `Mid price before swap: ${(uReserve0/uReserve1).toFixed(2)} ${token0Symbol}/${token1Symbol}\n`+
                `Mid price after swap: ${(newUReverve0/newUReverve1).toFixed(2)} ${token0Symbol}/${token1Symbol}\n`+
                `Swap ${Math.round(amountIn/10**18)} ${token1Symbol} for ${Math.round(amountOut/10**18)} ${token0Symbol}\n`+
                `Trade price: ${(amountOut/amountIn).toFixed(2)} ${token0Symbol}/${token1Symbol} (sell price)\n\n`+
                `Sushiswap price: ${sPrice.toFixed(2)} ${token0Symbol}/${token1Symbol} (buy price)\n`+
                `Difference: ${(difference).toFixed(2)} ${token0Symbol}/${token1Symbol}\n`+
                `Total difference: ${(totalDifference*priceToken0Eth).toFixed(5)} ETH or ${totalDifference.toFixed(2)} ${token0Symbol}\n\n`+
                `Gas needed: ${gasNeeded/10**6} M\n`+
                `Gas price: ${gasPrice/10**9} gwei\n`+
                `Gas cost: ${gasCost.toFixed(5)} ETH\n\n`+
                `${profit > 0 ? `Profit: ${profit.toFixed(5)} ETH or ${(profit*priceEth).toFixed(2)} DAI\n`.green :
                `No profit! (gas cost higher than the total difference achievable)\n`.red}`
                ) 
            
            if (profit<=0) return;

            const abi = web3.eth.abi.encodeParameters(['uint256','uint256'], [sAmountIn,deadline])
            const tx = { 
                from: myAccount, 
                to: sPair.options.address, 
                gas: gasNeeded, 
                data: sPair.methods.swap(0,amountIn,addrArbitrager,abi).encodeABI()
            }
            signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
            console.log('Tx pending')
            receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            console.log(
                'Tx mined, trade executed!\n'+
                `Tx hash: ${receipt.transactionHash}\n`
                )
        
        }

    } 
    
    catch(error) {

        console.log(error)

    }

})

newBlockEvent.on('error', console.error);




