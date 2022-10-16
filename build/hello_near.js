function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }

  return desc;
}

function call(target, key, descriptor) {}
function view(target, key, descriptor) {}
function NearBindgen(target) {
  return class extends target {
    static _init() {
      // @ts-ignore
      let args = target.deserializeArgs();
      let ret = new target(args); // @ts-ignore

      ret.init(); // @ts-ignore

      ret.serialize();
      return ret;
    }

    static _get() {
      let ret = Object.create(target.prototype);
      return ret;
    }

  };
}

const U64_MAX = 2n ** 64n - 1n;
const EVICTED_REGISTER = U64_MAX - 1n;
function log(...params) {
  env.log(`${params.map(x => x === undefined ? 'undefined' : x) // Stringify undefined
  .map(x => typeof x === 'object' ? JSON.stringify(x) : x) // Convert Objects to strings
  .join(' ')}` // Convert to string
  );
}
function predecessorAccountId() {
  env.predecessor_account_id(0);
  return env.read_register(0);
}
function blockTimestamp() {
  return env.block_timestamp();
}
function attachedDeposit() {
  return env.attached_deposit();
}
function panic(msg) {
  if (msg !== undefined) {
    env.panic(msg);
  } else {
    env.panic();
  }
}
function storageRead(key) {
  let ret = env.storage_read(key, 0);

  if (ret === 1n) {
    return env.read_register(0);
  } else {
    return null;
  }
}
function storageHasKey(key) {
  let ret = env.storage_has_key(key);

  if (ret === 1n) {
    return true;
  } else {
    return false;
  }
}
function storageGetEvicted() {
  return env.read_register(EVICTED_REGISTER);
}

function currentAccountId() {
  env.current_account_id(0);
  return env.read_register(0);
}
function input() {
  env.input(0);
  return env.read_register(0);
}
function promiseThen(promiseIndex, accountId, methodName, args, amount, gas) {
  return env.promise_then(promiseIndex, accountId, methodName, args, amount, gas);
}
function promiseBatchCreate(accountId) {
  return env.promise_batch_create(accountId);
}
function promiseBatchActionFunctionCall(promiseIndex, methodName, args, amount, gas) {
  env.promise_batch_action_function_call(promiseIndex, methodName, args, amount, gas);
}
var PromiseResult;

(function (PromiseResult) {
  PromiseResult[PromiseResult["NotReady"] = 0] = "NotReady";
  PromiseResult[PromiseResult["Successful"] = 1] = "Successful";
  PromiseResult[PromiseResult["Failed"] = 2] = "Failed";
})(PromiseResult || (PromiseResult = {}));

