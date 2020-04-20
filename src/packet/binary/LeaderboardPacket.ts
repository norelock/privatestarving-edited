import BinaryPacket from './BinaryPacket';
import Player from '../../entity/Player';
import Utils from '../../Utils';

export class LeaderboardPacket implements BinaryPacket {
    player: Player;
    players: Player[];

    constructor(player: Player, players: Player[]) {
        this.player = player;
        this.players = players;
    }

    boundPoints(points: number): number[] {
        if (points > 10000) {
            points = Math.round(points / 100 - 0.5) + 10000;
        }
        return Utils.sliceToBytes(points);
    }

    build(): Uint8Array {
        let array: number[] = [];

        const players = this.players.sort((a, b) => a.points - b.points);
        for (let index = -1; index < 10; index++) {
            const player = index == -1 ? this.player : players[index];
            if (player) {
                const points = this.boundPoints(player.points);
                array = array.concat([index == -1 ? 21 : player.id, 0].concat(points));
            }
        }

        return new Uint8Array(array);
    }
}
