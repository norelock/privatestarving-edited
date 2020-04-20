import BinaryPacket from './BinaryPacket';
import Item from '../../entity/Item';

export enum RemoveType {
    Amount = 11,
    Single = 53,
    All = 52,
    Place = 24
}

export class RemoveItemPacket implements BinaryPacket {
    item: Item;
    removeType: RemoveType;
    amount: number;

    constructor(item: Item, removeType: RemoveType, amount: number = NaN) {
        this.item = item;
        this.removeType = removeType;
        this.amount = amount;
    }

    build(): Uint8Array {
        return new Uint8Array([this.removeType, this.item.id, this.removeType == RemoveType.Amount ? this.amount : NaN]);
    }
}