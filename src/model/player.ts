export class Player {
  address: string;
  amount: bigint;

  constructor({ address, amount }: { address: string; amount: bigint }) {
    this.address = address;
    this.amount = amount;
  }
}
