import BinaryPacket from './BinaryPacket';
import Player from '../../entity/Player';
import Utils from '../../Utils';
import Entity from '../../entity/Entity';

export class UnitsPacket implements BinaryPacket {
    entities: Entity[];

    constructor(...entities: Entity[]) {
        this.entities = entities;
    }

    build(): Uint8Array {
        var array = [0, 0];
        for (const entity of this.entities) {
            var angle = entity.angle;
            var position = entity.body.position;
            var entityState = entity.state;

            var playerId = 0;
            var entityId = 0;
            var entityType = 0;

            if (entity instanceof Player) {
                playerId = entity.id;
            } else {
                entityId = entity.id;
                playerId = entity.owner ? entity.owner.id : 0;
                entityType = entity.type.id;
            }

            var x = Utils.sliceToBytes(position.x);
            var y = Utils.sliceToBytes(position.y);
            var entityIdBytes = Utils.sliceToBytes(entityId);
            var entityStateBytes = Utils.sliceToBytes(entityState);
            var entityTypeBytes = Utils.sliceToBytes(entityType);

            array = array.concat([playerId, angle], entityStateBytes, entityTypeBytes, x, y, entityIdBytes, entity.entityData || [0, 0], [entity.speed, 0, 0, 0]);
        }
        return new Uint8Array(array);
    }
}

export class DeletePacket extends UnitsPacket {
    build(): Uint8Array {
        var array = [0, 0];
        for (const entity of this.entities) {
            var playerId = 0;
            var entityId = 0;

            if (entity instanceof Player) {
                playerId = entity.id;
            } else {
                entityId = entity.id;
            }

            var entityIdBytes = Utils.sliceToBytes(entityId);
            array = array.concat([playerId, 0, 1, 0, 0, 0, 0, 0, 0, 0], entityIdBytes, [0, 0]);
        }
        return new Uint8Array(array);
    }
}