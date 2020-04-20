import Entity from '../Entity';
import WallEntity from './WallEntity';
import Player from '../Player';

export default class DoorEntity extends WallEntity {
    dealDamage(value: number, damager: Entity | undefined) {
        super.dealDamage(value, damager);

        if (damager instanceof Player && (!this.owner || this.owner == damager)) {            
            this.isOpen = !this.isOpen;
        }
    }

    isOpen: boolean = false;

    get entityData(): number[] {
        this.body.isSensor = this.isOpen;
        return [this.getBinaryHealth() * 2 - (this.isOpen ? 1 : 0), 0];
    }
}