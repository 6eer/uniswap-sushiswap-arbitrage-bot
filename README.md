*I'm not maintaining the project anymore, feel free to talk to others in the issues section*

# Making arbitrage between Uniswap V2 and Sushiswap

## Index
+ [What its included in this repo?](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot#what-its-included-in-this-repo)
+ [Installation](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot#installation)
+ [Running the demo](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot#running-the-demo)
+ [Running on a ethereum network](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot#running-on-a-ethereum-network)
+ [Notes](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot#notes)
+ [Considerations for production](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot#considerations-for-production)
+ [Useful resources](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot#useful-resources)
+ [License](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot#license)

## What its included in this repo?

1) Two bots written in JS that observe the prices changes on a pre user-defined liquidity pool at Uniswap V2 / Sushiswap and determine if its possibly to make a profit buying tokens cheaper at one exchange to selling them after for a bigger amount in the other, keeping the difference (profit). They only differ in how they get the tokens for making the arbitrage. One bot uses **flashswap**, this kind of swaps basically works as if you were taking a ‘free of charge' loan (no fee associated like normal loans works on 'real banks') to borrow the token needed to do the trade, repaying then the loan with some of the tokens you received, keeping the remaining to you. The other uses **normal swaps**, this bot require you to be holding the tokens needed to do the trade but it contrast it cost less gas to execute. In both cases Uniswap, like all the others exchanges, charges on you a fee for using their services (swapping tokens in this case), this fee currently is 0.3%. To see more on how flashswap or normal swaps works visit the [Uniswap docs](https://uniswap.org/docs/v2/).

2) A demo that you can easily run to see the bots in action. Basically consist of forking ethereum mainnet locally, run the demo script that do the set ups for you and execute the bots.

3) Proposed improvements for possible production stage.

First it will be explained how to install the required tools (probably you have already installed some of them, feel free to jump to the sections that you wish). Then I introduce how to run the demo, here assume that you are kind of newbie in blockchain and you don’t understand quiet well whats happening so its deeply explained. After, a very basic guide line to put the bots to work on an ethereum network, mainnet or testnet, I assume you know what you are doing at this point. Finally some improvements for a possible production stage and useful resourses are given.

## Installation

On Debian based linux distro (like Ubuntu), open a terminal and follow the instructions bellow.

1) Install git, to clone the repo  

```bash
sudo apt install git-all
```
2) Install nvm, tool for manage node versions in your system.
```bash
sudo apt install curl
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
``` 
3) Install node version required.
 
```bash
nvm install 12.22.1
```
4) Clone the repo and install its dependencies.
```bash
cd
git clone https://github.com/6eer/uniswap-sushiswap-arbitrage-bot.git
cd uniswap-sushiswap-arbitrage-bot
npm install
npm install -g ganache-cli
git clone https://github.com/sushiswap/sushiswap.git
```
## Running the demo

1) The ‘annoying’ part. In order to execute the bots you need to create an account on an ethereum provider, companies that maintain their own ethereum nodes, which you can use generally for free (with limited functions, but for us, it enough) to communicate with the ethereum blockchain. You can use whatever provider you desired (check what services they gives you for free) but for run the demo you need a provider that gives access to an **archive node** (special kind of node) and *Alchemy* do it for free, besides you can sing up with google account, so, its quiet fast. Once logged in, generally you must to create a project and then they assign to it a ‘link’ (indeed its a kind of key) that allows you to uses their services. In Alchemy looks like,

   https://eth-mainnet.alchemyapi.io/v2/qolQHYLqPhksKzW-QBEzlzdW14pRZnTr


2) Create a .env file on the root project directory with the paremeters of the bots, for the demo an example .env with valid parameters can be created as follow
```bash
printf "ADDR_ARBITRAGE_CONTRACT = '0x3eA3E0816b7Caf6e12D5083D02D4cb5e4330CE18'\nADDR_DAI = '0x6b175474e89094c44da98b954eedeac495271d0f'\nADDR_ETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'\nADDR_SFACTORY = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'\nADDR_SROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'\nADDR_TOKEN0 = '0x55B7162F06e4Cf5b2e06E5757c1e474dB8E10516'\nADDR_TOKEN1 = '0xedC71FcFD28912ab32b21Efaa906f39F628De110'\nADDR_UFACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'\nADDR_UROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'\nADDR_UTILS = '0xE78941610Ffef0eEA391BAe6d842175E389973E9'\nLOCAL_DEPLOYMENT = true\nPRICE_TOKEN0 = 190.2\nPRICE_TOKEN1 = 235.7\nPRIVATE_KEY = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d'\nPROJECT_ID = '3c40e9b697e547b4ae7e72dceb82ad11'\nVALID_PERIOD = 5\n" > .env
```
3) Open a new terminal on the same location and execute, replacing the ‘link’ used here as example with your Alchemy link
```bash
ganache-cli --fork https://eth-mainnet.alchemyapi.io/v2/qolQHYLqPhksKzW-QBEzlzdW14pRZnTr -b 2 -d
```
4) On the terminal thats you use to create .env or in a new one run the demo script with -a or -b option for use one of the two swaps directions possibles.
```bash
node ./src/demo_environment.js -a
#or
node ./src/demo_environment.js -b
```
This script will create two tokens and their correspond liquidity pools on Uniswap and Sushiswap with certain amounts that make an arbitrage opportunity possible.

