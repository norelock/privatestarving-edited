import BinaryPacket from "./BinaryPacket";
import Recipe from "../../entity/Recipe";

export class CraftingStartPacket implements BinaryPacket {
    recipe: Recipe;

    constructor(recipe: Recipe) {
        this.recipe = recipe;
    }

    build(): Uint8Array {
        return new Uint8Array([9, this.recipe.id]);
    }
}

export class CraftingEndPacket implements BinaryPacket {
    recipe: Recipe;

    constructor(recipe: Recipe) {
        this.recipe = recipe;
    }

    build(): Uint8Array {
        return new Uint8Array([8, this.recipe.result]);
    }
}

export class CraftingCancelPacket implements BinaryPacket {
    build(): Uint8Array {
        return new Uint8Array([2]);
    }
}