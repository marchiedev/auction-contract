import {
  NearBindgen,
  NearContract,
  near,
  call,
  view,
  UnorderedMap,
} from "near-sdk-js";
import { assert } from "./helper/assert";
import { BetRound } from "./model/bet_round";
import { Player } from "./model/player";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// The @NearBindgen decorator allows this code to compile to Base64.
@NearBindgen
class AuctionContract extends NearContract {
  // variables for auction round
  startTime: bigint;
  endTime: bigint;
  roundId: bigint;

  // all players
  allRounds: UnorderedMap;
  players: UnorderedMap;

  // variables for current round and last round winner
  currentWinner: string;
  currentHighestBid: bigint;
  lastRoundWinner: string;
  lastRoundHighestBid: bigint;

  constructor() {
    super();

    //execute the NEAR Contract's constructor
    this.players = new UnorderedMap("auction_contract");
    this.allRounds = new UnorderedMap("auction_contract");
    this.roundId = BigInt(0);
    this.startTime = BigInt(0);
    this.endTime = BigInt(0);
  }

  default() {
    return new AuctionContract();
  }

  // Function Call method for placing a bet
  @call
  bet({ address, amount }: { address: string; amount: bigint }): void {
    // Check if timestamp is between StartTime and EndTime
    const now = (near.blockTimestamp() as bigint) / BigInt(10 ** 9);

    near.log(`current timestamp is ${now}`);

    assert(now >= this.startTime, "Auction not yet Started");
    assert(now <= this.endTime, "Auction Ended");

    // Check if address is from sender and amount matched attached amount
    const sender = near.predecessorAccountId();
    const attachedAmount: bigint = near.attachedDeposit() as bigint;

    near.log(`calling from: ${address}`);
    near.log(`attached amount: ${attachedAmount}`);
    near.log(`betting amount: ${amount}`);

    assert(sender === address, `Address does not matched Sender Address`);
    assert(attachedAmount >= amount, `Amount does not matched Attached Amount`);

    // Check if attached ammount higher than current highest bid
    assert(
      attachedAmount > this.currentHighestBid,
      `Attached Amount is not higher than Current Highest Bid`
    );

    // Betting Logic
    const player = new Player({ address, amount });

    this.players.set(address, player);

    this.currentWinner = address;
    this.currentHighestBid = amount;

    near.log(
      `current winner is ${this.currentWinner} with the highest bid of ${this.currentHighestBid}`
    );
  }

  // Function Call method to end current round
  @call
  endRound() {
    // Start a new round logic
    const lastBetRound = new BetRound({
      roundId: this.roundId,
      players: this.players,
      winner: this.currentWinner,
      highestBid: this.currentHighestBid,
      startTime: this.startTime,
      endTime: this.endTime,
      tokenId: this.roundId + "",
    });

    this.allRounds.set(this.roundId.toString(), lastBetRound);

    // // clear variables
    this.players.clear();
    this.lastRoundWinner = this.currentWinner;
    this.lastRoundHighestBid = this.currentHighestBid;
    this.currentWinner = "";
    this.currentHighestBid = BigInt(0);
  }

  // Function Call method to start a new round
  @call
  startNewRound({
    startTime,
    endTime,
  }: {
    startTime: bigint;
    endTime: bigint;
  }) {
    this.roundId += BigInt(1);

    // set start time, end time
    this.startTime = startTime;
    this.endTime = endTime;

    near.log(`token id: ${this.roundId}`);
    near.log(`current account: ${near.currentAccountId()}`);
  }

  // Function View method for fetching current winner
  @view
  getCurrentWinner() {
    return this.currentWinner;
  }

  // Function View method for fetching current highest bid
  @view
  getCurrentHighestBid() {
    return this.currentHighestBid;
  }

  @view
  getCurrentStartTime() {
    return this.startTime;
  }

  @view
  getCurrentEndTime() {
    return this.endTime;
  }

  @view
  getCurrentRoundId() {
    return this.roundId;
  }

  @view
  getLastRoundWinner() {
    return this.lastRoundWinner;
  }

  @view
  getLastRoundHighestBid() {
    return this.lastRoundHighestBid;
  }

  @view
  getPlayers() {
    return this.players.toArray();
  }
}
