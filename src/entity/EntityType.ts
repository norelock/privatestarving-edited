import { JsonProperty, JsonConverter, JsonCustomConvert } from 'json2typescript';
import Entity from './Entity';

@JsonConverter
export class SourceConverter implements JsonCustomConvert<Source> {
    serialize(value: Source): any {
        return Source[value];
    }
    deserialize(json: string): Source {
        var source = Source.None;
        if(json) {
            for (const name of json.split(";")) {
                source |= Source[name];
            }
        }
        return source;
    }
}

export enum Source {
    None,
    Fire = 19,
    Workbench = 12,
    Water = 36,
    Island,
    River
}

export default class EntityType {
    @JsonProperty("Id")
    id: number = 0;

    @JsonProperty("Name")
    name: string = "";

    @JsonProperty("Damage")
    damage: number = 0;

    @JsonProperty("Health")
    health: number = 200;
    
    @JsonProperty("Collision")
    collision: string = "none";

    @JsonProperty("Source", SourceConverter)
    source: Source = Source.None;

    @JsonProperty("Class")
    className: string = "";

    @JsonProperty("Speed")
    speed: number = 0;

    constructor(id: number = 0) {
        this.id = id;
    }

    class: typeof Entity = Entity;

    static list: EntityType[] = [];
}