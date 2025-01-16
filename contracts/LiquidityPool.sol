// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILiquidityPool.sol";

contract LiquidityPool is ILiquidityPool, ReentrancyGuard, Ownable {
    /* ========== STATE VARIABLES ========== */
    IERC20 private immutable _tokenA;
    IERC20 private immutable _tokenB;

    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    uint256 private constant FEE_NUMERATOR = 997;
    uint256 private constant FEE_DENOMINATOR = 1000;

    bool private _paused;
    uint256 private _totalShares;
    mapping(address => uint256) private _shares;

    /* ========== MODIFIERS ========== */
    modifier whenNotPaused() {
        if (_paused) revert PoolPausedError();
        _;
    }

    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert SlippageExceededError();
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    constructor(address tokenA_, address tokenB_) Ownable(msg.sender) {
        if (
            tokenA_ == address(0) || tokenB_ == address(0) || tokenA_ == tokenB_
        ) revert InvalidTokenError();
        _tokenA = IERC20(tokenA_);
        _tokenB = IERC20(tokenB_);
    }

    /* ========== EXTERNAL FUNCTIONS ========== */
    function addLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant whenNotPaused returns (uint256 sharesMinted) {
        if (amountA == 0 || amountB == 0) revert ZeroAmountError();

        uint256 balanceA = _tokenA.balanceOf(address(this));
        uint256 balanceB = _tokenB.balanceOf(address(this));

        sharesMinted = _totalShares == 0
            ? _sqrt(amountA * amountB) - MINIMUM_LIQUIDITY
            : _min(
                (amountA * _totalShares) / balanceA,
                (amountB * _totalShares) / balanceB
            );

        if (sharesMinted == 0) revert InsufficientLiquidityError();

        _mint(msg.sender, sharesMinted);

        if (!_safeTransferFrom(_tokenA, msg.sender, address(this), amountA))
            revert TransferFailedError();
        if (!_safeTransferFrom(_tokenB, msg.sender, address(this), amountB))
            revert TransferFailedError();

        emit LiquidityAdded(msg.sender, amountA, amountB, sharesMinted);
    }

    function removeLiquidity(
        uint256 shareAmount
    )
        external
        nonReentrant
        whenNotPaused
        returns (uint256 amountA, uint256 amountB)
    {
        if (shareAmount == 0) revert ZeroAmountError();
        if (_shares[msg.sender] < shareAmount) revert InsufficientSharesError();

        uint256 balanceA = _tokenA.balanceOf(address(this));
        uint256 balanceB = _tokenB.balanceOf(address(this));

        amountA = (balanceA * shareAmount) / _totalShares;
        amountB = (balanceB * shareAmount) / _totalShares;

        if (amountA == 0 || amountB == 0) revert InsufficientLiquidityError();

        _burn(msg.sender, shareAmount);

        if (!_safeTransfer(_tokenA, msg.sender, amountA))
            revert TransferFailedError();
        if (!_safeTransfer(_tokenB, msg.sender, amountB))
            revert TransferFailedError();

        emit LiquidityRemoved(msg.sender, amountA, amountB, shareAmount);
    }

    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (block.timestamp > deadline) {
            revert InvalidDeadlineError();
        }
        if (amountIn == 0) revert ZeroAmountError();
        if (tokenIn != address(_tokenA) && tokenIn != address(_tokenB))
            revert InvalidTokenError();

        bool isTokenA = tokenIn == address(_tokenA);
        IERC20 tokenInput = isTokenA ? _tokenA : _tokenB;
        IERC20 tokenOutput = isTokenA ? _tokenB : _tokenA;

        uint256 reserveIn = tokenInput.balanceOf(address(this));
        uint256 reserveOut = tokenOutput.balanceOf(address(this));

        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        amountOut =
            (amountInWithFee * reserveOut) /
            ((reserveIn * FEE_DENOMINATOR) + amountInWithFee);

        if (amountOut < minAmountOut) revert SlippageExceededError();

        if (!_safeTransferFrom(tokenInput, msg.sender, address(this), amountIn))
            revert TransferFailedError();
        if (!_safeTransfer(tokenOutput, msg.sender, amountOut))
            revert TransferFailedError();

        emit Swapped(
            msg.sender,
            address(tokenInput),
            address(tokenOutput),
            amountIn,
            amountOut
        );
    }

    /* ========== VIEW FUNCTIONS ========== */
    function getReserves()
        external
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        return (
            _tokenA.balanceOf(address(this)),
            _tokenB.balanceOf(address(this))
        );
    }

    function getAmountOut(
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256) {
        if (tokenIn != address(_tokenA) && tokenIn != address(_tokenB))
            revert InvalidTokenError();
        if (amountIn == 0) revert ZeroAmountError();

        uint256 reserveIn = tokenIn == address(_tokenA)
            ? _tokenA.balanceOf(address(this))
            : _tokenB.balanceOf(address(this));
        uint256 reserveOut = tokenIn == address(_tokenA)
            ? _tokenB.balanceOf(address(this))
            : _tokenA.balanceOf(address(this));

        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        return
            (amountInWithFee * reserveOut) /
            ((reserveIn * FEE_DENOMINATOR) + amountInWithFee);
    }

    function getTokenA() external view returns (IERC20) {
        return _tokenA;
    }

    function getTokenB() external view returns (IERC20) {
        return _tokenB;
    }

    function isPaused() external view returns (bool) {
        return _paused;
    }

    function totalShares() external view returns (uint256) {
        return _totalShares;
    }

    function shares(address user) external view returns (uint256) {
        return _shares[user];
    }

    /* ========== ADMIN FUNCTIONS ========== */
    function pause() external onlyOwner {
        _paused = true;
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    /* ========== INTERNAL FUNCTIONS ========== */
    function _mint(address to, uint256 amount) internal {
        _shares[to] += amount;
        _totalShares += amount;
    }

    function _burn(address from, uint256 amount) internal {
        _shares[from] -= amount;
        _totalShares -= amount;
    }

    function _safeTransfer(
        IERC20 token,
        address to,
        uint256 amount
    ) internal returns (bool) {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        return success && (data.length == 0 || abi.decode(data, (bool)));
    }

    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) internal returns (bool) {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                from,
                to,
                amount
            )
        );
        return success && (data.length == 0 || abi.decode(data, (bool)));
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
