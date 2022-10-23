import {
  NearBindgen,
  NearContract,
  near,
  call,
  view,
  UnorderedMap,
  LookupMap,
  bytes,
} from "near-sdk-js";
import { assert } from "./helper/assert";
import { BetRound } from "./model/bet_round";
import { Player } from "./model/player";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Used In Main Contract
class NFTContractMetadata {
  spec: string;
  name: string;
  symbol: string;
  icon?: string;
  base_uri?: string;
  reference?: string;
  reference_hash?: string;

  constructor({
    spec,
    name,
    symbol,
    icon,
    baseUri,
    reference,
    referenceHash,
  }: {
    spec: string;
    name: string;
    symbol: string;
    icon?: string;
    baseUri?: string;
    reference?: string;
    referenceHash?: string;
  }) {
    this.spec = spec; // required, essentially a version like "nft-1.0.0"
    this.name = name; // required, ex. "Mosaics"
    this.symbol = symbol; // required, ex. "MOSAIC"
    this.icon = icon; // Data URL
    this.base_uri = baseUri; // Centralized gateway known to have reliable access to decentralized storage assets referenced by `reference` or `media` URLs
    this.reference = reference; // URL to a JSON file with more info
    this.reference_hash = referenceHash; // Base64-encoded sha256 hash of JSON from reference field. Required if `reference` is included.
  }
}

// Used In Token
class TokenMetadata {
  title?: string;
  description?: string;
  media?: string;
  media_hash?: string;
  copies?: number;
  issued_at?: string;
  expires_at?: string;
  starts_at?: string;
  updated_at?: string;
  extra?: string;
  reference?: string;
  reference_hash?: string;

  constructor({
    title,
    description,
    media,
    mediaHash,
    copies,
    issuedAt,
    expiresAt,
    startsAt,
    updatedAt,
    extra,
    reference,
    referenceHash,
  }: {
    title?: string;
    description?: string;
    media?: string;
    mediaHash?: string;
    copies?: number;
    issuedAt?: string;
    expiresAt?: string;
    startsAt?: string;
    updatedAt?: string;
    extra?: string;
    reference?: string;
    referenceHash?: string;
  }) {
    this.title = title; // ex. "Arch Nemesis: Mail Carrier" or "Parcel #5055"
    this.description = description; // free-form description
    this.media = media; // URL to associated media, preferably to decentralized, content-addressed storage
    this.media_hash = mediaHash; // Base64-encoded sha256 hash of content referenced by the `media` field. Required if `media` is included.
    this.copies = copies; // number of copies of this set of metadata in existence when token was minted.
    this.issued_at = issuedAt; // ISO 8601 datetime when token was issued or minted
    this.expires_at = expiresAt; // ISO 8601 datetime when token expires
    this.starts_at = startsAt; // ISO 8601 datetime when token starts being valid
    this.updated_at = updatedAt; // ISO 8601 datetime when token was last updated
    this.extra = extra; // anything extra the NFT wants to store on-chain. Can be stringified JSON.
    this.reference = reference; // URL to an off-chain JSON file with more info.
    this.reference_hash = referenceHash; // Base64-encoded sha256 hash of JSON from reference field. Required if `reference` is included.
  }
}

class Token {
  token_id: string;
  owner_id: string;

  constructor(token_id, owner_id) {
    this.token_id = token_id;
    this.owner_id = owner_id;
  }
}

//The Json token is what will be returned from view calls.
export class JsonToken {
  token_id: string;
  owner_id: string | unknown;
  metadata: TokenMetadata;

  constructor({
    tokenId,
    ownerId,
    metadata,
  }: {
    tokenId: string;
    ownerId: string | unknown;
    metadata: TokenMetadata;
  }) {
    //token ID
    this.token_id = tokenId;
    //owner of the token
    this.owner_id = ownerId;
    //token metadata
    this.metadata = metadata;
  }
}

// The @NearBindgen decorator allows this code to compile to Base64.
@NearBindgen
class AuctionContract extends NearContract {
  // NFT
  owner_id: string;
  owner_by_id: LookupMap;
  token_metadata_by_id: LookupMap;
  metadata: NFTContractMetadata;

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

  constructor({
    owner_id = "marchie.testnet",
    metadata = {
      spec: "nft-1.0.0",
      name: "NFT Tutorial Contract",
      symbol: "GOTEAM",
    },
  }: {
    owner_id: string;
    metadata?: NFTContractMetadata;
  }) {
    super();

    this.metadata = metadata;
    this.owner_id = near.currentAccountId();
    this.owner_by_id = new LookupMap("a");

    //execute the NEAR Contract's constructor
    this.players = new UnorderedMap("auction_contract");
    this.allRounds = new UnorderedMap("auction_contract");
    this.roundId = BigInt(0);
    this.startTime = BigInt(0);
    this.endTime = BigInt(0);
  }

  default() {
    return new AuctionContract({ owner_id: "" });
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

    // Send last current highest bid to last current winner
    const promise = near.promiseBatchCreate(this.currentWinner);
    near.promiseBatchActionTransfer(promise, this.currentHighestBid);
    near.promiseReturn(promise);

    this.currentWinner = address;
    this.currentHighestBid = amount;

    near.log(
      `current winner is ${this.currentWinner} with the highest bid of ${this.currentHighestBid}`
    );
  }

