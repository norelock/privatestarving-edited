import { StringDecoder } from "string_decoder";
import { Vector, Body } from 'matter-js';
import IPacket from './packet/IPacket';
import BinaryPacket from './packet/binary/BinaryPacket';
import JsonPacket from './packet/json/JsonPacket';
import GameServer from "./GameServer";
import Entity from "./entity/Entity";
import EntityType from "./entity/EntityType";

declare global {
    interface Array<T> {
        findId(id: number | string): T | undefined;
        delete(object: T): void;
    }

    interface Number {
        clamp: (min: number, max: number) => number;
    }
}

Array.prototype.findId = function (id: number | string) {
    if (this.length > 0) {
        if (typeof this[0].id == typeof id) {
            return this.find(x => x.id == id);
        }
    }
};

Array.prototype.delete = function (object: any) {
    this.splice(this.indexOf(object), 1);
};

Number.prototype.clamp = function (min: number, max: number): number {
    return Math.min(Math.max(this as number, min), max);
};

export type Stats = { [stat: number]: number };

export default abstract class Utils {
    static sendPacket(ws: any, packet: IPacket): void {
        if (packet.constructor["fromJson"] != undefined) {
            ws.send(JSON.stringify((packet as JsonPacket).build()));
        } else {
            ws.send((packet as BinaryPacket).build().buffer);
        }
    };

    static bufferToString(buffer: ArrayBuffer): string {
        return new StringDecoder("utf8").write(Buffer.from(buffer));
    };

    static sliceToBytes(x: number, size: number = 2): number[] {
        let array = new Array<number>(size);
        for (let i = 0; i < size; i++) {
            array[i] = x / Math.pow(256, i);
        }
        return array;
    };

    static getRandomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    };

    static binaryAngleToRadians(angle: number): number {
        return angle * Math.PI / 128;
    };

    static angleBetweenPoints(vector1: Vector, vector2: Vector) {
        return Math.atan2(vector1.x - vector2.x, vector1.y - vector2.y) * 128 / Math.PI;
    }

    static translateVector(vector: Vector, radians: number, range: number = 120): Vector {
        const x = vector.x + range * Math.cos(radians);
        const y = vector.y + range * Math.sin(radians);
        return { x, y }
    };

    static drawCollisions(body: Body, draw: (x: number, y: number) => void) {
        for (const vector of body.vertices) {
            draw(vector.x, vector.y);
        }
    };

    static spawnCell(gameServer: GameServer, x: number, y: number): Entity {
        return gameServer.addEntity(new Entity(gameServer, EntityType.list.findId(36)!), { x, y });
    };

    static hasFlag($enum: number, flag: number): boolean {
        return ($enum & flag) === flag;
    };
}
