import { UnorderedMap } from "near-sdk-js";

export class BetRound {
  roundId: bigint;
  players: UnorderedMap;
  winner: string;
  highestBid: bigint;
  startTime: bigint;
  endTime: bigint;
  tokenId: string;

  constructor({
    roundId,
    players,
    winner,
    highestBid,
    startTime,
    endTime,
    tokenId,
  }: {
    roundId: bigint;
    players: UnorderedMap;
    winner: string;
    highestBid: bigint;
    startTime: bigint;
    endTime: bigint;
    tokenId: string;
  }) {
    this.roundId = roundId;
    this.players = players;
    this.winner = winner;
    this.highestBid = highestBid;
    this.startTime = startTime;
    this.endTime = endTime;
    this.tokenId = tokenId;
  }
}
