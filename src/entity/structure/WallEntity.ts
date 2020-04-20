import Entity from "../Entity";

export default class WallEntity extends Entity {
    get entityData(): number[] {
        return [this.getBinaryHealth(), 0];
    }
}