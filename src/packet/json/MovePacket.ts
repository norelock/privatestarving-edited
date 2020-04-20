import JsonPacket from "./JsonPacket";

export enum MoveDirection {
    None = 0,
    Left = 1,
    Right = 2,
    Down = 4,
    Up = 8,
}

export default class MovePacket implements JsonPacket {
    direction: MoveDirection;

    constructor(direction: MoveDirection) {
        this.direction = direction;
    }

    build(): object {
        return [2, this.direction];
    }

    static fromJson(json: any[]): MovePacket {
        return new MovePacket(json[1]);
    }
}