import JsonPacket from "./JsonPacket";

export default class MessagePacket implements JsonPacket {
    reason: string;

    constructor(reason: string) {
        this.reason = reason;
    }

    build(): object {
        return [4, this.reason];
    }

    static fromJson(json: any[]): MessagePacket {
        return new MessagePacket(json[1]);
    }
}
