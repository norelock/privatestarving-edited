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
        let array = [0, 0];
        for (const entity of this.entities) {
            const angle = entity.angle;
            const position = entity.body.position;
            const entityState = entity.state;

            let playerId = 0;
            let entityId = 0;
            let entityType = 0;

            if (entity instanceof Player) {
                playerId = entity.id;
            } else {
                entityId = entity.id;
                playerId = entity.owner ? entity.owner.id : 0;
                entityType = entity.type.id;
            }

            const x = Utils.sliceToBytes(position.x);
            const y = Utils.sliceToBytes(position.y);
            const entityIdBytes = Utils.sliceToBytes(entityId);
            const entityStateBytes = Utils.sliceToBytes(entityState);
            const entityTypeBytes = Utils.sliceToBytes(entityType);

            array = array.concat([playerId, angle], entityStateBytes, entityTypeBytes, x, y, entityIdBytes, entity.entityData || [0, 0], [entity.speed, 0, 0, 0]);
        }
        return new Uint8Array(array);
    }
}

export class DeletePacket extends UnitsPacket {
    build(): Uint8Array {
        let array = [0, 0];
        for (const entity of this.entities) {
            let playerId = 0;
            let entityId = 0;

            if (entity instanceof Player) {
                playerId = entity.id;
            } else {
                entityId = entity.id;
            }

            const entityIdBytes = Utils.sliceToBytes(entityId);
            array = array.concat([playerId, 0, 1, 0, 0, 0, 0, 0, 0, 0], entityIdBytes, [0, 0]);
        }
        return new Uint8Array(array);
    }
}
