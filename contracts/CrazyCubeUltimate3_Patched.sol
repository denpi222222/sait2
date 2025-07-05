// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CrazyCubeUltimate3.sol";

/**
 * @title CrazyCubeUltimate3_Patched
 * @author CrazyCube Team
 * @notice Mini-upgrade: added only one setter `setRarityBonusBps`.
 *         Storage-layout doesn't change, so proxy-upgrade is safe.
 * @dev    This contract can be deployed via proxy upgrade from CrazyCubeUltimate3.
 */
contract CrazyCubeUltimate3_Patched is CrazyCubeUltimate3 {

    /// @notice Converts uint256 to its decimal string representation (internal helper)
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @notice Changes bonus (bps) for specified rarity.
     * @dev    Available to CONFIGURATOR_ROLE.
     * @param rarity Target rarity (1-6)
     * @param newBps New bonus in basis points (max 50000 = 500%)
     */
    function setRarityBonusBps(uint8 rarity, uint16 bps)
        external
        onlyRole(CONFIGURATOR_ROLE)
    {
        require(rarity >= 1 && rarity <= 6, "rarity");
        require(bps < 10_000,             "bps>=100%");

        // Log old and new value through standard event
        emit ConfigChanged(
            string(abi.encodePacked("rarityBonusBps[", _toString(rarity), "]")),
            rarityBonusBps[rarity],
            bps
        );

        rarityBonusBps[rarity] = bps;
    }

    /**
     * @notice Changes burn fee (bps)
     * @dev    Available to CONFIGURATOR_ROLE. 1 bp = 0.01 %; limit 0-10 000 (100 %)
     * @param newBps New value for burnFeeBps
     */
    function setBurnFeeBps(uint16 newBps) external onlyRole(CONFIGURATOR_ROLE) {
        require(newBps <= 10_000, "bps>100%" );
        emit ConfigChanged("burnFeeBps", burnFeeBps, newBps);
        burnFeeBps = newBps;
    }
} 