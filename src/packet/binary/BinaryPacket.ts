import IPacket from '../IPacket';

export default interface BinaryPacket extends IPacket {
    build(): Uint8Array;
}