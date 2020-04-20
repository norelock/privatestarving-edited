import JsonPacket from "./JsonPacket";

export default class PlacePacket implements JsonPacket {
    itemId: number;
    angle: number;

    constructor(itemId: number, angle: number) {
        this.itemId = itemId;
        this.angle = angle;
    }

    build(): object {
        return [10, this.itemId, this.angle, 0];
    }

    static fromJson(json: any[]): PlacePacket {
        return new PlacePacket(json[1], json[2]);
    }
}