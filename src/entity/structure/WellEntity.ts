import Entity from "../Entity";

export default class WellEntity extends Entity {
    water: boolean = false;

    get entityData(): number[] {
        return [this.water ? 1 : 0, 0];
    }
}