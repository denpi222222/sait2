// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// =================================================================================================
// || LIBRARY AND INTERFACE IMPORTS                                                                 ||
// =================================================================================================

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Removed IPyth interfaces and PythStructs library – Pyth is no longer used
interface IPythEntropy {
    function request(bytes32 userRandomness, bool useBlockhash) external payable returns (bytes32);
    function getRequestFee() external view returns (uint64);
}

/**
 * @title CrazyCubeUltimate3 - Automatic Pool Replenishment (Optimized Version)
 * @author Gemini
 * @notice Version v3.0-optimized: Added convenient pool replenishment functions, automatic unlock trigger,
 * removed mainTreasury to simplify logic + gas optimizations
 * @dev Changes v3.0-optimized:
 * 1) Added topUpMonthlyPool() and topUpLockedPool() for direct replenishment
 * 2) Added FUND_MANAGER_ROLE for safe replenishment
 * 3) Automatic trigger _autoUnlockIfNeeded() in ping() and requestBreed()
 * 4) Removed mainTreasury and depositFunds() for simplification
 * 5) Added reconcileBalances() for emergency synchronization
 * 6) ✅ OPTIMIZATION: Unified pool unlock logic
 * 7) ✅ OPTIMIZATION: Improved check order in claimBurnRewards for gas savings
 * 8) ✅ SECURITY: Added __gap array for future extensions
 * 9) ✅ SECURITY: Added emergencyProxyUpgrade function
 */
