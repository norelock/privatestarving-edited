import BinaryPacket from './BinaryPacket';
import { Source } from '../../entity/EntityType';

export class SetSourcePacket implements BinaryPacket {
    source: Source;
    value: boolean;

	constructor(source: Source, value: boolean) {
        this.source = source;
        this.value = value;
	}

    build(): Uint8Array {
        return new Uint8Array([this.source, this.value ? 1 : 0]);
    }
}