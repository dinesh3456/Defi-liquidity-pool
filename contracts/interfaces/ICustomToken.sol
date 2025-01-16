// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICustomToken is IERC20 {
    /**
     * @notice Mint new tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice Get token decimals
     * @return Number of decimals
     */
    function decimals() external view returns (uint8);

    /**
     * @notice Get token name
     * @return Name of the token
     */
    function name() external view returns (string memory);

    /**
     * @notice Get token symbol
     * @return Symbol of the token
     */
    function symbol() external view returns (string memory);
}
