// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ImprovedRandom
 * @dev Улучшенная генерация псевдо-рандома для блокчейн игр
 * @notice Использует block.prevrandao + tx.origin + множественные источники энтропии
 */
contract ImprovedRandom {
    
    // Внутренний счетчик для уникальности
    uint256 private randomNonce;
    
    /**
     * @dev Текущий метод (для сравнения)
     * Использует: blockhash + timestamp + msg.sender + salt
     */
    function _localRandom(bytes32 salt) internal view returns (bytes32) {
        bytes32 h = blockhash(block.number - 1);
        return keccak256(abi.encodePacked(h, block.timestamp, msg.sender, salt));
    }
    
    /**
     * @dev Предложенный метод с block.prevrandao + tx.origin
     * Более современный подход для Ethereum 2.0
     */
    function _improvedRandom(bytes32 salt) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.prevrandao,  // Новый источник рандомности в Ethereum
            tx.origin,         // Изначальный отправитель транзакции
            block.timestamp,
            msg.sender,
            salt
        ));
    }
    
    /**
     * @dev Гибридный метод - совместимость + современность
     * Автоматически выбирает лучший доступный источник энтропии
     */
    function _hybridRandom(bytes32 salt) internal view returns (bytes32) {
        bytes32 entropy;
        
        // Используем prevrandao если доступен, иначе blockhash
        if (block.prevrandao != 0) {
            entropy = bytes32(block.prevrandao);
        } else {
            entropy = blockhash(block.number - 1);
        }
        
        return keccak256(abi.encodePacked(
            entropy,
            block.timestamp,
            block.number,
            msg.sender,
            tx.origin,
            salt
        ));
    }
    
    /**
     * @dev РЕКОМЕНДУЕМЫЙ метод - максимальная энтропия
     * Использует все доступные источники рандомности
     */
    function _enhancedRandom(bytes32 salt) internal returns (bytes32) {
        bytes32 entropy;
        
        // Выбираем лучший доступный источник
        if (block.prevrandao != 0) {
            entropy = bytes32(block.prevrandao);
        } else {
            entropy = blockhash(block.number - 1);
        }
        
        // Увеличиваем nonce для уникальности
        randomNonce++;
        
        return keccak256(abi.encodePacked(
            entropy,                    // Основной источник рандомности
            block.timestamp,            // Время блока
            block.number,              // Номер блока
            block.gaslimit,            // Лимит газа (изменяется)
            msg.sender,                // Адрес вызывающего
            tx.origin,                 // Изначальный отправитель
            tx.gasprice,               // Цена газа
            salt,                      // Пользовательская соль
            randomNonce                // Внутренний счетчик
        ));
    }
    
    /**
     * @dev Специальная версия для breed - дополнительная энтропия от родителей
     * Включает ID родителей для еще большей уникальности
     */
    function _breedRandom(
        bytes32 salt,
        uint256 parent1Id,
        uint256 parent2Id
    ) internal returns (bytes32) {
        bytes32 entropy;
        
        if (block.prevrandao != 0) {
            entropy = bytes32(block.prevrandao);
        } else {
            entropy = blockhash(block.number - 1);
        }
        
        randomNonce++;
        
        return keccak256(abi.encodePacked(
            entropy,
            block.timestamp,
            block.number,
            block.gaslimit,
            msg.sender,
            tx.origin,
            tx.gasprice,
            salt,
            parent1Id,                 // ID первого родителя
            parent2Id,                 // ID второго родителя
            randomNonce
        ));
    }
    
    /**
     * @dev Проверка доступности block.prevrandao
     * Полезно для определения какой метод использовать
     */
    function isPrevrandaoAvailable() public view returns (bool) {
        return block.prevrandao != 0;
    }
    
    /**
     * @dev Получить текущий nonce (для отладки)
     */
    function getCurrentNonce() public view returns (uint256) {
        return randomNonce;
    }
    
    /**
     * @dev Демо функция для сравнения разных методов
     * Возвращает результаты всех методов для анализа
     */
    function compareRandomMethods(bytes32 salt) external returns (
        bytes32 local,
        bytes32 improved,
        bytes32 hybrid,
        bytes32 enhanced,
        bool prevrandaoAvailable
    ) {
        local = _localRandom(salt);
        improved = _improvedRandom(salt);
        hybrid = _hybridRandom(salt);
        enhanced = _enhancedRandom(salt);
        prevrandaoAvailable = isPrevrandaoAvailable();
    }
}

/**
 * @title RandomTester
 * @dev Контракт для тестирования разных методов рандома
 */
contract RandomTester is ImprovedRandom {
    
    event RandomGenerated(
        string method,
        bytes32 result,
        uint256 gasUsed
    );
    
    /**
     * @dev Тест всех методов рандома с измерением газа
     */
    function testAllMethods(bytes32 salt) external {
        uint256 gasStart;
        uint256 gasUsed;
        
        // Тест текущего метода
        gasStart = gasleft();
        bytes32 localResult = _localRandom(salt);
        gasUsed = gasStart - gasleft();
        emit RandomGenerated("local", localResult, gasUsed);
        
        // Тест улучшенного метода
        gasStart = gasleft();
        bytes32 improvedResult = _improvedRandom(salt);
        gasUsed = gasStart - gasleft();
        emit RandomGenerated("improved", improvedResult, gasUsed);
        
        // Тест гибридного метода
        gasStart = gasleft();
        bytes32 hybridResult = _hybridRandom(salt);
        gasUsed = gasStart - gasleft();
        emit RandomGenerated("hybrid", hybridResult, gasUsed);
        
        // Тест рекомендуемого метода
        gasStart = gasleft();
        bytes32 enhancedResult = _enhancedRandom(salt);
        gasUsed = gasStart - gasleft();
        emit RandomGenerated("enhanced", enhancedResult, gasUsed);
    }
} 