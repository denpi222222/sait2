// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ImprovedRandom
 * @dev Improved pseudo-random generation for blockchain games
 * @notice Uses block.prevrandao + tx.origin + multiple entropy sources
 */
contract ImprovedRandom {
    
    // Internal counter for uniqueness
    uint256 private randomNonce;
    
    /**
     * @dev Current method (for comparison)
     * Uses: blockhash + timestamp + msg.sender + salt
     */
    function _localRandom(bytes32 salt) internal view returns (bytes32) {
        bytes32 h = blockhash(block.number - 1);
        return keccak256(abi.encodePacked(h, block.timestamp, msg.sender, salt));
    }
    
    /**
     * @dev Proposed method with block.prevrandao + tx.origin
     * More modern approach for Ethereum 2.0
     */
    function _improvedRandom(bytes32 salt) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.prevrandao,  // New randomness source in Ethereum
            tx.origin,         // Original transaction sender
            block.timestamp,
            msg.sender,
            salt
        ));
    }
    
    /**
     * @dev Hybrid method - compatibility + modernity
     * Automatically selects the best available source of entropy
     */
    function _hybridRandom(bytes32 salt) internal view returns (bytes32) {
        bytes32 entropy;
        
        // Use prevrandao if available, otherwise blockhash
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
     * @dev RECOMMENDED method - maximum entropy
     * Uses all available sources of randomness
     */
    function _enhancedRandom(bytes32 salt) internal returns (bytes32) {
        bytes32 entropy;
        
        // Choose best available source
        if (block.prevrandao != 0) {
            entropy = bytes32(block.prevrandao);
        } else {
            entropy = blockhash(block.number - 1);
        }
        
        // Increase nonce for uniqueness
        randomNonce++;
        
        return keccak256(abi.encodePacked(
            entropy,                    // Main randomness source
            block.timestamp,            // Block time
            block.number,              // Block number
            block.gaslimit,            // Gas limit (changes)
            msg.sender,                // Caller address
            tx.origin,                 // Original sender
            tx.gasprice,               // Gas price
            salt,                      // User salt
            randomNonce                // Internal counter
        ));
    }
    
    /**
     * @dev Special version for breed - additional entropy from parents
     * Includes parent IDs for even greater uniqueness
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
            parent1Id,                 // ID first parent
            parent2Id,                 // ID second parent
            randomNonce
        ));
    }
    
    /**
     * @dev Check availability of block.prevrandao
     * Useful for determining which method to use
     */
    function isPrevrandaoAvailable() public view returns (bool) {
        return block.prevrandao != 0;
    }
    
    /**
     * @dev Get current nonce (for debugging)
     */
    function getCurrentNonce() public view returns (uint256) {
        return randomNonce;
    }
    
    /**
     * @dev Demo function for comparing different methods
     * Returns results of all methods for analysis
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
 * @dev Contract for testing different random methods
 */
contract RandomTester is ImprovedRandom {
    
    event RandomGenerated(
        string method,
        bytes32 result,
        uint256 gasUsed
    );
    
    /**
     * @dev Test all methods with gas measurement
     */
    function testAllMethods(bytes32 salt) external {
        uint256 gasStart;
        uint256 gasUsed;
        
        // Test current method
        gasStart = gasleft();
        bytes32 localResult = _localRandom(salt);
        gasUsed = gasStart - gasleft();
        emit RandomGenerated("local", localResult, gasUsed);
        
        // Test improved method
        gasStart = gasleft();
        bytes32 improvedResult = _improvedRandom(salt);
        gasUsed = gasStart - gasleft();
        emit RandomGenerated("improved", improvedResult, gasUsed);
        
        // Test hybrid method
        gasStart = gasleft();
        bytes32 hybridResult = _hybridRandom(salt);
        gasUsed = gasStart - gasleft();
        emit RandomGenerated("hybrid", hybridResult, gasUsed);
        
        // Test recommended method
        gasStart = gasleft();
        bytes32 enhancedResult = _enhancedRandom(salt);
        gasUsed = gasStart - gasleft();
        emit RandomGenerated("enhanced", enhancedResult, gasUsed);
    }
} 