/**
 * Turn a viem / wallet error into one readable line. The contracts use custom errors, so the
 * usual shape is "Error: Cooldown()"; wallets add their own phrasing for rejections.
 */
const CUSTOM_ERROR_TEXT: Record<string, string> = {
  NotController: "You do not control this character.",
  BadStake: "Stake must be 0 (friendly) or between 100 and 1,000,000 TRCH.",
  BadPreset: "Unknown preset.",
  BadOpponent: "Invalid opponent: the same character, the same controller, or a retired character.",
  Cooldown: "This pair of characters played in the last 24 hours. Wait for the cooldown to end.",
  BadStatus: "The match or tournament is not in the right state for this action.",
  TooLate: "The deadline for this action has passed.",
  TooEarly: "Too early: the window for this action has not opened yet.",
  NotParticipant: "Your address is not a side of this match.",
  AlreadyCommitted: "You have already committed tactics for this match.",
  NotCommitted: "Both sides must commit before anyone can reveal.",
  AlreadyRevealed: "You have already revealed.",
  BadReveal: "The revealed tactics do not match your commit.",
  InvalidTactics: "Tactics are invalid: energy must sum exactly to your budget.",
  NothingToDo: "Nothing to do yet: no deadline has passed.",
  NothingToClaim: "Nothing to claim.",
  StakingClosed: "The staking window for this match is closed.",
  ControllerCannotStake: "Controllers cannot stake on their own match.",
  NotResolved: "The match is not resolved yet.",
  NothingToWithdraw: "You have no stake in this match.",
  AlreadyLicensed: "This character already holds a season license.",
  NotLicensed: "This character has no season license.",
  SeasonNotOver: "The season has not ended yet.",
  BadSize: "Tournament size must be 8 or 16.",
  BadEntry: "Entry must be between 100 and 1,000,000 TRCH.",
  BadFee: "Organizer fee must be between 0 % and 2 %.",
  Full: "The tournament is already full.",
  NotFull: "The tournament is not full yet.",
  AlreadyRegistered: "This character is already registered (or busy in another tournament).",
  ControllerAlreadyIn: "You already have a character in this tournament.",
  NotRegistered: "This character is not registered.",
  RegistrationOpen: "Registration is still open; cancelling is possible only after 72 hours.",
  RoundNotFinished: "Not every match of the current round is resolved.",
  InvalidTraits: "Traits are invalid: each 1–15, total exactly 45.",
  InvalidSpecial: "Pick a special ability.",
  InvalidTokenomics: "Tokenomics out of bounds.",
  EmptyMetadata: "Metadata must not be empty.",
  SlippageExceeded: "Price moved beyond the slippage tolerance. Try again.",
  InsufficientReserve: "The pool's real reserve cannot cover this sale right now.",
  ZeroAmount: "Amount must be greater than zero.",
  CharacterBusy: "The character is in an active match or tournament.",
  Paused: "This action is paused by the guardian. Claims, reveals and withdrawals still work.",
  ExceedsPerTxMax: "During the launch cap period a single buy is limited to 0.5 ETH.",
  ExceedsInflowCap: "The cumulative launch inflow cap for today is reached.",
  ERC20InsufficientBalance: "Insufficient token balance.",
  ERC20InsufficientAllowance: "Insufficient allowance: approve first.",
};

export function shortError(input: unknown): string {
  const msg = input instanceof Error ? input.message : String(input ?? "");
  if (/user rejected|user denied|rejected the request/i.test(msg)) return "Transaction rejected in the wallet.";
  if (/insufficient funds/i.test(msg)) return "Insufficient ETH for gas.";
  const custom = msg.match(/Error:\s*([A-Za-z0-9_]+)\(/) ?? msg.match(/reverted with the following reason:\s*([A-Za-z0-9_]+)/);
  if (custom?.[1]) {
    const name = custom[1];
    return CUSTOM_ERROR_TEXT[name] ?? `Reverted: ${name}`;
  }
  const reason = msg.match(/reverted with the following reason:\s*([^\n]+)/);
  if (reason?.[1]) return `Reverted: ${reason[1]}`;
  if (/indexer \d{3}/.test(msg)) return "The indexer is unreachable. On-chain actions still work.";
  const first = msg.split("\n")[0] ?? msg;
  return first.length > 180 ? `${first.slice(0, 177)}…` : first || "Unknown error.";
}
