pragma solidity =0.6.6;

import 'sushiswap/contracts/uniswapv2/libraries/UniswapV2Library.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-core/contracts/interfaces/IERC20.sol';

contract Arbitrager {
  address immutable sFactory;
  IUniswapV2Router02 immutable uRouter;

  constructor(address _sFactory, address _uRouter) public {
    sFactory = _sFactory;  
    uRouter = IUniswapV2Router02(_uRouter);
  }

  function uniswapV2Call(address _sender, uint _amount0, uint _amount1, bytes calldata _data) external {
      address[] memory path = new address[](2);
      (uint amountRequired, uint deadline) = abi.decode(_data, (uint, uint));
      if (_amount0 == 0) {
        uint amountEntryToken =_amount1;
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        IERC20 entryToken = IERC20(token1);
        IERC20 exitToken = IERC20(token0);
        entryToken.approve(address(uRouter), amountEntryToken);  
        path[0] = token1; 
        path[1] = token0;
        uint amountReceived = uRouter.swapExactTokensForTokens(amountEntryToken, 0, path, address(this), deadline)[1];
        exitToken.transfer(msg.sender, amountRequired);      
        exitToken.transfer(_sender, amountReceived-amountRequired);   
      } else {
        uint amountEntryToken = _amount0;
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        IERC20 entryToken = IERC20(token0);
        IERC20 exitToken = IERC20(token1);
        entryToken.approve(address(uRouter), amountEntryToken);
        path[0] = token0;
        path[1] = token1;
        uint amountReceived = uRouter.swapExactTokensForTokens(amountEntryToken, 0, path, address(this), deadline)[1];
        exitToken.transfer(msg.sender, amountRequired);
        exitToken.transfer(_sender, amountReceived-amountRequired);   
      }
  }

  

}