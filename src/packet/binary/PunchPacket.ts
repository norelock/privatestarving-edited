import BinaryPacket from './BinaryPacket';
import { MapEntity } from '../../entity/MapEntity';
import Player from '../../entity/Player';
import Entity from '../../entity/Entity';
import Utils from '../../Utils';

export class MapEntityPunchPacket implements BinaryPacket {
    mapEntity: MapEntity;
    player: Player;

    constructor(mapEntity: MapEntity, player: Player) {
        this.mapEntity = mapEntity;
        this.player = player;
    }

    build(): Uint8Array {
        return new Uint8Array([7, 0, this.mapEntity.x / 100, 0, this.mapEntity.y / 100, 0, Utils.angleBetweenPoints(this.mapEntity.body.position, this.player.body.position), 0, this.mapEntity.type.number + this.mapEntity.nulls, 0]);
    }
}

export class EntityPunchPacket implements BinaryPacket {
    entity: Entity;
    player: Player;

    constructor(entity: Entity, player: Player) {
        this.entity = entity;
        this.player = player;
    }

    build(): Uint8Array {
        return new Uint8Array([13, 0, this.entity.id, 0, this.entity.owner ? this.entity.owner.id : 0, Utils.angleBetweenPoints(this.entity.body.position, this.player.body.position)]);
    }
}