function promiseResult(resultIdx) {
  let status = env.promise_result(resultIdx, 0);

  if (status == PromiseResult.Successful) {
    return env.read_register(0);
  } else if (status == PromiseResult.Failed || status == PromiseResult.NotReady) {
    return status;
  } else {
    panic(`Unexpected return code: ${status}`);
  }
}
function storageWrite(key, value) {
  let exist = env.storage_write(key, value, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}
function storageRemove(key) {
  let exist = env.storage_remove(key, EVICTED_REGISTER);

  if (exist === 1n) {
    return true;
  }

  return false;
}

class NearContract {
  deserialize() {
    const rawState = storageRead("STATE");

    if (rawState) {
      const state = JSON.parse(rawState); // reconstruction of the contract class object from plain object

      let c = this.default();
      Object.assign(this, state);

      for (const item in c) {
        if (c[item].constructor?.deserialize !== undefined) {
          this[item] = c[item].constructor.deserialize(this[item]);
        }
      }
    } else {
      throw new Error("Contract state is empty");
    }
  }

  serialize() {
    storageWrite("STATE", JSON.stringify(this));
  }

  static deserializeArgs() {
    let args = input();
    return JSON.parse(args || "{}");
  }

  static serializeReturn(ret) {
    return JSON.stringify(ret);
  }

  init() {}

}

class LookupMap {
  constructor(keyPrefix) {
    this.keyPrefix = keyPrefix;
  }

  containsKey(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    return storageHasKey(storageKey);
  }

  get(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    let raw = storageRead(storageKey);

    if (raw !== null) {
      return JSON.parse(raw);
    }

    return null;
  }

  remove(key) {
    let storageKey = this.keyPrefix + JSON.stringify(key);

    if (storageRemove(storageKey)) {
      return JSON.parse(storageGetEvicted());
    }

    return null;
  }

  set(key, value) {
    let storageKey = this.keyPrefix + JSON.stringify(key);
    let storageValue = JSON.stringify(value);

    if (storageWrite(storageKey, storageValue)) {
      return JSON.parse(storageGetEvicted());
    }

    return null;
  }

  extend(objects) {
    for (let kv of objects) {
      this.set(kv[0], kv[1]);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    return new LookupMap(data.keyPrefix);
  }

}

function u8ArrayToBytes(array) {
  let ret = "";

  for (let e of array) {
    ret += String.fromCharCode(e);
  }

  return ret;
} // TODO this function is a bit broken and the type can't be string
// TODO for more info: https://github.com/near/near-sdk-js/issues/78

function bytesToU8Array(bytes) {
  let ret = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i++) {
    ret[i] = bytes.charCodeAt(i);
  }

  return ret;
}
function bytes(strOrU8Array) {
  if (typeof strOrU8Array == "string") {
    return checkStringIsBytes(strOrU8Array);
  } else if (strOrU8Array instanceof Uint8Array) {
    return u8ArrayToBytes(strOrU8Array);
  }

  throw new Error("bytes: expected string or Uint8Array");
}

function checkStringIsBytes(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      throw new Error(`string ${str} at index ${i}: ${str[i]} is not a valid byte`);
    }
  }

  return str;
}

const ERR_INDEX_OUT_OF_BOUNDS = "Index out of bounds";
const ERR_INCONSISTENT_STATE$1 = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";

function indexToKey(prefix, index) {
  let data = new Uint32Array([index]);
  let array = new Uint8Array(data.buffer);
  let key = u8ArrayToBytes(array);
  return prefix + key;
} /// An iterable implementation of vector that stores its content on the trie.
/// Uses the following map: index -> element


class Vector {
  constructor(prefix) {
    this.length = 0;
    this.prefix = prefix;
  }

  len() {
    return this.length;
  }

  isEmpty() {
    return this.length == 0;
  }

  get(index) {
    if (index >= this.length) {
      return null;
    }

    let storageKey = indexToKey(this.prefix, index);
    return JSON.parse(storageRead(storageKey));
  } /// Removes an element from the vector and returns it in serialized form.
  /// The removed element is replaced by the last element of the vector.
  /// Does not preserve ordering, but is `O(1)`.


  swapRemove(index) {
    if (index >= this.length) {
      throw new Error(ERR_INDEX_OUT_OF_BOUNDS);
    } else if (index + 1 == this.length) {
      return this.pop();
    } else {
      let key = indexToKey(this.prefix, index);
      let last = this.pop();

      if (storageWrite(key, JSON.stringify(last))) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }
    }
  }

  push(element) {
    let key = indexToKey(this.prefix, this.length);
    this.length += 1;
    storageWrite(key, JSON.stringify(element));
  }

  pop() {
    if (this.isEmpty()) {
      return null;
    } else {
      let lastIndex = this.length - 1;
      let lastKey = indexToKey(this.prefix, lastIndex);
      this.length -= 1;

      if (storageRemove(lastKey)) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }
    }
  }

  replace(index, element) {
    if (index >= this.length) {
      throw new Error(ERR_INDEX_OUT_OF_BOUNDS);
    } else {
      let key = indexToKey(this.prefix, index);

      if (storageWrite(key, JSON.stringify(element))) {
        return JSON.parse(storageGetEvicted());
      } else {
        throw new Error(ERR_INCONSISTENT_STATE$1);
      }
    }
  }

  extend(elements) {
    for (let element of elements) {
      this.push(element);
    }
  }

  [Symbol.iterator]() {
    return new VectorIterator(this);
  }

  clear() {
    for (let i = 0; i < this.length; i++) {
      let key = indexToKey(this.prefix, i);
      storageRemove(key);
    }

    this.length = 0;
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let vector = new Vector(data.prefix);
    vector.length = data.length;
    return vector;
  }

}
class VectorIterator {
  constructor(vector) {
    this.current = 0;
    this.vector = vector;
  }

