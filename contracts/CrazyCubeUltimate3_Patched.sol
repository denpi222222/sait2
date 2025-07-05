// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CrazyCubeUltimate3.sol";

/**
 * @title CrazyCubeUltimate3_Patched
 * @notice Мини-апгрейд: добавлен только один сеттер `setRarityBonusBps`.
 *         Storage-layout не меняется, поэтому прокси-апгрейд безопасен.
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
     * @notice Изменяет бонус (bps) для указанной rarity.
     * @dev    Доступно роли CONFIGURATOR_ROLE.
     * @param rarity  Значение 1-6 (Common-Legendary+)
     * @param bps     Новое значение в базис-пунктах (0-10_000; 10_000 = 100%)
     */
    function setRarityBonusBps(uint8 rarity, uint16 bps)
        external
        onlyRole(CONFIGURATOR_ROLE)
    {
        require(rarity >= 1 && rarity <= 6, "rarity");
        require(bps < 10_000,             "bps>=100%");

        // Логируем старое и новое значение через стандартное событие
        emit ConfigChanged(
            string(abi.encodePacked("rarityBonusBps[", _toString(rarity), "]")),
            rarityBonusBps[rarity],
            bps
        );

        rarityBonusBps[rarity] = bps;
    }

    /**
     * @notice Меняет комиссию за операцию burn (в базис-пунктах)
     * @dev    Доступно роли CONFIGURATOR_ROLE. 1 bp = 0.01 %; лимит 0-10 000 (100 %)
     * @param newBps Новое значение burnFeeBps
     */
    function setBurnFeeBps(uint16 newBps) external onlyRole(CONFIGURATOR_ROLE) {
        require(newBps <= 10_000, "bps>100%" );
        emit ConfigChanged("burnFeeBps", burnFeeBps, newBps);
        burnFeeBps = newBps;
    }
} 