import { call, near, NearBindgen, NearContract, view } from "near-sdk-js";
import { assert } from "./helper/assert";

@NearBindgen
class Treasury extends NearContract {
  owner: string;

  constructor(owner: string) {
    super();

    this.owner = owner;
  }

  default() {
    return new Treasury("");
  }

  // deposit near to treasury
  @call
  deposit() {
    const attachedAmount: bigint = near.attachedDeposit() as bigint;

    near.log(`sending ${attachedAmount} to treasury!`);
  }

  // withdraw near from treasury only owner
  @call
  withdraw() {
    const sender = near.predecessorAccountId();

    assert(this.owner === sender, `You are not an owner!`);

    const attachedAmount: bigint = near.attachedDeposit() as bigint;

    const promise = near.promiseBatchCreate(this.owner);
    near.promiseBatchActionTransfer(promise, attachedAmount);
    near.promiseReturn(promise);

    near.log(`sending ${attachedAmount} from treasury!`);
  }

  // view treasury balance
  @view
  balance() {
    return near.accountBalance();
  }
}
