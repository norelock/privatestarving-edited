import Player from './Player';
import Item, { ItemStack } from './Item';
import Utils from '../Utils';
import { AddItemPacket } from '../packet/binary/AddItemPacket';
import { RemoveType, RemoveItemPacket } from '../packet/binary/RemoveItemPacket';
import { ItemType } from './Item';

export default class PlayerInventory {
    player: Player;
    equippedItem: Item = Item.hand;
    equippedHelmet: Item = Item.none;
    items: ItemStack[] = [];

    get size() {
        return 14; // bag
    }

    unEquipItem(item: Item) {
        let did = false;
        if (item.isTool()) {
            if (this.equippedItem == item) {
                this.equippedItem = Item.hand;
                did = true;
            }
        } else if (item.type == ItemType.Armor) {
            if (this.equippedHelmet == item) {
                this.equippedHelmet = Item.none;
                did = true;
            }
        }
        if (did) {
            this.player.action = true;
        }

        return did;
    }

    equipItem(item: Item) {
        if (!this.unEquipItem(item))
            if (item.isTool()) {
                this.equippedItem = item;
            } else if (item.type == ItemType.Armor) {
                this.equippedHelmet = item;
            } else if (item.type == ItemType.Food) {
                this.removeItem(item, RemoveType.Amount, 1);
                for (const effect of item.onEat.split(";")) {
                    const args = effect.split(":");
                    switch (args[0]) {
                        case "food":
                            this.player.hunger += Number(args[1]);
                            break;
                        case "water":
                            this.player.water += Number(args[1]);
                            break;
                        case "hp":
                            this.player.health += Number(args[1]);
                            break;
                    }
                }
            }
        this.player.action = true;
    }

    removeItems(items: ItemStack[]) {
        for (const item of items) {
            this.removeItem(item.item, RemoveType.Amount, item.amount);
        }
    }

    removeItem(item: Item, removeType: RemoveType, amount: number = 1) {
        Utils.sendPacket(this.player.ws, new RemoveItemPacket(item, removeType, amount));

        for (const [i, itemStack] of this.items.entries()) {
            if (itemStack.item.id == item.id) {
                switch (removeType) {
                    case RemoveType.Single:
                    case RemoveType.Place:
                        itemStack.amount -= amount;
                        break;
                    case RemoveType.All:
                        itemStack.amount = 0;
                        break;
                }
                if (itemStack.amount <= 0) {
                    this.items.delete(itemStack);
                    this.unEquipItem(itemStack.item);

                } else {
                    this.items[i] = itemStack;
                }
            }
        }
    }

    addItem(items: ItemStack[], sendPacket: boolean = true) {
        if (sendPacket)
            Utils.sendPacket(this.player.ws, new AddItemPacket(items));

        itemsLoop:
        for (const item of items) {
            for (const [i, itemStack] of this.items.entries()) {
                if (itemStack.item.id == item.item.id) {
                    itemStack.amount += item.amount;
                    this.items[i] = itemStack;
                    continue itemsLoop;
                }
            }
            if (this.items.length < this.size)
                this.items.push(item);
        }
    }

    containsItem(item: Item, amount: number = 1): boolean {
        if (item === Item.none || item === Item.hand) {
            return true;
        }

        for (const itemStack of this.items) {
            if (itemStack.item == item && itemStack.amount >= amount) {
                return true;
            }
        }
        return false;
    }

    constructor(player: Player) {
        this.player = player;
    }
}