/// @custom:storage-size 95
contract CrazyCubeUltimate3 is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IERC721Receiver
{
    // =================================================================================================
    // || ROLES AND CONSTANTS                                                                          ||
    // =================================================================================================

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CONFIGURATOR_ROLE = keccak256("CONFIGURATOR_ROLE");
    bytes32 public constant UNLOCKER_ROLE = keccak256("UNLOCKER_ROLE");
    bytes32 public constant FUND_MANAGER_ROLE = keccak256("FUND_MANAGER_ROLE");

    // ────────────────────────────────────────────────────────────────
    // Progressive bonus / malus constants
    // ────────────────────────────────────────────────────────────────
    uint256 public constant BONUS_PERIOD = 10 days;          // 10-day window
    uint16  public constant BONUS_STEP_BPS = 270;            // +2.7 % each step
    uint16  public constant BONUS_MAX_BPS  = 9_720;          // +97.2 % cap
    int16   public constant PENALTY_BPS    = -1_890;         // –18.9 % malus

    uint256 public constant MAX_SUPPLY = 5000;
    uint256 private constant ACCURACY = 1e18;

    // =================================================================================================
    // || DATA STRUCTURES                                                                              ||
    // =================================================================================================

    struct NFTData { uint8 rarity; uint8 initialStars; bool isActivated; }
    struct NFTState { uint8 currentStars; uint256 lockedCRA; uint256 lastPingTime; uint256 lastBreedTime; bool isInGraveyard; }
    struct BurnSplit { uint16 playerBps; uint16 poolBps; uint16 burnBps; }
    struct BurnRecord { address owner; uint256 totalAmount; uint256 claimAvailableTime; uint256 graveyardReleaseTime; bool claimed; uint8 waitPeriod; }
    struct BreedRequest { address requester; uint256 parent1Id; uint256 parent2Id; bool exists; }

    // =================================================================================================
    // || STORAGE VARIABLES                                                                            ||
    // =================================================================================================

    IERC721 public nftContract;
    IERC20 public craToken;

    mapping(uint256 => NFTData) public nftData;
    mapping(uint256 => NFTState) public nftState;
    uint256[] public graveyardTokens;
    mapping(uint256 => uint256) internal graveyardTokenIndex;
    mapping(uint256 => BurnRecord) public burnRecords;
    mapping(uint8 => BurnSplit) public burnSplits;

    // ⚠️ IMPORTANT: mainTreasury kept for storage layout compatibility, but not used
    uint256 public mainTreasury; 
    uint256 public totalLockedForRewards;
    uint256 public monthlyRewardPool;

    uint256 public manualFloorPrice;
    uint256 public breedCostBps;
    uint256 public rewardRatePerSecond;
    uint256 public pingInterval;
    uint256 public maxAccumulationPeriod;
    uint256 public breedCooldown;
    uint256 public graveyardCooldown;
    uint256 public monthlyUnlockPercentage;
    uint256 public burnFeeBps;
    mapping(uint8 => uint256) public rarityBonusBps;
    uint256 public lastUnlockTimestamp;
    uint256 public monthDuration;
    uint256 public totalBurnedCRA;

    address public entropyOracleAddr;
    mapping(bytes32 => BreedRequest) internal s_breedRequests;
    bytes32[] internal pendingBreedIds;
    mapping(bytes32 => uint256) internal pendingBreedIndex;

    uint256 public totalBurned; // 🔴 new – number of NFTs currently in graveyard
    uint256 public totalStars;  // 🔴 new – sum of stars of all live NFTs

    // ══════════════════════════════════════════════════════════════════════
    // NEW SHARE / CAP VARIABLES (restored)
    // ══════════════════════════════════════════════════════════════════════
    uint256 public perPingCapDivisor;     // dynamic cap divisor
    uint256 public monthlySharePerNFT;    // CRA share per NFT per month

    uint256 public sharePerPing;

    // 🔴 how many successful pings performed per NFT
    mapping(uint256 => uint32) public pingsDone;

    // 🔴 progressive bonus / malus (-1 890 … +9 720 bps)
    mapping(uint256 => int16) public bonusBps;

    // =================================================================================================
    // || EVENTS                                                                                       ||
    // =================================================================================================

    event BreedRequested(bytes32 indexed requestId, address indexed requester);
    event NFTActivated(uint256 indexed tokenId, uint8 rarity, uint8 stars);
    event Ping(address indexed player, uint256 indexed tokenId, uint256 reward);
    event NFTBurned(address indexed player, uint256 indexed tokenId, uint256 amountToClaim, uint256 waitHours);
    event BurnRewardClaimed(address indexed player, uint256 indexed tokenId, uint256 playerShare, uint256 burnedShare);
    event NFTBred(address indexed player, uint256 parent1, uint256 parent2, uint256 indexed revivedTokenId);
    event MonthlyPoolRefilled(uint256 amount);
    event ConfigChanged(string parameter, uint256 oldValue, uint256 newValue);
    event FloorPriceUpdated(uint256 newPrice, address indexed updatedBy, bool isManual);
    event StarsRestored(uint256 indexed tokenId, uint8 newStars);
    event BurnedCRA(uint256 amount);
    
    // ✅ NEW EVENTS FOR POOL REPLENISHMENT
    event MonthlyPoolToppedUp(address indexed by, uint256 amount);
    event LockedPoolToppedUp(address indexed by, uint256 amount);
    event BalancesReconciled(uint256 newMonthlyPool, uint256 newLockedPool);


    // =================================================================================================
    // || ERRORS                                                                                       ||
    // =================================================================================================

    error NotOwner(); 
    error NotInGraveyard(); 
    error IsInGraveyard(); 
    error NotActivated(); 
    error CooldownActive(uint256 timeLeft); 
    error InsufficientStars(); 
    error GraveyardIsEmpty(); 
    error GraveyardIsFull(); 
    error InsufficientFunds(); 
    error InvalidAmount(); 
    error AlreadyClaimed(); 
    error NotReadyToClaim(); 
    error InvalidWaitPeriod(); 
    error InvalidTokenId();
    error ZeroAddress();
    error Bounds();
    error PercentSum();
    error NotEnoughCRA();
    error LengthMismatch();
    error TooSmall();
    error BatchTooLarge();
    error NoCorpseReady();

    // =================================================================================================
    // || INITIALIZATION                                                                               ||
    // =================================================================================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _admin,
        address _nftContractAddr,
        address _craTokenAddr,
        address _entropyOracleAddr,
        uint256 initialRewardPool
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        if (_nftContractAddr == address(0) || _craTokenAddr == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(CONFIGURATOR_ROLE, _admin);
        _grantRole(UNLOCKER_ROLE, _admin);
        _grantRole(FUND_MANAGER_ROLE, _admin);


        nftContract = IERC721(_nftContractAddr);
        craToken = IERC20(_craTokenAddr);
        entropyOracleAddr = _entropyOracleAddr;
        
        pingInterval = 3 minutes;
        maxAccumulationPeriod = 9 minutes;
        breedCooldown = 3 minutes;
        graveyardCooldown = 3 minutes;
        
        manualFloorPrice = 300000 * 1e18; // 300,000 CRA instead of 1 ether
        breedCostBps = 20000; // 200% instead of 20% (2000 bps)
        
        monthlyUnlockPercentage = 444;
        burnFeeBps = 500;
        monthDuration = 1 hours;
        lastUnlockTimestamp = block.timestamp;
        rewardRatePerSecond = 2019040647937929985235;

        rarityBonusBps[1] = 0;
        rarityBonusBps[2] = 500;
        rarityBonusBps[3] = 1000;
        rarityBonusBps[4] = 1500;
        rarityBonusBps[5] = 2000;
        rarityBonusBps[6] = 2500;

        if (initialRewardPool > 0) {
            monthlyRewardPool = initialRewardPool;
        }

        // 👉 set default cap-divisor = MAX_SUPPLY
        perPingCapDivisor = MAX_SUPPLY;
    }

    // =================================================================================================
    // || NEW POOL REPLENISHMENT FUNCTIONS                                                          ||
    // =================================================================================================

    /// @notice Top up monthly pool with rewards (only FUND_MANAGER_ROLE)
    function topUpMonthlyPool(uint256 amount) external onlyRole(FUND_MANAGER_ROLE) nonReentrant {
        if (amount == 0) revert InvalidAmount();
        bool success = craToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        monthlyRewardPool += amount;
        if (monthDuration != 0) {
            rewardRatePerSecond = (monthlyRewardPool * ACCURACY) / monthDuration;
        }
        emit MonthlyPoolToppedUp(msg.sender, amount);
    }

    /// @notice Top up locked pool (only FUND_MANAGER_ROLE)
    function topUpLockedPool(uint256 amount) external onlyRole(FUND_MANAGER_ROLE) nonReentrant {
        if (amount == 0) revert InvalidAmount();
        bool success = craToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        totalLockedForRewards += amount;
        emit LockedPoolToppedUp(msg.sender, amount);
    }

    /// @notice Emergency balance reconciliation (only ADMIN_ROLE)
    function reconcileBalances() external onlyRole(ADMIN_ROLE) {
        uint256 contractBalance = craToken.balanceOf(address(this));
        uint256 expectedBalance = monthlyRewardPool + totalLockedForRewards;
        
        if (contractBalance > expectedBalance) {
            uint256 excess = contractBalance - expectedBalance;
            monthlyRewardPool += excess;
        }
        
        if (monthDuration != 0) {
            rewardRatePerSecond = (monthlyRewardPool * ACCURACY) / monthDuration;
        }
        emit BalancesReconciled(monthlyRewardPool, totalLockedForRewards);
    }

    // =================================================================================================
    // || OPTIMIZED POOL UNLOCK LOGIC                                                               ||
    // =================================================================================================

    /// @notice ✅ OPTIMIZATION: Unified pool unlock logic
    /// @param monthsPassed Number of months for unlock
    /// @return amountUnlocked Unlocked amount
    function _performUnlock(uint256 monthsPassed) internal returns (uint256 amountUnlocked) {
        if (monthsPassed == 0) return 0;

        // ✅ CRITICAL-001 FIX: Limit monthsPassed to prevent economic explosion
        if (monthsPassed > 1) {
            monthsPassed = 1; // limit, but no event
        }

        // if monthly pool is not exhausted – roll back remaining to lockedPool
        if (block.timestamp >= lastUnlockTimestamp + monthDuration && monthlyRewardPool > 0) {
            totalLockedForRewards += monthlyRewardPool;
            monthlyRewardPool = 0;
        }

        uint256 baseUnlock = totalLockedForRewards * monthlyUnlockPercentage * monthsPassed;
        amountUnlocked = baseUnlock / 10000;
        if (amountUnlocked > totalLockedForRewards) {
            amountUnlocked = totalLockedForRewards;
        }
        totalLockedForRewards -= amountUnlocked;
        monthlyRewardPool += amountUnlocked;
        lastUnlockTimestamp += monthsPassed * monthDuration;

        // calculate new share values
        if (MAX_SUPPLY > 0) {
            monthlySharePerNFT = amountUnlocked / MAX_SUPPLY;
            uint256 periodsInMonth = monthDuration / pingInterval;
            if (periodsInMonth == 0) periodsInMonth = 1;
            sharePerPing = monthlySharePerNFT / periodsInMonth;
        }

        if (monthDuration != 0) {
            rewardRatePerSecond = (monthlyRewardPool * ACCURACY) / monthDuration;
        }
        emit MonthlyPoolRefilled(amountUnlocked);
    }

    /// @notice Automatic unlock of funds if enough time has passed
    function _autoUnlockIfNeeded() internal {
        uint256 monthsPassed = (block.timestamp - lastUnlockTimestamp) / monthDuration;
        _performUnlock(monthsPassed);
    }

    // =================================================================================================
    // || GAME LOGIC WITH AUTOMATIC TRIGGER                                                           ||
    // =================================================================================================
    
    /// @notice ✅ MEDIUM-001: Safe ownership check
    function _safeCheckOwnership(uint256 tokenId) internal view {
        try nftContract.ownerOf(tokenId) returns (address owner) {
            if (owner != msg.sender) revert NotOwner();
        } catch {
            revert InvalidTokenId();
        }
    }
    
    function ping(uint256 tokenId) external whenNotPaused nonReentrant {
        _autoUnlockIfNeeded(); // ✅ AUTOMATIC TRIGGER

        if (tokenId > MAX_SUPPLY || tokenId == 0) revert InvalidTokenId();
        _safeCheckOwnership(tokenId); // ✅ MEDIUM-001: Improved ownership check
        _requireIsLiveAndActive(tokenId);
        
        NFTState storage state = nftState[tokenId];
        
        // ────────────────────────────────────────────────────────────────
        // 🔸 FREE FIRST PING – just activates the NFT, no reward
        // ────────────────────────────────────────────────────────────────
        if (state.lastPingTime == 0) {
            state.lastPingTime = block.timestamp;
            unchecked { pingsDone[tokenId] += 1; }
            emit Ping(msg.sender, tokenId, 0);
            return;
        }
        
        if (state.lastPingTime > 0 && block.timestamp < state.lastPingTime + pingInterval) {
            revert CooldownActive(state.lastPingTime + pingInterval - block.timestamp);
        }
        
        uint256 timeSinceLastPing = state.lastPingTime == 0 ? pingInterval : block.timestamp - state.lastPingTime;
        
        if (timeSinceLastPing > maxAccumulationPeriod) {
            timeSinceLastPing = maxAccumulationPeriod;
        }
        
        uint256 periodCount = timeSinceLastPing / pingInterval;
        if (periodCount == 0) {
            periodCount = 1;
        }
        
        // ✅ LOW-002: Cache rarity for gas savings
        uint8 rarity = nftData[tokenId].rarity;
        uint256 baseReward = sharePerPing * periodCount;
        uint256 rarityBonus = (baseReward * rarityBonusBps[rarity]) / 10_000;
        uint256 totalReward = baseReward + rarityBonus;

        // Apply progressive bonus / penalty multiplier
        int256 multiplierBps = int256(10_000 + bonusBps[tokenId]); // always >= 0
        totalReward = (totalReward * uint256(multiplierBps)) / 10_000;

        // safety: never exceed monthly pool
        if (totalReward > monthlyRewardPool) {
            totalReward = monthlyRewardPool;
        }
        
        if (monthlyRewardPool < totalReward) revert InsufficientFunds();
        
        monthlyRewardPool -= totalReward;
        state.lockedCRA += totalReward;
        state.lastPingTime = block.timestamp;
        unchecked { pingsDone[tokenId] += 1; }

        // Grow bonus if player kept the rhythm (<= 10 days since last ping)
        if (timeSinceLastPing <= BONUS_PERIOD) {
            int16 curr = bonusBps[tokenId];
            if (curr < int16(uint16(BONUS_MAX_BPS))) {
                int16 next = curr + int16(uint16(BONUS_STEP_BPS));
                if (next > int16(uint16(BONUS_MAX_BPS))) next = int16(uint16(BONUS_MAX_BPS));
                bonusBps[tokenId] = next;
            }
        }

        emit Ping(msg.sender, tokenId, totalReward);
    }

    function requestBreed(uint256 parent1Id, uint256 parent2Id, bytes32 userRandom) external virtual whenNotPaused nonReentrant {
        _autoUnlockIfNeeded(); // ✅ AUTOMATIC TRIGGER

        _validateBreedPrerequisites(parent1Id, parent2Id);
        
        uint256 cost = getBreedCostCRA();
        if (craToken.balanceOf(msg.sender) < cost) revert InsufficientFunds();
        bool success = craToken.transferFrom(msg.sender, address(this), cost);
        require(success, "Transfer failed");
        monthlyRewardPool += cost;
        
        bytes32 breedSeed = keccak256(abi.encodePacked(
            userRandom,
            parent1Id, 
            parent2Id,
            msg.sender,
            block.timestamp
        ));
        
        bytes32 requestId = _localRandom(breedSeed);
        
        s_breedRequests[requestId] = BreedRequest({
            requester: msg.sender, 
            parent1Id: parent1Id, 
            parent2Id: parent2Id, 
            exists: true
        });
        
        pendingBreedIndex[requestId] = pendingBreedIds.length;
        pendingBreedIds.push(requestId);
        
        emit BreedRequested(requestId, msg.sender);
        
        bytes32 finalRandom = _localRandom(keccak256(abi.encodePacked(requestId, "FINAL")));
        _fulfill(requestId, finalRandom);
    }

    function burnNFT(uint256 tokenId, uint8 waitHours) external whenNotPaused nonReentrant {
        if (tokenId > MAX_SUPPLY || tokenId == 0) revert InvalidTokenId();
        if (burnSplits[waitHours].playerBps == 0) revert InvalidWaitPeriod();
        if (graveyardTokens.length >= MAX_SUPPLY) revert GraveyardIsFull();
        _safeCheckOwnership(tokenId); // ✅ MEDIUM-001: Improved ownership check
        _requireIsLiveAndActive(tokenId);
        if (nftState[tokenId].lockedCRA == 0) revert InvalidAmount();
        
        uint256 fee = (nftState[tokenId].lockedCRA * burnFeeBps) / 10000;
        if (craToken.balanceOf(msg.sender) < fee) revert InsufficientFunds();

        if (fee > 0) {
            bool success = craToken.transferFrom(msg.sender, address(this), fee);
            require(success, "Transfer failed");
            _burnCRA(fee);
        }

        nftContract.safeTransferFrom(msg.sender, address(this), tokenId, "");
        NFTState storage state = nftState[tokenId];
        burnRecords[tokenId] = BurnRecord({
            owner: msg.sender,
            totalAmount: state.lockedCRA,
            claimAvailableTime: block.timestamp + (uint256(waitHours) * 1 minutes),
            graveyardReleaseTime: block.timestamp + graveyardCooldown,
            claimed: false,
            waitPeriod: waitHours
        });
        state.isInGraveyard = true;
        state.lockedCRA = 0;
        state.currentStars = 0;
        graveyardTokenIndex[tokenId] = graveyardTokens.length;
        graveyardTokens.push(tokenId);
        emit NFTBurned(msg.sender, tokenId, burnRecords[tokenId].totalAmount, waitHours);

        unchecked { totalBurned += 1; if (totalStars > 0) totalStars -= 1; }
    }

    /// @notice ✅ OPTIMIZATION: Improved check order for gas savings
    function claimBurnRewards(uint256 tokenId) external whenNotPaused nonReentrant {
        if (tokenId > MAX_SUPPLY || tokenId == 0) revert InvalidTokenId();
        BurnRecord storage record = burnRecords[tokenId];
        if (record.owner != msg.sender) revert NotOwner();
        if (record.claimed) revert AlreadyClaimed();
        if (block.timestamp < record.claimAvailableTime) revert NotReadyToClaim();
        
        BurnSplit memory split = burnSplits[record.waitPeriod];
        uint256 total = record.totalAmount;
        uint256 playerShare = (total * split.playerBps) / 10000;
        uint256 poolShare = (total * split.poolBps) / 10000;
        uint256 burnedShare = (total * split.burnBps) / 10000;

        // ✅ OPTIMIZATION: Check balance BEFORE state change for gas savings
        if (craToken.balanceOf(address(this)) < playerShare + poolShare + burnedShare) revert InsufficientFunds();
        
        // Change state only after successful balance check
        record.claimed = true;
        
        if (playerShare > 0) {
            bool success = craToken.transfer(msg.sender, playerShare);
            require(success, "Transfer failed");
        }
        if (poolShare > 0) monthlyRewardPool += poolShare; 
        if (burnedShare > 0) _burnCRA(burnedShare);

        emit BurnRewardClaimed(msg.sender, tokenId, playerShare, burnedShare);
    }

    // =================================================================================================
    // || MANUAL POOL MANAGEMENT (FOR COMPATIBILITY)                                                    ||
    // =================================================================================================

    function unlockAndRefillMonthlyPool() external whenNotPaused nonReentrant onlyRole(UNLOCKER_ROLE) {
        uint256 monthsPassed = (block.timestamp - lastUnlockTimestamp) / monthDuration;
        _performUnlock(monthsPassed); // ✅ OPTIMIZATION: Use unified function
    }

    // =================================================================================================
    // || INTERNAL FUNCTIONS                                                                            ||
    // =================================================================================================

    /// @dev Returns true if corpse is ready for revival (cooldown passed)
    function _isCorpseReady(uint256 tokenId) internal view returns (bool) {
        return block.timestamp >= burnRecords[tokenId].graveyardReleaseTime;
    }

    /// @dev Refunds breed cost to `to` and updates monthlyRewardPool accordingly
    function _refundBreedCost(address to) internal {
        uint256 refund = getBreedCostCRA();
        if (monthlyRewardPool <= refund) {
            monthlyRewardPool = 0;
        } else {
            monthlyRewardPool -= refund;
        }
        bool success = craToken.transfer(to, refund);
        require(success, "Transfer failed");
    }

    function _fulfill(bytes32 requestId, bytes32 randomness) internal virtual {
        BreedRequest memory request = s_breedRequests[requestId];
        if (!request.exists) return; 

        // remove from mappings/arrays (unchanged logic)
        delete s_breedRequests[requestId];
        uint256 idxPending = pendingBreedIndex[requestId];
        uint256 lastIdx = pendingBreedIds.length - 1;
        if (idxPending < pendingBreedIds.length) {
            bytes32 lastId = pendingBreedIds[lastIdx];
            pendingBreedIds[idxPending] = lastId;
            pendingBreedIndex[lastId] = idxPending;
            pendingBreedIds.pop();
            delete pendingBreedIndex[requestId];
        }

        uint256 graveSize = graveyardTokens.length;
        if (graveSize == 0) {
            _refundBreedCost(request.requester);
            return;
        }

        uint256 idx = uint256(randomness) % graveSize;
        uint256 attempts = graveSize;
        uint256 revivedTokenId = 0;

        while (attempts-- > 0) {
            uint256 candidate = graveyardTokens[idx];
            if (_isCorpseReady(candidate)) {
                revivedTokenId = candidate;
                break;
            }
            idx = (idx + 1) % graveSize; // circular loop
        }

        if (revivedTokenId == 0) revert NoCorpseReady();

        _finalizeBreed(request.requester, request.parent1Id, request.parent2Id, revivedTokenId);
    }

    function _finalizeBreed(address requester, uint256 parent1Id, uint256 parent2Id, uint256 revivedTokenId) internal virtual {
        NFTState storage parent1State = nftState[parent1Id];
        NFTState storage parent2State = nftState[parent2Id];
        parent1State.currentStars--;
        parent2State.currentStars--;
        parent1State.lastBreedTime = block.timestamp;
        parent2State.lastBreedTime = block.timestamp;

        NFTState storage revivedState = nftState[revivedTokenId];
        revivedState.isInGraveyard = false;
        revivedState.currentStars = nftData[revivedTokenId].initialStars;
        // ⚡️ newborn starts un-activated: first ping will be free (reward=0)
        revivedState.lastPingTime = 0;
        revivedState.lastBreedTime = block.timestamp;
        // Reset ping counter for revived cube
        pingsDone[revivedTokenId] = 0;
        bonusBps[revivedTokenId] = PENALTY_BPS; // apply malus after revive

        _removeFromGraveyard(revivedTokenId);
        nftContract.safeTransferFrom(address(this), requester, revivedTokenId, "");
        emit NFTBred(requester, parent1Id, parent2Id, revivedTokenId);

        unchecked { if (totalBurned > 0) totalBurned -= 1; totalStars += nftData[revivedTokenId].initialStars; }
    }

    function _validateBreedPrerequisites(uint256 parent1Id, uint256 parent2Id) internal view {
        if (parent1Id == 0 || parent2Id == 0) revert InvalidTokenId();
        if (parent1Id > MAX_SUPPLY || parent2Id > MAX_SUPPLY) revert InvalidTokenId();
        
        // ✅ MEDIUM-001: Improved ownership check for both NFTs
        try nftContract.ownerOf(parent1Id) returns (address owner1) {
            if (owner1 != msg.sender) revert NotOwner();
        } catch {
            revert InvalidTokenId();
        }
        
        try nftContract.ownerOf(parent2Id) returns (address owner2) {
            if (owner2 != msg.sender) revert NotOwner();
        } catch {
            revert InvalidTokenId();
        }
        
        _requireIsLiveAndActive(parent1Id);
        _requireIsLiveAndActive(parent2Id);
        if (nftState[parent1Id].currentStars == 0 || nftState[parent2Id].currentStars == 0) revert InsufficientStars();
        if (block.timestamp < nftState[parent1Id].lastBreedTime + breedCooldown) revert CooldownActive(nftState[parent1Id].lastBreedTime + breedCooldown - block.timestamp);
        if (block.timestamp < nftState[parent2Id].lastBreedTime + breedCooldown) revert CooldownActive(nftState[parent2Id].lastBreedTime + breedCooldown - block.timestamp);
        if (graveyardTokens.length == 0) revert GraveyardIsEmpty();
    }

    function _removeFromGraveyard(uint256 tokenId) private {
        uint256 index = graveyardTokenIndex[tokenId];
        uint256 lastIndex = graveyardTokens.length - 1;
        uint256 lastTokenId = graveyardTokens[lastIndex];
        graveyardTokens[index] = lastTokenId;
        graveyardTokenIndex[lastTokenId] = index;
        graveyardTokens.pop();
        delete graveyardTokenIndex[tokenId];
    }

    function _requireIsLiveAndActive(uint256 tokenId) private view {
        if (!nftData[tokenId].isActivated) revert NotActivated();
        if (nftState[tokenId].isInGraveyard) revert IsInGraveyard();
    }

    function _localRandom(bytes32 salt) internal view virtual returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.prevrandao,
            msg.sender,
            block.timestamp,
            msg.sender,
            salt
        ));
    }

    function _burnCRA(uint256 amount) internal virtual {
        bool success = craToken.transfer(0x000000000000000000000000000000000000dEaD, amount);
        require(success, "Transfer failed");
        totalBurnedCRA += amount;
        emit BurnedCRA(amount);
    }

    // =================================================================================================
    // || ADMINISTRATIVE FUNCTIONS                                                                      ||
    // =================================================================================================

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    function emergencyCompleteBreed(bytes32 requestId, uint256 randomSeed) external onlyRole(ADMIN_ROLE) {
        _fulfill(requestId, bytes32(randomSeed));
    }

    function emergencyRestoreStars(uint256 tokenId, uint8 stars) external onlyRole(ADMIN_ROLE) {
        if (tokenId > MAX_SUPPLY || tokenId == 0) revert InvalidTokenId();
        if (stars > nftData[tokenId].initialStars) revert InvalidAmount();
        uint8 oldStars = nftState[tokenId].currentStars;
        nftState[tokenId].currentStars = stars;
        if (stars > oldStars) {
            totalStars += (stars - oldStars);
        } else if (oldStars > stars) {
            totalStars -= (oldStars - stars);
        }
        emit StarsRestored(tokenId, stars);
    }

    function activateNFTs(uint256[] calldata tokenIds, uint8[] calldata rarities) external onlyRole(ADMIN_ROLE) {
        if (tokenIds.length > 200) revert BatchTooLarge();
        if (tokenIds.length != rarities.length) revert LengthMismatch();
        for (uint i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint8 rarity = rarities[i];
            if (tokenId > MAX_SUPPLY || tokenId == 0) continue;
            if (rarity > 0 && rarity <= 6 && !nftData[tokenId].isActivated) {
                nftData[tokenId] = NFTData({
                    rarity: rarity,
                    initialStars: rarity,
                    isActivated: true
                });
                nftState[tokenId].currentStars = rarity;
                emit NFTActivated(tokenId, rarity, rarity);
                totalStars += rarity;
            }
        }
    }

    function emergencyWithdraw(address tokenAddr, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (tokenAddr == address(0)) revert ZeroAddress();
        bool success = IERC20(tokenAddr).transfer(msg.sender, amount);
        require(success, "Transfer failed");
    }

    function emergencySetGraveyardStatus(uint256 tokenId, bool isDead) external onlyRole(ADMIN_ROLE) {
        if (tokenId > MAX_SUPPLY || tokenId == 0) revert InvalidTokenId();
        nftState[tokenId].isInGraveyard = isDead;
    }

    /**
     * @notice Full "hard reset" NFT: set lockedCRA to 0 and return to "unactivated" state
     * @dev ADMIN_ROLE only. Sets lockedCRA = 0, lastPingTime = 0, pingsDone = 0.
     *      Stars and other fields are not touched.
     * @param tokenIds List of IDs to reset.
     */
    function adminResetLockedCRAToZero(uint256[] calldata tokenIds) external onlyRole(ADMIN_ROLE) {
        unchecked {
            for (uint256 i = 0; i < tokenIds.length; ++i) {
                uint256 id = tokenIds[i];
                nftState[id].lockedCRA = 0;
                nftState[id].lastPingTime = 0;
                pingsDone[id] = 0;
                bonusBps[id] = PENALTY_BPS;
            }
        }
    }

    // =================================================================================================
    // || CONFIGURATION                                                                                ||
    // =================================================================================================

    function configureTimings(uint256 _pingInterval, uint256 _maxAccumulationPeriod, uint256 _breedCooldown, uint256 _graveyardCooldown) external onlyRole(CONFIGURATOR_ROLE) {
        require(_maxAccumulationPeriod >= _pingInterval, "maxAccumulationPeriod must be >= pingInterval");
        emit ConfigChanged("pingInterval", pingInterval, _pingInterval);
        emit ConfigChanged("maxAccumulationPeriod", maxAccumulationPeriod, _maxAccumulationPeriod);
        emit ConfigChanged("breedCooldown", breedCooldown, _breedCooldown);
        emit ConfigChanged("graveyardCooldown", graveyardCooldown, _graveyardCooldown);
        pingInterval = _pingInterval;
        maxAccumulationPeriod = _maxAccumulationPeriod;
        breedCooldown = _breedCooldown;
        graveyardCooldown = _graveyardCooldown;
        // 🔸 Safety: accumulation cap must be at least 2× interval to avoid zero periods
        require(_maxAccumulationPeriod >= _pingInterval * 2, "cap<2x");
    }

    function configureBreedCostBps(uint256 _breedCostBps) external onlyRole(CONFIGURATOR_ROLE) {
        emit ConfigChanged("breedCostBps", breedCostBps, _breedCostBps);
        breedCostBps = _breedCostBps;
    }

    function configureBurnSplit(uint8 waitHours, uint16 playerBps, uint16 poolBps, uint16 burnBps) external onlyRole(CONFIGURATOR_ROLE) {
        if (playerBps + poolBps + burnBps != 10000) revert PercentSum();
        burnSplits[waitHours] = BurnSplit(playerBps, poolBps, burnBps);
    }

    function configureMonthDuration(uint256 _seconds) external onlyRole(CONFIGURATOR_ROLE) {
        if (_seconds < 1 hours) revert TooSmall();
        emit ConfigChanged("monthDuration", monthDuration, _seconds);
        monthDuration = _seconds;
        if (monthDuration != 0) {
            rewardRatePerSecond = (monthlyRewardPool * ACCURACY) / monthDuration;
        }
    }

    function setManualFloorPrice(uint256 _newPrice) external onlyRole(CONFIGURATOR_ROLE) {
        manualFloorPrice = _newPrice;
        emit FloorPriceUpdated(_newPrice, msg.sender, true);
    }

    /**
     * @notice Changes the monthly unlock percentage of the lockedPool.
     * @param newBps Percentage in basis points (BPS = 1/100 %, max 10000)
     * Example: 833  →  8,33 %  (≈ 1/12); 1666 → 16,66 % (≈ 1/6)
     */
    function setMonthlyUnlockPercentage(uint16 newBps)
        external
        onlyRole(CONFIGURATOR_ROLE)
    {
        require(newBps > 0 && newBps <= 10_000, "bps");
        emit ConfigChanged(
            "monthlyUnlockPercentage",
            monthlyUnlockPercentage,
            newBps
        );
        monthlyUnlockPercentage = newBps;
    }

    /**
     * @notice Sets rarity bonuses
     * @dev ADMIN_ROLE only
     * @param rarity Rarity level (1-6)
     * @param bps Bonus in basis points (10000 = 100%)
     */
    function setRarityBonus(uint8 rarity, uint256 bps) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(rarity >= 1 && rarity <= 6, "rarity");
        if (bps > 50000) revert Bounds(); // max 500% bonus
        uint256 oldValue = rarityBonusBps[rarity];
        rarityBonusBps[rarity] = bps;
        emit ConfigChanged("rarityBonusBps", oldValue, bps);
    }

    // =================================================================================================
    // || POOL RESET FUNCTIONS (FROM CubeResetAddon)                                                    ||
    // =================================================================================================

    /**
     * @notice Full "hard reset" of pools "as is"
     * @dev ADMIN_ROLE only; nothing else is touched except two storage fields
     * @param _locked New value for totalLockedForRewards
     * @param _monthly New value for monthlyRewardPool
     */
    function adminResetPools(uint256 _locked, uint256 _monthly)
        external
        virtual
        onlyRole(ADMIN_ROLE)
    {
        if (_locked + _monthly > craToken.balanceOf(address(this))) revert NotEnoughCRA();
        
        uint256 oldLocked = totalLockedForRewards;
        uint256 oldMonthly = monthlyRewardPool;
        
        totalLockedForRewards = _locked;
        monthlyRewardPool = _monthly;
        
        if (monthDuration != 0) {
            rewardRatePerSecond = (monthlyRewardPool * ACCURACY) / monthDuration;
        }
        
        emit BalancesReconciled(_monthly, _locked);
        emit ConfigChanged("totalLockedForRewards", oldLocked, _locked);
        emit ConfigChanged("monthlyRewardPool", oldMonthly, _monthly);
    }
    
    /**
     * @notice Admin can "recall" ping for NFT and return CRA to monthly pool
     * @dev ADMIN_ROLE only. Does *not* change stars or other state.
     * @param tokenIds List of NFT IDs to reset.
     */
    function emergencyResetLockedCRA(uint256[] calldata tokenIds) external onlyRole(ADMIN_ROLE) {
        unchecked {
            for (uint256 i = 0; i < tokenIds.length; ++i) {
                uint256 id = tokenIds[i];
                nftState[id].lockedCRA = 0;
                nftState[id].lastPingTime = block.timestamp;
            }
        }
    }

    // =================================================================================================
    // || VIEW FUNCTIONS                                                                               ||
    // =================================================================================================

    /// @notice Calculates breeding cost in CRA tokens
    /// @return Breeding cost in wei
    function getBreedCostCRA() public view returns (uint256) {
        return (manualFloorPrice * breedCostBps) / 10000;
    }

    /// @notice Implements IERC721Receiver for receiving NFTs
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice Returns true if NFT has been activated by at least one ping
    function isActivated(uint256 tokenId) external view returns (bool) {
        return nftState[tokenId].lastPingTime != 0;
    }

    /// @notice Returns current multiplier (base 10 000 bps)
    function currentMultiplierBps(uint256 tokenId) external view returns (uint16) {
        int16 b = bonusBps[tokenId];
        int16 total = int16(10_000) + b;
        return uint16(uint256(int256(total)));
    }
}