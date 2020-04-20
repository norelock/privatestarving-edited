import IPacket from '../IPacket';

export default interface JsonPacket extends IPacket {
    build(): object;
}