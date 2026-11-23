const fs = require("fs");

const garage = "C:\\Users\\Market\\AppData\\Roaming\\Code\\agentSessionData\\e3e5591f-a06e-48e9-9e5c-732188006fe3\\attachments\\b1c08de7-9f7a-4b69-8837-04fb1b0e5500\\Garage - Banner_3.png";
const spares = "C:\\Users\\Market\\AppData\\Roaming\\Code\\agentSessionData\\e3e5591f-a06e-48e9-9e5c-732188006fe3\\attachments\\5cd6fa9f-04b9-43d9-ae46-edfc47559294\\Spares Parts - Banner.png";
const publicDir = "C:\\Users\\Market\\Desktop\\auto360\\Auto360New\\client\\public";

fs.copyFileSync(garage, `${publicDir}\\garage-banner.png`);
fs.copyFileSync(spares, `${publicDir}\\spares-parts-banner.png`);
console.log("copied");