  next() {
    if (this.current < this.vector.len()) {
      let value = this.vector.get(this.current);
      this.current += 1;
      return {
        value,
        done: false
      };
    }

    return {
      value: null,
      done: true
    };
  }

}

const ERR_INCONSISTENT_STATE = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";
class UnorderedMap {
  constructor(prefix) {
    this.length = 0;
    this.prefix = prefix;
    this.keyIndexPrefix = prefix + "i";
    let indexKey = prefix + "k";
    let indexValue = prefix + "v";
    this.keys = new Vector(indexKey);
    this.values = new Vector(indexValue);
  }

  len() {
    let keysLen = this.keys.len();
    let valuesLen = this.values.len();

    if (keysLen != valuesLen) {
      throw new Error(ERR_INCONSISTENT_STATE);
    }

    return keysLen;
  }

  isEmpty() {
    let keysIsEmpty = this.keys.isEmpty();
    let valuesIsEmpty = this.values.isEmpty();

    if (keysIsEmpty != valuesIsEmpty) {
      throw new Error(ERR_INCONSISTENT_STATE);
    }

    return keysIsEmpty;
  }

  serializeIndex(index) {
    let data = new Uint32Array([index]);
    let array = new Uint8Array(data.buffer);
    return u8ArrayToBytes(array);
  }

  deserializeIndex(rawIndex) {
    let array = bytesToU8Array(rawIndex);
    let data = new Uint32Array(array.buffer);
    return data[0];
  }

  getIndexRaw(key) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);
    return indexRaw;
  }

  get(key) {
    let indexRaw = this.getIndexRaw(key);

    if (indexRaw) {
      let index = this.deserializeIndex(indexRaw);
      let value = this.values.get(index);

      if (value) {
        return value;
      } else {
        throw new Error(ERR_INCONSISTENT_STATE);
      }
    }

    return null;
  }

  set(key, value) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);

    if (indexRaw) {
      let index = this.deserializeIndex(indexRaw);
      return this.values.replace(index, value);
    } else {
      let nextIndex = this.len();
      let nextIndexRaw = this.serializeIndex(nextIndex);
      storageWrite(indexLookup, nextIndexRaw);
      this.keys.push(key);
      this.values.push(value);
      return null;
    }
  }

  remove(key) {
    let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
    let indexRaw = storageRead(indexLookup);

    if (indexRaw) {
      if (this.len() == 1) {
        // If there is only one element then swap remove simply removes it without
        // swapping with the last element.
        storageRemove(indexLookup);
      } else {
        // If there is more than one element then swap remove swaps it with the last
        // element.
        let lastKey = this.keys.get(this.len() - 1);

        if (!lastKey) {
          throw new Error(ERR_INCONSISTENT_STATE);
        }

        storageRemove(indexLookup); // If the removed element was the last element from keys, then we don't need to
        // reinsert the lookup back.

        if (lastKey != key) {
          let lastLookupKey = this.keyIndexPrefix + JSON.stringify(lastKey);
          storageWrite(lastLookupKey, indexRaw);
        }
      }

      let index = this.deserializeIndex(indexRaw);
      this.keys.swapRemove(index);
      return this.values.swapRemove(index);
    }

    return null;
  }

  clear() {
    for (let key of this.keys) {
      let indexLookup = this.keyIndexPrefix + JSON.stringify(key);
      storageRemove(indexLookup);
    }

    this.keys.clear();
    this.values.clear();
  }

  toArray() {
    let ret = [];

    for (let v of this) {
      ret.push(v);
    }

    return ret;
  }

  [Symbol.iterator]() {
    return new UnorderedMapIterator(this);
  }

  extend(kvs) {
    for (let [k, v] of kvs) {
      this.set(k, v);
    }
  }

  serialize() {
    return JSON.stringify(this);
  } // converting plain object to class object


  static deserialize(data) {
    let map = new UnorderedMap(data.prefix); // reconstruct UnorderedMap

    map.length = data.length; // reconstruct keys Vector

    map.keys = new Vector(data.prefix + "k");
    map.keys.length = data.keys.length; // reconstruct values Vector

    map.values = new Vector(data.prefix + "v");
    map.values.length = data.values.length;
    return map;
  }

}

