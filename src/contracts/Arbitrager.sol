// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

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
      address token0 = IUniswapV2Pair(msg.sender).token0();
      address token1 = IUniswapV2Pair(msg.sender).token1();
      uint amountEntryToken;
      IERC20 entryToken;
      IERC20 exitToken;
      if (_amount0 == 0) {
        amountEntryToken =_amount1;
        entryToken = IERC20(token1);
        exitToken = IERC20(token0);
        approveToken(entryToken, amountEntryToken);
        path[0] = token1; 
        path[1] = token0;
        takeProfit(exitToken, _sender, amountRequired, amountEntryToken, path, deadline);
      } else {
        amountEntryToken = _amount0;
        entryToken = IERC20(token0);
        exitToken = IERC20(token1);
        approveToken(entryToken, amountEntryToken);
        path[0] = token0;
        path[1] = token1;
        takeProfit(exitToken, _sender, amountRequired, amountEntryToken, path, deadline);
      }
  }

  function approveToken(IERC20 entryToken, uint amountEntryToken) private {
     entryToken.approve(address(uRouter), amountEntryToken);  
  }

  function takeProfit(IERC20 exitToken, address _sender, uint amountRequired, uint amountEntryToken, address[] memory path, uint deadline) private {
       uint amountReceived = uRouter.swapExactTokensForTokens(amountEntryToken, 0, path, address(this), deadline)[1];
       exitToken.transfer(msg.sender, amountRequired);
       exitToken.transfer(_sender, amountReceived-amountRequired);   
  }

}
