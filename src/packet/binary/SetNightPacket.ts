import BinaryPacket from './BinaryPacket';

export class SetNightPacket implements BinaryPacket {
    night: boolean;

	constructor(night: boolean) {
        this.night = night;
	}

    build(): Uint8Array {
        return new Uint8Array([22, this.night ? 1 : 0]);
    }
}