import JsonPacket from "./JsonPacket";
import Player, { PlayerSkin } from "../../entity/Player";

export class HandshakePacket implements JsonPacket {
    nickname: string;
    width: number;
    height: number;
    clientVersion: number;
    skin: PlayerSkin;
    userId: number;

    constructor(nickname: string, width: number, height: number, clientVersion: number, skin: PlayerSkin, userId: number) {
        this.nickname = nickname;
        this.width = width;
        this.height = height;
        this.clientVersion = clientVersion;
        this.skin = skin;
        this.userId = userId;
    }

    build(): object {
        return [this.nickname, this.width, this.height, this.clientVersion, "", "", 0, this.skin.skinId, this.skin.accessoryId, this.skin.bagId, this.skin.bookId, this.skin.lootBox, this.skin.deadBox, this.userId, 0, null, null, null];
    }

    static fromJson(json: any[]): HandshakePacket {
        return new HandshakePacket(json[0], json[1], json[2], json[3], new PlayerSkin(json[7], json[8], json[9], json[10], json[11], json[12]), json[13]);
    }
}

export class HandshakeResponse implements JsonPacket {
    player: Player;
    maxPlayers: number;
    players: Player[];
    night: boolean;
    time: number;
    mapSeed: number;

    constructor(player: Player, maxPlayers: number, players: Player[], night: boolean, time: number, mapSeed: number) {
        this.player = player;
        this.maxPlayers = maxPlayers;
        this.players = players;
        this.night = night;
        this.time = time;
        this.mapSeed = mapSeed;
    }

    build(): object {
        return [3,
            1,
            0,
            this.player.body.position.x,
            this.players.sort(x => x.points).map(x => x.asLeaderBoard()),
            this.night ? 1 : 0,
            0,
            1000,
            [],
            this.player.id,
            this.player.body.position.y,
            this.maxPlayers + 1,
            "BFK01Ma]",
            0,
            [],
            this.time,
            0,
            [],
            0,
            this.mapSeed,
            154,
            154,
            6,
            0,
            "",
            0,
            0,
            0
        ];
    }

    static fromJson(json: any[]): HandshakeResponse {
        throw null;
    }
}
