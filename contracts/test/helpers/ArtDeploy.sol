// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {CharacterPortrait} from "../../src/CharacterPortrait.sol";
import {PortraitArms} from "../../src/art/PortraitArms.sol";
import {PortraitBase} from "../../src/art/PortraitBase.sol";
import {PortraitBody} from "../../src/art/PortraitBody.sol";
import {PortraitFace} from "../../src/art/PortraitFace.sol";
import {PortraitItems} from "../../src/art/PortraitItems.sol";

/// @dev Deploys the portrait renderer (five parts + entry): six CREATEs from the caller.
function deployPortrait() returns (CharacterPortrait) {
    address[5] memory parts;
    parts[0] = address(new PortraitBase());
    parts[1] = address(new PortraitBody());
    parts[2] = address(new PortraitFace());
    parts[3] = address(new PortraitItems());
    parts[4] = address(new PortraitArms());
    return new CharacterPortrait(parts);
}
