import MultiContextObject from '../core/MultiContextObject';

export default class StateSync {
    mco: MultiContextObject;

    constructor(multiContextObject: MultiContextObject) {
        this.mco = multiContextObject;
        this.setupSync();
    }

    setupSync(): void {
        const provider = this.mco.provider;
        provider.on([`${this.mco.id}.state`], (data: any) => {
            if (data && data.timestamp > this.mco.getState().timestamp) {
                this.mco.setState(data)
            }
        });
    }

    pushUpdate(newState: any): void {
        const provider = this.mco.provider;
        newState.timestamp = Date.now();
        provider.put([`${this.mco.id}.state`], newState);
    }
}