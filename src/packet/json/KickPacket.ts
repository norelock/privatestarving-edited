import JsonPacket from "./JsonPacket";

export default class KickPacket implements JsonPacket {
    reason: string;

    constructor(reason: string) {
        this.reason = reason;
    }

    build(): object {
        return [0, this.reason];
    }

    static fromJson(json: any[]): KickPacket {
        return new KickPacket(json[1]);
    }
}
