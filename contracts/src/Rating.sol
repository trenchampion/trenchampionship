// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Config} from "./Config.sol";
import {IControllerNFT, IRewardPool} from "./interfaces/IProtocol.sol";

/// @title Rating
/// @notice Elo per character, seasons, season licenses and the on-chain top-10 that the season
///         prize is paid to. Updated only by MatchManager; everything else is permissionless or
///         controller-only. Never pausable.
/// @dev Elo: K = 32 for the first 20 rated matches, then 16; expected score from an integer table
///      (permille) so the TypeScript port can match exactly. Season boundaries are fixed from
///      DEPLOY_TIME in SEASON_LENGTH steps; squeeze 1000 + 0.8 * (r - 1000) is applied lazily.
contract Rating is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error NotMatchManager();
    error NotController();
    error AlreadyLicensed();
    error NotLicensed();
    error SeasonNotOver();
    error SeasonAlreadyClosed();
    error NothingToClaim();

    event RatingChanged(uint256 indexed characterId, uint256 season, int256 before, int256 after_, bool rated);
    event Licensed(uint256 indexed characterId, address indexed by);
    event Unlicensed(uint256 indexed characterId, address indexed by, uint256 refunded);
    event SeasonClosed(uint256 indexed season, uint256 prize, uint256[] top);
    event SeasonRewardBooked(
        uint256 indexed season, uint256 indexed characterId, address indexed controller, uint256 amount
    );
    event Claimed(address indexed to, uint256 amount);

    IERC20 public immutable TL;
    address public immutable MATCH_MANAGER;
    IRewardPool public immutable REWARD_POOL;
    IControllerNFT public immutable NFT;
    uint256 public immutable DEPLOY_TIME;

    // --- rating state
    mapping(uint256 characterId => int256) internal _rating; // 0 means never touched -> RATING_START
    mapping(uint256 characterId => uint256) public ratedMatches; // lifetime, for K
    mapping(uint256 characterId => uint256) public lastSeasonTouched;

    // --- per-season state
    mapping(uint256 season => mapping(uint256 characterId => uint256)) public seasonRatedMatches;
    mapping(uint256 season => mapping(uint256 characterId => uint256)) public seasonDistinctOpponents;
    mapping(uint256 season => mapping(bytes32 pairKey => uint256)) public seasonPairMatches;
    // slither-disable-next-line uninitialized-state
    mapping(uint256 season => uint256[]) internal _top; // sorted desc, max 10; grown by push only
    mapping(uint256 season => bool) public seasonClosed;
    uint256 public seasonsClosed;

    // --- licenses and claims
    mapping(uint256 characterId => bool) public licensed;
    mapping(address => uint256) public claimable;

    constructor(address tl, address matchManager, address rewardPool, address nft) {
        TL = IERC20(tl);
        MATCH_MANAGER = matchManager;
        REWARD_POOL = IRewardPool(rewardPool);
        NFT = IControllerNFT(nft);
        DEPLOY_TIME = block.timestamp;
    }

    // ------------------------------------------------------------------ views

    /// @notice Current season index (0-based) from DEPLOY_TIME.
    function currentSeason() public view returns (uint256) {
        return (block.timestamp - DEPLOY_TIME) / Config.SEASON_LENGTH;
    }

    function seasonEnd(uint256 season) public view returns (uint256) {
        return DEPLOY_TIME + (season + 1) * Config.SEASON_LENGTH;
    }

    /// @notice Rating as it would be after lazy squeezes up to the current season.
    function ratingOf(uint256 characterId) public view returns (int256) {
        int256 r = _rating[characterId];
        if (r == 0) return int256(Config.RATING_START);
        uint256 last = lastSeasonTouched[characterId];
        uint256 cur = currentSeason();
        for (uint256 s = last; s < cur; s++) {
            r = _squeeze(r);
        }
        return r;
    }

    /// @notice Top list of a season (character ids, best first).
    function top(uint256 season) external view returns (uint256[] memory) {
        return _top[season];
    }

    /// @notice Eligible for the season prize: licensed, enough rated matches, enough distinct opponents.
    function eligible(uint256 season, uint256 characterId) public view returns (bool) {
        return licensed[characterId] && seasonRatedMatches[season][characterId] >= Config.SEASON_MIN_RATED_MATCHES
            && seasonDistinctOpponents[season][characterId] >= Config.SEASON_MIN_DISTINCT_OPPONENTS;
    }

    /// @notice Expected score (permille) of a player rated `diff` points above the opponent (FIDE table).
    function expectedScore(int256 diff) public pure returns (uint256) {
        bool higher = diff >= 0;
        uint256 d = uint256(higher ? diff : -diff);
        uint256 p = _tableHigher(d);
        return higher ? p : 1000 - p;
    }

    function _tableHigher(uint256 d) internal pure returns (uint256) {
        // upper bound of the difference bracket -> expected permille for the higher-rated player
        if (d <= 3) return 500;
        if (d <= 10) return 510;
        if (d <= 17) return 520;
        if (d <= 25) return 530;
        if (d <= 32) return 540;
        if (d <= 39) return 550;
        if (d <= 46) return 560;
        if (d <= 53) return 570;
        if (d <= 61) return 580;
        if (d <= 68) return 590;
        if (d <= 76) return 600;
        if (d <= 83) return 610;
        if (d <= 91) return 620;
        if (d <= 98) return 630;
        if (d <= 106) return 640;
        if (d <= 113) return 650;
        if (d <= 121) return 660;
        if (d <= 129) return 670;
        if (d <= 137) return 680;
        if (d <= 145) return 690;
        if (d <= 153) return 700;
        if (d <= 162) return 710;
        if (d <= 170) return 720;
        if (d <= 179) return 730;
        if (d <= 188) return 740;
        if (d <= 197) return 750;
        if (d <= 206) return 760;
        if (d <= 215) return 770;
        if (d <= 225) return 780;
        if (d <= 235) return 790;
        if (d <= 245) return 800;
        if (d <= 256) return 810;
        if (d <= 267) return 820;
        if (d <= 278) return 830;
        if (d <= 290) return 840;
        if (d <= 302) return 850;
        if (d <= 315) return 860;
        if (d <= 328) return 870;
        if (d <= 344) return 880;
        if (d <= 357) return 890;
        if (d <= 374) return 900;
        if (d <= 391) return 910;
        if (d <= 411) return 920;
        if (d <= 432) return 930;
        if (d <= 456) return 940;
        if (d <= 484) return 950;
        if (d <= 517) return 960;
        if (d <= 559) return 970;
        if (d <= 619) return 980;
        return 990;
    }

    // ------------------------------------------------------------------ match results

    /// @notice Record a decided match. outcome: 1 = A won, -1 = B won (forfeits count as losses).
    ///         Draws and voids are never reported. MatchManager only.
    function recordResult(uint256 idA, uint256 idB, int8 outcome) external {
        if (msg.sender != MATCH_MANAGER) revert NotMatchManager();
        uint256 season = currentSeason();
        _touch(idA, season);
        _touch(idB, season);
        bytes32 key = _pairKey(idA, idB);
        uint256 pairCount = seasonPairMatches[season][key];
        seasonPairMatches[season][key] = pairCount + 1;
        if (pairCount < Config.RATED_PER_PAIR_PER_SEASON) {
            _applyElo(season, idA, idB, outcome == 1, pairCount == 0);
        } else {
            emit RatingChanged(idA, season, _rating[idA], _rating[idA], false);
            emit RatingChanged(idB, season, _rating[idB], _rating[idB], false);
        }
        _updateTop(season, idA);
        _updateTop(season, idB);
    }

    /// @dev Elo update for both sides of a rated match; `newOpponent` marks the first meeting this season.
    function _applyElo(uint256 season, uint256 idA, uint256 idB, bool aWon, bool newOpponent) internal {
        int256 ra = _rating[idA];
        int256 rb = _rating[idB];
        int256 newA = _elo(ra, rb, aWon ? 1000 : 0, ratedMatches[idA]);
        int256 newB = _elo(rb, ra, aWon ? 0 : 1000, ratedMatches[idB]);
        ratedMatches[idA]++;
        ratedMatches[idB]++;
        _rating[idA] = newA;
        _rating[idB] = newB;
        _countSeason(season, idA, newOpponent);
        _countSeason(season, idB, newOpponent);
        emit RatingChanged(idA, season, ra, newA, true);
        emit RatingChanged(idB, season, rb, newB, true);
    }

    /// @notice Re-evaluate a character's place in the current top list. Anyone may call.
    function nominate(uint256 characterId) external {
        if (NFT.controllerOf(characterId) == address(0)) revert NotController();
        _touch(characterId, currentSeason());
        _updateTop(currentSeason(), characterId);
    }

    // ------------------------------------------------------------------ licenses

    /// @notice Lock SEASON_LICENSE TL to compete for season prizes. Controller only.
    function license(uint256 characterId) external nonReentrant {
        if (NFT.ownerOf(characterId) != msg.sender) revert NotController();
        if (licensed[characterId]) revert AlreadyLicensed();
        licensed[characterId] = true;
        TL.safeTransferFrom(msg.sender, address(this), Config.SEASON_LICENSE);
        emit Licensed(characterId, msg.sender);
    }

    /// @notice Withdraw the license deposit. Controller only, always available. Forfeits the
    ///         current season's eligibility (season match counters reset).
    function unlicense(uint256 characterId) external nonReentrant {
        if (NFT.ownerOf(characterId) != msg.sender) revert NotController();
        if (!licensed[characterId]) revert NotLicensed();
        licensed[characterId] = false;
        uint256 season = currentSeason();
        seasonRatedMatches[season][characterId] = 0;
        seasonDistinctOpponents[season][characterId] = 0;
        _removeFromTop(season, characterId);
        TL.safeTransfer(msg.sender, Config.SEASON_LICENSE);
        emit Unlicensed(characterId, msg.sender, Config.SEASON_LICENSE);
    }

    // ------------------------------------------------------------------ seasons

    /// @notice Close season `seasonsClosed` once it has ended: pull 20 % of RewardPool.available and
    ///         book shares to the controllers of the top list. Anyone may call; seasons close in order.
    function closeSeason() external nonReentrant {
        uint256 season = seasonsClosed;
        if (block.timestamp < seasonEnd(season)) revert SeasonNotOver();
        seasonsClosed = season + 1;
        seasonClosed[season] = true;
        uint256[] memory list = _top[season];
        uint256 prize = REWARD_POOL.paySeason(address(this));
        uint256 booked = 0;
        for (uint256 i = 0; i < list.length && i < 10; i++) {
            // A listed character holds a license while the season runs, but between seasonEnd and this call
            // its controller may unlicense and retire it; the share of a retired character then stays in the
            // RewardPool (via prize - booked) instead of being booked to address(0).
            address to = NFT.controllerOf(list[i]);
            if (to == address(0)) continue;
            uint256 amount = prize * Config.seasonSplit(i) / Config.BPS;
            claimable[to] += amount;
            booked += amount;
            emit SeasonRewardBooked(season, list[i], to, amount);
        }
        if (prize > booked) TL.safeTransfer(address(REWARD_POOL), prize - booked);
        emit SeasonClosed(season, prize, list);
    }

    /// @notice Withdraw booked season rewards.
    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender] = 0;
        TL.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    // ------------------------------------------------------------------ internals

    function _pairKey(uint256 a, uint256 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    function _squeeze(int256 r) internal pure returns (int256) {
        int256 base = int256(Config.RATING_START);
        return base + (r - base) * int256(Config.ELO_SQUEEZE_BPS) / int256(Config.BPS);
    }

    /// @dev Apply lazy squeezes and return the current rating; initialises first-time characters.
    function _touch(uint256 characterId, uint256 season) internal returns (int256 r) {
        r = ratingOf(characterId);
        _rating[characterId] = r;
        lastSeasonTouched[characterId] = season;
    }

    function _elo(int256 mine, int256 theirs, uint256 scorePermille, uint256 played) internal pure returns (int256) {
        int256 k = int256(played < Config.ELO_EARLY_MATCHES ? Config.ELO_K_EARLY : Config.ELO_K_LATE);
        int256 expected = int256(expectedScore(mine - theirs));
        return mine + k * (int256(scorePermille) - expected) / 1000;
    }

    function _countSeason(uint256 season, uint256 characterId, bool newOpponent) internal {
        if (!licensed[characterId]) return;
        seasonRatedMatches[season][characterId]++;
        if (newOpponent) seasonDistinctOpponents[season][characterId]++;
    }

    function _indexInTop(uint256 season, uint256 characterId) internal view returns (bool found, uint256 idx) {
        uint256[] storage list = _top[season];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == characterId) return (true, i);
        }
        return (false, 0);
    }

    function _removeFromTop(uint256 season, uint256 characterId) internal {
        (bool found, uint256 idx) = _indexInTop(season, characterId);
        if (!found) return;
        uint256[] storage list = _top[season];
        for (uint256 i = idx; i + 1 < list.length; i++) {
            list[i] = list[i + 1];
        }
        list.pop();
    }

    /// @dev Insert or reposition `characterId` in the season's sorted top-10 (desc by rating; ties
    ///      keep the earlier entrant ahead), or remove it when no longer eligible.
    function _updateTop(uint256 season, uint256 characterId) internal {
        if (seasonClosed[season]) return;
        _removeFromTop(season, characterId);
        if (!eligible(season, characterId)) return;
        uint256[] storage list = _top[season];
        int256 r = ratingOf(characterId);
        uint256 pos = list.length;
        for (uint256 i = 0; i < list.length; i++) {
            if (ratingOf(list[i]) < r) {
                pos = i;
                break;
            }
        }
        if (pos >= 10) return;
        list.push(0);
        for (uint256 i = list.length - 1; i > pos; i--) {
            list[i] = list[i - 1];
        }
        list[pos] = characterId;
        if (list.length > 10) list.pop();
    }
}
