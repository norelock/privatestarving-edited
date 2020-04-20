import Entity from "../Entity";

export default class WindmillEntity extends Entity {
    input: number;
    output: number;

    get entityData(): number[] {
        return [this.input, this.output];
    }
}