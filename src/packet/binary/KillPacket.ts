import BinaryPacket from './BinaryPacket';
import Utils from '../../Utils';

export enum KillReason {
    None,
    Starve,
    Cold,
    OtherPlayer,
    Heat,
    Spider,
    Wolf,
    Fox,
    Bear,
    Dragon,
    SpikeWall,
    FailedResurrect,
    RottenFood,
    Thirst,
    Oxygen,
    Piranas,
    Kraken,
    VampireSun,
    VampireGarlic
}

export class KillPacket implements BinaryPacket {
    reason: KillReason;
    kills: number;
    points: number;

	constructor(reason: KillReason, kills: number, points: number) {
		this.reason = reason;
		this.kills = kills;
		this.points = points;
	}

    build(): Uint8Array {
        const kills = Utils.sliceToBytes(this.kills);
        const points = Utils.sliceToBytes(this.points, 4);
        return new Uint8Array([25, this.reason].concat(kills, points));
    }
}
