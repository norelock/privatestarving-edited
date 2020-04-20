import BinaryPacket from './BinaryPacket';
import Player from '../../entity/Player';

export enum StatType {
    Health = 37,
    Hunger = 38,
    Temperature = 56,
    Water = 39,
    Oxygen,
    Overheat
}

export class SetStatPacket implements BinaryPacket {
    type: StatType;
    value: number;

    constructor(type: StatType, value: number) {
        this.type = type;
        this.value = value;
    }

    build(): Uint8Array {
        return new Uint8Array([this.type, this.value]);
    }
}

export class SetStatsPacket implements BinaryPacket {
    player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    build(): Uint8Array {
        return new Uint8Array([16, this.player.getBinaryHealth(), this.player.hunger, this.player.temperature, this.player.water, this.player.oxygen, this.player.overheat]);
    }
}
