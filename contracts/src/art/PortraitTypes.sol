// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title PortraitTypes
/// @notice Shared data of the portrait renderer: the element palette, and the per-character
///         context (traits as tiers, id-hashed variants, colours, head outline) that the
///         rendering parts receive. Pure data, no logic.
library PortraitTypes {
    /// @dev Element palette: background pair, ring, accent and its shade, iris, glow, cloth pair.
    struct Pal {
        string bg;
        string bg2;
        string ring;
        string a;
        string ab;
        string iris;
        string glow;
        string cloth;
        string cloth2;
    }

    /// @dev Everything a rendering part needs; built once per portrait by CharacterPortrait.
    struct Ctx {
        uint8 e; // element 0..4 (out-of-range elements render as Shadow)
        uint8 special; // 0..8
        uint8 weakness; // 0..4 (out-of-range weaknesses render as Shadow)
        uint8 strTier; // strength tier 0..2
        uint8 defTier; // defense tier 0..2
        uint8 spdTier; // speed tier 0..2
        uint8 focTier; // focus tier 0..2
        uint8 skin; // 0..2
        uint8 marks; // 0..6
        uint8 ears; // 0..2
        uint8 accessory; // 0..5
        uint8 background; // 0..5
        uint8 outfit; // 0..5
        uint8 brows; // 0..2
        uint8 metal; // 0..1
        uint8 iris; // 0..1
        uint8 headgear; // 0..5
        uint8 eye; // 0..2
        uint8 itemStyle; // 0..1
        bool goldEyes; // rare, 1 in 16
        bool aura; // rare, 1 in 16
        bytes32 seed; // keccak256 of the id, also the star positions
        string head; // head outline path
        Pal p; // element palette
        string s0; // skin light
        string s1; // skin base
        string s2; // skin shade
        string wa; // weakness accent (badge)
        string wab; // weakness accent shade (badge)
    }
}

/// @notice One section of the portrait, rendered from the shared context. Pure: the parts hold
///         no state and are called with a static call.
interface IPortraitPart {
    function render(PortraitTypes.Ctx calldata c) external pure returns (string memory);
}
