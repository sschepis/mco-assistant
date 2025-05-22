import EventManager from "./managers/EventManager";
import {NetworkManager} from "./managers/NetworkManager";
import ObjectManager from "./managers/ObjectManager";
import { DataProvider } from './types'; // Corrected import path

export default function loadManagers(dataProvider: DataProvider) {

    const objectManager = ObjectManager.newInstance(dataProvider);
    const networkManager = NetworkManager.newInstance(dataProvider);
    const eventManager = EventManager.getInstance(dataProvider);

    return { objectManager, networkManager, eventManager };
}