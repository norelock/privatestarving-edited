import JsonPacket from "./JsonPacket";
import Player from '../../entity/Player';

export default class NewPlayerPacket implements JsonPacket {
    player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    build(): object {
        return [2, this.player.id, this.player.nickname, this.player.skin.skinId, this.player.skin.accessoryId, this.player.skin.bagId, this.player.skin.bookId, this.player.skin.lootBox, this.player.skin.deadBox, this.player.level];
    }

    static fromJson(json: any[]): void {
    }
}
