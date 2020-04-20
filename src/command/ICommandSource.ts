export default interface ICommandSource {
    sendMessage(message: string): void;
}

export class ConsoleSource implements ICommandSource {
    sendMessage(message: string): void {
        console.log(message);
    }
}