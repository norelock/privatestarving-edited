import Entity from "../Entity";
import GameServer from "../../GameServer";
import EntityType from "../EntityType";
import Player from "../Player";
import { ItemStack, ItemType } from '../Item';
import Item from '../Item';
import Utils from "../../Utils";

export enum BerriesState {
    Grown = 0,
    Seed = 10,
    Dry = 16
}

export default class BerriesEntity extends Entity {
    berriesState: BerriesState = BerriesState.Seed;
    berries: number = 0;

    dealDamage(value: number, damager: Entity | undefined) {
        super.dealDamage(value, damager);

        if (damager instanceof Player) {
            if (damager.inventory.equippedItem && damager.inventory.equippedItem.id == 98) {
                this.berriesState &= ~BerriesState.Dry;
            } else if (this.berries > 0) {
                this.berries--;;
                damager.inventory.addItem([new ItemStack(Item.list.findId(4)!, Math.min(this.berries, damager.inventory.equippedItem.type === ItemType.Pitchfork ? 2 : 1))]);
            }
        }
    }

    constructor(gameServer: GameServer, type: EntityType) {
        super(gameServer, type);

        setTimeout(() => {
            this.berriesState = BerriesState.Grown;
            this.action = true;
        }, 1000 * 4)

        setTimeout(() => {
            gameServer.deleteEntity(this);
        }, 1000 * 60 * 64)

        setInterval(() => {
            this.berriesState = BerriesState.Dry;
            this.action = true;
        }, 1000 * 60);

        setInterval(() => {
            if (this.berriesState == BerriesState.Grown && this.berries < 3) {
                this.berries++;
                this.action = true;
                this.action = true;
            }
        }, 1000 * 30);
    }

    get entityData(): number[] {
        return [this.berriesState + this.berries, 0];
    }
}