import GunDataProvider from "./data-providers/GunDataProvider";
import Gun from "gun"; // Import Gun

// Create a local Gun instance for this default provider
const localGunInstance = Gun({ /* Add any default options if needed */ });
const provider = new GunDataProvider(localGunInstance);

export default provider;