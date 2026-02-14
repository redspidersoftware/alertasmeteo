import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';

// Load env vars manually since we are running this with node
// Simple parsing of .env file
const envFile = fs.readFileSync('.env', 'utf8');
const apiKeyLine = envFile.split('\n').find(line => line.startsWith('VITE_AEMET_API_KEY='));
const API_KEY = apiKeyLine ? apiKeyLine.split('=')[1].trim() : '';

console.log("Using API Key:", API_KEY ? "Found" : "Missing");

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

async function testApi() {
    try {
        console.log("1. Requesting latest alerts URL...");
        const initResponse = await axios.get(
            'https://opendata.aemet.es/opendata/api/avisos_cap/ultimoelaborado/area/esp',
            {
                params: { api_key: API_KEY },
                headers: { 'Accept': 'application/json' }
            }
        );

        console.log("Status:", initResponse.data.estado);
        console.log("Description:", initResponse.data.descripcion);

        if (initResponse.data.estado !== 200) {
            console.error("Error from AEMET:", initResponse.data);
            return;
        }

        const dataUrl = initResponse.data.datos;
        console.log("2. Fetching CAP data from:", dataUrl);

        const capResponse = await axios.get(dataUrl, {
            responseType: 'text'
        });

        console.log("CAP Response Length:", capResponse.data.length);
        console.log("First 500 chars of CAP:", capResponse.data.substring(0, 500));

        const jsonObj = parser.parse(capResponse.data);
        console.log("Parsed JSON Structure Keys:", Object.keys(jsonObj));

        if (jsonObj.alert) {
            console.log("Found 'alert' root element.");
            const info = jsonObj.alert.info;
            if (info) {
                const count = Array.isArray(info) ? info.length : 1;
                console.log(`Found ${count} info blocks.`);
                console.log("First Info block:", Array.isArray(info) ? info[0] : info);
            } else {
                console.log("Alert found but no 'info' block inside.");
            }
        } else {
            console.log("No 'alert' root element found. Keys:", Object.keys(jsonObj));
        }

    } catch (error) {
        console.error("Test Failed:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

testApi();
