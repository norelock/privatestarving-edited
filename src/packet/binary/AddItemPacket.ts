import BinaryPacket from './BinaryPacket';
import { ItemStack } from '../../entity/Item';
import Utils from '../../Utils';

export class AddItemPacket implements BinaryPacket {
    items: ItemStack[];

    constructor(items: ItemStack[]) {
        this.items = items;
    }

    build(): Uint8Array {
        return new Uint8Array([3, 0].concat(...this.items.map(x => {
            const amount = Utils.sliceToBytes(x.amount);
            return [x.item.id, 0].concat(amount);
        })));
    }
}
