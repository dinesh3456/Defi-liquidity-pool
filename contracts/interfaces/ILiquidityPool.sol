// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILiquidityPool {
    /* ========== EVENTS ========== */
    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 shares
    );
    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 shares
    );
    event Swapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event EmergencyPaused(address indexed operator);
    event EmergencyUnpaused(address indexed operator);

    /* ========== CUSTOM ERRORS ========== */
    error ZeroAmountError();
    error InsufficientLiquidityError();
    error InsufficientSharesError();
    error InvalidTokenError();
    error PoolPausedError();
    error SlippageExceededError();
    error TransferFailedError();
    error PoolOverflowError();
    error InvalidDeadlineError();

    /* ========== FUNCTIONS ========== */
    function addLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external returns (uint256 sharesMinted);

    function removeLiquidity(
        uint256 shareAmount
    ) external returns (uint256 amountA, uint256 amountB);

    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (uint256 amountOut);

    function getReserves()
        external
        view
        returns (uint256 reserveA, uint256 reserveB);

    function getAmountOut(
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256);

    function getTokenA() external view returns (IERC20);

    function getTokenB() external view returns (IERC20);

    function isPaused() external view returns (bool);

    function totalShares() external view returns (uint256);

    function shares(address user) external view returns (uint256);

    function pause() external;

    function unpause() external;
}
