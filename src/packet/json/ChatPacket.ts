import JsonPacket from "./JsonPacket";

export class ChatPacket implements JsonPacket {
    message: string;

    constructor(message: string)
    {
        this.message = message;
    }

    build(): object {
        return [0, this.message];
    }

    static fromJson(json: any[]): ChatPacket {
        return new ChatPacket(json[1]);
    }
}

export class SendChatPacket implements JsonPacket {
    playerId: number;
    message: string;

    constructor(playerId: number, message: string)
    {
        this.playerId = playerId;
        this.message = message;
    }

    build(): object {
        return [0, this.playerId, this.message];
    }

    static fromJson(json: any[]): SendChatPacket {
        return new SendChatPacket(json[1], json[2]);
    }
}