  // Function Call method to end current round
  @call
  endRound() {
    // Send a NFT to last round winner
    this.nftTransfer({
      receiver_id: this.currentWinner,
      token_id: this.roundId.toString(),
      approval_id: near.currentAccountId(),
      memo: "",
    });

    // Start a new round logic
    const lastBetRound = new BetRound({
      roundId: this.roundId,
      players: this.players,
      winner: this.currentWinner,
      highestBid: this.currentHighestBid,
      startTime: this.startTime,
      endTime: this.endTime,
      tokenId: this.roundId.toString(),
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

    // Mint a NFT
    this.nftMint({
      token_id: this.roundId.toString(),
      token_owner_id: near.currentAccountId(),
    });
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

  // NFT
  //get the information for a specific token ID
  internalNftMetadata({ token_id }: { token_id: string }) {
    return this.token_metadata_by_id.get(token_id);
  }

  internalTransfer({
    sender_id,
    receiver_id,
    token_id,
    approval_id: _ai,
    memo: _m,
  }: {
    sender_id: string;
    receiver_id: string;
    token_id: string;
    approval_id: string;
    memo: string;
  }) {
    let owner_id = this.owner_by_id.get(token_id);

    assert(owner_id !== null, "Token not found");
    assert(sender_id === owner_id, "Sender must be the current owner");
    assert(owner_id !== receiver_id, "Current and next owner must differ");

    this.owner_by_id.set(token_id, receiver_id);

    return owner_id;
  }

  @call
  nftTransfer({
    receiver_id,
    token_id,
    approval_id,
    memo,
  }: {
    receiver_id: string;
    token_id: string;
    approval_id: string;
    memo: string;
  }) {
    let sender_id = near.predecessorAccountId();
    this.internalTransfer({
      sender_id,
      receiver_id,
      token_id,
      approval_id,
      memo,
    });
  }

  @call
  nftTransferCall({
    receiver_id,
    token_id,
    approval_id,
    memo,
    msg,
  }: {
    receiver_id: string;
    token_id: string;
    approval_id: string;
    memo: string;
    msg: string;
  }) {
    near.log(
      `nftTransferCall called, receiver_id ${receiver_id}, token_id ${token_id}`
    );
    let sender_id = near.predecessorAccountId();
    let old_owner_id = this.internalTransfer({
      sender_id,
      receiver_id,
      token_id,
      approval_id,
      memo,
    });

    const promise = near.promiseBatchCreate(receiver_id);
    near.promiseBatchActionFunctionCall(
      promise,
      "nftOnTransfer",
      bytes(
        JSON.stringify({
          senderId: sender_id,
          previousOwnerId: old_owner_id,
          tokenId: token_id,
          msg: msg,
        })
      ),
      0,
      30000000000000
    );
    near.promiseThen(
      promise,
      near.currentAccountId(),
      "_nftResolveTransfer",
      bytes(JSON.stringify({ sender_id, receiver_id, token_id })),
      0,
      30000000000000
    );
  }

  @call
  _nftResolveTransfer({
    sender_id,
    receiver_id,
    token_id,
  }: {
    sender_id: string;
    receiver_id: string;
    token_id: string;
  }) {
    near.log(
      `_nftResolveTransfer called, receiver_id ${receiver_id}, token_id ${token_id}`
    );

    const promiseResult: any = near.promiseResult(0);

    const isTokenTransfered = JSON.parse(promiseResult);
    near.log(
      `${token_id} ${
        isTokenTransfered ? "was transfered" : "was NOT transfered"
      }`
    );

    if (!isTokenTransfered) {
      near.log(`Returning ${token_id} to ${receiver_id}`);
      const currentOwner = this.owner_by_id.get(token_id);
      if (currentOwner === receiver_id) {
        this.internalTransfer({
          sender_id: receiver_id,
          receiver_id: sender_id,
          token_id: token_id,
          approval_id: null,
          memo: null,
        });
        near.log(`${token_id} returned to ${sender_id}`);
        return;
      }
      near.log(
        `Failed to return ${token_id}. It was burned or not owned by ${receiver_id} now.`
      );
    }
  }

  @call
  nftMint({
    token_id,
    token_owner_id,
    token_metadata,
  }: {
    token_id: string;
    token_owner_id: string;
    token_metadata?: TokenMetadata;
  }) {
    let sender_id = near.predecessorAccountId();
    assert(sender_id === this.owner_id, "Unauthorized");
    assert(this.owner_by_id.get(token_id) === null, "Token ID must be unique");

    this.owner_by_id.set(token_id, token_owner_id);
    this.token_metadata_by_id.set(token_id, token_metadata);

    return new Token(token_id, token_owner_id);
  }

  @view
  nftToken({ token_id }: { token_id: string }) {
    let owner_id = this.owner_by_id.get(token_id);
    if (owner_id === null) {
      return null;
    }

    let metadata = this.internalNftMetadata({ token_id });

    //we return the JsonToken
    let jsonToken = new JsonToken({
      tokenId: token_id,
      ownerId: owner_id,
      metadata,
    });

    return jsonToken;
  }
}
