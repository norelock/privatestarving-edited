import Entity from "../Entity";
import { ItemStack } from "../Item";

export default class ChestEntity extends Entity {
    inventory: ItemStack | undefined;
    isLocked: boolean = false;

    get state() {
        return this.inventory ? 2 + 2 * this.inventory.item.id : 0;
    }

    set state(_value) { }

    get entityData(): number[] {
        return this.inventory ? [this.inventory.amount, this.isLocked ? 32 : 0] : [0, this.isLocked ? 32 : 0];
    }
}