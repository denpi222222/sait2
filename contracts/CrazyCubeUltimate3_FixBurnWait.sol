// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CrazyCubeUltimate3.sol";

/**
 * @title CrazyCubeUltimate3_FixBurnWait
 * @notice Мини-патч: правильный часовой cooldown для Graveyard
 *          и проверка «труп готов» при выборе для revive.
 * @dev 1) storage-layout не меняем — прокси остаётся валиден  
 *      2) используем существующие helper функции из базового контракта
 */
contract CrazyCubeUltimate3_FixBurnWait is CrazyCubeUltimate3 {

    /* ---------- override key part of _fulfill ---------- */
    function _fulfill(bytes32 requestId, bytes32 randomness) internal override {
        BreedRequest memory request = s_breedRequests[requestId];
        if (!request.exists) return;

        //--- удаляем request из очереди (как в оригинале) ---
        delete s_breedRequests[requestId];
        uint256 idx = pendingBreedIndex[requestId];
        uint256 last = pendingBreedIds.length - 1;
        if (idx < pendingBreedIds.length) {
            bytes32 lastId = pendingBreedIds[last];
            pendingBreedIds[idx] = lastId;
            pendingBreedIndex[lastId] = idx;
            pendingBreedIds.pop();
            delete pendingBreedIndex[requestId];
        }

        uint256 n = graveyardTokens.length;
        if (n == 0) {
            _refundBreedCost(request.requester);
            return;
        }

        /* ---------- новая логика выбора готового трупа ---------- */
        uint256 start = uint256(randomness) % n;
        uint256 attempts = n;
        uint256 tokenIdReady = 0;

        while (attempts-- > 0) {
            uint256 cand = graveyardTokens[(start + attempts) % n];
            if (_isCorpseReady(cand)) { tokenIdReady = cand; break; }
        }

        if (tokenIdReady == 0) revert NoCorpseReady();

        _finalizeBreed(request.requester,
                       request.parent1Id,
                       request.parent2Id,
                       tokenIdReady);
    }
} 