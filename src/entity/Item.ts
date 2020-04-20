import "../Utils"
import { JsonProperty, JsonConverter, JsonCustomConvert } from "json2typescript";

@JsonConverter
class EnumConverter implements JsonCustomConvert<ItemType> {
    serialize(value: ItemType): any {
        return ItemType[value];
    }
    deserialize(json: string): ItemType {
        return ItemType[json];
    }
}

export enum ItemType {
    None,
    Tool,
    Food,
    Armor,
    Structure,
    Pickaxe,
    Shovel,
    Weapon,
    Hammer,
    Pitchfork
}

@JsonConverter
class DamageConverter implements JsonCustomConvert<Damage> {
    serialize(damage: Damage): any {
        return `${damage.pvp},${damage.pve}`;
    }
    deserialize(json: any): Damage {
        if(json) {
            const array = json.toString().split(",").map(x => Number.parseFloat(x));
            return { pvp: array[0], pve: array[1] };
        }
        return new Damage();
    }
}

export class Damage {
    pvp: number = 0;
    pve: number = 0;
}

export default class Item {
    @JsonProperty("Id")
    id: number = 0;

    @JsonProperty("Name")
    name: string = "";

    @JsonProperty("Type", EnumConverter)
    type: ItemType = ItemType.None;

    @JsonProperty("Damage", DamageConverter)
    damage: Damage = new Damage();

    @JsonProperty("Range")
    range: number = 0;

    @JsonProperty("Defense", DamageConverter)
    defense: Damage = new Damage();

    @JsonProperty("Tier")
    tier: number = 0;

    @JsonProperty("OnEat")
    onEat: string = "";

    structureId: number = 0;

    isTool(): boolean {
        return this.type === ItemType.Pickaxe || this.type === ItemType.Hammer || this.type === ItemType.Shovel || this.type === ItemType.Weapon || this.type === ItemType.Tool || this.type === ItemType.Pitchfork;
    }

    isCombatItem(): boolean {
        return this.type === ItemType.Weapon;
    }

    static list: Item[] = [];
    static hand: Item;
    static none: Item = new Item();
}

export class ItemStack {
    item: Item;
    amount: number;

    constructor(item: Item, amount: number = 1) {
        this.item = item;
        this.amount = amount;
    }
}