class UnorderedMapIterator {
  constructor(unorderedMap) {
    this.keys = new VectorIterator(unorderedMap.keys);
    this.values = new VectorIterator(unorderedMap.values);
  }

  next() {
    let key = this.keys.next();
    let value = this.values.next();

    if (key.done != value.done) {
      throw new Error(ERR_INCONSISTENT_STATE);
    }

    return {
      value: [key.value, value.value],
      done: key.done
    };
  }

}

function assert(statement, message) {
  if (!statement) {
    throw Error(`Assertion failed: ${message}`);
  }
}

class BetRound {
  constructor({
    roundId,
    players,
    winner,
    highestBid,
    startTime,
    endTime,
    tokenId
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

class Player {
  constructor({
    address,
    amount
  }) {
    this.address = address;
    this.amount = amount;
  }

}

var _class, _class2;

BigInt.prototype.toJSON = function () {
  return this.toString();
};

class Token {
  constructor(token_id, owner_id) {
    this.token_id = token_id;
    this.owner_id = owner_id;
  }

} // The @NearBindgen decorator allows this code to compile to Base64.


let AuctionContract = NearBindgen(_class = (_class2 = class AuctionContract extends NearContract {
  // NFT
  // variables for auction round
  // all players
  // variables for current round and last round winner
  constructor({
    owner_id = "marchie.testnet"
  }) {
    super();
    this.owner_id = currentAccountId();
    this.owner_by_id = new LookupMap("a"); //execute the NEAR Contract's constructor

    this.players = new UnorderedMap("auction_contract");
    this.allRounds = new UnorderedMap("auction_contract");
    this.roundId = BigInt(0);
    this.startTime = BigInt(0);
    this.endTime = BigInt(0);
  }

  default() {
    return new AuctionContract({
      owner_id: ""
    });
  } // Function Call method for placing a bet


  bet({
    address,
    amount
  }) {
    // Check if timestamp is between StartTime and EndTime
    const now = blockTimestamp() / BigInt(10 ** 9);
    log(`current timestamp is ${now}`);
    assert(now >= this.startTime, "Auction not yet Started");
    assert(now <= this.endTime, "Auction Ended"); // Check if address is from sender and amount matched attached amount

    const sender = predecessorAccountId();
    const attachedAmount = attachedDeposit();
    log(`calling from: ${address}`);
    log(`attached amount: ${attachedAmount}`);
    log(`betting amount: ${amount}`);
    assert(sender === address, `Address does not matched Sender Address`);
    assert(attachedAmount >= amount, `Amount does not matched Attached Amount`); // Check if attached ammount higher than current highest bid

    assert(attachedAmount > this.currentHighestBid, `Attached Amount is not higher than Current Highest Bid`); // Betting Logic

    const player = new Player({
      address,
      amount
    });
    this.players.set(address, player);
    this.currentWinner = address;
    this.currentHighestBid = amount;
    log(`current winner is ${this.currentWinner} with the highest bid of ${this.currentHighestBid}`);
  } // Function Call method to end current round


  endRound() {
    // Send a NFT to last round winner
    this.nftTransfer({
      receiver_id: this.currentWinner,
      token_id: this.roundId.toString(),
      approval_id: currentAccountId(),
      memo: ""
    }); // Start a new round logic

    const lastBetRound = new BetRound({
      roundId: this.roundId,
      players: this.players,
      winner: this.currentWinner,
      highestBid: this.currentHighestBid,
      startTime: this.startTime,
      endTime: this.endTime,
      tokenId: this.roundId.toString()
    });
    this.allRounds.set(this.roundId.toString(), lastBetRound); // // clear variables

    this.players.clear();
    this.lastRoundWinner = this.currentWinner;
    this.lastRoundHighestBid = this.currentHighestBid;
    this.currentWinner = "";
    this.currentHighestBid = BigInt(0);
  } // Function Call method to start a new round


  startNewRound({
    startTime,
    endTime
  }) {
    this.roundId += BigInt(1); // set start time, end time

    this.startTime = startTime;
    this.endTime = endTime;
    log(`token id: ${this.roundId}`);
    log(`current account: ${currentAccountId()}`); // Mint a NFT

    this.nftMint({
      token_id: this.roundId.toString(),
      token_owner_id: currentAccountId(),
      token_metadata: ""
    });
  } // Function View method for fetching current winner


  getCurrentWinner() {
    return this.currentWinner;
  } // Function View method for fetching current highest bid


  getCurrentHighestBid() {
    return this.currentHighestBid;
  }

  getCurrentStartTime() {
    return this.startTime;
  }

  getCurrentEndTime() {
    return this.endTime;
  }

  getCurrentRoundId() {
    return this.roundId;
  }

  getLastRoundWinner() {
    return this.lastRoundWinner;
  }

  getLastRoundHighestBid() {
    return this.lastRoundHighestBid;
  }

  getPlayers() {
    return this.players.toArray();
  } // NFT


  internalTransfer({
    sender_id,
    receiver_id,
    token_id,
    approval_id: _ai,
    memo: _m
  }) {
    let owner_id = this.owner_by_id.get(token_id);
    assert(owner_id !== null, "Token not found");
    assert(sender_id === owner_id, "Sender must be the current owner");
    assert(owner_id !== receiver_id, "Current and next owner must differ");
    this.owner_by_id.set(token_id, receiver_id);
    return owner_id;
  }

  nftTransfer({
    receiver_id,
    token_id,
    approval_id,
    memo
  }) {
    let sender_id = predecessorAccountId();
    this.internalTransfer({
      sender_id,
      receiver_id,
      token_id,
      approval_id,
      memo
    });
  }

  nftTransferCall({
    receiver_id,
    token_id,
    approval_id,
    memo,
    msg
  }) {
    log(`nftTransferCall called, receiver_id ${receiver_id}, token_id ${token_id}`);
    let sender_id = predecessorAccountId();
    let old_owner_id = this.internalTransfer({
      sender_id,
      receiver_id,
      token_id,
      approval_id,
      memo
    });
    const promise = promiseBatchCreate(receiver_id);
    promiseBatchActionFunctionCall(promise, "nftOnTransfer", bytes(JSON.stringify({
      senderId: sender_id,
      previousOwnerId: old_owner_id,
      tokenId: token_id,
      msg: msg
    })), 0, 30000000000000);
    promiseThen(promise, currentAccountId(), "_nftResolveTransfer", bytes(JSON.stringify({
      sender_id,
      receiver_id,
      token_id
    })), 0, 30000000000000);
  }

  _nftResolveTransfer({
    sender_id,
    receiver_id,
    token_id
  }) {
    log(`_nftResolveTransfer called, receiver_id ${receiver_id}, token_id ${token_id}`);
    const promiseResult$1 = promiseResult(0);
    const isTokenTransfered = JSON.parse(promiseResult$1);
    log(`${token_id} ${isTokenTransfered ? "was transfered" : "was NOT transfered"}`);

    if (!isTokenTransfered) {
      log(`Returning ${token_id} to ${receiver_id}`);
      const currentOwner = this.owner_by_id.get(token_id);

      if (currentOwner === receiver_id) {
        this.internalTransfer({
          sender_id: receiver_id,
          receiver_id: sender_id,
          token_id: token_id,
          approval_id: null,
          memo: null
        });
        log(`${token_id} returned to ${sender_id}`);
        return;
      }

      log(`Failed to return ${token_id}. It was burned or not owned by ${receiver_id} now.`);
    }
  }

  nftMint({
    token_id,
    token_owner_id,
    token_metadata: _
  }) {
    let sender_id = predecessorAccountId();
    assert(sender_id === this.owner_id, "Unauthorized");
    assert(this.owner_by_id.get(token_id) === null, "Token ID must be unique");
    this.owner_by_id.set(token_id, token_owner_id);
    return new Token(token_id, token_owner_id);
  }

  nftToken({
    token_id
  }) {
    let owner_id = this.owner_by_id.get(token_id);

    if (owner_id === null) {
      return null;
    }

    return new Token(token_id, owner_id);
  }

}, (_applyDecoratedDescriptor(_class2.prototype, "bet", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "bet"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "endRound", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "endRound"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "startNewRound", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "startNewRound"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getCurrentWinner", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getCurrentWinner"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getCurrentHighestBid", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getCurrentHighestBid"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getCurrentStartTime", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getCurrentStartTime"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getCurrentEndTime", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getCurrentEndTime"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getCurrentRoundId", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getCurrentRoundId"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getLastRoundWinner", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getLastRoundWinner"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getLastRoundHighestBid", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getLastRoundHighestBid"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "getPlayers", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "getPlayers"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nftTransfer", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "nftTransfer"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nftTransferCall", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "nftTransferCall"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "_nftResolveTransfer", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "_nftResolveTransfer"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nftMint", [call], Object.getOwnPropertyDescriptor(_class2.prototype, "nftMint"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "nftToken", [view], Object.getOwnPropertyDescriptor(_class2.prototype, "nftToken"), _class2.prototype)), _class2)) || _class;

function init() {
  AuctionContract._init();
}
function nftToken() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nftToken(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nftMint() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nftMint(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function _nftResolveTransfer() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract._nftResolveTransfer(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nftTransferCall() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nftTransferCall(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function nftTransfer() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.nftTransfer(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getPlayers() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getPlayers(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getLastRoundHighestBid() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getLastRoundHighestBid(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getLastRoundWinner() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getLastRoundWinner(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getCurrentRoundId() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getCurrentRoundId(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getCurrentEndTime() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getCurrentEndTime(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getCurrentStartTime() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getCurrentStartTime(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getCurrentHighestBid() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getCurrentHighestBid(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function getCurrentWinner() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.getCurrentWinner(args);
  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function startNewRound() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.startNewRound(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function endRound() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.endRound(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}
function bet() {
  let _contract = AuctionContract._get();

  _contract.deserialize();

  let args = _contract.constructor.deserializeArgs();

  let ret = _contract.bet(args);

  _contract.serialize();

  if (ret !== undefined) env.value_return(_contract.constructor.serializeReturn(ret));
}

export { _nftResolveTransfer, bet, endRound, getCurrentEndTime, getCurrentHighestBid, getCurrentRoundId, getCurrentStartTime, getCurrentWinner, getLastRoundHighestBid, getLastRoundWinner, getPlayers, init, nftMint, nftToken, nftTransfer, nftTransferCall, startNewRound };
//# sourceMappingURL=hello_near.js.map
