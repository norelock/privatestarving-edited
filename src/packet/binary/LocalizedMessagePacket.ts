import BinaryPacket from './BinaryPacket';

export enum LocalizedMessage {
    Full = 5,
    NotRightTool = 6,
    ForceDead = 27,
    NotFoundSpawn = 51
}

export class LocalizedMessagePacket implements BinaryPacket {
    reason: LocalizedMessage;


	constructor(reason: LocalizedMessage) {
		this.reason = reason;
	}

    build(): Uint8Array {
        return new Uint8Array([this.reason]);
    }
}