5) Finally, execute the bot you want to use.
```bash
node ./src/bot_flashswap.js
#or
node ./src/bot_normalswap.js
```
Once the arbitrage occur (you will notice because the logs on the console) Ctrol+C to stop the bots.

## Running on a ethereum network

1) Need to set up a provider, the code its setted up to use Infura but you can easily change it.

2) Deploy the arbitrager contract if you gonna use bot_flashswap.js and in both cases you need to deploy the utils contract.

3) Create a .env file on the project directory with valid parameter values, see bot_flashswap.js or bot_normalswap.js to see what they are.

4) Assuming you own an account with the enough eth for paying the gas and fees (and if you use normal swap the tokens as well) you are ready to run the bots. **_Remember that as they are, the bots are not ready for production and even with the changes proposed bellow I dont recommend use them for that porpuse, do it at your own risk_**.

## Notes

+ **10/07/21 ->** If u are having gas issues, check out [this tiny thread](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot/issues/2)

+ **14/06/21 ->** I realize that the arbitrage, in the manner that I did it, its not rigth conceptually. The proper way, I think, it would have been using a CEX (Centralized EXchange) like Binance or Coinbase as off-chain oracle and use Avee (lending platform) [flashloans](https://aave.com/flash-loans/) (similar to how flashswaps works) to arbitrage whatever DEX (Decentralized EXchanges) I wished. The only 'drawback' that I can see with this approach is that you must pay back the flashloan in the same asset you borrow so you probably need and extra trade. Personally I only understand how Uniswap like exchanges works, in other words, AMMs that uses the constant product formula to set the price [(here more info)](https://defiweekly.substack.com/p/the-state-of-amms-3ad). What Im trying to say its that I dont know if other kind of AMMs are arbitrageable (I remember hear about a DEX that auto regulates its prices), so keep that in mind. But, that said, I think it is a good project to get confidence with the ethereum blackchain, understand how it works, the software stack and learn how one of the most important protocols that the network has, Uniswap, works. Good luck!

## Considerations for production

+ Read [this issue](https://github.com/6eer/uniswap-sushiswap-arbitrage-bot/issues/5) (useful).

+ Its **_very important_** that you set up an aproppiate value to amountOutMin on
```javascript
function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
)
```
for safety reasons, if not you could be losing money. see Uniswap docs for more info. (This function is used in bot_normalswap.js and Arbitrager.sol).

+ You probably wanna embedded the logic available at Utils.sol on the bots scripts, avoiding the cost of deploy the Utils contract.

+ Use child process for each block.

+ Maybe an improvement on robustness using event subscription to UniswapV2Pair.Swap() and ERC20.Approval() events can be achieved.

+ Select the pools automatically based on, for example, the amount of arbitrage opportunities in the past.

+ Probably dockerized the app its a good idea (for portability reasons).

+ Instead of printing to the console, print only the trades on a file (kinda silly, I know).

## Useful resources

[Build a Flash Loan Arbitrage Bot on Infura](https://blog.infura.io/build-a-flash-loan-arbitrage-bot-on-infura-part-i/?&utm_source=social&utm_medium=facebook&utm_campaign=Tutorials&utm_content=flashbot1) (If you are lost I personally recommend read this post)

[How does Ethereum work, anyway?](https://preethikasireddy.medium.com/how-does-ethereum-work-anyway-22d1df506369)

[Life Cycle of an Ethereum Transaction](https://medium.com/blockchannel/life-cycle-of-an-ethereum-transaction-e5c66bae0f6e)

[Ganache CLI](https://github.com/trufflesuite/ganache-cli/blob/master/README.md)

[Uniswap docs](https://uniswap.org/docs/v2/)

[Web3 docs](https://web3js.readthedocs.io/en/v1.3.4/)

[Truffle docs](https://www.trufflesuite.com/docs/truffle/overview)

[Solidity docs](https://docs.soliditylang.org/en/v0.8.5/)

## License

[MIT](https://tldrlegal.com/license/mit-license)
